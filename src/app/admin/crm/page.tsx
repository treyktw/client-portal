// app/admin/crm/page.tsx
"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  MessageSquare,
  ExternalLink,
  ArrowRight,
  Filter,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CreateContactModal from "@/components/crm/CreateContactModal";
import QuickOutreachModal from "@/components/crm/QuickOutreachModal";
import ConsentBadge from "@/components/crm/ConsentBadge";
import type { ContactFilters, ContactFilterAction, Contact } from "@/types/crm";
import { cn } from "@/lib/utils";

const filterReducer = (state: ContactFilters, action: ContactFilterAction): ContactFilters => {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_TYPE":
      return { ...state, type: action.payload };
    case "SET_SOURCE":
      return { ...state, source: action.payload };
    case "SET_TAGS":
      return { ...state, tags: action.payload };
    case "SET_HAS_EMAIL":
      return { ...state, hasEmail: action.payload };
    case "SET_HAS_SMS":
      return { ...state, hasSms: action.payload };
    case "SET_ASSIGNED":
      return { ...state, assignedTo: action.payload };
    case "RESET_FILTERS":
      return {
        search: "",
        status: "all",
        type: "all",
        source: "all",
        tags: [],
        hasEmail: null,
        hasSms: null,
        assignedTo: "all",
      };
    default:
      return state;
  }
};

interface ModalState {
  createContact: boolean;
  quickOutreach: { open: boolean; contact: Contact | null };
}

type ModalAction =
  | { type: "OPEN_CREATE" }
  | { type: "CLOSE_CREATE" }
  | { type: "OPEN_OUTREACH"; contact: Contact }
  | { type: "CLOSE_OUTREACH" };

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case "OPEN_CREATE":
      return { ...state, createContact: true };
    case "CLOSE_CREATE":
      return { ...state, createContact: false };
    case "OPEN_OUTREACH":
      return { ...state, quickOutreach: { open: true, contact: action.contact } };
    case "CLOSE_OUTREACH":
      return { ...state, quickOutreach: { open: false, contact: null } };
    default:
      return state;
  }
};

export default function CRMPage() {
  const router = useRouter();
  const contacts = useQuery(api.crm.getContacts, {}) || [];
  const convertToWorkspace = useMutation(api.crm.convertToWorkspace);

  const [filters, filterDispatch] = useReducer(filterReducer, {
    search: "",
    status: "all",
    type: "all",
    source: "all",
    tags: [],
    hasEmail: null,
    hasSms: null,
    assignedTo: "all",
  });

  const [modals, modalDispatch] = useReducer(modalReducer, {
    createContact: false,
    quickOutreach: { open: false, contact: null },
  });

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.businessName.toLowerCase().includes(search) ||
          c.ownerName?.toLowerCase().includes(search) ||
          c.emails.some((e) => e.address.toLowerCase().includes(search)) ||
          c.phones.some((p) => p.number.includes(search))
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    // Type filter
    if (filters.type !== "all") {
      filtered = filtered.filter((c) => c.type === filters.type);
    }

    // Source filter
    if (filters.source !== "all") {
      filtered = filtered.filter((c) => c.source === filters.source);
    }

    // Consent filters
    if (filters.hasEmail !== null) {
      filtered = filtered.filter((c) => {
        const hasValidEmail = c.emails.some((e) => e.emailConsent !== "opted_out");
        return filters.hasEmail ? hasValidEmail : !hasValidEmail;
      });
    }

    if (filters.hasSms !== null) {
      filtered = filtered.filter((c) => {
        const hasValidSms = c.phones.some((p) => p.smsConsent !== "opted_out");
        return filters.hasSms ? hasValidSms : !hasValidSms;
      });
    }

    return filtered;
  }, [contacts, filters]);

  const handleConvert = useCallback(
    async (contact: Contact) => {
      try {
        const result = await convertToWorkspace({
          contactId: contact._id,
          workspaceName: contact.businessName,
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
      }
    },
    [convertToWorkspace, router]
  );

  const getStatusColor = useCallback((status: Contact["status"]) => {
    const colors = {
      lead: "bg-slate-100 text-slate-700",
      qualified: "bg-blue-100 text-blue-700",
      proposal: "bg-amber-100 text-amber-700",
      won: "bg-green-100 text-green-700",
      lost: "bg-red-100 text-red-700",
    };
    return colors[status];
  }, []);

  const getTypeIcon = useCallback((type: Contact["type"]) => {
    return <Building2 className="h-4 w-4" />;
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-muted-foreground">
            {filteredContacts.length} of {contacts.length} contacts
          </p>
        </div>
        <Button onClick={() => modalDispatch({ type: "OPEN_CREATE" })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) =>
              filterDispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
            className="pl-9"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            filterDispatch({ type: "SET_STATUS", payload: value as any })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type}
          onValueChange={(value) =>
            filterDispatch({ type: "SET_TYPE", payload: value as any })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dental">Dental</SelectItem>
            <SelectItem value="detailing">Detailing</SelectItem>
            <SelectItem value="trucking">Trucking</SelectItem>
            <SelectItem value="automotive">Automotive</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.source}
          onValueChange={(value) =>
            filterDispatch({ type: "SET_SOURCE", payload: value as any })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="cold_call">Cold Call</SelectItem>
            <SelectItem value="walk_in">Walk In</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="webform">Web Form</SelectItem>
            <SelectItem value="import">Import</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => filterDispatch({ type: "RESET_FILTERS" })}
        >
          <Filter className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Consent</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow
                  key={contact._id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/crm/${contact._id}`)}
                >
                  <TableCell
                    className="font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="font-semibold">{contact.businessName}</p>
                      {contact.website && (
                        <p className="text-xs text-muted-foreground">{contact.website}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div>
                      <p>{contact.ownerName || "—"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {contact.emails[0] && (
                          <span className="text-xs text-muted-foreground">
                            {contact.emails[0].address}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Badge className={cn("capitalize", getStatusColor(contact.status))}>
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(contact.type)}
                      <span className="capitalize">{contact.type}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <span className="capitalize text-sm">{contact.source.replace("_", " ")}</span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {contact.phones[0] && (
                        <ConsentBadge
                          channel="sms"
                          status={contact.phones[0].smsConsent || "unknown"}
                        />
                      )}
                      {contact.emails[0] && (
                        <ConsentBadge
                          channel="email"
                          status={contact.emails[0].emailConsent || "unknown"}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{contact.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/crm/${contact._id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            modalDispatch({ type: "OPEN_OUTREACH", contact });
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Quick Outreach
                        </DropdownMenuItem>
                        {!contact.workspaceId && contact.status !== "lost" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvert(contact);
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Convert to Workspace
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <CreateContactModal
        open={modals.createContact}
        onClose={() => modalDispatch({ type: "CLOSE_CREATE" })}
      />
      
      {modals.quickOutreach.contact && (
        <QuickOutreachModal
          open={modals.quickOutreach.open}
          contact={modals.quickOutreach.contact}
          onClose={() => modalDispatch({ type: "CLOSE_OUTREACH" })}
        />
      )}
    </div>
  );
}