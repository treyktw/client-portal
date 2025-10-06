// convex/workspaces.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to generate unique slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8);
}

// Helper to generate invite token
function generateInviteToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Updated createWorkspace to create provisional user
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    invitedEmail: v.string(),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create workspaces");
    }

    const now = Date.now();
    const slug = generateSlug(args.name);
    const inviteToken = args.inviteToken || generateInviteToken();

    // Check if invited user already exists
    let invitedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.invitedEmail))
      .first();

    // If user doesn't exist, create a provisional user
    if (!invitedUser && args.invitedEmail) {
      const provisionalUserId = await ctx.db.insert("users", {
        clerkId: `provisional_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        email: args.invitedEmail,
        name: undefined,
        imageUrl: undefined,
        role: "client",
        clientCode: generateClientCode(),
        createdAt: now,
        updatedAt: now,
        isProvisional: true,
        provisionalExpiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      });

      invitedUser = await ctx.db.get(provisionalUserId);
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      slug,
      ownerId: invitedUser?._id || user._id,
      createdBy: user._id,
      theme: "notebook",
      darkMode: false,
      onboardingCompleted: false,
      onboardingStep: 1,
      inviteStatus: "pending",
      invitedEmail: args.invitedEmail,
      inviteToken,
      inviteSentAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { workspaceId, inviteToken, slug };
  },
});

// Updated acceptInvite to handle provisional users
export const acceptInvite = mutation({
  args: {
    inviteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken))
      .first();

    if (!workspace) throw new Error("Invalid invite token");

    // Safely derive user email from identity without using any/unknown
    type IdentityWithEmail = {
      subject: string;
      email?: string;
      emailAddresses?: Array<string | { emailAddress?: string }>;
      name?: string;
      pictureUrl?: string;
    };
    const id = identity as IdentityWithEmail;

    let userEmail: string | undefined = id.email;
    if (!userEmail && id.emailAddresses && id.emailAddresses.length > 0) {
      const first = id.emailAddresses[0];
      userEmail = typeof first === "string" ? first : first?.emailAddress;
    }
    if (!userEmail) throw new Error("User email not found");

    if (workspace.invitedEmail !== userEmail) {
      throw new Error("This invite is for a different email address");
    }

    // Check if user exists (might be provisional)
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      // Check for provisional user with this email
      const provisionalUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .first();

      if (provisionalUser && provisionalUser.isProvisional) {
        // Update provisional user to real user
        await ctx.db.patch(provisionalUser._id, {
          clerkId: identity.subject,
          name: identity.name || undefined,
          imageUrl: identity.pictureUrl || undefined,
          isProvisional: false,
          provisionalExpiresAt: undefined,
          updatedAt: Date.now(),
        });
        
        user = await ctx.db.get(provisionalUser._id);
      } else {
        // Create new user
        const userId = await ctx.db.insert("users", {
          clerkId: identity.subject,
          email: userEmail,
          name: identity.name || undefined,
          imageUrl: identity.pictureUrl || undefined,
          role: "client",
          clientCode: generateClientCode(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isProvisional: false,
        });
        
        user = await ctx.db.get(userId);
      }
    }

    if (!user) throw new Error("Failed to create or update user");

    // Update workspace
    await ctx.db.patch(workspace._id, {
      ownerId: user._id,
      inviteStatus: "accepted",
      updatedAt: Date.now(),
    });

    return workspace;
  },
});

// Cleanup expired provisional users
export const cleanupProvisionalUsers = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find expired provisional users
    const expiredUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.eq(q.field("isProvisional"), true),
          q.lt(q.field("provisionalExpiresAt"), now)
        )
      )
      .collect();

    for (const user of expiredUsers) {
      // Find and delete associated workspaces
      const workspaces = await ctx.db
        .query("workspaces")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect();

      for (const workspace of workspaces) {
        // Delete all workspace data
        const notes = await ctx.db
          .query("notes")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();
        
        for (const note of notes) {
          await ctx.db.delete(note._id);
        }

        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();
        
        for (const task of tasks) {
          await ctx.db.delete(task._id);
        }

        const canvases = await ctx.db
          .query("canvases")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();
        
        for (const canvas of canvases) {
          await ctx.db.delete(canvas._id);
        }

        const files = await ctx.db
          .query("files")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();
        
        for (const file of files) {
          await ctx.db.delete(file._id);
        }

        // Delete workspace
        await ctx.db.delete(workspace._id);
      }

      // Delete the provisional user
      await ctx.db.delete(user._id);
    }

    return { deletedCount: expiredUsers.length };
  },
});



export const getWorkspaceBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!workspace) return null;

    // Check access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Allow access if user is owner, admin, or invited
    if (
      workspace.ownerId === user._id ||
      user.role === "admin" ||
      workspace.invitedEmail === user.email
    ) {
      return workspace;
    }

    return null;
  },
});

export const getMyWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    if (user.role === "admin") {
      // Admins see all workspaces
      return await ctx.db.query("workspaces").collect();
    }

    // Clients see their own workspaces
    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const invitedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_invited_email", (q) => q.eq("invitedEmail", user.email))
      .collect();

    // Combine and deduplicate
    const workspaceMap = new Map();
    [...ownedWorkspaces, ...invitedWorkspaces].forEach(w => {
      workspaceMap.set(w._id, w);
    });

    return Array.from(workspaceMap.values());
  },
});

export const updateOnboardingStep = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    step: v.number(),
    fieldToUpdate: v.optional(v.string()), // which field we're updating
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const updateData: any = {
      onboardingStep: args.step,
      updatedAt: Date.now(),
    };

    // Update specific field if provided
    if (args.fieldToUpdate && args.data) {
      switch (args.fieldToUpdate) {
        case "businessInfo":
          updateData.businessInfo = args.data;
          break;
        case "goals":
          updateData.goals = args.data;
          break;
        case "theme":
          updateData.theme = args.data.theme;
          updateData.darkMode = args.data.darkMode || false;
          break;
        case "brandAssets":
          updateData.brandAssets = args.data;
          break;
        case "policies":
          updateData.policies = args.data;
          break;
        case "complete":
          updateData.onboardingCompleted = true;
          updateData.inviteStatus = "completed";
          break;
      }
    }

    await ctx.db.patch(args.workspaceId, updateData);
    return workspace;
  },
});

export const updateTheme = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    theme: v.union(
      v.literal("notebook"),
      v.literal("coffee"),
      v.literal("graphite"),
      v.literal("mono")
    ),
    darkMode: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.workspaceId, {
      theme: args.theme,
      darkMode: args.darkMode,
      updatedAt: Date.now(),
    });
  },
});

export const getWorkspaceById = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    
    if (!workspace) return null;
    
    // Check access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) return null;
    
    // Allow access if user is owner, admin, or invited
    if (
      workspace.ownerId === user._id ||
      user.role === "admin" ||
      workspace.invitedEmail === user.email
    ) {
      return workspace;
    }
    
    return null;
  },
});

export const getWorkspaceByInviteToken = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken))
      .first();
    
    return workspace;
  },
});

export const updateInvitedEmail = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update invitations");
    }

    await ctx.db.patch(args.workspaceId, {
      invitedEmail: args.email,
      updatedAt: Date.now(),
    });
  },
});

export const updateInviteToken = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    inviteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update invite tokens");
    }

    await ctx.db.patch(args.workspaceId, {
      inviteToken: args.inviteToken,
      updatedAt: Date.now(),
    });
  },
});

export const regenerateInviteToken = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can regenerate invite tokens");
    }

    const newToken = generateInviteToken();

    await ctx.db.patch(args.workspaceId, {
      inviteToken: newToken,
      updatedAt: Date.now(),
    });

    return newToken;
  },
});

function generateClientCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export const deleteWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Check if user owns this workspace, is invited client, or is admin
    const isOwner = workspace.ownerId === user._id;
    const isAdmin = user.role === "admin";
    const isInvitedClient = workspace.invitedEmail === user.email;

    if (!isOwner && !isAdmin && !isInvitedClient) {
      throw new Error("You don't have permission to delete this workspace");
    }

    // Delete all related data
    
    // Delete notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("isArchived", false)
      )
      .collect();
    
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Delete archived notes
    const archivedNotes = await ctx.db
      .query("notes")
      .withIndex("by_workspace", (q) => 
        q.eq("workspaceId", args.workspaceId).eq("isArchived", true)
      )
      .collect();
    
    for (const note of archivedNotes) {
      await ctx.db.delete(note._id);
    }

    // Delete tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete canvases
    const canvases = await ctx.db
      .query("canvases")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    for (const canvas of canvases) {
      await ctx.db.delete(canvas._id);
    }

    // Delete files (and their storage)
    const files = await ctx.db
      .query("files")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    for (const file of files) {
      // Delete from storage
      try {
        await ctx.storage.delete(file.storageId);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }
      // Delete file record
      await ctx.db.delete(file._id);
    }

    // Delete folders
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    for (const folder of folders) {
      await ctx.db.delete(folder._id);
    }

    // Delete activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Finally, delete the workspace itself
    await ctx.db.delete(args.workspaceId);

    return { success: true };
  },
});

// Get user workspaces
export const getUserWorkspaces = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    return workspaces;
  },
});

export const getAllWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can view all workspaces");
    }

    return await ctx.db.query("workspaces").collect();
  },
});

export const updateWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    updates: v.object({
      name: v.optional(v.string()),
      businessInfo: v.optional(v.any()),
      theme: v.optional(v.union(
        v.literal("notebook"),
        v.literal("coffee"),
        v.literal("graphite"),
        v.literal("mono")
      )),
      darkMode: v.optional(v.boolean()),
      policies: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Check if user has permission to update this workspace
    const isOwner = workspace.ownerId === user._id;
    const isAdmin = user.role === "admin";
    const isInvitedClient = workspace.invitedEmail === user.email;

    if (!isOwner && !isAdmin && !isInvitedClient) {
      throw new Error("You don't have permission to update this workspace");
    }

    await ctx.db.patch(args.workspaceId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});