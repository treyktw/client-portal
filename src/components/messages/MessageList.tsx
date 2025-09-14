// components/messages/MessageList.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowDown } from "lucide-react";
import MessageItem from "./MessageItem";
import TypingIndicator from "./TypingIndicator";
import { toast } from "sonner";

interface EnrichedMessage extends Doc<"messages"> {
  replyTo?: {
    body: string;
    author?: Doc<"users"> | null;
  } | null;
}

interface MessageListProps {
  threadId: Id<"threads">;
  currentUserId: string;
  isAdmin?: boolean;
  onReply?: (message: EnrichedMessage) => void;
}

export default function MessageList({
  threadId,
  currentUserId,
  isAdmin = false,
  onReply,
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const messagesData = useQuery(api.messages.getMessages, { 
    threadId, 
    limit: 50 
  });

  const typingIndicators = useQuery(
    api.messagehelpers.getTypingIndicators,
    { threadId, excludeUserId: currentUserId as Id<"users"> }
  );

  // Mutations
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const pinMessage = useMutation(api.messages.pinMessage);
  const unpinMessage = useMutation(api.messages.unpinMessage);
  const addReaction = useMutation(api.messages.addReaction);
  const markAsRead = useMutation(api.messages.markAsRead);

  const messages = messagesData?.messages || [];

  // Mark messages as read when thread changes or new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.authorId !== currentUserId) {
        markAsRead({ threadId });
      }
    }
  }, [threadId, messages, currentUserId, markAsRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isAtBottom);
    setShowScrollButton(!isAtBottom && messages.length > 10);
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
  };

  const handleEditMessage = async (messageId: string, body: string) => {
    try {
      await editMessage({ messageId: messageId as Id<"messages">, body });
      toast.success("Message edited");
    } catch (error) {
      toast.error("Failed to edit message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> });
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      const message = messages.find(m => m._id === messageId);
      if (message?.isPinned) {
        await unpinMessage({ messageId: messageId as Id<"messages"> });
        toast.success("Message unpinned");
      } else {
        await pinMessage({ messageId: messageId as Id<"messages"> });
        toast.success("Message pinned");
      }
    } catch (error) {
      toast.error("Failed to pin message", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction({ 
        messageId: messageId as Id<"messages">, 
        emoji 
      });
    } catch (error) {
      toast.error("Failed to add reaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Load more messages
  const loadMore = async () => {
    if (messagesData?.hasMore && messagesData.nextCursor) {
      // Load more logic here
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: EnrichedMessage[]) => {
    const groups: { date: string; messages: EnrichedMessage[] }[] = [];
    let currentDate = "";
    
    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toLocaleDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (!messagesData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Messages Container */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        <div className="min-h-full flex flex-col">
          {/* Load more button */}
          {messagesData.hasMore && (
            <div className="flex justify-center p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
              >
                Load earlier messages
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 ? (
            <div className="flex-1 px-4 py-4 space-y-4">
              {messageGroups.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">
                        {group.date}
                      </span>
                    </div>
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-2">
                    {group.messages.map((message) => (
                      <div key={message._id} className="relative">
                        <MessageItem
                          message={message}
                          currentUserId={currentUserId}
                          isAdmin={isAdmin}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onPin={handlePinMessage}
                          onReply={onReply}
                          onReaction={handleReaction}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No messages yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start the conversation by sending a message
              </p>
            </div>
          )}

          {/* Invisible scroll anchor */}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Typing Indicator */}
      {typingIndicators && typingIndicators.length > 0 && (
        <div className="px-4 py-2 border-t bg-background">
          <TypingIndicator 
            users={typingIndicators
              .map(ti => ti.user)
              .filter((user): user is NonNullable<typeof user> => user !== null)} 
          />
        </div>
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-20 right-4 rounded-full shadow-lg z-10"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}