// components/messages/MessageItem.tsx
"use client";

import { useState } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Edit,
  Trash2,
  Pin,
  Reply,
  MoreHorizontal,
  Check,
  X,
  Smile,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import MessageContent from "./MessageContent";

interface EnrichedMessage extends Doc<"messages"> {
  author?: Doc<"users"> | null;
  replyTo?: {
    body: string;
    author?: Doc<"users"> | null;
  } | null;
}

interface MessageItemProps {
  message: EnrichedMessage;
  currentUserId: string;
  isAdmin?: boolean;
  onEdit?: (messageId: string, body: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onReply?: (message: EnrichedMessage) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😄", "🎉", "👏", "🔥"];

export default function MessageItem({
  message,
  currentUserId,
  isAdmin = false,
  onEdit,
  onDelete,
  onPin,
  onReply,
  onReaction,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.body);
  const [showReactions, setShowReactions] = useState(false);

  const isOwnMessage = message.authorId === currentUserId;
  const canEdit = isOwnMessage && !message.deletedAt;
  const canDelete = (isOwnMessage || isAdmin) && !message.deletedAt;

  // Get file URLs for message attachments
  const messageFiles = useQuery(
    api.files.getFileUrls,
    message.files && message.files.length > 0
      ? { fileIds: message.files }
      : "skip"
  );

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.body) {
      onEdit?.(message._id, editText);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.body);
    setIsEditing(false);
  };

  const renderFilePreview = (file: Doc<"files"> & { url: string | null }) => {
    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="relative w-20 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
          <Image
            src={file.url || "Error loading image"}
            alt={file.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      );
    }

    if (file.mimeType.includes("pdf")) {
      return (
        <div className="w-20 h-16 rounded-md bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
      );
    }

    if (file.mimeType.includes("word") || file.mimeType.includes("document")) {
      return (
        <div className="w-20 h-16 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    // Default file type
    return (
      <div className="w-20 h-16 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  const getUserInitials = (user?: Doc<"users"> | null) => {
    if (!user) return "??";
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const getUserName = (user?: Doc<"users"> | null) => {
    if (!user) return "Unknown";
    return user.name || user.email.split("@")[0];
  };

  // Group reactions by emoji
  const groupedReactions = message.reactions?.reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction.userId);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-4 hover:bg-accent/50 transition-colors mb-6",
        message.deletedAt && "opacity-60",
        message.isPinned && "bg-amber-50/50 dark:bg-amber-950/20"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 mt-0.5">
        <AvatarImage src={message.author?.imageUrl} />
        <AvatarFallback className="text-xs">
          {getUserInitials(message.author)}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0 mt-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {getUserName(message.author)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {message.isPinned && <Pin className="h-3 w-3 text-amber-600" />}
        </div>

        {/* Reply Reference */}
        {message.replyTo && (
          <div className="mt-2 mb-3 pl-3 border-l-2 border-primary/30 bg-muted/20 rounded-r-md py-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                <span className="text-xs font-medium text-primary">
                  Replying to
                </span>
              </div>
              <span className="text-xs font-medium text-foreground">
                {getUserName(message.replyTo.author)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {message.replyTo.body.substring(0, 120)}
              {message.replyTo.body.length > 120 && "..."}
            </p>
          </div>
        )}

        {/* Message Body */}
        {isEditing ? (
          <div className="mt-3">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[60px] resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <MessageContent
            content={message.body}
            className="text-sm whitespace-pre-wrap break-words"
          />
        )}

        {/* Files */}
        {messageFiles && messageFiles.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {messageFiles.map((file) => (
              <div
                key={file._id}
                className="flex items-start gap-2 rounded-lg border bg-muted/30 p-2 max-w-xs"
              >
                {renderFilePreview(file)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.mimeType.startsWith("image/") ? "Image" : "File"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        {/* {message.links && message.links.length > 0 && (
          <div className="mt-3 space-y-1">
            {message.links.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {link.title || link.url}
              </a>
            ))}
          </div>
        )} */}

        {/* Reactions */}
        {groupedReactions && Object.keys(groupedReactions).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {Object.entries(groupedReactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(currentUserId);
              return (
                <TooltipProvider key={emoji}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={hasReacted ? "secondary" : "ghost"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onReaction?.(message._id, emoji)}
                      >
                        <span className="mr-1">{emoji}</span>
                        {userIds.length}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {userIds.length === 1
                          ? "1 reaction"
                          : `${userIds.length} reactions`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1">
        {/* Quick Reactions */}
        {!message.deletedAt && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowReactions(!showReactions)}
            >
              <Smile className="h-4 w-4" />
            </Button>
            {showReactions && (
              <div className="absolute right-0 top-8 z-10 flex gap-1 rounded-md border bg-background p-1 shadow-md">
                {QUICK_REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      onReaction?.(message._id, emoji);
                      setShowReactions(false);
                    }}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reply */}
        {!message.deletedAt && onReply && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onReply(message)}
          >
            <Reply className="h-4 w-4" />
          </Button>
        )}

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {isAdmin && onPin && (
              <DropdownMenuItem onClick={() => onPin(message._id)}>
                <Pin className="mr-2 h-4 w-4" />
                {message.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => onDelete?.(message._id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
