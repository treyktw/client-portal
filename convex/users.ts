// convex/users.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Helper to generate unique 5-digit code
function generateClientCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("No identity found in getCurrentUser");
      return null;
    }

    console.log("Identity found:", {
      subject: identity.subject,
      issuer: identity.issuer,
      email: identity.email,
      name: identity.name
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    console.log("User found in database:", user ? "YES" : "NO", user ? { id: user._id, clerkId: user.clerkId, email: user.email } : null);

    return user;
  },
});

// Debug query to see all users
export const debugAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("No identity for debugAllUsers");
      return [];
    }

    const allUsers = await ctx.db.query("users").collect();
    console.log("All users in database:", allUsers.map(u => ({ id: u._id, clerkId: u.clerkId, email: u.email, role: u.role })));
    
    return allUsers.map(u => ({ 
      id: u._id, 
      clerkId: u.clerkId, 
      email: u.email, 
      role: u.role,
      name: u.name 
    }));
  },
});


export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...args,
        updatedAt: now,
      });
      return existingUser._id;
    }

    // Check if this is the first user (make them admin)
    const userCount = await ctx.db.query("users").collect();
    const role = userCount.length === 0 ? "admin" : "client";

    // Generate unique client code
    let clientCode = generateClientCode();
    let codeExists = await ctx.db
      .query("users")
      .withIndex("by_client_code", (q) => q.eq("clientCode", clientCode))
      .first();
    
    // Keep generating until we get a unique one
    while (codeExists) {
      clientCode = generateClientCode();
      codeExists = await ctx.db
        .query("users")
        .withIndex("by_client_code", (q) => q.eq("clientCode", clientCode))
        .first();
    }

    const userId = await ctx.db.insert("users", {
      ...args,
      role,
      clientCode,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

export const createAdminUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    adminSecret: v.string(),
  },
  handler: async (ctx, args) => {
    // Check admin secret from environment
    const adminUserSecret = process.env.ADMIN_USER_SECRET;
    if (!adminUserSecret || args.adminSecret !== adminUserSecret) {
      throw new Error("Invalid admin secret");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user to admin role
      await ctx.db.patch(existingUser._id, {
        role: "admin",
        updatedAt: Date.now(),
      });
      return { success: true, message: "User updated to admin role", userId: existingUser._id };
    }

    // Check if email already exists
    const existingEmailUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingEmailUser) {
      throw new Error("User with this email already exists");
    }

    const now = Date.now();

    // Generate unique client code
    let clientCode = generateClientCode();
    let codeExists = await ctx.db
      .query("users")
      .withIndex("by_client_code", (q) => q.eq("clientCode", clientCode))
      .first();
    
    // Keep generating until we get a unique one
    while (codeExists) {
      clientCode = generateClientCode();
      codeExists = await ctx.db
        .query("users")
        .withIndex("by_client_code", (q) => q.eq("clientCode", clientCode))
        .first();
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      role: "admin",
      clientCode,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, message: "Admin user created successfully", userId };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?.role === "admin";
  },
});

export const syncClerkMetadata = action({
  handler: async (ctx) => {
    // Get all users from the database
    const users = await ctx.runQuery(api.users.getAllUsers);
    
    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get Clerk secret key from environment
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      return {
        ...results,
        errors: ["CLERK_SECRET_KEY not configured in environment variables"]
      };
    }

    for (const user of users) {
      // Skip provisional users
      if (user.isProvisional) {
        continue;
      }

      try {
        // Use correct Clerk API endpoint format
        const response = await fetch(`https://api.clerk.com/v1/users/${user.clerkId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              role: user.role,
              clientCode: user.clientCode,
              workspaceCount: user.workspaceCount || 0,
            },
            unsafe_metadata: {
              convexUserId: user._id,
              lastSyncedAt: new Date().toISOString(),
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to update Clerk user ${user.clerkId}:`, errorText);
          console.error(`Response status: ${response.status}`);
          results.failed++;
          results.errors.push(`User ${user.email}: ${response.status} - ${errorText}`);
        } else {
          results.synced++;
          console.log(`Successfully synced user ${user.email}`);
          
          // Update the user record to track sync
          await ctx.runMutation(api.users.updateSyncStatus, {
            userId: user._id,
            lastClerkSync: Date.now(),
          });
        }
      } catch (error) {
        console.error(`Error syncing user ${user.email}:`, error);
        results.failed++;
        results.errors.push(`User ${user.email}: ${String(error)}`);
      }
    }

    console.log(`Clerk metadata sync completed: ${results.synced} synced, ${results.failed} failed`);
    if (results.errors.length > 0) {
      console.log("Errors:", results.errors);
    }
    
    return results;
  },
});

