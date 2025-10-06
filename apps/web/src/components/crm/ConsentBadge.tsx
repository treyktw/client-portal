// components/crm/ConsentBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, Mail, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsentStatus } from "@/types/crm";

interface ConsentBadgeProps {
  channel: "sms" | "email";
  status: ConsentStatus;
  size?: "sm" | "md";
}

export default function ConsentBadge({ channel, status, size = "sm" }: ConsentBadgeProps) {
  const getIcon = () => {
    const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
    
    if (channel === "sms") {
      return <Phone className={iconClass} />;
    }
    return <Mail className={iconClass} />;
  };

  const getStatusIcon = () => {
    const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
    
    switch (status) {
      case "opted_in":
        return <CheckCircle className={iconClass} />;
      case "opted_out":
        return <XCircle className={iconClass} />;
      default:
        return <HelpCircle className={iconClass} />;
    }
  };

  const getVariant = () => {
    switch (status) {
      case "opted_in":
        return "default";
      case "opted_out":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getTooltip = () => {
    const channelName = channel === "sms" ? "SMS" : "Email";
    switch (status) {
      case "opted_in":
        return `${channelName} opted in`;
      case "opted_out":
        return `${channelName} opted out`;
      default:
        return `${channelName} consent unknown`;
    }
  };

  return (
    <Badge
      variant={getVariant() as any}
      className={cn(
        "gap-1",
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm"
      )}
      title={getTooltip()}
    >
      {getIcon()}
      {getStatusIcon()}
    </Badge>
  );
}