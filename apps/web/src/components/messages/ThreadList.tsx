// components/messages/ThreadList.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ThreadItem from "./ThreadItem";
import { Plus, Search, Archive } from "lucide-react";
import { toast } from "sonner";

interface ThreadListProps {
  workspaceId?: Id<"workspaces">;
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  isAdmin?: boolean;
}

export default function ThreadList({
  workspaceId,
  selectedThreadId,
  onThreadSelect,
  isAdmin = false,
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");

  // Queries
  const threads = useQuery(
    api.threads.getThreads,
    workspaceId ? { workspaceId, includeArchived: showArchived } : "skip"
  );

  const globalThreads = useQuery(
    api.threads.getAllThreadsForAdmin,
    isAdmin && !workspaceId ? { limit: 50 } : "skip"
  );

  // Mutations
  const createThread = useMutation(api.threads.createThread);
  const updateThread = useMutation(api.threads.updateThread);
  const deleteThread = useMutation(api.threads.deleteThread);

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !workspaceId) return;

    try {
      const threadId = await createThread({
        workspaceId,
        title: newThreadTitle.trim(),
        isDefault: false,
      });
      
      setNewThreadTitle("");
      setShowNewThreadDialog(false);
      onThreadSelect(threadId);
      toast.success("Thread created");
    } catch (error) {
      toast.error("Failed to create thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleArchiveThread = async (threadId: Id<"threads">, isArchived: boolean) => {
    try {
      await updateThread({
        threadId,
        isArchived: !isArchived,
      });
      toast.success(isArchived ? "Thread unarchived" : "Thread archived");
    } catch (error) {
      toast.error("Failed to update thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteThread = async (threadId: Id<"threads">) => {
    try {
      await deleteThread({ threadId });
      toast.success("Thread deleted");
      if (selectedThreadId === threadId) {
        // Select the first available thread
        const firstThread = displayThreads?.[0];
        if (firstThread) {
          onThreadSelect(firstThread._id);
        }
      }
    } catch (error) {
      toast.error("Failed to delete thread", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Determine which threads to display
  const displayThreads = workspaceId
    ? threads
    : globalThreads?.threads;

  // Filter threads by search query
  const filteredThreads = displayThreads?.filter((thread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.title.toLowerCase().includes(query) ||
      thread.lastMessagePreview?.toLowerCase().includes(query) ||
      thread.workspaceId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {workspaceId ? "Conversations" : "All Conversations"}
          </h2>
          {isAdmin && workspaceId && (
            <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Thread</DialogTitle>
                  <DialogDescription>
                    Start a new conversation thread in this workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="thread-title">Thread Title</Label>
                    <Input
                      id="thread-title"
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                      placeholder="e.g., Design Discussion"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreateThread();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewThreadDialog(false);
                        setNewThreadTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()}>
                      Create Thread
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>

        {/* Archive Toggle */}
        {workspaceId && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
        )}
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredThreads?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No conversations found"
                  : "No conversations yet"}
              </p>
              {workspaceId && !searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new thread to start chatting
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredThreads?.map((thread) => (
                <ThreadItem
                  key={thread._id}
                  thread={thread}
                  isActive={selectedThreadId === thread._id}
                  onClick={() => onThreadSelect(thread._id)}
                  onArchive={() => handleArchiveThread(thread._id, thread.isArchived || false)}
                  onDelete={() => handleDeleteThread(thread._id)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Load More for Global View */}
      {!workspaceId && globalThreads?.hasMore && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              // Load more logic here
            }}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}