// app/actions/invitations.ts
"use server";

import { Resend } from "resend";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import InvitationEmail from "@/emails/invitation";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}


if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Set auth token for Convex HTTP client
async function getAuthenticatedConvex() {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) throw new Error("Not authenticated");
  
  convex.setAuth(token);
  return convex;
}

export type InvitationResult = {
  success: boolean;
  message?: string;
  inviteLink?: string;
  workspaceId?: string;
  error?: string;
};

export async function createWorkspaceWithInvite(
  workspaceName: string,
  inviteEmail?: string,
  sendEmail: boolean = true
): Promise<InvitationResult> {
  try {
    const client = await getAuthenticatedConvex();
    
    // Generate a unique invite token
    const inviteToken = generateInviteToken();
    
    // Create workspace with Convex
    const result = await client.mutation(api.workspaces.createWorkspace, {
      name: workspaceName,
      invitedEmail: inviteEmail || "",
      inviteToken,
    });
    
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;
    
    // Send email if requested and email provided
    if (sendEmail && inviteEmail) {
      await sendInvitationEmail({
        to: inviteEmail,
        workspaceName,
        inviteLink,
        senderName: "Telera Team", // You can get this from the current user
      });
    }
    
    return {
      success: true,
      message: sendEmail && inviteEmail 
        ? "Workspace created and invitation sent!" 
        : "Workspace created successfully!",
      inviteLink,
      workspaceId: result.workspaceId,
    };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create workspace",
    };
  }
}

export async function resendInvitation(
  workspaceId: Id<"workspaces">,
  email: string
): Promise<InvitationResult> {
  try {
    const client = await getAuthenticatedConvex();
    
    // Get workspace details
    const workspace = await client.query(api.workspaces.getWorkspaceById, {
      workspaceId,
    });
    
    if (!workspace) {
      return {
        success: false,
        error: "Workspace not found",
      };
    }
    
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${workspace.inviteToken}`;
    
    // Send email
    await sendInvitationEmail({
      to: email,
      workspaceName: workspace.name,
      inviteLink,
      senderName: "Telera Team",
    });
    
    // Update invited email if different
    if (email !== workspace.invitedEmail) {
      await client.mutation(api.workspaces.updateInvitedEmail, {
        workspaceId,
        email,
      });
    }
    
    return {
      success: true,
      message: "Invitation sent successfully!",
      inviteLink,
    };
  } catch (error) {
    console.error("Error resending invitation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

export async function generateInviteLink(
  workspaceId: Id<"workspaces">
): Promise<InvitationResult> {
  try {
    const client = await getAuthenticatedConvex();
    
    // Get or regenerate invite token
    const workspace = await client.query(api.workspaces.getWorkspaceById, {
      workspaceId,
    });
    
    if (!workspace) {
      return {
        success: false,
        error: "Workspace not found",
      };
    }
    
    let inviteToken = workspace.inviteToken;
    
    // Generate new token if none exists
    if (!inviteToken) {
      inviteToken = generateInviteToken();
      await client.mutation(api.workspaces.updateInviteToken, {
        workspaceId,
        inviteToken,
      });
    }
    
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;
    
    return {
      success: true,
      inviteLink,
      message: "Invite link generated!",
    };
  } catch (error) {
    console.error("Error generating invite link:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate invite link",
    };
  }
}

// Helper function to send email
async function sendInvitationEmail({
  to,
  workspaceName,
  inviteLink,
  senderName,
}: {
  to: string;
  workspaceName: string;
  inviteLink: string;
  senderName: string;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "support@telera.tech",
    to: [to],
    subject: `You're invited to collaborate on ${workspaceName}`,
    react: InvitationEmail({
      workspaceName,
      inviteLink,
      senderName,
      recipientEmail: to,
    }),
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

// Generate a secure invite token
function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}