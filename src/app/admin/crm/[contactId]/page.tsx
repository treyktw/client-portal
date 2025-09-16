// app/admin/crm/[contactId]/page.tsx
"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  FileText,
  PhoneCall,
  Send,
  ArrowRight,
  Edit,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Timeline from "@/components/crm/Timeline";
import OutreachComposer from "@/components/crm/OutreachComposer";
import ConsentBadge from "@/components/crm/ConsentBadge";
import EditContactModal from "@/components/crm/EditContactModal";
// Removed ConvertWorkspaceModal import as the component does not exist
import type { Contact } from "@/types/crm";

interface PageState {
  editModal: boolean;
  convertModal: boolean;
  activeTab: string;
}

type PageAction =
  | { type: "OPEN_EDIT" }
  | { type: "CLOSE_EDIT" }
  | { type: "OPEN_CONVERT" }
  | { type: "CLOSE_CONVERT" }
  | { type: "SET_TAB"; payload: string };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case "OPEN_EDIT":
      return { ...state, editModal: true };
    case "CLOSE_EDIT":
      return { ...state, editModal: false };
    case "OPEN_CONVERT":
      return { ...state, convertModal: true };
    case "CLOSE_CONVERT":
      return { ...state, convertModal: false };
    case "SET_TAB":
      return { ...state, activeTab: action.payload };
    default:
      return state;
  }
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as Id<"contacts">;

  const contact = useQuery(api.crm.getContactWithInteractions, { contactId });
  const createInteraction = useMutation(api.crm.createInteraction);
  const updateContact = useMutation(api.crm.updateContact);

  const [state, dispatch] = useReducer(pageReducer, {
    editModal: false,
    convertModal: false,
    activeTab: "overview",
  });

  const handleAddNote = useCallback(
    async (note: string) => {
      try {
        await createInteraction({
          contactId,
          type: "note",
          body: note,
        });
        toast.success("Note added");
      } catch {
        toast.error("Failed to add note");
      }
    },
    [contactId, createInteraction]
  );

  const handleStatusChange = useCallback(
    async (newStatus: Contact["status"]) => {
      try {
        await updateContact({
          contactId,
          patch: { status: newStatus },
        });
        toast.success(`Status updated to ${newStatus}`);
      } catch {
        toast.error("Failed to update status");
      }
    },
    [contactId, updateContact]
  );

  const getStatusOptions = useMemo(() => {
    const allStatuses: Contact["status"][] = ["lead", "qualified", "proposal", "won", "lost"];
    return allStatuses.filter((s) => s !== contact?.status);
  }, [contact?.status]);

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading contact...</p>
        </div>
      </div>
    );
  }

  const primaryPhone = contact.phones[0];
  const primaryEmail = contact.emails[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/crm")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contact.businessName}</h1>
              <Badge className="capitalize">{contact.status}</Badge>
            </div>
            {contact.ownerName && (
              <p className="text-lg text-muted-foreground mt-1">{contact.ownerName}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {contact.type}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Added {format(new Date(contact.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => dispatch({ type: "OPEN_EDIT" })}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {!contact.workspaceId && contact.status !== "lost" && (
              <Button onClick={() => dispatch({ type: "OPEN_CONVERT" })}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Convert to Workspace
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Contact Info */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone */}
              {primaryPhone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Phone</p>
                  <div className="flex items-center justify-between">
                    <a
                      href={`tel:${primaryPhone.number}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {primaryPhone.number}
                    </a>
                    <ConsentBadge channel="sms" status={primaryPhone.smsConsent || "unknown"} />
                  </div>
                </div>
              )}

              {/* Email */}
              {primaryEmail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center justify-between">
                    <a
                      href={`mailto:${primaryEmail.address}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {primaryEmail.address}
                    </a>
                    <ConsentBadge
                      channel="email"
                      status={primaryEmail.emailConsent || "unknown"}
                    />
                  </div>
                </div>
              )}

              {/* Website */}
              {contact.website && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Website</p>
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {contact.website}
                  </a>
                </div>
              )}

              {/* Location */}
              {contact.location && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Location</p>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <div>
                      {contact.location.line1 && <p>{contact.location.line1}</p>}
                      <p>
                        {[contact.location.city, contact.location.state, contact.location.zip]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Source */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Source</p>
                <p className="text-sm capitalize">{contact.source.replace("_", " ")}</p>
              </div>

              {/* Tags */}
              {contact.tags.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => dispatch({ type: "SET_TAB", payload: "outreach" })}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAddNote("Called - no answer")}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Log Call
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => dispatch({ type: "SET_TAB", payload: "timeline" })}
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="col-span-2">
          <Tabs
            value={state.activeTab}
            onValueChange={(value) => dispatch({ type: "SET_TAB", payload: value })}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="outreach">Outreach</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status Pipeline</CardTitle>
                  <CardDescription>Update contact status through the sales pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">{contact.status}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex gap-2">
                      {getStatusOptions.map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(status)}
                          className="capitalize"
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline
                    interactions={contact.interactions.slice(0, 5)}
                    compact
                  />
                  {contact.interactions.length > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => dispatch({ type: "SET_TAB", payload: "timeline" })}
                    >
                      View all {contact.interactions.length} interactions
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>All interactions with this contact</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <Timeline
                      interactions={contact.interactions}
                      onAddNote={handleAddNote}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outreach">
              <OutreachComposer contact={contact} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <EditContactModal
        contact={contact}
        open={state.editModal}
        onClose={() => dispatch({ type: "CLOSE_EDIT" })}
      />

      {/* ConvertWorkspaceModal temporarily removed until implemented */}

    </div>

    
  );
}