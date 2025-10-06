// components/messages/RightSidebar.tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Doc, Id } from "@telera/convex";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Pin,
  FileText,
  Link,
  Users,
  X,
  ExternalLink,
  Download,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getFileIcon } from "@/lib/fileUtils";
import MembersList from "./MembersList";

interface RightSidebarProps {
  thread: Doc<"threads">;
  workspace: Doc<"workspaces">;
  onClose?: () => void;
}

export default function RightSidebar({
  thread,
  workspace,
  onClose,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("info");

  // Queries
  const pinnedMessages = useQuery(api.messages.getPinnedMessages, {
    threadId: thread._id,
  });

  const messages = useQuery(api.messages.getMessages, {
    threadId: thread._id,
    limit: 100, // Get more messages to extract files and links
  });

  // Extract files and links from messages
  const filesInThread =
    messages?.messages
      .filter((m) => m.files && m.files.length > 0)
      .flatMap(
        (m) =>
          m.files?.map((fileId) => ({
            fileId,
            message: m,
          })) || []
      ) || [];

  const linksInThread =
    messages?.messages
      .filter((m) => m.links && m.links.length > 0)
      .flatMap(
        (m) =>
          m.links?.map((link) => ({
            ...link,
            message: m,
          })) || []
      ) || [];

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Thread Details</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="gap-1">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Info</span>
          </TabsTrigger>
          <TabsTrigger value="pins" className="gap-1">
            <Pin className="h-4 w-4" />
            <span className="hidden sm:inline">Pins</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Files</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1">
            <Link className="h-4 w-4" />
            <span className="hidden sm:inline">Links</span>
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
              {/* Thread Info */}
              <div>
                <h4 className="text-sm font-medium mb-2">Thread Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{thread.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={thread.isDefault ? "default" : "secondary"}>
                      {thread.isDefault ? "Default" : "Custom"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>
                      {formatDistanceToNow(new Date(thread.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {thread.lastMessageAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Last Activity
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(thread.lastMessageAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workspace Info */}
              <div>
                <h4 className="text-sm font-medium mb-2">Workspace</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{workspace.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span>{workspace.invitedEmail}</span>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Members ({thread.memberIds.length})
                </h4>
                <MembersList memberIds={thread.memberIds} />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Pins Tab */}
        <TabsContent value="pins" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {pinnedMessages && pinnedMessages.length > 0 ? (
                <div className="space-y-3">
                  {pinnedMessages.map((message) => (
                    <div
                      key={message._id}
                      className="rounded-lg border bg-amber-50/50 p-3 dark:bg-amber-950/20"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={message.author?.imageUrl} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(message.author)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">
                              {getUserName(message.author)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(message.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          <p className="text-sm">{message.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Pin className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pinned messages
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pin important messages to keep them easily accessible
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {filesInThread.length > 0 ? (
                <div className="space-y-2">
                  {filesInThread.map(({ fileId, message }) => (
                    <div
                      key={fileId}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon("application/octet-stream", "sm")}
                        <div>
                          <p className="text-sm font-medium">File</p>
                          <p className="text-xs text-muted-foreground">
                            Shared by {getUserName(message.author)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No files shared
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Files shared in this thread will appear here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {linksInThread.length > 0 ? (
                <div className="space-y-2">
                  {linksInThread.map((link, index) => (
                    <div
                      key={`${link.url}-${index}`}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400 truncate block"
                        >
                          {link.title || link.url}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          Shared by {getUserName(link.message.author)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Link className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No links shared
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Links shared in this thread will appear here
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