export const updateSyncStatus = mutation({
  args: {
    userId: v.id("users"),
    lastClerkSync: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastClerkSync: args.lastClerkSync,
      updatedAt: Date.now(),
    });
  },
});

type SyncSingleUserResult = { success: boolean; error?: string };

async function syncSingleUserMetadataHandler(
  ctx: ActionCtx,
  args: { userId: Id<'users'> }
): Promise<SyncSingleUserResult> {
  const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
  
  if (!user || user.isProvisional) {
    return { success: false, error: "User not found or is provisional" };
  }

  // Get workspace count
  const workspaces = await ctx.runQuery(api.workspaces.getUserWorkspaces, { userId: user._id });

  try {
    const response = await fetch(`${process.env.CLERK_API_URL}/users/${user.clerkId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: user.role,
          clientCode: user.clientCode,
          workspaceCount: workspaces.length,
        },
        unsafe_metadata: {
          convexUserId: user._id,
          lastSyncedAt: new Date().toISOString(),
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    // Update sync status
    await ctx.runMutation(api.users.updateSyncStatus, {
      userId: user._id,
      lastClerkSync: Date.now(),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export const syncSingleUserMetadata = action({
  args: {
    userId: v.id('users'),
  },
  handler: syncSingleUserMetadataHandler,
});

export const getAllUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // Get workspace count for each user
    const usersWithWorkspaceCount = await Promise.all(
      users.map(async (user) => {
        const workspaces = await ctx.db
          .query("workspaces")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .collect();
        
        return {
          ...user,
          workspaceCount: workspaces.length,
        };
      })
    );
    
    return usersWithWorkspaceCount;
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!requestingUser) throw new Error("Requesting user not found");

    // Only admins can delete users, or users can delete themselves
    if (requestingUser.role !== "admin" && requestingUser._id !== args.userId) {
      throw new Error("Insufficient permissions to delete user");
    }

    const userToDelete = await ctx.db.get(args.userId);
    if (!userToDelete) throw new Error("User to delete not found");

    console.log(`Starting deletion of user ${userToDelete.email}`);

    // Find all workspaces owned by this user
    const ownedWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    // Delete each workspace and its data
    for (const workspace of ownedWorkspaces) {
      console.log(`Deleting workspace ${workspace.name} owned by user`);
      
      // Delete all workspace data
      const [notes, archivedNotes, tasks, canvases, files, folders, activities] = await Promise.all([
        ctx.db.query("notes")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id).eq("isArchived", false))
          .collect(),
        ctx.db.query("notes")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id).eq("isArchived", true))
          .collect(),
        ctx.db.query("tasks")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect(),
        ctx.db.query("canvases")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect(),
        ctx.db.query("files")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect(),
        ctx.db.query("folders")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect(),
        ctx.db.query("activities")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect(),
      ]);

      // Delete files from storage
      for (const file of files) {
        try {
          await ctx.storage.delete(file.storageId);
        } catch (error) {
          console.error(`Failed to delete storage for file ${file._id}:`, error);
        }
      }

      // Delete all records
      await Promise.all([
        ...notes.map(n => ctx.db.delete(n._id)),
        ...archivedNotes.map(n => ctx.db.delete(n._id)),
        ...tasks.map(t => ctx.db.delete(t._id)),
        ...canvases.map(c => ctx.db.delete(c._id)),
        ...files.map(f => ctx.db.delete(f._id)),
        ...folders.map(f => ctx.db.delete(f._id)),
        ...activities.map(a => ctx.db.delete(a._id)),
      ]);

      // Delete the workspace
      await ctx.db.delete(workspace._id);
    }

    // Update workspaces where user was creator but not owner
    const createdWorkspaces = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("createdBy"), args.userId))
      .collect();
    
    for (const workspace of createdWorkspaces) {
      if (workspace.ownerId !== args.userId) {
        // Just update the createdBy to null or system user
        await ctx.db.patch(workspace._id, {
          createdBy: undefined as any, // or you could set to a system user ID
          updatedAt: Date.now(),
        });
      }
    }

    // Delete all activities by this user
    const userActivities = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    await Promise.all(userActivities.map(a => ctx.db.delete(a._id)));

    // Finally, delete the user
    await ctx.db.delete(args.userId);

    console.log(`Successfully deleted user ${userToDelete.email} and all associated data`);
    
    return { 
      success: true, 
      deletedWorkspaces: ownedWorkspaces.length,
      email: userToDelete.email 
    };
  },
});

// Optional: Add a soft delete option
export const softDeleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requestingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!requestingUser || requestingUser.role !== "admin") {
      throw new Error("Only admins can soft delete users");
    }

    await ctx.db.patch(args.userId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});