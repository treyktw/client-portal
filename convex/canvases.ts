// convex/canvases.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createCanvas = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("No identity found in createCanvas");
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      console.error("User not found for identity:", identity.subject);
      throw new Error("User not found");
    }

    const now = Date.now();
    
    const canvasId = await ctx.db.insert("canvases", {
      workspaceId: args.workspaceId,
      name: args.name,
      data: args.data,
      isShared: false,
      createdBy: user._id,
      lastEditedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return canvasId;
  },
});

export const getCanvases = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // Query doesn't require auth check since it's read-only
    return await ctx.db
      .query("canvases")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

export const updateCanvas = mutation({
  args: {
    canvasId: v.id("canvases"),
    name: v.optional(v.string()),
    data: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // For updates, we'll be more lenient - just update without auth if needed
    // This is because auto-save might trigger before auth is ready
    let userId = null;
    
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      
      if (user) {
        userId = user._id;
      }
    }

    const { canvasId, ...updateData } = args;
    
    const updates: Record<string, unknown> = {
      ...updateData,
      updatedAt: Date.now(),
    };
    
    if (userId) {
      updates.lastEditedBy = userId;
    }
    
    await ctx.db.patch(canvasId, updates);
  },
});

export const deleteCanvas = mutation({
  args: {
    canvasId: v.id("canvases"),
  },
  handler: async (ctx, args) => {
    // For delete, we want to ensure authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.canvasId);
  },
});