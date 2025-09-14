// convex/messageHelpers.ts
import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, query } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// Extract links from message body (internal helper)
export const extractLinks = internalQuery({
  args: {
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = args.body.match(urlRegex) || [];
    
    const links = matches.map(url => {
      // Clean up URL
      const cleanUrl = url.replace(/[.,;!?]$/, '');
      
      return {
        url: cleanUrl,
        title: undefined, // Would need to fetch URL to get title
        favicon: undefined, // Would need to fetch URL to get favicon
      };
    });

    return links;
  },
});

// Extract mentions from message body (internal helper)
export const extractMentions = internalQuery({
  args: {
    body: v.string(),
  },
  handler: async (ctx, args) => {
    // Match @username or @"Full Name" patterns
    const mentionRegex = /@(?:(\w+)|"([^"]+)")/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    match = mentionRegex.exec(args.body);
    while (match !== null) {
      const username = match[1] || match[2];
      if (username) {
        mentions.push(username);
      }
      match = mentionRegex.exec(args.body);
    }

    return mentions;
  },
});

// Create a notification for a user
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const now = Date.now();

    // Create in-app notification
    await ctx.db.insert("notifications", {
      workspaceId: args.workspaceId,
      type: args.type,
      subject: args.title,
      recipient: user.email,
      status: "pending",
      sentAt: now,
    });

    // TODO: Send email notification if user has email notifications enabled
    // This would integrate with your email service (Resend, SendGrid, etc.)

    return { success: true };
  },
});

// Update typing indicator
export const updateTypingIndicator = mutation({
  args: {
    threadId: v.id("threads"),
    isTyping: v.boolean(),
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
    const expiresAt = now + 5000; // Expire after 5 seconds

    if (args.isTyping) {
      // Check if indicator already exists
      const existing = await ctx.db
        .query("typingIndicators")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();

      if (existing) {
        // Update expiration
        await ctx.db.patch(existing._id, {
          startedAt: now,
          expiresAt,
        });
      } else {
        // Create new indicator
        await ctx.db.insert("typingIndicators", {
          threadId: args.threadId,
          userId: user._id,
          startedAt: now,
          expiresAt,
        });
      }
    } else {
      // Remove typing indicator
      const indicators = await ctx.db
        .query("typingIndicators")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();

      for (const indicator of indicators) {
        await ctx.db.delete(indicator._id);
      }
    }

    return { success: true };
  },
});

// Get typing indicators for a thread
export const getTypingIndicators = query({
  args: {
    threadId: v.id("threads"),
    excludeUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    // Check if user has access to this thread
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return [];

    const workspace = await ctx.db.get(thread.workspaceId);
    if (!workspace) return [];

    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.createdBy === user._id ||
      workspace.invitedEmail === user.email ||
      thread.memberIds.includes(user._id);

    if (!hasAccess) return [];

    const now = Date.now();

    // Get non-expired indicators
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Filter out current user if specified
    const filtered = args.excludeUserId
      ? indicators.filter(i => i.userId !== args.excludeUserId)
      : indicators;

    // Get user info for each indicator
    const withUsers = await Promise.all(
      filtered.map(async (indicator) => {
        const user = await ctx.db.get(indicator.userId);
        return {
          ...indicator,
          user,
        };
      })
    );

    return withUsers;
  },
});

// Clean up expired typing indicators (could be called by a cron job)
export const cleanupExpiredTypingIndicators = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("typingIndicators")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    for (const indicator of expired) {
      await ctx.db.delete(indicator._id);
    }

    return { deleted: expired.length };
  },
});

// Get thread participants with online status
export const getThreadParticipants = internalQuery({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return [];

    const participants = await Promise.all(
      thread.memberIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Get last activity (simplified - would need proper presence tracking)
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_author", (q) => q.eq("authorId", userId))
          .order("desc")
          .first();

        const lastActivity = lastMessage?.createdAt || user.createdAt;
        const now = Date.now();
        const isOnline = now - lastActivity < 5 * 60 * 1000; // Consider online if active in last 5 minutes

        return {
          ...user,
          isOnline,
          lastActivity,
        };
      })
    );

    return participants.filter(p => p !== null);
  },
});

// Search messages in a workspace or thread
export const searchMessages = internalQuery({
  args: {
    query: v.string(),
    workspaceId: v.optional(v.id("workspaces")),
    threadId: v.optional(v.id("threads")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const searchQuery = args.query.toLowerCase();

    let messages: Doc<"messages">[];
    if (args.threadId) {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId!))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(1000); // Search through last 1000 messages
    } else if (args.workspaceId) {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(1000);
    } else {
      return [];
    }

    // Filter by search query
    const filtered = messages.filter(m => 
      m.body.toLowerCase().includes(searchQuery)
    );

    // Sort by relevance (simple: exact matches first, then partial)
    filtered.sort((a, b) => {
      const aExact = a.body.toLowerCase() === searchQuery;
      const bExact = b.body.toLowerCase() === searchQuery;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by recency
      return b.createdAt - a.createdAt;
    });

    // Limit results
    const limited = filtered.slice(0, limit);

    // Enrich with author and thread info
    const enriched = await Promise.all(
      limited.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        const thread = await ctx.db.get(message.threadId);
        
        return {
          ...message,
          author,
          thread,
        };
      })
    );

    return enriched;
  },
});

// Get message statistics for a workspace
export const getMessageStats = internalQuery({
  args: {
    workspaceId: v.id("workspaces"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = args.startDate || now - 30 * 24 * 60 * 60 * 1000; // Default: last 30 days
    const endDate = args.endDate || now;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startDate),
          q.lte(q.field("createdAt"), endDate),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Calculate statistics
    const totalMessages = messages.length;
    const uniqueAuthors = new Set(messages.map(m => m.authorId)).size;
    const messagesWithFiles = messages.filter(m => m.files && m.files.length > 0).length;
    const messagesWithLinks = messages.filter(m => m.links && m.links.length > 0).length;
    const messagesWithMentions = messages.filter(m => m.mentions && m.mentions.length > 0).length;
    const editedMessages = messages.filter(m => m.editedAt).length;

    // Messages by day
    const messagesByDay = new Map<string, number>();
    messages.forEach(m => {
      const date = new Date(m.createdAt).toISOString().split('T')[0];
      messagesByDay.set(date, (messagesByDay.get(date) || 0) + 1);
    });

    // Messages by author
    const messagesByAuthor = new Map<string, number>();
    messages.forEach(m => {
      messagesByAuthor.set(m.authorId, (messagesByAuthor.get(m.authorId) || 0) + 1);
    });

    // Get author details
    const authorStats = await Promise.all(
      Array.from(messagesByAuthor.entries()).map(async ([authorId, count]) => {
        const author = await ctx.db.get(authorId as Id<'users'>);
        return {
          author,
          messageCount: count,
          percentage: (count / totalMessages) * 100,
        };
      })
    );

    return {
      totalMessages,
      uniqueAuthors,
      messagesWithFiles,
      messagesWithLinks,
      messagesWithMentions,
      editedMessages,
      messagesByDay: Array.from(messagesByDay.entries()).map(([date, count]) => ({
        date,
        count,
      })),
      authorStats: authorStats.sort((a, b) => b.messageCount - a.messageCount),
      averageMessagesPerDay: totalMessages / Math.max(1, messagesByDay.size),
    };
  },
});