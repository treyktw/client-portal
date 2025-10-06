// convex/milestones.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const createMilestone = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    phase: v.string(),
    title: v.string(),
    description: v.string(), // BlockNote JSON
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    dueDate: v.optional(v.number()),
    paymentAmount: v.optional(v.number()),
    paymentPercentage: v.optional(v.number()),
    dependencies: v.optional(v.array(v.id("milestones"))),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create milestones");
    }

    const now = Date.now();

    const milestoneId = await ctx.db.insert("milestones", {
      ...args,
      status: "pending",
      completedAt: undefined,
      completedBy: undefined,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for workspace owner
    const workspace = await ctx.db.get(args.workspaceId);
    if (workspace) {
      await ctx.db.insert("notificationLogs", {
        workspaceId: args.workspaceId,
        userId: workspace.ownerId,
        type: "milestone_created",
        channel: "inapp",
        body: `New milestone: ${args.title}`,
        status: "sent",
        createdAt: now,
        sentAt: now,
      });
    }

    return milestoneId;
  },
});

export const updateMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
    phase: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    position: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("blocked")
    )),
    dueDate: v.optional(v.number()),
    paymentAmount: v.optional(v.number()),
    paymentPercentage: v.optional(v.number()),
    dependencies: v.optional(v.array(v.id("milestones"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update milestones");
    }

    const { milestoneId, ...updates } = args;
    
    await ctx.db.patch(milestoneId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const completeMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    const now = Date.now();

    await ctx.db.patch(args.milestoneId, {
      status: "completed",
      completedAt: now,
      completedBy: user._id,
      completionNotes: args.notes,
      updatedAt: now,
    });

    // Check if this unlocks other milestones
    const dependentMilestones = await ctx.db
      .query("milestones")
      .filter((q) => q.eq(q.field("workspaceId"), milestone.workspaceId))
      .collect();

    for (const dependent of dependentMilestones) {
      if (dependent.dependencies?.includes(args.milestoneId)) {
        const allDepsComplete = await checkAllDependenciesComplete(ctx, dependent.dependencies);
        if (allDepsComplete && dependent.status === "blocked") {
          await ctx.db.patch(dependent._id, {
            status: "pending",
            updatedAt: now,
          });
        }
      }
    }

    // Send notification
    const workspace = await ctx.db.get(milestone.workspaceId);
    if (workspace) {
      await ctx.db.insert("notificationLogs", {
        workspaceId: milestone.workspaceId,
        userId: workspace.ownerId,
        type: "milestone_completed",
        channel: "inapp",
        body: `Milestone completed: ${milestone.title}`,
        status: "sent",
        createdAt: now,
        sentAt: now,
      });
    }

    return { success: true };
  },
});

export const getMilestones = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("asc")
      .collect();

    // Calculate progress
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === "completed").length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return {
      milestones,
      progress,
      total,
      completed,
    };
  },
});

export const createMilestoneTemplate = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    phases: v.array(v.object({
      name: v.string(),
      milestones: v.array(v.object({
        title: v.string(),
        description: v.string(),
        defaultDuration: v.optional(v.number()), // days
        paymentPercentage: v.optional(v.number()),
      })),
    })),
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

    const templateId = await ctx.db.insert("milestoneTemplates", {
      ...args,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

export const applyMilestoneTemplate = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    templateId: v.id("milestoneTemplates"),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can apply templates");
    }

    const now = Date.now();
    const startDate = args.startDate || now;
    let currentDate = startDate;
    let order = 0;
    const createdMilestones: Id<"milestones">[] = [];

    // Create milestones from template
    for (const phase of template.phases) {
      for (const milestone of phase.milestones) {
        const dueDate = milestone.defaultDuration 
          ? currentDate + (milestone.defaultDuration * 24 * 60 * 60 * 1000)
          : undefined;

        const milestoneId = await ctx.db.insert("milestones", {
          workspaceId: args.workspaceId,
          phase: phase.name,
          title: milestone.title,
          description: milestone.description,
          position: {
            x: (order % 3) * 300 + 100,
            y: Math.floor(order / 3) * 200 + 100,
          },
          dueDate,
          paymentPercentage: milestone.paymentPercentage,
          status: order === 0 ? "pending" : "blocked",
          dependencies: order > 0 ? [createdMilestones[order - 1]] : undefined,
          order,
          createdBy: user._id,
          createdAt: now,
          updatedAt: now,
        });

        createdMilestones.push(milestoneId);
        if (dueDate) currentDate = dueDate;
        order++;
      }
    }

    return { milestonesCreated: createdMilestones.length };
  },
});

export const deleteMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete milestones");
    }

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    // Remove this milestone from dependencies of other milestones
    const allMilestones = await ctx.db
      .query("milestones")
      .filter((q) => q.eq(q.field("workspaceId"), milestone.workspaceId))
      .collect();

    for (const otherMilestone of allMilestones) {
      if (otherMilestone.dependencies?.includes(args.milestoneId)) {
        const newDeps = otherMilestone.dependencies.filter(
          (dep) => dep !== args.milestoneId
        );
        await ctx.db.patch(otherMilestone._id, {
          dependencies: newDeps.length > 0 ? newDeps : undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the milestone
    await ctx.db.delete(args.milestoneId);

    return { success: true };
  },
});

// Helper function
async function checkAllDependenciesComplete(ctx: any, dependencies: Id<"milestones">[]) {
  for (const depId of dependencies) {
    const dep = await ctx.db.get(depId);
    if (!dep || dep.status !== "completed") {
      return false;
    }
  }
  return true;
}