// components/crm/CreateContactModal.tsx
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
import type { ContactType, ContactSource } from "@/types/crm";

interface FormState {
  businessName: string;
  ownerName: string;
  type: ContactType;
  source: ContactSource;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  notes: string;
  tags: string;
  isSubmitting: boolean;
}

type FormAction =
  | { type: "SET_FIELD"; field: keyof FormState; value: string }
  | { type: "START_SUBMIT" }
  | { type: "END_SUBMIT" }
  | { type: "RESET" };

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
        businessName: "",
        ownerName: "",
        type: "other",
        source: "webform",
        email: "",
        phone: "",
        website: "",
        city: "",
        state: "",
        notes: "",
        tags: "",
        isSubmitting: false,
      };
    default:
      return state;
  }
};

interface CreateContactModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateContactModal({ open, onClose }: CreateContactModalProps) {
  const createContact = useMutation(api.crm.createContact);

  const [form, dispatch] = useReducer(formReducer, {
    businessName: "",
    ownerName: "",
    type: "other",
    source: "webform",
    email: "",
    phone: "",
    website: "",
    city: "",
    state: "",
    notes: "",
    tags: "",
    isSubmitting: false,
  });

  const handleSubmit = useCallback(async () => {
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    dispatch({ type: "START_SUBMIT" });

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createContact({
        businessName: form.businessName,
        ownerName: form.ownerName || undefined,
        type: form.type,
        source: form.source,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        location: form.city || form.state
          ? {
              city: form.city || undefined,
              state: form.state || undefined,
            }
          : undefined,
        notes: form.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success("Contact created successfully");
      dispatch({ type: "RESET" });
      onClose();
    } catch (error) {
      toast.error("Failed to create contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      dispatch({ type: "END_SUBMIT" });
    }
  }, [form, createContact, onClose]);

  const handleClose = useCallback(() => {
    if (!form.isSubmitting) {
      dispatch({ type: "RESET" });
      onClose();
    }
  }, [form.isSubmitting, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter contact information to add them to your CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "businessName", value: e.target.value })
                }
                placeholder="Acme Corporation"
                disabled={form.isSubmitting}
              />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Business Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  dispatch({ type: "SET_FIELD", field: "type", value })
                }
                disabled={form.isSubmitting}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="trucking">Trucking</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Select
                value={form.source}
                onValueChange={(value) =>
                  dispatch({ type: "SET_FIELD", field: "source", value })
                }
                disabled={form.isSubmitting}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="walk_in">Walk In</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="webform">Web Form</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "email", value: e.target.value })
                }
                placeholder="contact@example.com"
                disabled={form.isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "phone", value: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
                disabled={form.isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "website", value: e.target.value })
              }
              placeholder="https://example.com"
              disabled={form.isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "city", value: e.target.value })
                }
                placeholder="Atlanta"
                disabled={form.isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) =>
                  dispatch({ type: "SET_FIELD", field: "state", value: e.target.value })
                }
                placeholder="GA"
                disabled={form.isSubmitting}
              />
            </div>
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
              placeholder="Initial conversation notes..."
              rows={3}
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
                Creating...
              </>
            ) : (
              "Create Contact"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}