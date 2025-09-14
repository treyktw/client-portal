// convex/messages.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Helper to extract URLs from message text
function extractLinks(text: string): Array<{ url: string; title?: string }> {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  
  return matches.map(url => {
    const cleanUrl = url.replace(/[.,;!?]$/, ''); // Remove trailing punctuation
    
    // Extract a readable title from URL
    try {
      const urlObj = new URL(cleanUrl);
      const pathname = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
      const pathParts = pathname.split('/').filter(Boolean);
      
      // Create title from domain and path
      let title = urlObj.hostname.replace('www.', '');
      
      // Add meaningful path parts
      if (pathParts.length > 0) {
        // Take first 2 path segments for context
        const relevantParts = pathParts.slice(0, 2).join(' ');
        title = `${title} - ${relevantParts}`;
      }
      
      // Clean up the title
      title = title
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split('.')
        .slice(0, -1) // Remove TLD
        .join('.')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        url: cleanUrl,
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
      };
    } catch {
      return {
        url: cleanUrl,
        title: undefined,
      };
    }
  });
}

// Helper to extract mentions from message text
function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  return matches.map(m => m.substring(1)); // Remove @ symbol
}

// Send a message
export const sendMessage = mutation({
  args: {
    threadId: v.id("threads"),
    body: v.string(),
    files: v.optional(v.array(v.id("files"))),
    mentions: v.optional(v.array(v.id("users"))),
    replyToId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    // Check if user has access to this thread
    const workspace = await ctx.db.get(thread.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.createdBy === user._id ||
      workspace.invitedEmail === user.email ||
      thread.memberIds.includes(user._id);

    if (!hasAccess) throw new Error("Not authorized to send messages in this thread");

    const now = Date.now();

    // Extract links and mentions from message body
    let processedBody = args.body;
    const links = extractLinks(args.body);
    const mentionUsernames = extractMentions(args.body);
    
    // Convert mention usernames to user IDs (simplified - in production, map usernames to IDs)
    const mentionIds = args.mentions || [];

    links.forEach((link, index) => {
      // Create a markdown-style link replacement
      const linkText = link.title || new URL(link.url).hostname.replace('www.', '');
      const replacement = `[${linkText}](${link.url})`;
      processedBody = processedBody.replace(link.url, replacement);
    });


    // Create the message
    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      workspaceId: thread.workspaceId,
      authorId: user._id,
      body: processedBody, // Use processed body
      originalBody: args.body, // Store original if needed
      files: args.files,
      links: links.length > 0 ? links : undefined,
      mentions: mentionIds.length > 0 ? mentionIds : undefined,
      replyToId: args.replyToId,
      isPinned: false,
      createdAt: now,
    });

    // Update thread's last message info
    await ctx.db.patch(args.threadId, {
      lastMessageAt: now,
      lastMessagePreview: args.body.substring(0, 100),
      lastMessageAuthor: user._id,
      updatedAt: now,
    });

    // Mark as read for the sender
    await ctx.db.insert("messageReads", {
      messageId,
      userId: user._id,
      threadId: args.threadId,
      workspaceId: thread.workspaceId,
      readAt: now,
    });

    // Create notifications for mentions
    for (const mentionedUserId of mentionIds) {
      if (mentionedUserId !== user._id) {
        await ctx.db.insert("notifications", {
          workspaceId: thread.workspaceId,
          type: "mention",
          subject: `${user.name || user.email} mentioned you`,
          recipient: "", // Would need to get user's email
          status: "pending",
          sentAt: now,
        });
      }
    }

    return messageId;
  },
});

// Get messages for a thread (paginated)
export const getMessages = query({
  args: {
    threadId: v.id("threads"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], hasMore: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { messages: [], hasMore: false };

    const thread = await ctx.db.get(args.threadId);
    if (!thread) return { messages: [], hasMore: false };

    // Check access
    const workspace = await ctx.db.get(thread.workspaceId);
    if (!workspace) return { messages: [], hasMore: false };

    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.createdBy === user._id ||
      workspace.invitedEmail === user.email ||
      thread.memberIds.includes(user._id);

    if (!hasAccess) return { messages: [], hasMore: false };

    const limit = args.limit || 50;

    // Build query
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId));

    // Apply cursor if provided
    if (args.cursor) {
      const cursorMessage = await ctx.db.get(args.cursor as Id<"messages">);
      if (cursorMessage) {
        messagesQuery = messagesQuery.filter((q) => 
          q.lt(q.field("createdAt"), cursorMessage.createdAt)
        );
      }
    }

    // Get messages
    const messages = await messagesQuery
      .order("desc")
      .take(limit + 1);

    const hasMore = messages.length > limit;
    const resultMessages = messages.slice(0, limit);

    // Enrich messages with author info
    const enrichedMessages = await Promise.all(
      resultMessages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        const replyTo = message.replyToId 
          ? await ctx.db.get(message.replyToId)
          : null;
        const replyToAuthor = replyTo 
          ? await ctx.db.get(replyTo.authorId)
          : null;

        return {
          ...message,
          author,
          replyTo: replyTo ? {
            ...replyTo,
            author: replyToAuthor,
          } : null,
        };
      })
    );

    // Reverse to get chronological order
    enrichedMessages.reverse();

    return {
      messages: enrichedMessages,
      hasMore,
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1]._id : null,
    };
  },
});

