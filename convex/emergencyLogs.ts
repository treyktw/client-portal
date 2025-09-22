// convex/emergencyLogs.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Create emergency log
export const create = mutation({
  args: {
    type: v.union(v.literal("sms"), v.literal("voice_call"), v.literal("email"), v.literal("system")),
    from: v.string(),
    message: v.optional(v.string()),
    messageSid: v.optional(v.string()),
    callSid: v.optional(v.string()),
    timestamp: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("priority"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("completed")
    ),
    hasMedia: v.optional(v.boolean()),
    mediaUrls: v.optional(v.array(v.string())),
    recordingUrl: v.optional(v.string()),
    transcription: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Allow unauthenticated for webhook calls
    const userId = identity ? await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first()
      .then(user => user?._id) : undefined;

    const emergencyId = await ctx.db.insert("emergencyLogs", {
      ...args,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      acknowledgedAt: undefined,
      acknowledgedBy: undefined,
      resolvedAt: undefined,
      resolvedBy: undefined,
      escalatedAt: undefined,
      escalatedTo: undefined,
      responseTime: undefined,
      resolutionTime: undefined,
      priority: determinePriority(args.type, args.message),
      tags: extractEmergencyTags(args.message),
    });

    // Trigger notifications if critical
    if (args.status === "active") {
      await ctx.scheduler.runAfter(0, internal.emergencyLogs.notifyTeam, {
        emergencyId,
      });
    }

    return emergencyId;
  },
});

// Update emergency log
export const update = mutation({
  args: {
    emergencyId: v.optional(v.id("emergencyLogs")),
    callSid: v.optional(v.string()),
    messageSid: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("priority"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("completed")
    )),
    recordingUrl: v.optional(v.string()),
    transcription: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let emergency: Doc<"emergencyLogs"> | null = null;

    // Find by ID or by call/message SID
    if (args.emergencyId) {
      emergency = await ctx.db.get(args.emergencyId);
    } else if (args.callSid) {
      emergency = await ctx.db
        .query("emergencyLogs")
        .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
        .first();
    } else if (args.messageSid) {
      emergency = await ctx.db
        .query("emergencyLogs")
        .withIndex("by_message_sid", (q) => q.eq("messageSid", args.messageSid))
        .first();
    }

    if (!emergency) {
      throw new Error("Emergency log not found");
    }

    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first()
      .then(user => user?._id) : undefined;

    const now = Date.now();
    const updates: Partial<Doc<"emergencyLogs">> = {
      updatedAt: now,
    };

    // Handle status transitions
    if (args.status && args.status !== emergency.status) {
      updates.status = args.status;
      
      switch (args.status) {
        case "acknowledged":
          if (!emergency.acknowledgedAt) {
            updates.acknowledgedAt = now;
            updates.acknowledgedBy = userId;
            updates.responseTime = now - emergency.createdAt;
          }
          break;
        
        case "resolved":
        case "completed":
          if (!emergency.resolvedAt) {
            updates.resolvedAt = now;
            updates.resolvedBy = userId;
            updates.resolutionTime = now - emergency.createdAt;
          }
          break;
        
        case "escalated":
          if (!emergency.escalatedAt) {
            updates.escalatedAt = now;
            // Trigger escalation notifications
            await ctx.scheduler.runAfter(0, internal.emergencyLogs.escalate, {
              emergencyId: emergency._id,
            });
          }
          break;
      }
    }

    // Update other fields
    if (args.recordingUrl) updates.recordingUrl = args.recordingUrl;
    if (args.transcription) updates.transcription = args.transcription;
    if (args.notes) {
      updates.notes = emergency.notes 
        ? `${emergency.notes}\n\n${now}: ${args.notes}`
        : `${now}: ${args.notes}`;
    }
    if (args.metadata) {
      updates.metadata = { ...emergency.metadata, ...args.metadata };
    }

    await ctx.db.patch(emergency._id, updates);
    
    return { success: true };
  },
});

