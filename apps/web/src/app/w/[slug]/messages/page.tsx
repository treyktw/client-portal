"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import ThreadList from "@/components/messages/ThreadList";
import MessageList from "@/components/messages/MessageList";
import MessageInput from "@/components/messages/MessageInput";
import RightSidebar from "@/components/messages/RightSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PanelLeft,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkspaceMessagesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showThreadList, setShowThreadList] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    _id: string;
    body: string;
    author?: { name?: string; email: string };
  } | null>(null);

  // Queries
  const currentUser = useQuery(api.users.getCurrentUser);
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const threads = useQuery(
    api.threads.getThreads,
    workspace ? { workspaceId: workspace._id, includeArchived: false } : "skip"
  );
  const selectedThread = useQuery(
    api.threads.getThreadById,
    selectedThreadId ? { threadId: selectedThreadId as Id<"threads"> } : "skip"
  );
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Auto-select default thread on load
  useEffect(() => {
    if (threads && threads.length > 0 && !selectedThreadId) {
      const defaultThread = threads.find(t => t.isDefault) || threads[0];
      if (defaultThread) {
        setSelectedThreadId(defaultThread._id);
      }
    }
  }, [threads, selectedThreadId]);

  // Check access
  const hasAccess = workspace && currentUser && (
    currentUser.role === "admin" ||
    workspace.ownerId === currentUser._id ||
    workspace.invitedEmail === currentUser.email
  );

  if (!workspace || !currentUser || !hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const isClientSender = !isAdmin;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || "";

  return (
    <div className="flex h-screen bg-background">
      {/* Thread List - Collapsible on mobile */}
      <div className={cn(
        "border-r bg-background transition-all duration-300",
        showThreadList ? "w-80" : "w-0 overflow-hidden",
        "max-md:absolute max-md:left-0 max-md:top-0 max-md:h-full max-md:z-20"
      )}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/w/${slug}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workspace
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowThreadList(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          {/* Thread List */}
          <div className="flex-1">
            <ThreadList
              workspaceId={workspace._id}
              selectedThreadId={selectedThreadId || undefined}
              onThreadSelect={(id) => {
                setSelectedThreadId(id);
                // On mobile, close thread list when selecting
                if (window.innerWidth < 768) {
                  setShowThreadList(false);
                }
              }}
              isAdmin={isAdmin}
            />
          </div>

          {/* Workspace Info */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">{workspace.name}</p>
              <p>{workspace.invitedEmail}</p>
              {unreadCount !== undefined && unreadCount > 0 && (
                <Badge variant="secondary" className="mt-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedThread && currentUser ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                {!showThreadList && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowThreadList(true)}
                    className="md:hidden"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  {selectedThread.isDefault ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <span className="text-xs font-medium">
                        {selectedThread.title.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="font-semibold">{selectedThread.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedThread.memberIds.length} members
                    </p>
                  </div>
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
                isAdmin={isAdmin}
                onReply={setReplyTo}
                // onTyping={setIsTyping}
              />
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0">
              <MessageInput
                workspaceId={workspace._id}
                threadId={selectedThread._id}
                workspaceName={workspace.name}
                senderName={currentUser.name || currentUser.email?.split('@')[0]}
                senderAvatar={currentUser.imageUrl}
                threadName={selectedThread.title}
                isClientSender={isClientSender}
                adminEmail={adminEmail || undefined}
                recipientEmails={(() => {
                  if (isClientSender) {
                    return adminEmail ? [adminEmail] : [];
                  }
                  const emails: string[] = [];
                  if (workspace.invitedEmail && workspace.invitedEmail !== currentUser.email) {
                    emails.push(workspace.invitedEmail);
                  }
                  return emails;
                })()}
                clientPhone={isClientSender ? (adminPhone || undefined) : workspace.businessInfo?.phone}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onTyping={() => {}}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-muted-foreground">
                Welcome to {workspace.name} Messages
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select a conversation to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      {showRightSidebar && selectedThread && workspace && (
        <div className={cn(
          "w-80 border-l",
          "max-md:absolute max-md:right-0 max-md:top-0 max-md:h-full max-md:z-20 max-md:bg-background"
        )}>
          <RightSidebar
            thread={selectedThread}
            workspace={workspace}
            onClose={() => setShowRightSidebar(false)}
          />
        </div>
      )}
    </div>
  );
}