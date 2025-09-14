// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - linked to Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("client")),
    createdAt: v.number(),
    clientCode: v.string(),
    updatedAt: v.number(),
    isProvisional: v.optional(v.boolean()), // True for invited but not accepted users
    provisionalExpiresAt: v.optional(v.number()), // Timestamp when provisional user expires
    lastClerkSync: v.optional(v.number()), 
    deletedAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_client_code", ["clientCode"])
    .index("by_provisional", ["isProvisional", "provisionalExpiresAt"]),

  // Workspaces - each client gets one
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    ownerId: v.id("users"), // The client user
    createdBy: v.id("users"), // Admin who created it

    // Onboarding data
    businessInfo: v.optional(
      v.object({
        businessName: v.string(),
        contactPerson: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        website: v.optional(v.string()),
        socialLinks: v.optional(
          v.array(
            v.object({
              platform: v.string(),
              url: v.string(),
            })
          )
        ),
      })
    ),

    goals: v.optional(
      v.object({
        services: v.array(v.string()),
        mainGoals: v.array(v.string()), // More leads, better design, online bookings, etc.
        specialNotes: v.optional(v.string()),
      })
    ),

    // Theme settings
    theme: v.union(
      v.literal("notebook"),
      v.literal("coffee"),
      v.literal("graphite"),
      v.literal("mono")
    ),
    darkMode: v.boolean(),

    // Brand assets
    brandAssets: v.optional(
      v.object({
        logoId: v.optional(v.string()), // Store customId instead of storageId
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        additionalFiles: v.optional(v.array(v.string())), // Store customIds instead of storageIds
        uploadLater: v.optional(v.boolean()),
      })
    ),

    // Policies
    policies: v.optional(
      v.object({
        enableAnalytics: v.boolean(),
        enableNotifications: v.boolean(),
        dataConsent: v.boolean(),
      })
    ),

    // Status
    onboardingCompleted: v.boolean(),
    onboardingStep: v.number(), // Current step in onboarding (1-7)
    projectBriefId: v.optional(v.id("_storage")), // Generated project brief document

    // Metadata
    inviteStatus: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("completed")
    ),
    invitedEmail: v.string(),
    inviteToken: v.optional(v.string()),
    inviteSentAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_invite_token", ["inviteToken"])
    .index("by_invited_email", ["invitedEmail"]),

  // Notes - collaborative markdown documents
  notes: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    content: v.string(), // JSON string from BlockNote
    emoji: v.optional(v.string()),
    coverImage: v.optional(v.id("_storage")),
    isArchived: v.boolean(),
    isPinned: v.boolean(),

    createdBy: v.id("users"),
    lastEditedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "isArchived"])
    .index("by_workspace_pinned", ["workspaceId", "isPinned"]),

  // Tasks - Kanban board items
  tasks: defineTable({
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
    position: v.number(), // For ordering within columns

    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    labels: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.id("_storage"))),

    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace", ["workspaceId"])
    .index("by_assigned", ["assignedTo"]),

  // Canvas - Excalidraw data
  canvases: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    data: v.string(), // JSON string of Excalidraw data
    thumbnail: v.optional(v.id("_storage")),

    isShared: v.boolean(),
    shareToken: v.optional(v.string()),

    createdBy: v.id("users"),
    lastEditedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_share_token", ["shareToken"]),

  // Files - uploaded documents
  files: defineTable({
    workspaceId: v.id("workspaces"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    customId: v.string(),
    fileType: v.string(), // "logo", "brandAsset", "document"

    folderId: v.optional(v.id("folders")),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),

    uploadedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_folder", ["folderId"])
    .index("by_custom_id", ["customId"]),

  // Folders for file organization
  folders: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    color: v.optional(v.string()),

    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_parent", ["parentId"]),

  // Activity log for audit trail
  activities: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    action: v.string(), // "created_task", "uploaded_file", etc.
    entityType: v.string(), // "task", "note", "file", etc.
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional context

    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "createdAt"])
    .index("by_user", ["userId"]),

    //Notifications
    notifications: defineTable({
      workspaceId: v.id("workspaces"),
      type: v.string(),
      subject: v.string(),
      recipient: v.string(),
      status: v.string(),
      sentAt: v.number(),
    }),

    payments: defineTable({
      workspaceId: v.id("workspaces"),
      serviceName: v.string(),
      serviceDescription: v.string(),
      amount: v.number(), // in cents
      currency: v.string(), // USD, EUR, etc
      stripeLink: v.string(), // The Stripe payment link URL
      invoiceNumber: v.string(), // Simple invoice number
      status: v.string(), // pending, paid
      createdAt: v.number(),
      deliveryTime: v.optional(v.string()),
    })
      .index("by_workspace", ["workspaceId"])
      .index("by_status", ["status"]),
    
    coupons: defineTable({
      code: v.string(),
      description: v.string(),
      stripeCouponId: v.optional(v.string()), // If you want to track Stripe coupon ID
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_code", ["code"]),
    
    services: defineTable({
      name: v.string(),
      description: v.string(),
      stripePriceId: v.optional(v.string()), // Stripe price ID if needed
      createdAt: v.number(),
    }),

    threads: defineTable({
      workspaceId: v.id("workspaces"),
      title: v.string(),
      createdBy: v.id("users"),
      isDefault: v.boolean(), // true for "Project Chat"
      lastMessageAt: v.optional(v.number()),
      lastMessagePreview: v.optional(v.string()),
      lastMessageAuthor: v.optional(v.id("users")),
      pinnedMessageIds: v.optional(v.array(v.string())), // Store as strings to avoid circular dependency
      memberIds: v.array(v.id("users")), // Thread participants
      isArchived: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_workspace", ["workspaceId"])
      .index("by_workspace_updated", ["workspaceId", "lastMessageAt"])
      .index("by_workspace_archived", ["workspaceId", "isArchived"]),
  
    // Messages table
    messages: defineTable({
      threadId: v.id("threads"),
      workspaceId: v.id("workspaces"),
      authorId: v.id("users"),
      body: v.string(), 
  originalBody: v.optional(v.string()),
      files: v.optional(v.array(v.id("files"))),
      links: v.optional(v.array(v.object({
        url: v.string(),
        title: v.optional(v.string()),
        favicon: v.optional(v.string()),
      }))),
      mentions: v.optional(v.array(v.id("users"))),
      reactions: v.optional(v.array(v.object({
        emoji: v.string(),
        userId: v.id("users"),
        createdAt: v.number(),
      }))),
      replyToId: v.optional(v.id("messages")), // For threading
      editedAt: v.optional(v.number()),
      editedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      deletedBy: v.optional(v.id("users")),
      isPinned: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_thread", ["threadId", "createdAt"])
      .index("by_workspace", ["workspaceId", "createdAt"])
      .index("by_author", ["authorId"])
      .index("by_thread_pinned", ["threadId", "isPinned"])
      .index("by_deleted", ["deletedAt"]),
  
    // Message read tracking
    messageReads: defineTable({
      messageId: v.id("messages"),
      userId: v.id("users"),
      threadId: v.id("threads"),
      workspaceId: v.id("workspaces"),
      readAt: v.number(),
    })
      .index("by_user_thread", ["userId", "threadId"])
      .index("by_thread_message", ["threadId", "messageId"])
      .index("by_user_workspace", ["userId", "workspaceId"]),
  
    // Typing indicators (ephemeral)
    typingIndicators: defineTable({
      threadId: v.id("threads"),
      userId: v.id("users"),
      startedAt: v.number(),
      expiresAt: v.number(), // Auto-expire after 5 seconds
    })
      .index("by_thread", ["threadId"])
      .index("by_expires", ["expiresAt"]),
});
