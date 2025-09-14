// components/messages/MessageInput.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, Paperclip, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/fileUtils";
import Image from "next/image";
import MessageContent from "./MessageContent";

interface MessageInputProps {
  threadId: Id<"threads">;
  workspaceId: Id<"workspaces">;
  replyTo?: {
    _id: string;
    body: string;
    author?: { name?: string; email: string };
  } | null;
  onCancelReply?: () => void;
  onTyping?: (isTyping: boolean) => void;
}

export default function MessageInput({
  threadId,
  workspaceId,
  replyTo,
  onCancelReply,
  onTyping,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Mutations
  const sendMessage = useMutation(api.messages.sendMessage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const updateTypingIndicator = useMutation(
    api.messagehelpers.updateTypingIndicator
  );

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onTyping?.(true);
    updateTypingIndicator({ threadId, isTyping: true });

    typingTimeoutRef.current = setTimeout(() => {
      onTyping?.(false);
      updateTypingIndicator({ threadId, isTyping: false });
    }, 2000);
  }, [threadId, onTyping, updateTypingIndicator]);

  // Handle message send
  const handleSend = async () => {
    if (!message.trim() && files.length === 0) return;

    setIsSending(true);

    const hasLinks = /https?:\/\/[^\s]+/.test(message);

    try {
      // Upload files first if any
      const fileIds: Id<"files">[] = [];
      if (files.length > 0) {
        setIsUploading(true);
        for (const file of files) {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { storageId } = await result.json();

          // Save file metadata
          const { fileId } = await saveFile({
            storageId,
            workspaceId,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            fileType: "document",
          });

          fileIds.push(fileId as Id<"files">);
        }
        setIsUploading(false);
      }

      // Send message
      await sendMessage({
        threadId,
        body: message.trim(),
        files: fileIds.length > 0 ? fileIds : undefined,
        replyToId: replyTo?._id as Id<"messages"> | undefined,
      });

      // Show notification if links were processed
    if (hasLinks) {
      toast.success("Message sent", {
        description: "Links have been shortened for readability",
      });
    }

      // Clear input
      setMessage("");
      setFiles([]);
      onCancelReply?.();

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping?.(false);
      updateTypingIndicator({ threadId, isTyping: false });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  // Remove file
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processMessageLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let processed = text;
    const matches = text.match(urlRegex) || [];

    matches.forEach((url) => {
      try {
        const urlObj = new URL(url);
        const linkText = urlObj.hostname.replace("www.", "").split(".")[0];
        const replacement = `[${linkText}](${url})`;
        processed = processed.replace(url, replacement);
      } catch {
        // Keep original if URL parsing fails
      }
    });

    return processed;
  };

  const renderFilePreview = (file: File) => {
    if (file.type.startsWith("image/")) {
      const imageUrl = URL.createObjectURL(file);
      return (
        <div className="relative w-16 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
          <Image
            src={imageUrl}
            alt={file.name}
            fill
            className="object-cover"
            unoptimized
            onLoad={() => {
              // Clean up object URL after image loads
              setTimeout(() => URL.revokeObjectURL(imageUrl), 100);
            }}
          />
        </div>
      );
    }

    if (file.type.includes("pdf")) {
      return (
        <div className="w-16 h-12 rounded-md bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
      );
    }

    if (file.type.includes("word") || file.type.includes("document")) {
      return (
        <div className="w-16 h-12 rounded-md bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    if (file.type.includes("excel") || file.type.includes("spreadsheet")) {
      return (
        <div className="w-16 h-12 rounded-md bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
          <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
      );
    }

    // Default file type
    return (
      <div className="w-16 h-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    );
  };

  return (
    <section
      className={cn(
        "border-t bg-background",
        isDragging && "ring-2 ring-primary ring-offset-2"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label="Message input"
    >
      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                  <span className="text-xs font-medium text-primary">
                    Replying to
                  </span>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {replyTo.author?.name || replyTo.author?.email.split("@")[0]}
                </span>
              </div>
              <div className="pl-3 border-l-2 border-primary/30 bg-muted/20 rounded-r-md py-1.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {replyTo.body ? (
                    <>
                      {replyTo.body.substring(0, 150)}
                      {replyTo.body.length > 150 && "..."}
                    </>
                  ) : (
                    "Message content unavailable"
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={onCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* File Preview */}
      {files.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={file.name}
                className="flex items-start gap-2 rounded-lg border bg-background p-2 text-xs max-w-xs"
              >
                {renderFilePreview(file)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(file.size)}
                  </p>
                  {file.type.startsWith("image/") && (
                    <p className="text-muted-foreground text-xs">Image</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 p-4 h-full">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isDragging ? "Drop files here..." : "Type a message..."}
          className="flex-1 h-[10px] resize-none"
          disabled={isUploading || isSending}
        />

        {message?.includes("http") && (
          <div className="px-4 pb-2">
            <div className="rounded-md bg-muted/50 p-2 text-xs">
              <p className="text-muted-foreground mb-1">
                Preview (links will be shortened):
              </p>
              <MessageContent content={processMessageLinks(message)} />
            </div>
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={
            (!message.trim() && files.length === 0) || isUploading || isSending
          }
          size="icon"
        >
          {isSending || isUploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </section>
  );
}
