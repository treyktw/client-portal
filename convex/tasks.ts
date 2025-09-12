// convex/tasks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTask = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Get the highest position in the column
    const tasksInColumn = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", args.status)
      )
      .collect();

    const maxPosition = Math.max(0, ...tasksInColumn.map(t => t.position));
    const now = Date.now();

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      position: maxPosition + 1,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: args.workspaceId,
      userId: user._id,
      action: "created_task",
      entityType: "task",
      entityId: taskId,
      createdAt: now,
    });

    return taskId;
  },
});

export const getTasks = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Group by status and sort by position
    const grouped = {
      todo: tasks.filter(t => t.status === "todo").sort((a, b) => a.position - b.position),
      in_progress: tasks.filter(t => t.status === "in_progress").sort((a, b) => a.position - b.position),
      review: tasks.filter(t => t.status === "review").sort((a, b) => a.position - b.position),
      done: tasks.filter(t => t.status === "done").sort((a, b) => a.position - b.position),
    };

    return grouped;
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    )),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    position: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const { taskId, ...updateData } = args;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();

    // If status changed to done, set completedAt
    if (updateData.status === "done" && task.status !== "done") {
      (updateData as any).completedAt = now;
    } else if (updateData.status !== "done" && task.status === "done") {
      (updateData as any).completedAt = undefined;
    }

    await ctx.db.patch(taskId, {
      ...updateData,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: task.workspaceId,
      userId: user._id,
      action: "updated_task",
      entityType: "task",
      entityId: taskId,
      metadata: { changes: Object.keys(updateData) },
      createdAt: now,
    });
  },
});

export const reorderTasks = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    newStatus: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    newPosition: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const oldStatus = task.status;
    const oldPosition = task.position;

    // Get all tasks in the destination column
    const destinationTasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", args.newStatus)
      )
      .collect();

    // If moving within the same column
    if (oldStatus === args.newStatus) {
      // Reorder within the same column
      for (const t of destinationTasks) {
        if (t._id === args.taskId) continue;
        
        if (oldPosition < args.newPosition) {
          // Moving down
          if (t.position > oldPosition && t.position <= args.newPosition) {
            await ctx.db.patch(t._id, { position: t.position - 1 });
          }
        } else {
          // Moving up
          if (t.position >= args.newPosition && t.position < oldPosition) {
            await ctx.db.patch(t._id, { position: t.position + 1 });
          }
        }
      }
    } else {
      // Moving to a different column
      
      // Update positions in source column
      const sourceTasks = await ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", args.workspaceId).eq("status", oldStatus)
        )
        .collect();
      
      for (const t of sourceTasks) {
        if (t.position > oldPosition) {
          await ctx.db.patch(t._id, { position: t.position - 1 });
        }
      }
      
      // Update positions in destination column
      for (const t of destinationTasks) {
        if (t.position >= args.newPosition) {
          await ctx.db.patch(t._id, { position: t.position + 1 });
        }
      }
    }

    // Update the moved task
    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: args.newStatus,
      position: args.newPosition,
      updatedAt: now,
      completedAt: args.newStatus === "done" ? now : undefined,
    });

    // Log activity
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (user) {
      await ctx.db.insert("activities", {
        workspaceId: args.workspaceId,
        userId: user._id,
        action: "moved_task",
        entityType: "task",
        entityId: args.taskId,
        metadata: { 
          from: oldStatus, 
          to: args.newStatus,
          fromPosition: oldPosition,
          toPosition: args.newPosition
        },
        createdAt: now,
      });
    }
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    // Update positions of tasks after this one
    const tasksInColumn = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", task.workspaceId).eq("status", task.status)
      )
      .collect();

    for (const t of tasksInColumn) {
      if (t.position > task.position) {
        await ctx.db.patch(t._id, { position: t.position - 1 });
      }
    }

    await ctx.db.delete(args.taskId);

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: task.workspaceId,
      userId: user._id,
      action: "deleted_task",
      entityType: "task",
      entityId: args.taskId,
      metadata: { title: task.title },
      createdAt: Date.now(),
    });
  },
});