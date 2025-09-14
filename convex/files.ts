// convex/files.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Generate unique file ID with client code prefix
function generateFileId(clientCode: string): string {
  // Generate a random string using Math.random and base36
  const randomPart = Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
  
  // Add timestamp for additional uniqueness
  const timestamp = Date.now().toString(36);
  
  return `${clientCode}-${timestamp}-${randomPart}`;
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Generate upload URL from Convex storage
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    fileType: v.string(), // "logo", "brandAsset", "document"
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Try to resolve the acting user. If auth isn't ready, fall back to the
    // workspace creator (admin) so uploads aren't blocked for admins.
    let actingUser = null as null | { _id: Id<"users">; clientCode: string };

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (!user) throw new Error("User not found");
      actingUser = { _id: user._id, clientCode: user.clientCode };
    } else {
      // Fallback for early calls before auth is hydrated on the client.
      const workspace = await ctx.db.get(args.workspaceId);
      if (!workspace) throw new Error("Workspace not found");
      const adminUser = await ctx.db.get(workspace.createdBy);
      if (!adminUser) throw new Error("Admin user not found");
      actingUser = { _id: adminUser._id, clientCode: adminUser.clientCode };
    }

    const customFileId = generateFileId(actingUser.clientCode);

    const fileId = await ctx.db.insert("files", {
      workspaceId: args.workspaceId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      customId: customFileId, // Store our custom ID
      fileType: args.fileType,
      folderId: args.folderId,
      uploadedBy: actingUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { fileId, customId: customFileId };
  },
});

export const getWorkspaceFiles = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    // Get URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );

    return filesWithUrls;
  },
});

// Get file URLs by file IDs (for message attachments)
export const getFileUrls = query({
  args: { fileIds: v.array(v.id("files")) },
  handler: async (ctx, args) => {
    if (args.fileIds.length === 0) return [];

    const files = await Promise.all(
      args.fileIds.map(async (fileId) => {
        const file = await ctx.db.get(fileId);
        if (!file) return null;
        
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url,
        };
      })
    );

    return files.filter(f => f !== null);
  },
});


export const moveFileToFolder = mutation({
  args: {
    fileId: v.id("files"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      folderId: args.folderId,
      updatedAt: Date.now(),
    });
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) throw new Error("File not found");

    // Delete from storage
    try {
      await ctx.storage.delete(file.storageId);
    } catch (error) {
      console.error("Failed to delete from storage:", error);
    }

    // Delete from database
    await ctx.db.delete(args.fileId);
  },
});