// Edit a message
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only author or admin can edit
    if (message.authorId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to edit this message");
    }

    // Don't allow editing deleted messages
    if (message.deletedAt) {
      throw new Error("Cannot edit deleted message");
    }

    const now = Date.now();

    // Extract new links
    const links = extractLinks(args.body);

    await ctx.db.patch(args.messageId, {
      body: args.body,
      links: links.length > 0 ? links : undefined,
      editedAt: now,
      editedBy: user._id,
    });

    return { success: true };
  },
});

// Delete a message (soft delete)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only author or admin can delete
    if (message.authorId !== user._id && user.role !== "admin") {
      throw new Error("Not authorized to delete this message");
    }

    const now = Date.now();

    // Soft delete
    await ctx.db.patch(args.messageId, {
      deletedAt: now,
      deletedBy: user._id,
      body: "[Message deleted]",
    });

    return { success: true };
  },
});

// Pin a message
export const pinMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can pin messages");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      isPinned: true,
    });

    // Also update thread's pinned messages list
    const thread = await ctx.db.get(message.threadId);
    if (thread) {
      const pinnedIds = thread.pinnedMessageIds || [];
      if (!pinnedIds.includes(args.messageId)) {
        pinnedIds.push(args.messageId);
        await ctx.db.patch(message.threadId, {
          pinnedMessageIds: pinnedIds,
        });
      }
    }

    return { success: true };
  },
});

// Unpin a message
export const unpinMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can unpin messages");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      isPinned: false,
    });

    // Also update thread's pinned messages list
    const thread = await ctx.db.get(message.threadId);
    if (thread && thread.pinnedMessageIds) {
      const pinnedIds = thread.pinnedMessageIds.filter(id => id !== args.messageId);
      await ctx.db.patch(message.threadId, {
        pinnedMessageIds: pinnedIds,
      });
    }

    return { success: true };
  },
});

// Add a reaction to a message
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions || [];
    
    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      r => r.userId === user._id && r.emoji === args.emoji
    );

    if (existingReaction) {
      // Remove the reaction (toggle off)
      const newReactions = reactions.filter(
        r => !(r.userId === user._id && r.emoji === args.emoji)
      );
      await ctx.db.patch(args.messageId, { reactions: newReactions });
    } else {
      // Add the reaction
      reactions.push({
        emoji: args.emoji,
        userId: user._id,
        createdAt: Date.now(),
      });
      await ctx.db.patch(args.messageId, { reactions });
    }

    return { success: true };
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    threadId: v.id("threads"),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const now = Date.now();

    // If messageId provided, mark that specific message
    // Otherwise, mark the latest message in thread
    let targetMessageId = args.messageId;
    
    if (!targetMessageId) {
      const latestMessage = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("desc")
        .first();
      
      if (latestMessage) {
        targetMessageId = latestMessage._id;
      }
    }

    if (targetMessageId) {
      // Check if already marked as read
      const existingRead = await ctx.db
        .query("messageReads")
        .withIndex("by_user_thread", (q) => 
          q.eq("userId", user._id).eq("threadId", args.threadId)
        )
        .order("desc")
        .first();

      // Only create new read if this is a newer message
      if (!existingRead || existingRead.messageId !== targetMessageId) {
        await ctx.db.insert("messageReads", {
          messageId: targetMessageId,
          userId: user._id,
          threadId: args.threadId,
          workspaceId: thread.workspaceId,
          readAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Get unread count for a user
export const getUnreadCount = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return 0;

    // Get threads user has access to
    let threads: Doc<"threads">[];
    if (args.workspaceId) {
      threads = await ctx.db
        .query("threads")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();
    } else if (user.role === "admin") {
      // Admin sees all threads
      threads = await ctx.db.query("threads").collect();
    } else {
      // Get workspaces user has access to
      const workspaces = await ctx.db
        .query("workspaces")
        .filter((q) => 
          q.or(
            q.eq(q.field("ownerId"), user._id),
            q.eq(q.field("createdBy"), user._id)
          )
        )
        .collect();
      
      threads = [];
      for (const workspace of workspaces) {
        const wsThreads = await ctx.db
          .query("threads")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
          .collect();
        threads.push(...wsThreads);
      }
    }

    // Filter threads user is member of
    threads = threads.filter(t => 
      t.memberIds.includes(user._id) || user.role === "admin"
    );

    let totalUnread = 0;

    for (const thread of threads) {
      // Get last read message for this thread
      const lastRead = await ctx.db
        .query("messageReads")
        .withIndex("by_user_thread", (q) => 
          q.eq("userId", user._id).eq("threadId", thread._id)
        )
        .order("desc")
        .first();

      // Count unread messages
      const unreadQuery = ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .filter((q) => {
          // Exclude deleted messages
          const notDeleted = q.eq(q.field("deletedAt"), undefined);
          // Exclude own messages
          const notOwn = q.neq(q.field("authorId"), user._id);
          
          if (lastRead) {
            return q.and(
              notDeleted,
              notOwn,
              q.gt(q.field("createdAt"), lastRead.readAt)
            );
          }
          return q.and(notDeleted, notOwn);
        });

      const unreadMessages = await unreadQuery.collect();
      totalUnread += unreadMessages.length;
    }

    return totalUnread;
  },
});

// Get pinned messages for a thread
export const getPinnedMessages = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const pinnedMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread_pinned", (q) => 
        q.eq("threadId", args.threadId).eq("isPinned", true)
      )
      .collect();

    // Enrich with author info
    const enrichedMessages = await Promise.all(
      pinnedMessages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        return {
          ...message,
          author,
        };
      })
    );

    return enrichedMessages;
  },
});