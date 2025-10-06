// convex/notes.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createNote = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    
    const noteId = await ctx.db.insert("notes", {
      workspaceId: args.workspaceId,
      title: args.title,
      content: args.content || "",
      isArchived: false,
      isPinned: false,
      createdBy: user._id,
      lastEditedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: args.workspaceId,
      userId: user._id,
      action: "created_note",
      entityType: "note",
      entityId: noteId,
      createdAt: now,
    });

    return noteId;
  },
});

export const getNotes = query({
  args: {
    workspaceId: v.id("workspaces"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) => 
        q.eq("workspaceId", args.workspaceId)
         .eq("isArchived", args.includeArchived ? true : false)
      )
      .order("desc")
      .collect();

    return notes;
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
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

    const { noteId, ...updateData } = args;
    
    await ctx.db.patch(noteId, {
      ...updateData,
      lastEditedBy: user._id,
      updatedAt: Date.now(),
    });

    const note = await ctx.db.get(noteId);
    
    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: note!.workspaceId,
      userId: user._id,
      action: "updated_note",
      entityType: "note",
      entityId: noteId,
      createdAt: Date.now(),
    });
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    await ctx.db.delete(args.noteId);

    // Log activity
    await ctx.db.insert("activities", {
      workspaceId: note.workspaceId,
      userId: user._id,
      action: "deleted_note",
      entityType: "note",
      entityId: args.noteId,
      metadata: { title: note.title },
      createdAt: Date.now(),
    });
  },
});
