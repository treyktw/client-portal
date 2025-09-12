import { v } from "convex/values";
import { mutation } from "./_generated/server";

// convex/notifications.ts
export const sendWelcomeEmail = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Here you would integrate with email service (SendGrid, Resend, etc.)
    // For now, just log the notification
    await ctx.db.insert("notifications", {
      workspaceId: args.workspaceId,
      type: "email",
      subject: "Welcome to Your Workspace!",
      recipient: workspace.invitedEmail,
      status: "sent",
      sentAt: Date.now(),
    });

    return { success: true };
  },
});

