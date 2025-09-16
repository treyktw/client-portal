// convex/notificationSystem.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Send notification helper
export const sendNotification = mutation({
  args: {
    contactId: v.optional(v.id("contacts")),
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.optional(v.id("users")),
    type: v.string(),
    channel: v.union(v.literal("inapp"), v.literal("email"), v.literal("sms")),
    subject: v.optional(v.string()),
    body: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const notificationId = await ctx.db.insert("notificationLogs", {
      contactId: args.contactId,
      workspaceId: args.workspaceId,
      userId: args.userId,
      type: args.type,
      channel: args.channel,
      subject: args.subject,
      body: args.body,
      status: "pending",
      metadata: args.metadata,
      createdAt: now,
    });

    return notificationId;
  },
});

// Process SMS notification (called from internal action)
export const processSmsNotification = mutation({
  args: {
    notificationId: v.id("notificationLogs"),
    twilioMessageSid: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.notificationId, {
      status: args.status,
      metadata: { twilioMessageSid: args.twilioMessageSid },
      error: args.error,
      sentAt: args.status === "sent" ? now : undefined,
    });
  },
});

// Process Email notification (called from internal action)
export const processEmailNotification = mutation({
  args: {
    notificationId: v.id("notificationLogs"),
    resendId: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.notificationId, {
      status: args.status,
      metadata: { resendId: args.resendId },
      error: args.error,
      sentAt: args.status === "sent" ? now : undefined,
    });
  },
});

// Get user notification preferences
export const getUserNotificationConfig = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("notificationConfigs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return configs;
  },
});

// Update notification preferences
export const updateNotificationConfig = mutation({
  args: {
    channel: v.union(v.literal("inapp"), v.literal("email"), v.literal("sms")),
    enabled: v.boolean(),
    categories: v.optional(v.array(v.string())),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      startHour: v.number(),
      endHour: v.number(),
      timezone: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if config exists
    const existing = await ctx.db
      .query("notificationConfigs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("channel"), args.channel))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        categories: args.categories || existing.categories,
        quietHours: args.quietHours || existing.quietHours,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("notificationConfigs", {
        userId: user._id,
        channel: args.channel,
        enabled: args.enabled,
        categories: args.categories || [],
        quietHours: args.quietHours,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get notification logs
export const getNotificationLogs = query({
  args: {
    contactId: v.optional(v.id("contacts")),
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("read"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    let notifications: Doc<"notificationLogs">[];
    if (args.contactId) {
      notifications = await ctx.db
        .query("notificationLogs")
        .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.workspaceId) {
      notifications = await ctx.db
        .query("notificationLogs")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.userId) {
      notifications = await ctx.db
        .query("notificationLogs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(args.limit || 100);
    } else {
      notifications = await ctx.db
        .query("notificationLogs")
        .order("desc")
        .take(args.limit || 100);
    }

    if (args.status) {
      notifications = notifications.filter(n => n.status === args.status);
    }

    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notificationLogs"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.notificationId, {
      status: "read",
      readAt: now,
    });
    return { success: true };
  },
});

// Create message templates
export const createMessageTemplate = mutation({
  args: {
    channel: v.union(v.literal("sms"), v.literal("email")),
    name: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    variables: v.array(v.string()),
    category: v.union(
      v.literal("outreach"),
      v.literal("followup"),
      v.literal("payment"),
      v.literal("milestone"),
      v.literal("task"),
      v.literal("system")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create templates");
    }

    const now = Date.now();

    const templateId = await ctx.db.insert("messageTemplates", {
      channel: args.channel,
      name: args.name,
      subject: args.subject,
      body: args.body,
      variables: args.variables,
      category: args.category,
      isActive: true,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

// Get message templates
export const getMessageTemplates = query({
  args: {
    channel: v.optional(v.union(v.literal("sms"), v.literal("email"))),
    category: v.optional(v.union(
      v.literal("outreach"),
      v.literal("followup"),
      v.literal("payment"),
      v.literal("milestone"),
      v.literal("task"),
      v.literal("system")
    )),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let templates: Doc<"messageTemplates">[];
    if (args.channel) {
      const channel = args.channel; // narrowed to non-undefined
      templates = await ctx.db
        .query("messageTemplates")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .collect();
    } else {
      templates = await ctx.db.query("messageTemplates").collect();
    }

    if (args.category) {
      templates = templates.filter(t => t.category === args.category);
    }

    if (args.isActive !== undefined) {
      templates = templates.filter(t => t.isActive === args.isActive);
    }

    return templates;
  },
});

// Helper to replace template variables
export const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
};

// Check if in quiet hours
export const isInQuietHours = (config: { quietHours?: { enabled: boolean; timezone?: string; startHour: number; endHour: number } }): boolean => {
  if (!config?.quietHours?.enabled) return false;

  const now = new Date();
  
  // Convert to timezone (simplified - in production use proper timezone library)
  const hour = now.getHours();
  
  const { startHour, endHour } = config.quietHours;
  
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  } else {
    // Spans midnight
    return hour >= startHour || hour < endHour;
  }
};

// Cron job: Check for no follow-up
export const checkNoFollowUp = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get all active contacts
    const contacts = await ctx.db
      .query("contacts")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "won"),
          q.neq(q.field("status"), "lost")
        )
      )
      .collect();

    for (const contact of contacts) {
      // Get last interaction
      const lastInteraction = await ctx.db
        .query("interactions")
        .withIndex("by_contact", (q) => q.eq("contactId", contact._id))
        .order("desc")
        .first();

      if (!lastInteraction || lastInteraction.createdAt < sevenDaysAgo) {
        // Create notification for admin
        if (contact.assignedTo) {
          await ctx.db.insert("notificationLogs", {
            contactId: contact._id,
            userId: contact.assignedTo,
            type: "no_followup",
            channel: "inapp",
            body: `No follow-up recorded for ${contact.businessName} in 7 days.`,
            status: "sent",
            createdAt: now,
            sentAt: now,
          });
        }
      }
    }
  },
});

// Cron job: Check milestone risks
export const checkMilestoneRisks = internalMutation({
  handler: async (_ctx) => {
    // This would need a milestones table - placeholder for now
    // You'd query milestones due soon with low completion
    
    return { checked: true };
  },
});