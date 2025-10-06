// components/crm/QuickOutreachModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OutreachComposer from "./OutreachComposer";
import type { Contact } from "@/types/crm";

interface QuickOutreachModalProps {
  open: boolean;
  contact: Contact;
  onClose: () => void;
}

export default function QuickOutreachModal({ open, contact, onClose }: QuickOutreachModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Quick Outreach - {contact.businessName}</DialogTitle>
        </DialogHeader>
        <OutreachComposer contact={contact} />
      </DialogContent>
    </Dialog>
  );
}