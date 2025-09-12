// convex/folders.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createFolder = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const folderId = await ctx.db.insert("folders", {
      ...args,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

export const getFolders = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

export const updateFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { folderId, ...updates } = args;
    await ctx.db.patch(folderId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    // Move all files in this folder to root
    const files = await ctx.db
      .query("files")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    for (const file of files) {
      await ctx.db.patch(file._id, { folderId: undefined });
    }

    // Delete the folder
    await ctx.db.delete(args.folderId);
  },
});

// convex/folders.ts - Add this query
export const getFolderThumbnails = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    // Get first 4 image files in folder for thumbnail preview
    const files = await ctx.db
      .query("files")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("fileType"), "image"))
      .take(4);
    
    return files;
  },
});

export const moveFolder = mutation({
  args: {
    folderId: v.id("folders"),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    // Don't allow moving a folder into itself or its descendants
    if (args.parentId === args.folderId) {
      throw new Error("Cannot move folder into itself");
    }
    
    // Check for circular reference
    if (args.parentId) {
      let currentParent = await ctx.db.get(args.parentId);
      while (currentParent) {
        if (currentParent._id === args.folderId) {
          throw new Error("Cannot move folder into its own subfolder");
        }
        if (currentParent.parentId) {
          currentParent = await ctx.db.get(currentParent.parentId);
        } else {
          break;
        }
      }
    }
    
    await ctx.db.patch(args.folderId, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });
  },
});