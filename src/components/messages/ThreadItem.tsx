// components/messages/ThreadItem.tsx
"use client";

import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import UnreadBadge from "./UnreadBadge";
import {
  Hash,
  MoreHorizontal,
  Pin,
  Archive,
  Edit,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ThreadItemProps {
  thread: Doc<"threads"> & {
    lastAuthor?: Doc<"users"> | null;
    unreadCount?: number;
  };
  workspace?: Doc<"workspaces">;
  isActive?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export default function ThreadItem({
  thread,
  workspace,
  isActive,
  onClick,
  onEdit,
  onArchive,
  onDelete,
  isAdmin,
}: ThreadItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors w-full text-left",
        "hover:bg-accent text-foreground",
        isActive && "bg-accent",
        thread.isArchived && "opacity-60"
      )}
      type="button"
    >
      {/* Thread Icon */}
      <div className="">
        {thread.isDefault ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Hash className="h-4 w-4 text-primary" />
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {thread.title.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Thread Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 max-w-22">
            <div className="flex items-center gap-2">
              <h4 className={cn("text-sm font-medium truncate group-hover:text-accent-foreground", isActive && "text-muted-foreground")}>
                {thread.title}
              </h4>
              {thread.isDefault && (
                <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            
            {thread.lastMessagePreview && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 group-hover:text-accent-foreground">
                {thread.lastAuthor && (
                  <span className="font-medium">
                    {thread.lastAuthor.name || thread.lastAuthor.email.split("@")[0]}:{" "}
                  </span>
                )}
                {thread.lastMessagePreview}
              </p>
            )}
            
            {workspace && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {workspace.name}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {thread.lastMessageAt && (
              <span className="text-xs text-muted-foreground group-hover:text-accent-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
              </span>
            )}
            
            {thread.unreadCount && thread.unreadCount > 0 && (
              <UnreadBadge count={thread.unreadCount} size="sm" className="group-hover:text-accent-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      {isAdmin && !thread.isDefault && (
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4 group-hover:text-accent-foreground " />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={(e) => handleMenuClick(e, onEdit)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Thread
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem onClick={(e) => handleMenuClick(e, onArchive)}>
                <Archive className="mr-2 h-4 w-4" />
                {thread.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
            )}
            {onDelete && !thread.isDefault && (
              <DropdownMenuItem
                onClick={(e) => handleMenuClick(e, onDelete)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Thread
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </button>
  );
}