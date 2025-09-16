// components/crm/ConvertWorkspaceModal.tsx
"use client";

import { useReducer, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  ArrowRight,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  MessageSquare,
} from "lucide-react";
import type { Contact } from "@/types/crm";

interface FormState {
  workspaceName: string;
  plan: string;
  isSubmitting: boolean;
  step: "preview" | "confirm";
}

type FormAction =
  | { type: "SET_WORKSPACE_NAME"; payload: string }
  | { type: "SET_PLAN"; payload: string }
  | { type: "SET_STEP"; payload: "preview" | "confirm" }
  | { type: "START_SUBMIT" }
  | { type: "END_SUBMIT" }
  | { type: "RESET"; contact: Contact };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case "SET_WORKSPACE_NAME":
      return { ...state, workspaceName: action.payload };
    case "SET_PLAN":
      return { ...state, plan: action.payload };
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true };
    case "END_SUBMIT":
      return { ...state, isSubmitting: false };
    case "RESET":
      return {
        workspaceName: action.contact.businessName,
        plan: "standard",
        isSubmitting: false,
        step: "preview",
      };
    default:
      return state;
  }
};

interface ConvertWorkspaceModalProps {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

export default function ConvertWorkspaceModal({ contact, open, onClose }: ConvertWorkspaceModalProps) {
  const router = useRouter();
  const convertToWorkspace = useMutation(api.crm.convertToWorkspace);

  const [form, dispatch] = useReducer(formReducer, {
    workspaceName: contact.businessName,
    plan: "standard",
    isSubmitting: false,
    step: "preview",
  });

  const handleConvert = useCallback(async () => {
    dispatch({ type: "START_SUBMIT" });

    try {
      const result = await convertToWorkspace({
        contactId: contact._id,
        workspaceName: form.workspaceName,
        plan: form.plan,
      });

      toast.success("Workspace created successfully!", {
        description: "Redirecting to workspace...",
      });

      setTimeout(() => {
        router.push(`/w/${result.slug}`);
      }, 1500);
    } catch (error) {
      toast.error("Failed to convert to workspace", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      dispatch({ type: "END_SUBMIT" });
    }
  }, [form, contact._id, convertToWorkspace, router]);

  const handleClose = useCallback(() => {
    if (!form.isSubmitting) {
      dispatch({ type: "RESET", contact });
      onClose();
    }
  }, [form.isSubmitting, contact, onClose]);

  const primaryEmail = contact.emails[0];
  const primaryPhone = contact.phones[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Convert to Workspace</DialogTitle>
          <DialogDescription>
            Convert {contact.businessName} from lead to active client workspace
          </DialogDescription>
        </DialogHeader>

        {form.step === "preview" ? (
          <>
            <div className="space-y-4 py-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The following information will be automatically prefilled in the workspace:
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Business Name</p>
                    <p className="text-sm text-muted-foreground">{contact.businessName}</p>
                  </div>
                </div>

                {contact.ownerName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Primary Contact</p>
                      <p className="text-sm text-muted-foreground">{contact.ownerName}</p>
                    </div>
                  </div>
                )}

                {primaryEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{primaryEmail.address}</p>
                    </div>
                  </div>
                )}

                {primaryPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{primaryPhone.number}</p>
                    </div>
                  </div>
                )}

                {contact.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Website</p>
                      <p className="text-sm text-muted-foreground">{contact.website}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">What will be created:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Client workspace with portal access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Project Brief note (prefilled)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Project Chat thread</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Welcome email with portal link</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  value={form.workspaceName}
                  onChange={(e) =>
                    dispatch({ type: "SET_WORKSPACE_NAME", payload: e.target.value })
                  }
                  placeholder="Workspace name"
                  disabled={form.isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={form.isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => dispatch({ type: "SET_STEP", payload: "confirm" })}
                disabled={!form.workspaceName.trim()}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription className="font-medium">
                  Ready to convert {contact.businessName} to an active workspace?
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{form.workspaceName}</p>
                    <Badge>New Workspace</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {contact.ownerName || "No contact name"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {primaryEmail?.address || "No email"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    An invitation will be sent to {primaryEmail?.address || "the client"} with portal access
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => dispatch({ type: "SET_STEP", payload: "preview" })}
                disabled={form.isSubmitting}
              >
                Back
              </Button>
              <Button onClick={handleConvert} disabled={form.isSubmitting}>
                {form.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    Convert to Workspace
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}