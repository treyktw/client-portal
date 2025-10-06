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
  }).index("by_code", ["code"]),

  services: defineTable({
    name: v.string(),
    description: v.string(),
    stripePriceId: v.optional(v.string()), // Stripe price ID if needed
    createdAt: v.number(),
  }),

  // Emergency logs for SMS/Voice/Email incidents and system alerts
  emergencyLogs: defineTable({
    type: v.union(
      v.literal("sms"),
      v.literal("voice_call"),
      v.literal("email"),
      v.literal("system")
    ),
    from: v.string(),
    message: v.optional(v.string()),
    messageSid: v.optional(v.string()),
    callSid: v.optional(v.string()),
    timestamp: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("priority"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("completed")
    ),
    hasMedia: v.optional(v.boolean()),
    mediaUrls: v.optional(v.array(v.string())),
    recordingUrl: v.optional(v.string()),
    transcription: v.optional(v.string()),
    // Freeform operator notes and resolution details
    notes: v.optional(v.string()),
    resolution: v.optional(v.string()),
    preventionSteps: v.optional(v.string()),
    metadata: v.optional(v.any()),

    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    escalatedAt: v.optional(v.number()),
    escalatedTo: v.optional(v.id("users")),

    responseTime: v.optional(v.number()),
    resolutionTime: v.optional(v.number()),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_call_sid", ["callSid"]) 
    .index("by_message_sid", ["messageSid"]) 
    .index("by_status", ["status"]) 
    .index("by_type", ["type"]),

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
    links: v.optional(
      v.array(
        v.object({
          url: v.string(),
          title: v.optional(v.string()),
          favicon: v.optional(v.string()),
        })
      )
    ),
    mentions: v.optional(v.array(v.id("users"))),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
          createdAt: v.number(),
        })
      )
    ),
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

  contacts: defineTable({
    status: v.union(
      v.literal("lead"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("won"),
      v.literal("lost")
    ),
    type: v.union(
      v.literal("dental"),
      v.literal("detailing"),
      v.literal("trucking"),
      v.literal("automotive"),
      v.literal("other")
    ),
    source: v.union(
      v.literal("cold_call"),
      v.literal("walk_in"),
      v.literal("referral"),
      v.literal("webform"),
      v.literal("import")
    ),
    businessName: v.string(),
    ownerName: v.optional(v.string()),
    emails: v.array(
      v.object({
        label: v.optional(v.union(v.literal("work"), v.literal("personal"))),
        address: v.string(),
        verified: v.optional(v.boolean()),
        emailConsent: v.optional(
          v.union(
            v.literal("opted_in"),
            v.literal("opted_out"),
            v.literal("unknown")
          )
        ),
        lastConsentAt: v.optional(v.number()),
      })
    ),
    phones: v.array(
      v.object({
        label: v.optional(v.union(v.literal("main"), v.literal("mobile"))),
        number: v.string(),
        verified: v.optional(v.boolean()),
        smsConsent: v.optional(
          v.union(
            v.literal("opted_in"),
            v.literal("opted_out"),
            v.literal("unknown")
          )
        ),
        lastConsentAt: v.optional(v.number()),
      })
    ),
    website: v.optional(v.string()),
    location: v.optional(
      v.object({
        line1: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zip: v.optional(v.string()),
        country: v.optional(v.string()),
        lat: v.optional(v.number()),
        lng: v.optional(v.number()),
      })
    ),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    workspaceId: v.optional(v.id("workspaces")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_assigned", ["assignedTo"])
    .index("by_workspace", ["workspaceId"]),

  interactions: defineTable({
    contactId: v.id("contacts"),
    type: v.union(
      v.literal("call"),
      v.literal("sms"),
      v.literal("email"),
      v.literal("note"),
      v.literal("meeting"),
      v.literal("status_change"),
      v.literal("task")
    ),
    direction: v.optional(v.union(v.literal("outbound"), v.literal("inbound"))),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("files"))),
    metadata: v.optional(v.any()),
    twilioMessageSid: v.optional(v.string()), // For tracking Twilio messages
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_twilio_sid", ["twilioMessageSid"]),

  consents: defineTable({
    contactId: v.id("contacts"),
    channel: v.union(v.literal("sms"), v.literal("email")),
    action: v.union(v.literal("opt_in"), v.literal("opt_out")),
    source: v.union(
      v.literal("sms_reply"),
      v.literal("link_click"),
      v.literal("manual"),
      v.literal("import")
    ),
    value: v.string(), // phone or email
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_contact_channel", ["contactId", "channel"])
    .index("by_value", ["value"]),

  messageTemplates: defineTable({
    channel: v.union(v.literal("sms"), v.literal("email")),
    name: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    variables: v.array(v.string()),
    category: v.union(
      v.literal("outreach"),
      v.literal("followup"),
      v.literal("payment"),
      v.literal("milestone"),
      v.literal("task"),
      v.literal("system")
    ),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_channel", ["channel"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Enhanced notifications table
  notificationConfigs: defineTable({
    userId: v.id("users"),
    channel: v.union(v.literal("inapp"), v.literal("email"), v.literal("sms")),
    enabled: v.boolean(),
    categories: v.array(v.string()), // which notification types to receive
    quietHours: v.optional(
      v.object({
        enabled: v.boolean(),
        startHour: v.number(), // 0-23
        endHour: v.number(),
        timezone: v.string(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Update existing notifications table - add these fields
  notificationLogs: defineTable({
    contactId: v.optional(v.id("contacts")),
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.optional(v.id("users")),
    type: v.string(), // lead_created, no_followup, milestone_risk, etc.
    channel: v.union(v.literal("inapp"), v.literal("email"), v.literal("sms")),
    subject: v.optional(v.string()),
    body: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("read")
    ),
    metadata: v.optional(v.any()), // Additional data like twilioSid, resendId
    error: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

    milestones: defineTable({
      workspaceId: v.id("workspaces"),
      phase: v.string(),
      title: v.string(),
      description: v.string(), // BlockNote JSON
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      status: v.union(
        v.literal("pending"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("blocked")
      ),
      dueDate: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      completedBy: v.optional(v.id("users")),
      completionNotes: v.optional(v.string()),
      paymentAmount: v.optional(v.number()),
      paymentPercentage: v.optional(v.number()),
      paymentStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("overdue")
      )),
      dependencies: v.optional(v.array(v.id("milestones"))),
      order: v.number(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_workspace", ["workspaceId"])
      .index("by_status", ["status"])
      .index("by_due_date", ["dueDate"]),
  
    milestoneTemplates: defineTable({
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
      createdBy: v.id("users"),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_name", ["name"]),
});
