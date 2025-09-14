// components/admin/CreateWorkspaceModal.tsx - Updated version
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { toast } from "sonner";
import {
  Mail,
  Link2,
  Users,
  Send,
  Copy,
  CheckCircle2,
  Loader2,
  Plus,
  X,
} from "lucide-react";

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ open, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteMethod, setInviteMethod] = useState<"email" | "link" | "multiple">("email");
  
  // Single email invite
  const [inviteEmail, setInviteEmail] = useState("");
  
  // Multiple emails (store stable id + value)
  const [emailList, setEmailList] = useState<Array<{ id: string; value: string }>>([
    { id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)), value: "" },
  ]);
  
  // Generated link
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const sendInvitationMutation = trpc.invitations.sendInvitation.useMutation();

  const handleAddEmail = () => {
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    setEmailList((prev) => [...prev, { id, value: "" }]);
  };

  const handleRemoveEmail = (index: number) => {
    const idToRemove = emailList[index]?.id;
    if (!idToRemove) return;
    setEmailList((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleEmailChange = (index: number, value: string) => {
    const id = emailList[index]?.id;
    if (!id) return;
    setEmailList((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const sendInvitationEmail = async (
    email: string, 
    workspaceName: string, 
    inviteToken: string
  ) => {
    const inviteLink = `${window.location.origin}/invite/${inviteToken}`;
    
    try {
      const result = await sendInvitationMutation.mutateAsync({
        to: email,
        workspaceName,
        inviteLink,
        senderName: 'Telera Team',
      });
      
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  const handleCreate = async () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setIsCreating(true);

    try {
      let targetEmail = "";
      
      switch (inviteMethod) {
        case "email":
          if (!inviteEmail.trim()) {
            toast.error("Please enter an email address");
            setIsCreating(false);
            return;
          }
          targetEmail = inviteEmail;
          break;
          
        case "multiple": {
          const validEmails = emailList.map((e) => e.value).filter((email) => email.trim());
          if (validEmails.length === 0) {
            toast.error("Please enter at least one email address");
            setIsCreating(false);
            return;
          }
          targetEmail = validEmails[0]; // Use first email for workspace creation
          break;
        }
          
        case "link":
          targetEmail = ""; // No email for link-only
          break;
      }

      // Create workspace with Convex
      const result = await createWorkspace({
        name: workspaceName,
        invitedEmail: targetEmail,
      });

      // Generate invite link
      const inviteLink = `${window.location.origin}/invite/${result.inviteToken}`;
      setGeneratedLink(inviteLink);

      // Send email if needed
      if (inviteMethod === "email" && targetEmail) {
        try {
          await sendInvitationEmail(targetEmail, workspaceName, result.inviteToken);
          toast.success("Workspace created and invitation sent!");
        } catch (emailError) {
          toast.error("Workspace created but failed to send email. You can copy the link instead.");
          console.error('Email error:', emailError);
        }
      } else if (inviteMethod === "multiple") {
        const validEmails = emailList.map((e) => e.value).filter(email => email.trim());
        
        // Send to first email
        if (validEmails[0]) {
          try {
            await sendInvitationEmail(validEmails[0], workspaceName, result.inviteToken);
            toast.success(`Invitation sent to ${validEmails[0]}`);
          } catch (emailError) {
            toast.error("Failed to send email invitation", {
              description: emailError instanceof Error ? emailError.message : "Unknown error",
            });
          }
        }
        
        // Note about additional emails
        if (validEmails.length > 1) {
          toast.info("Additional team members can use the same invite link");
        }
      } else if (inviteMethod === "link") {
        // Copy link to clipboard
        await navigator.clipboard.writeText(inviteLink);
        setLinkCopied(true);
        toast.success("Workspace created and invite link copied!");
      }

      // Navigate after a short delay
      setTimeout(() => {
        router.push(`/admin`);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleClose = () => {
    // Reset form
    setWorkspaceName("");
    setInviteEmail("");
    setEmailList([
      { id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)), value: "" },
    ]);
    setGeneratedLink("");
    setLinkCopied(false);
    setInviteMethod("email");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Set up a new workspace and choose how to invite your client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name *</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              disabled={isCreating}
            />
          </div>

          {/* Invitation Method */}
          <div className="space-y-3">
            <Label>Invitation Method</Label>
            <Tabs value={inviteMethod} onValueChange={(v) => setInviteMethod(v as "email" | "link" | "multiple")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email" disabled={isCreating}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="link" disabled={isCreating}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Only
                </TabsTrigger>
                <TabsTrigger value="multiple" disabled={isCreating}>
                  <Users className="w-4 h-4 mr-2" />
                  Multiple
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Client Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="client@example.com"
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    An invitation email will be sent automatically. A provisional account will be created.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="link" className="space-y-3 mt-4">
                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertDescription>
                    Generate a shareable invite link. You can send this link via WhatsApp, Slack, or any other method.
                  </AlertDescription>
                </Alert>
                {generatedLink && (
                  <div className="space-y-2">
                    <Label>Generated Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                      >
                        {linkCopied ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="multiple" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label>Email Addresses</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {emailList.map((item, index) => (
                      <div key={item.id} className="flex gap-2">
                        <Input
                          type="email"
                          value={item.value}
                          onChange={(e) => handleEmailChange(index, e.target.value)}
                          placeholder={`Email ${index + 1}`}
                          disabled={isCreating}
                        />
                        {emailList.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveEmail(index)}
                            disabled={isCreating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEmail}
                    disabled={isCreating || emailList.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    The first email will be set as the primary workspace owner.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Generated Link Display */}
          {generatedLink && inviteMethod !== "link" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Workspace created! Invite link:
                <div className="flex gap-2 mt-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {inviteMethod === "email" && (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create & Send
                  </>
                )}
                {inviteMethod === "link" && (
                  <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Create & Generate Link
                  </>
                )}
                {inviteMethod === "multiple" && (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create & Invite
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}