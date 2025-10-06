// convex/threads.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Create a new thread
export const createThread = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Get workspace to determine members
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Get all users associated with this workspace (owner + creator/admin)
    const memberIds: Id<"users">[] = [workspace.ownerId];
    if (workspace.createdBy !== workspace.ownerId) {
      memberIds.push(workspace.createdBy);
    }

    const now = Date.now();

    const threadId = await ctx.db.insert("threads", {
      workspaceId: args.workspaceId,
      title: args.title,
      createdBy: user._id,
      isDefault: args.isDefault || false,
      memberIds,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

// Create default thread when workspace is created
export const createDefaultThread = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get workspace to determine members
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const memberIds: Id<"users">[] = [workspace.ownerId];
    if (workspace.createdBy !== workspace.ownerId) {
      memberIds.push(workspace.createdBy);
    }

    const now = Date.now();

    const threadId = await ctx.db.insert("threads", {
      workspaceId: args.workspaceId,
      title: "Project Chat",
      createdBy: args.createdBy,
      isDefault: true,
      memberIds,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

// Get all threads for a workspace
export const getThreads = query({
  args: {
    workspaceId: v.id("workspaces"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Check if user has access to this workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) return [];

    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.createdBy === user._id ||
      workspace.invitedEmail === user.email;

    if (!hasAccess) return [];

    // Get threads
    let threads = await ctx.db
      .query("threads")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Filter out archived if needed
    if (!args.includeArchived) {
      threads = threads.filter(t => !t.isArchived);
    }

    // Sort by lastMessageAt (most recent first), with default thread always first
    threads.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt);
    });

    return threads;
  },
});

// Get a single thread by ID
export const getThreadById = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    // Check if user has access
    const workspace = await ctx.db.get(thread.workspaceId);
    if (!workspace) return null;

    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.createdBy === user._id ||
      workspace.invitedEmail === user.email ||
      thread.memberIds.includes(user._id);

    if (!hasAccess) return null;

    return thread;
  },
});

// Update thread title
export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    // Only admin or thread creator can update
    if (user.role !== "admin" && thread.createdBy !== user._id) {
      throw new Error("Not authorized to update this thread");
    }

    const updates: Partial<Doc<"threads">> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.isArchived !== undefined) updates.isArchived = args.isArchived;

    await ctx.db.patch(args.threadId, updates);

    return { success: true };
  },
});

// Delete a thread (soft delete by archiving)
export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    // Don't allow deleting default thread
    if (thread.isDefault) {
      throw new Error("Cannot delete the default project chat");
    }

    // Only admin or thread creator can delete
    if (user.role !== "admin" && thread.createdBy !== user._id) {
      throw new Error("Not authorized to delete this thread");
    }

    // Soft delete by archiving
    await ctx.db.patch(args.threadId, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get all threads for admin (global view)
export const getAllThreadsForAdmin = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { threads: [], hasMore: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      return { threads: [], hasMore: false };
    }

    const limit = args.limit || 50;

    // Get all threads with workspace info
    let threadsQuery = ctx.db.query("threads");

    // If cursor provided, start after that thread
    if (args.cursor) {
      const cursorThread = await ctx.db.get(args.cursor as Id<"threads">);
      if (cursorThread) {
        threadsQuery = threadsQuery.filter((q) => 
          q.lt(q.field("lastMessageAt"), cursorThread.lastMessageAt || cursorThread.createdAt)
        );
      }
    }

    const threads = await threadsQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = threads.length > limit;
    const resultThreads = threads.slice(0, limit);

    // Enrich with workspace data
    const enrichedThreads = await Promise.all(
      resultThreads.map(async (thread) => {
        const workspace = await ctx.db.get(thread.workspaceId);
        const lastAuthor = thread.lastMessageAuthor 
          ? await ctx.db.get(thread.lastMessageAuthor)
          : null;
        
        // Get unread count for this thread
        const lastRead = await ctx.db
          .query("messageReads")
          .withIndex("by_user_thread", (q) => 
            q.eq("userId", user._id).eq("threadId", thread._id)
          )
          .order("desc")
          .first();

        let unreadCount = 0;
        if (thread.lastMessageAt) {
          const unreadMessages = await ctx.db
            .query("messages")
            .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
            .filter((q) => {
              if (lastRead) {
                return q.gt(q.field("createdAt"), lastRead.readAt);
              }
              return true;
            })
            .collect();
          unreadCount = unreadMessages.length;
        }

        return {
          ...thread,
          workspace,
          lastAuthor,
          unreadCount,
        };
      })
    );

    return {
      threads: enrichedThreads,
      hasMore,
      nextCursor: hasMore ? resultThreads[resultThreads.length - 1]._id : null,
    };
  },
});

// Add or remove thread members
export const updateThreadMembers = mutation({
  args: {
    threadId: v.id("threads"),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update thread members");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    await ctx.db.patch(args.threadId, {
      memberIds: args.memberIds,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});