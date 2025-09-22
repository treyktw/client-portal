// components/crm/OutreachComposer.tsx
"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { trpc } from "@/lib/trpc-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Mail, Send, Loader2, AlertTriangle, X } from "lucide-react";
import type { Contact, OutreachState, OutreachAction } from "@/types/crm";

const outreachReducer = (state: OutreachState, action: OutreachAction): OutreachState => {
  switch (action.type) {
    case "SET_CHANNEL":
      return { ...state, channel: action.payload, templateId: null, subject: "", body: "" };
    case "SET_TEMPLATE":
      return { ...state, templateId: action.payload };
    case "SET_SUBJECT":
      return { ...state, subject: action.payload };
    case "SET_BODY":
      return { ...state, body: action.payload };
    case "SET_VARIABLE":
      return { ...state, variables: { ...state.variables, [action.key]: action.value } };
    case "SET_VARIABLES":
      return { ...state, variables: action.payload };
    case "START_SEND":
      return { ...state, isSending: true, error: null };
    case "SEND_SUCCESS":
      return { ...state, isSending: false, body: "", subject: "", templateId: null, variables: {} };
    case "SEND_ERROR":
      return { ...state, isSending: false, error: action.payload };
    case "RESET":
      return {
        channel: "sms",
        templateId: null,
        subject: "",
        body: "",
        variables: {},
        isSending: false,
        error: null,
      };
    default:
      return state;
  }
};

interface OutreachComposerProps {
  contact: Contact;
}