// Acknowledge emergency
export const acknowledge = mutation({
  args: {
    emergencyId: v.id("emergencyLogs"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");

    const emergency = await ctx.db.get(args.emergencyId);
    if (!emergency) throw new Error("Emergency log not found");

    const now = Date.now();
    
    await ctx.db.patch(args.emergencyId, {
      status: "acknowledged",
      acknowledgedAt: now,
      acknowledgedBy: user._id,
      responseTime: now - emergency.createdAt,
      notes: args.notes ? `${now}: [Acknowledged by ${user.name || user.email}] ${args.notes}` : undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Resolve emergency
export const resolve = mutation({
  args: {
    emergencyId: v.id("emergencyLogs"),
    resolution: v.string(),
    preventionSteps: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");

    const emergency = await ctx.db.get(args.emergencyId);
    if (!emergency) throw new Error("Emergency log not found");

    const now = Date.now();
    
    await ctx.db.patch(args.emergencyId, {
      status: "resolved",
      resolvedAt: now,
      resolvedBy: user._id,
      resolutionTime: now - emergency.createdAt,
      resolution: args.resolution,
      preventionSteps: args.preventionSteps,
      notes: emergency.notes 
        ? `${emergency.notes}\n\n${now}: [Resolved by ${user.name || user.email}] ${args.resolution}`
        : `${now}: [Resolved by ${user.name || user.email}] ${args.resolution}`,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Get emergency by message SID
export const getByMessageSid = query({
  args: {
    messageSid: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emergencyLogs")
      .withIndex("by_message_sid", (q) => q.eq("messageSid", args.messageSid))
      .first();
  },
});

// Get emergency by call SID
export const getByCallSid = query({
  args: {
    callSid: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emergencyLogs")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
  },
});

// Get all active emergencies
export const getActiveEmergencies = query({
  args: {
    includePriority: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const statuses = ["active"];
    if (args.includePriority) {
      statuses.push("priority");
    }

    const emergencies = [];
    for (const status of statuses) {
      const statusEmergencies = await ctx.db
        .query("emergencyLogs")
        .withIndex("by_status", (q) => q.eq("status", status as "active" | "priority" | "acknowledged" | "resolved" | "escalated" | "completed"))
        .order("desc")
        .collect();
      emergencies.push(...statusEmergencies);
    }

    // Sort by priority and creation time
    return emergencies.sort((a, b) => {
      if (a.priority !== b.priority) {
        return getPriorityValue(b.priority) - getPriorityValue(a.priority);
      }
      return b.createdAt - a.createdAt;
    });
  },
});

// Get emergency logs with filters
export const getEmergencyLogs = query({
  args: {
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("priority"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("completed")
    )),
    type: v.optional(v.union(
      v.literal("sms"),
      v.literal("voice_call"),
      v.literal("email"),
      v.literal("system")
    )),
    from: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs: Doc<"emergencyLogs">[];
    if (args.status !== undefined) {
      const status = args.status as "active" | "priority" | "acknowledged" | "resolved" | "escalated" | "completed";
      logs = await ctx.db
        .query("emergencyLogs")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.type !== undefined) {
      const type = args.type as "sms" | "voice_call" | "email" | "system";
      logs = await ctx.db
        .query("emergencyLogs")
        .withIndex("by_type", (q) => q.eq("type", type))
        .order("desc")
        .take(args.limit || 100);
    } else {
      logs = await ctx.db.query("emergencyLogs").order("desc").take(args.limit || 100);
    }

    // Apply additional filters
    if (args.from) {
      logs = logs.filter(log => log.from === args.from);
    }
    if (args.startDate !== undefined) {
      const start = args.startDate as number;
      logs = logs.filter(log => log.createdAt >= start);
    }
    if (args.endDate !== undefined) {
      const end = args.endDate as number;
      logs = logs.filter(log => log.createdAt <= end);
    }

    return logs;
  },
});

// Get emergency statistics
export const getEmergencyStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("emergencyLogs")
      .collect();

    const filteredLogs = logs.filter(log => {
      if (args.startDate && log.createdAt < args.startDate) return false;
      if (args.endDate && log.createdAt > args.endDate) return false;
      return true;
    });

    const stats = {
      total: filteredLogs.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averageResponseTime: 0,
      averageResolutionTime: 0,
      unacknowledged: 0,
      escalated: 0,
    };

    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;

    for (const log of filteredLogs) {
      // Count by status
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      
      // Count by type
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      
      // Count by priority
      if (log.priority) {
        stats.byPriority[log.priority] = (stats.byPriority[log.priority] || 0) + 1;
      }
      
      // Calculate average times
      if (log.responseTime) {
        totalResponseTime += log.responseTime;
        responseCount++;
      }
      if (log.resolutionTime) {
        totalResolutionTime += log.resolutionTime;
        resolutionCount++;
      }
      
      // Count unacknowledged
      if (log.status === "active" || log.status === "priority") {
        stats.unacknowledged++;
      }
      
      // Count escalated
      if (log.status === "escalated" || log.escalatedAt) {
        stats.escalated++;
      }
    }

    stats.averageResponseTime = responseCount > 0 
      ? Math.round(totalResponseTime / responseCount / 1000 / 60) // Convert to minutes
      : 0;
    
    stats.averageResolutionTime = resolutionCount > 0
      ? Math.round(totalResolutionTime / resolutionCount / 1000 / 60) // Convert to minutes
      : 0;

    return stats;
  },
});

// Helper functions
function determinePriority(type: string, message?: string): "critical" | "high" | "medium" | "low" {
  const criticalKeywords = ["down", "crashed", "hacked", "breach", "911", "emergency"];
  const highKeywords = ["urgent", "asap", "critical", "help", "sos"];
  
  const lowerMessage = message?.toLowerCase() || "";
  
  if (criticalKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return "critical";
  }
  
  if (highKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return "high";
  }
  
  if (type === "voice_call") {
    return "medium";
  }
  
  return "low";
}

function extractEmergencyTags(message?: string): string[] {
  if (!message) return [];
  
  const tags: string[] = [];
  const lowerMessage = message.toLowerCase();
  
  const tagMap = {
    "network": ["network", "connection", "internet", "wifi"],
    "security": ["hacked", "breach", "security", "unauthorized"],
    "system": ["down", "crashed", "error", "broken"],
    "payment": ["payment", "charge", "billing", "invoice"],
    "access": ["locked", "access", "login", "password"],
  };
  
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  return tags;
}

function getPriorityValue(priority?: string): number {
  switch (priority) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

// Internal mutation for automated notifications
export const notifyTeam = internalMutation({
  args: {
    emergencyId: v.id("emergencyLogs"),
  },
  handler: async (ctx, args) => {
    const emergency = await ctx.db.get(args.emergencyId);
    if (!emergency) return;

    // Get admin users
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();

    // Create notifications for each admin
    for (const admin of admins) {
      await ctx.db.insert("notificationLogs", {
        userId: admin._id,
        type: `emergency_${emergency.type}`,
        channel: "inapp",
        subject: `🚨 Emergency: ${emergency.type} from ${emergency.from}`,
        body: emergency.message || "Emergency alert received",
        status: "pending",
        metadata: {
          emergencyId: emergency._id,
          priority: emergency.priority,
        },
        createdAt: Date.now(),
      });
    }
  },
});

// Internal mutation for escalation
export const escalate = internalMutation({
  args: {
    emergencyId: v.id("emergencyLogs"),
  },
  handler: async (ctx, args) => {
    const emergency = await ctx.db.get(args.emergencyId);
    if (!emergency || emergency.status !== "escalated") return;

    // Logic for escalation notifications
    // This would trigger additional alerts to senior staff
    console.log(`Escalating emergency ${emergency._id}`);
  },
});