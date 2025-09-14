"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import ThreadList from "@/components/messages/ThreadList";
import MessageList from "@/components/messages/MessageList";
import MessageInput from "@/components/messages/MessageInput";
import RightSidebar from "@/components/messages/RightSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelRightClose, PanelRightOpen, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminMessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    _id: string;
    body: string;
    author?: { name?: string; email: string };
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Queries
  const currentUser = useQuery(api.users.getCurrentUser);
  const workspaces = useQuery(api.workspaces.getAllWorkspaces);
  const selectedThread = useQuery(
    api.threads.getThreadById,
    selectedThreadId ? { threadId: selectedThreadId as Id<"threads"> } : "skip"
  );
  const unreadCount = useQuery(api.messages.getUnreadCount, {});

  // Get workspace for selected thread
  const threadWorkspace = useMemo(() => {
    if (!selectedThread || !workspaces) return null;
    return workspaces.find(w => w._id === selectedThread.workspaceId);
  }, [selectedThread, workspaces]);

  // Filter threads by workspace if selected
  const filteredWorkspaceId = selectedWorkspaceId as Id<"workspaces"> | undefined;

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">

      {/* Main Content */}
      <div className={cn(
        "flex flex-1 transition-all duration-300",
        sidebarOpen ? "" : "ml-0"
      )}>
        {/* Workspace Filter & Thread List */}
        <div className="w-80 border-r flex flex-col">
          {/* Workspace Filter */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Workspace</span>
            </div>
            <Select
              value={selectedWorkspaceId || "all"}
              onValueChange={(value) => 
                setSelectedWorkspaceId(value === "all" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces?.map((workspace) => (
                  <SelectItem key={workspace._id} value={workspace._id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thread List */}
          <div className="flex-1">
            <ThreadList
              workspaceId={filteredWorkspaceId}
              selectedThreadId={selectedThreadId || undefined}
              onThreadSelect={setSelectedThreadId}
              isAdmin={true}
            />
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedThread && currentUser ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="font-semibold">{selectedThread.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {threadWorkspace?.name}
                    </p>
                  </div>
                  {selectedThread.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                  {showRightSidebar ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden min-h-0">
                <MessageList
                  threadId={selectedThread._id}
                  currentUserId={currentUser._id}
                  isAdmin={true}
                  onReply={setReplyTo}
                />
              </div>

              {/* Message Input */}
              {threadWorkspace && (
                <div className="flex-shrink-0">
                  <MessageInput
                    threadId={selectedThread._id}
                    workspaceId={threadWorkspace._id}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a thread from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {showRightSidebar && selectedThread && threadWorkspace && (
          <div className="w-80">
            <RightSidebar
              thread={selectedThread as Doc<"threads">}
              workspace={threadWorkspace as Doc<"workspaces">}
              onClose={() => setShowRightSidebar(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}