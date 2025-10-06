// components/crm/EditContactModal.tsx
"use client";

import { useReducer, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Contact, ContactStatus } from "@/types/crm";

interface FormState {
  status: ContactStatus;
  ownerName: string;
  notes: string;
  tags: string;
  isSubmitting: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: keyof FormState; value: any }
  | { type: "START_SUBMIT" }
  | { type: "END_SUBMIT" }
  | { type: "RESET"; contact: Contact };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true };
    case "END_SUBMIT":
      return { ...state, isSubmitting: false };
    case "RESET":
      return {
        status: action.contact.status,
        ownerName: action.contact.ownerName || "",
        notes: action.contact.notes || "",
        tags: action.contact.tags.join(", "),
        isSubmitting: false,
      };
    default:
      return state;
  }
};

interface EditContactModalProps {
  contact: Contact;
  open: boolean;
  onClose: () => void;
}

export default function EditContactModal({ contact, open, onClose }: EditContactModalProps) {
  const updateContact = useMutation(api.crm.updateContact);

  const [form, dispatch] = useReducer(formReducer, {
    status: contact.status,
    ownerName: contact.ownerName || "",
    notes: contact.notes || "",
    tags: contact.tags.join(", "),
    isSubmitting: false,
  });

  const handleSubmit = useCallback(async () => {
    dispatch({ type: "START_SUBMIT" });

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateContact({
        contactId: contact._id,
        patch: {
          status: form.status,
          ownerName: form.ownerName || undefined,
          notes: form.notes || undefined,
          tags,
        },
      });

      toast.success("Contact updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      dispatch({ type: "END_SUBMIT" });
    }
  }, [form, contact._id, updateContact, onClose]);

  const handleClose = useCallback(() => {
    if (!form.isSubmitting) {
      dispatch({ type: "RESET", contact });
      onClose();
    }
  }, [form.isSubmitting, contact, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update information for {contact.businessName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                dispatch({ type: "SET_FIELD", field: "status", value })
              }
              disabled={form.isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Contact Name</Label>
            <Input
              id="ownerName"
              value={form.ownerName}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "ownerName", value: e.target.value })
              }
              placeholder="John Doe"
              disabled={form.isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "tags", value: e.target.value })
              }
              placeholder="web design, seo, marketing (comma separated)"
              disabled={form.isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "notes", value: e.target.value })
              }
              placeholder="Additional notes..."
              rows={4}
              disabled={form.isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={form.isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={form.isSubmitting}>
            {form.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}