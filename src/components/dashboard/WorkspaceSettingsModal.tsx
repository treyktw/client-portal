// components/dashboard/WorkspaceSettingsModal.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { trpc } from "@/lib/trpc-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings,
  Copy,
  RefreshCw,
  Trash2,
  Mail,
  AlertTriangle,
  User,
  Calendar,
  Loader2,
} from "lucide-react";

interface WorkspaceSettingsModalProps {
  workspace: Doc<"workspaces"> | null;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export default function WorkspaceSettingsModal({
  workspace,
  open,
  onClose,
  onDelete,
}: WorkspaceSettingsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [newInviteEmail, setNewInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);
  const regenerateInviteToken = useMutation(api.workspaces.regenerateInviteToken);
  const updateInvitedEmail = useMutation(api.workspaces.updateInvitedEmail);
  const sendInvitationMutation = trpc.invitations.sendInvitation.useMutation();

  if (!workspace) return null;

  const inviteLink = workspace.inviteToken 
    ? `${window.location.origin}/invite/${workspace.inviteToken}`
    : null;

  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard!");
    }
  };

  const handleRegenerateToken = async () => {
    setIsRegenerating(true);
    try {
      await regenerateInviteToken({ workspaceId: workspace._id });
      toast.success("Invite token regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate invite token", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleResendInvite = async () => {
    setIsSendingInvite(true);
    try {
      const emailToUse = newInviteEmail || workspace.invitedEmail;
      
      // Update email if different
      if (newInviteEmail && newInviteEmail !== workspace.invitedEmail) {
        await updateInvitedEmail({ 
          workspaceId: workspace._id, 
          email: newInviteEmail 
        });
      }

      // Send email via tRPC
      await sendInvitationMutation.mutateAsync({
        to: emailToUse,
        workspaceName: workspace.name,
        inviteLink: inviteLink || "",
        senderName: 'Telera Team',
      });
      
      toast.success(`Invitation sent to ${emailToUse}`);
      setNewInviteEmail("");
    } catch (error) {
      toast.error("Failed to send invitation", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (confirmDelete !== workspace.name) {
      toast.error("Please type the workspace name to confirm deletion");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkspace({ workspaceId: workspace._id });
      toast.success("Workspace deleted successfully");
      onDelete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to delete workspace", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Workspace Settings
          </DialogTitle>
          <DialogDescription>
            Manage settings for {workspace.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="invite">Invitation</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Workspace Name</Label>
                <p className="font-medium">{workspace.name}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Slug</Label>
                <p className="font-mono text-sm">{workspace.slug}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="capitalize">{workspace.inviteStatus}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Theme</Label>
                <p className="capitalize">{workspace.theme || "Not set"}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created
                  </Label>
                  <p className="text-sm">
                    {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Invited Email
                  </Label>
                  <p className="text-sm">{workspace.invitedEmail}</p>
                </div>
              </div>

              {!workspace.onboardingCompleted && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Onboarding in progress: Step {workspace.onboardingStep} of 7
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4 mt-4">
            {workspace.inviteStatus === "pending" ? (
              <>
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink || ""}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyInviteLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Regenerate Token</Label>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateToken}
                    disabled={isRegenerating}
                    className="w-full"
                  >
                    {isRegenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate Invite Token
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will invalidate the current invite link
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Resend Invitation</Label>
                  <Input
                    type="email"
                    placeholder={workspace.invitedEmail}
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleResendInvite}
                    disabled={isSendingInvite}
                    className="w-full"
                  >
                    {isSendingInvite ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send Invitation
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to resend to original email
                  </p>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  {workspace.inviteStatus === "accepted" 
                    ? "Invitation has been accepted. Client is setting up their workspace."
                    : "Workspace setup is complete."}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="danger" className="space-y-4 mt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Deleting a workspace is permanent and will remove all associated data including notes, tasks, files, and canvases.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-bold">{workspace.name}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="Enter workspace name"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={isDeleting || confirmDelete !== workspace.name}
              className="w-full"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Workspace Permanently
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}