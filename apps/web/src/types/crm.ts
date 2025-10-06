// types/crm.ts
import type { Doc, Id } from "@telera/convex/_generated/dataModel";

export type ContactStatus = "lead" | "qualified" | "proposal" | "won" | "lost";
export type ContactType = "dental" | "detailing" | "trucking" | "automotive" | "other";
export type ContactSource = "cold_call" | "walk_in" | "referral" | "webform" | "import";
export type ConsentStatus = "opted_in" | "opted_out" | "unknown";
export type InteractionType = "call" | "sms" | "email" | "note" | "meeting" | "status_change" | "task";

export interface ContactEmail {
  label?: "work" | "personal";
  address: string;
  verified?: boolean;
  emailConsent?: ConsentStatus;
  lastConsentAt?: number;
}

export interface ContactPhone {
  label?: "main" | "mobile";
  number: string;
  verified?: boolean;
  smsConsent?: ConsentStatus;
  lastConsentAt?: number;
}

export interface ContactLocation {
  line1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface Contact extends Doc<"contacts"> {
  status: ContactStatus;
  type: ContactType;
  source: ContactSource;
  businessName: string;
  ownerName?: string;
  emails: ContactEmail[];
  phones: ContactPhone[];
  website?: string;
  location?: ContactLocation;
  tags: string[];
  notes?: string;
  assignedTo?: Id<"users">;
  workspaceId?: Id<"workspaces">;
}

export interface Interaction extends Omit<Doc<"interactions">, "createdBy"> {
  contactId: Id<"contacts">;
  type: InteractionType;
  direction?: "outbound" | "inbound";
  subject?: string;
  body?: string;
  attachments?: Id<"files">[];
  metadata?: Record<string, unknown>;
  twilioMessageSid?: string;
  createdBy: Id<"users"> | Doc<"users">;
}

export interface ContactWithInteractions extends Contact {
  interactions: Interaction[];
}

// Enriched interaction type when joining user details in queries
export interface InteractionWithUser extends Omit<Interaction, "createdBy"> {
  createdBy: Id<"users"> | Doc<"users"> | null;
  createdByUser?: Doc<"users">;
}

export interface MessageTemplate extends Doc<"messageTemplates"> {
  channel: "sms" | "email";
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  category: "outreach" | "followup" | "payment" | "milestone" | "task" | "system";
  isActive: boolean;
}

// Table filters state
export interface ContactFilters {
  search: string;
  status: ContactStatus | "all";
  type: ContactType | "all";
  source: ContactSource | "all";
  tags: string[];
  hasEmail: boolean | null;
  hasSms: boolean | null;
  assignedTo: Id<"users"> | "all";
}

// Table actions
export type ContactFilterAction =
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_STATUS"; payload: ContactStatus | "all" }
  | { type: "SET_TYPE"; payload: ContactType | "all" }
  | { type: "SET_SOURCE"; payload: ContactSource | "all" }
  | { type: "SET_TAGS"; payload: string[] }
  | { type: "SET_HAS_EMAIL"; payload: boolean | null }
  | { type: "SET_HAS_SMS"; payload: boolean | null }
  | { type: "SET_ASSIGNED"; payload: Id<"users"> | "all" }
  | { type: "RESET_FILTERS" };

// Outreach state
export interface OutreachState {
  channel: "sms" | "email";
  templateId: string | null;
  subject: string;
  body: string;
  variables: Record<string, string>;
  isSending: boolean;
  error: string | null;
}

export type OutreachAction =
  | { type: "SET_CHANNEL"; payload: "sms" | "email" }
  | { type: "SET_TEMPLATE"; payload: string | null }
  | { type: "SET_SUBJECT"; payload: string }
  | { type: "SET_BODY"; payload: string }
  | { type: "SET_VARIABLE"; key: string; value: string }
  | { type: "SET_VARIABLES"; payload: Record<string, string> }
  | { type: "START_SEND" }
  | { type: "SEND_SUCCESS" }
  | { type: "SEND_ERROR"; payload: string }
  | { type: "RESET" };