// components/messages/MembersList.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Mail, Circle } from "lucide-react";

interface MembersListProps {
  memberIds: Id<"users">[];
  className?: string;
}

export default function MembersList({ memberIds, className }: MembersListProps) {
  // Fetch all users and filter by memberIds
  const allUsers = useQuery(api.users.getAllUsers);
  const members = allUsers?.filter(user => memberIds.includes(user._id));

  const getStatusColor = (lastActivity?: number) => {
    if (!lastActivity) return "offline";
    const now = Date.now();
    const diff = now - lastActivity;
    
    if (diff < 5 * 60 * 1000) return "online"; // Active in last 5 minutes
    if (diff < 30 * 60 * 1000) return "idle"; // Active in last 30 minutes
    return "offline";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { color: "bg-green-500", text: "Online" },
      idle: { color: "bg-yellow-500", text: "Away" },
      offline: { color: "bg-gray-400", text: "Offline" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs">
        <Circle className={cn("h-2 w-2 fill-current", config.color)} />
        {config.text}
      </Badge>
    );
  };

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {members?.map((member) => {
        if (!member) return null;
        
        // Mock status - in production, track last activity
        const status = getStatusColor(member.updatedAt);
        
        return (
          <div
            key={member._id}
            className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
          >
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.imageUrl} />
              <AvatarFallback className="text-xs">
                {getUserInitials(member.name, member.email)}
              </AvatarFallback>
            </Avatar>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {member.name || member.email.split("@")[0]}
                  </span>
                  {member.role === "admin" && (
                    <Badge variant="default" className="text-xs px-1.5 py-0">
                      Admin
                    </Badge>
                  )}
                </div>
                {getStatusBadge(status)}
              </div>
              
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
                {/* Phone would need to be added to user schema */}
                {/* {member.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{member.phone}</span>
                  </div>
                )} */}
              </div>
            </div>
          </div>
        );
      })}
      
      {(!members || members.length === 0) && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No members in this thread
        </p>
      )}
    </div>
  );
}