// convex/crm.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Helper to check consent status
export const checkConsent = async (
  ctx: QueryCtx | MutationCtx,
  contactId: Id<"contacts">,
  channel: "sms" | "email",
  value: string
) => {
  const contact = await ctx.db.get(contactId);
  if (!contact) throw new Error("Contact not found");

  if (channel === "sms") {
    const phone = contact.phones.find((p) => p.number === value);
    return phone?.smsConsent !== "opted_out";
  } else {
    const email = contact.emails.find((e) => e.address === value);
    return email?.emailConsent !== "opted_out";
  }
};

// Create a new contact
export const createContact = mutation({
  args: {
    businessName: v.string(),
    ownerName: v.optional(v.string()),
    type: v.union(v.literal("dental"), v.literal("detailing"), v.literal("trucking"), v.literal("automotive"), v.literal("other")),
    source: v.union(v.literal("cold_call"), v.literal("walk_in"), v.literal("referral"), v.literal("webform"), v.literal("import")),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    location: v.optional(v.object({
      line1: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zip: v.optional(v.string()),
    })),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can create contacts");
    }

    const now = Date.now();

    const emails = args.email ? [{
      label: "work" as const,
      address: args.email,
      verified: false,
      emailConsent: "unknown" as const,
    }] : [];

    const phones = args.phone ? [{
      label: "main" as const,
      number: args.phone,
      verified: false,
      smsConsent: "unknown" as const,
    }] : [];

    const contactId = await ctx.db.insert("contacts", {
      status: "lead",
      businessName: args.businessName,
      ownerName: args.ownerName,
      type: args.type,
      source: args.source,
      emails,
      phones,
      website: args.website,
      location: args.location,
      tags: args.tags || [],
      notes: args.notes,
      assignedTo: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create notification for lead creation
    await ctx.db.insert("notificationLogs", {
      userId: user._id,
      contactId,
      type: "lead_created",
      channel: "inapp",
      body: `New lead added: ${args.businessName}, source: ${args.source}`,
      status: "sent",
      createdAt: now,
      sentAt: now,
    });

    return contactId;
  },
});

// Update contact
export const updateContact = mutation({
  args: {
    contactId: v.id("contacts"),
    patch: v.object({
      status: v.optional(v.union(v.literal("lead"), v.literal("qualified"), v.literal("proposal"), v.literal("won"), v.literal("lost"))),
      ownerName: v.optional(v.string()),
      notes: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      assignedTo: v.optional(v.id("users")),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update contacts");
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    const now = Date.now();

    // If status changed, create interaction
    if (args.patch.status && args.patch.status !== contact.status) {
      await ctx.db.insert("interactions", {
        contactId: args.contactId,
        type: "status_change",
        body: `Status changed from ${contact.status} to ${args.patch.status}`,
        metadata: { from: contact.status, to: args.patch.status },
        createdBy: user._id,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.contactId, {
      ...args.patch,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Record consent
export const recordConsent = mutation({
  args: {
    contactId: v.id("contacts"),
    channel: v.union(v.literal("sms"), v.literal("email")),
    action: v.union(v.literal("opt_in"), v.literal("opt_out")),
    value: v.string(),
    source: v.union(v.literal("sms_reply"), v.literal("link_click"), v.literal("manual"), v.literal("import")),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Record consent in immutable log
    await ctx.db.insert("consents", {
      contactId: args.contactId,
      channel: args.channel,
      action: args.action,
      source: args.source,
      value: args.value,
      ip: args.ip,
      userAgent: args.userAgent,
      createdAt: now,
    });

    // Update contact record
    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    if (args.channel === "sms") {
      const phones: typeof contact.phones = contact.phones.map((p) => {
        if (p.number === args.value) {
          return {
            ...p,
            smsConsent: args.action === "opt_in" ? ("opted_in" as const) : ("opted_out" as const),
            lastConsentAt: now,
          };
        }
        return p;
      });
      await ctx.db.patch(args.contactId, { phones, updatedAt: now });
    } else {
      const emails: typeof contact.emails = contact.emails.map((e) => {
        if (e.address === args.value) {
          return {
            ...e,
            emailConsent: args.action === "opt_in" ? ("opted_in" as const) : ("opted_out" as const),
            lastConsentAt: now,
          };
        }
        return e;
      });
      await ctx.db.patch(args.contactId, { emails, updatedAt: now });
    }

    return { success: true };
  },
});

// Create interaction
export const createInteraction = mutation({
  args: {
    contactId: v.id("contacts"),
    type: v.union(v.literal("call"), v.literal("sms"), v.literal("email"), v.literal("note"), v.literal("meeting")),
    direction: v.optional(v.union(v.literal("outbound"), v.literal("inbound"))),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    metadata: v.optional(v.any()),
    twilioMessageSid: v.optional(v.string()),
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

    const interactionId = await ctx.db.insert("interactions", {
      contactId: args.contactId,
      type: args.type,
      direction: args.direction || "outbound",
      subject: args.subject,
      body: args.body,
      metadata: args.metadata,
      twilioMessageSid: args.twilioMessageSid,
      createdBy: user._id,
      createdAt: now,
    });

    // Update contact's last interaction
    await ctx.db.patch(args.contactId, { updatedAt: now });

    return interactionId;
  },
});

// Get contacts
export const getContacts = query({
  args: {
    status: v.optional(v.union(v.literal("lead"), v.literal("qualified"), v.literal("proposal"), v.literal("won"), v.literal("lost"))),
    type: v.optional(v.union(v.literal("dental"), v.literal("detailing"), v.literal("trucking"), v.literal("automotive"), v.literal("other"))),
    assignedTo: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") return [];

    let contacts: Doc<"contacts">[];
    if (args.status !== undefined) {
      const status = args.status; // narrowed to non-undefined
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      contacts = await ctx.db.query("contacts").collect();
    }

    // Filter by other criteria
    let filtered = contacts;
    if (args.type) {
      filtered = filtered.filter(c => c.type === args.type);
    }
    if (args.assignedTo) {
      filtered = filtered.filter(c => c.assignedTo === args.assignedTo);
    }

    return filtered;
  },
});

// Get contact by ID with interactions
export const getContactWithInteractions = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") return null;

    const contact = await ctx.db.get(args.contactId);
    if (!contact) return null;

    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .take(50);

    // Get user details for interactions
    const enrichedInteractions = await Promise.all(
      interactions.map(async (i) => {
        const createdBy = await ctx.db.get(i.createdBy);
        return { ...i, createdBy };
      })
    );

    return {
      ...contact,
      interactions: enrichedInteractions,
    };
  },
});

// Convert contact to workspace
export const convertToWorkspace = mutation({
  args: {
    contactId: v.id("contacts"),
    workspaceName: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can convert contacts");
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) throw new Error("Contact not found");

    if (contact.workspaceId) {
      throw new Error("Contact already converted to workspace");
    }

    const now = Date.now();
    const workspaceName = args.workspaceName || contact.businessName;

    // Generate slug
    const slug = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      + "-" + Math.random().toString(36).substring(2, 8);

    // Generate invite token
    const inviteToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);

    // Get primary email
    const primaryEmail = contact.emails[0]?.address || "";

    // Create or get provisional user
    let clientUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", primaryEmail))
      .first();

    if (!clientUser && primaryEmail) {
      // Create provisional user
      const clientCode = Math.floor(10000 + Math.random() * 90000).toString();
      const clientUserId = await ctx.db.insert("users", {
        clerkId: `provisional_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        email: primaryEmail,
        name: contact.ownerName,
        role: "client",
        clientCode,
        createdAt: now,
        updatedAt: now,
        isProvisional: true,
        provisionalExpiresAt: now + (30 * 24 * 60 * 60 * 1000), // 30 days
      });
      clientUser = await ctx.db.get(clientUserId);
    }

    // Create workspace with prefilled data
    const workspaceId = await ctx.db.insert("workspaces", {
      name: workspaceName,
      slug,
      ownerId: clientUser?._id || user._id,
      createdBy: user._id,
      businessInfo: {
        businessName: contact.businessName,
        contactPerson: contact.ownerName || "",
        email: primaryEmail,
        phone: contact.phones[0]?.number,
        address: contact.location ? 
          `${contact.location.line1 || ""}, ${contact.location.city || ""}, ${contact.location.state || ""} ${contact.location.zip || ""}`.trim() 
          : undefined,
        website: contact.website,
        socialLinks: [],
      },
      goals: {
        services: contact.tags,
        mainGoals: [],
        specialNotes: contact.notes,
      },
      theme: "notebook",
      darkMode: false,
      onboardingCompleted: false,
      onboardingStep: 1,
      inviteStatus: "pending",
      invitedEmail: primaryEmail,
      inviteToken,
      inviteSentAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update contact
    await ctx.db.patch(args.contactId, {
      workspaceId,
      status: "won",
      updatedAt: now,
    });

    // Create default thread
    await ctx.db.insert("threads", {
      workspaceId,
      title: "Project Chat",
      createdBy: user._id,
      isDefault: true,
      memberIds: clientUser ? [user._id, clientUser._id] : [user._id],
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create prefilled Project Brief note
    const briefContent = generateProjectBrief(contact, slug);
    
    await ctx.db.insert("notes", {
      workspaceId,
      title: "Project Brief (Prefilled)",
      content: briefContent,
      isArchived: false,
      isPinned: true,
      createdBy: user._id,
      lastEditedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Create interaction
    await ctx.db.insert("interactions", {
      contactId: args.contactId,
      type: "status_change",
      body: "Converted to workspace",
      metadata: { workspaceId, workspaceName },
      createdBy: user._id,
      createdAt: now,
    });

    return { workspaceId, inviteToken, slug };
  },
});

// Helper function to generate project brief
function generateProjectBrief(contact: Doc<"contacts">, slug: string): string {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://telera.tech'}/w/${slug}`;
  
  const blocks = [
    {
      id: crypto.randomUUID(),
      type: "heading",
      props: { level: 1 },
      content: [{ type: "text", text: `Project Brief – ${contact.businessName}`, styles: {} }],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Primary Contact: ", styles: { bold: true } },
        { type: "text", text: contact.ownerName || "(To be confirmed)", styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Email: ", styles: { bold: true } },
        { type: "text", text: contact.emails[0]?.address || "(To be confirmed)", styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Phone: ", styles: { bold: true } },
        { type: "text", text: contact.phones[0]?.number || "(To be confirmed)", styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Website: ", styles: { bold: true } },
        { type: "text", text: contact.website || "None", styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Industry: ", styles: { bold: true } },
        { type: "text", text: contact.type, styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Source: ", styles: { bold: true } },
        { type: "text", text: contact.source, styles: {} },
      ],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Goals", styles: {} }],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: contact.notes || "(To be discussed in kickoff)", styles: {} }],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "heading",
      props: { level: 2 },
      content: [{ type: "text", text: "Portal Access", styles: {} }],
      children: [],
    },
    {
      id: crypto.randomUUID(),
      type: "paragraph",
      props: {},
      content: [
        { type: "text", text: "Your client portal: ", styles: {} },
        { type: "text", text: portalUrl, styles: { bold: true } },
      ],
      children: [],
    },
  ];

  return JSON.stringify(blocks);
}