export default function OutreachComposer({ contact }: OutreachComposerProps) {
  const templates = useQuery(api.notificationsystem.getMessageTemplates, {}) || [];
  const sendSms = trpc.notifications.sendSms.useMutation({
    onSuccess: () => toast.success("SMS sent successfully"),
    onError: (error) => toast.error(error.message || "Failed to send SMS"),
  });
  const sendEmail = trpc.notifications.sendEmail.useMutation({
    onSuccess: () => toast.success("Email sent successfully"),
    onError: (error) => toast.error(error.message || "Failed to send email"),
  });

  const [state, dispatch] = useReducer(outreachReducer, {
    channel: "sms",
    templateId: null,
    subject: "",
    body: "",
    variables: {},
    isSending: false,
    error: null,
  });

  const primaryPhone = contact.phones[0];
  const primaryEmail = contact.emails[0];

  const canSendSms = useMemo(
    () => primaryPhone && primaryPhone.smsConsent !== "opted_out",
    [primaryPhone]
  );

  const canSendEmail = useMemo(
    () => primaryEmail && primaryEmail.emailConsent !== "opted_out",
    [primaryEmail]
  );

  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === state.channel && t.isActive),
    [templates, state.channel]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === state.templateId),
    [templates, state.templateId]
  );

  const processedBody = useMemo(() => {
    let body = selectedTemplate?.body || state.body;
    
    // Replace variables
    const defaultVars = {
      businessName: contact.businessName,
      ownerFirst: contact.ownerName?.split(" ")[0] || "",
      ownerName: contact.ownerName || "",
      portalUrl: `${window.location.origin}/w/${contact.workspaceId || "pending"}`,
      ...state.variables,
    };

    Object.entries(defaultVars).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      body = body.replace(regex, value);
    });

    return body;
  }, [selectedTemplate, state.body, state.variables, contact]);

  const processedSubject = useMemo(() => {
    let subject = selectedTemplate?.subject || state.subject;
    
    const defaultVars = {
      businessName: contact.businessName,
      projectName: contact.businessName,
      ...state.variables,
    };

    Object.entries(defaultVars).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, "g");
      subject = subject.replace(regex, value);
    });

    return subject;
  }, [selectedTemplate, state.subject, state.variables, contact]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = templates.find((t) => t._id === templateId);
    if (!template) return;

    dispatch({ type: "SET_TEMPLATE", payload: templateId });
    dispatch({ type: "SET_BODY", payload: template.body });
    if (template.subject) {
      dispatch({ type: "SET_SUBJECT", payload: template.subject });
    }

    // Extract default variables
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => {
      if (!["businessName", "ownerFirst", "ownerName", "portalUrl"].includes(v)) {
        vars[v] = "";
      }
    });
    dispatch({ type: "SET_VARIABLES", payload: vars });
  }, [templates]);

  const handleSend = useCallback(async () => {
    dispatch({ type: "START_SEND" });

    try {
      if (state.channel === "sms") {
        if (!canSendSms) {
          throw new Error("Cannot send SMS - no consent or no phone number");
        }

        await sendSms.mutateAsync({
          contactId: contact._id,
          toPhone: primaryPhone?.number,
          templateId: state.templateId ?? undefined,
          body: processedBody,
          variables: state.variables,
        });

        // success toast handled in mutation onSuccess
        console.log("SMS sent successfully");
      } else {
        if (!canSendEmail) {
          throw new Error("Cannot send email - no consent or no email address");
        }

        await sendEmail.mutateAsync({
          contactId: contact._id,
          toEmail: primaryEmail?.address,
          templateId: state.templateId ?? undefined,
          subject: processedSubject,
          body: processedBody,
          variables: state.variables,
        });

        // success toast handled in mutation onSuccess
        console.log("Email sent successfully");
      }

      dispatch({ type: "SEND_SUCCESS" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      dispatch({ type: "SEND_ERROR", payload: message });
      toast.error(message);
    }
  }, [
    state,
    contact._id,
    canSendSms,
    canSendEmail,
    processedBody,
    processedSubject,
    sendSms,
    sendEmail,
    primaryPhone?.number,
    primaryEmail?.address,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Message</CardTitle>
        <CardDescription>
          Send SMS or email to {contact.businessName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={state.channel}
          onValueChange={(value) => dispatch({ type: "SET_CHANNEL", payload: value as "sms" | "email" })}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sms" disabled={!primaryPhone}>
              <Phone className="h-4 w-4 mr-2" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" disabled={!primaryEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-4">
            {!canSendSms ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {!primaryPhone
                    ? "No phone number on file"
                    : "Contact has opted out of SMS messages"}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>To</Label>
                  <div className="flex items-center gap-2">
                    <Input value={primaryPhone.number} disabled />
                    <Badge variant="default">
                      {primaryPhone.smsConsent === "opted_in" ? "Opted In" : "Unknown"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={state.templateId ?? "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        dispatch({ type: "SET_TEMPLATE", payload: null });
                        return;
                      }
                      handleTemplateSelect(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {channelTemplates.map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate?.variables.filter(
                  (v) => !["businessName", "ownerFirst", "ownerName", "portalUrl"].includes(v)
                ).map((variable) => (
                  <div key={variable} className="space-y-2">
                    <Label>{variable}</Label>
                    <Input
                      value={state.variables[variable] || ""}
                      onChange={(e) =>
                        dispatch({ type: "SET_VARIABLE", key: variable, value: e.target.value })
                      }
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={processedBody}
                    onChange={(e) => dispatch({ type: "SET_BODY", payload: e.target.value })}
                    placeholder="Type your message..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {processedBody.length}/160 characters
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            {!canSendEmail ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {!primaryEmail
                    ? "No email address on file"
                    : "Contact has opted out of email messages"}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>To</Label>
                  <div className="flex items-center gap-2">
                    <Input value={primaryEmail.address} disabled />
                    <Badge variant="default">
                      {primaryEmail.emailConsent === "opted_in" ? "Opted In" : "Unknown"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={state.templateId ?? "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        dispatch({ type: "SET_TEMPLATE", payload: null });
                        return;
                      }
                      handleTemplateSelect(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {channelTemplates.map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate?.variables.filter(
                  (v) => !["businessName", "ownerFirst", "ownerName", "portalUrl", "projectName"].includes(v)
                ).map((variable) => (
                  <div key={variable} className="space-y-2">
                    <Label>{variable}</Label>
                    <Input
                      value={state.variables[variable] || ""}
                      onChange={(e) =>
                        dispatch({ type: "SET_VARIABLE", key: variable, value: e.target.value })
                      }
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={processedSubject}
                    onChange={(e) => dispatch({ type: "SET_SUBJECT", payload: e.target.value })}
                    placeholder="Email subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={processedBody}
                    onChange={(e) => dispatch({ type: "SET_BODY", payload: e.target.value })}
                    placeholder="Type your message..."
                    rows={8}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {state.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "RESET" })}
            disabled={state.isSending}
            className="hover:text-red-500"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button
            onClick={handleSend}
            disabled={
              state.isSending ||
              !processedBody ||
              (state.channel === "sms" ? !canSendSms : !canSendEmail) ||
              (state.channel === "email" && !processedSubject)
            }
          >
            {state.isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {state.channel === "sms" ? "SMS" : "Email"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}