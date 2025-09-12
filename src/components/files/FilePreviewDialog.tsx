// components/files/FilePreviewDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Copy, ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { getFileIcon, formatFileSize } from "@/lib/fileUtils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface FilePreviewDialogProps {
  file: {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
    customId: string;
    url?: string | null;
    createdAt: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}

export function FilePreviewDialog({ 
  file, 
  open, 
  onOpenChange, 
  onDownload 
}: FilePreviewDialogProps) {
  if (!file) return null;

  const handleCopyLink = () => {
    if (file.url) {
      navigator.clipboard.writeText(file.url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleOpenInNewTab = () => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const renderPreview = () => {
    if (!file.url) {
      return (
        <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
          {getFileIcon(file.mimeType, "lg")}
          <p className="mt-4 text-sm text-muted-foreground">
            Preview not available
          </p>
        </div>
      );
    }

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="relative w-full h-[60vh] bg-muted rounded-lg">
          <Image
            src={file.url}
            alt={file.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
          />
        </div>
      );
    }

    if (file.mimeType === "application/pdf") {
      return (
        <iframe
          src={file.url}
          className="w-full h-[60vh] rounded-lg border"
          title={file.name}
        />
      );
    }

    if (file.mimeType.includes("video")) {
      return (
        <video
          src={file.url}
          controls
          className="w-full h-auto max-h-[60vh] rounded-lg"
        >
          <track kind="captions" label="No captions available" />
          Your browser does not support the video tag.
        </video>
      );
    }

    if (file.mimeType.includes("audio")) {
      return (
        <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
          {getFileIcon(file.mimeType, "lg")}
          <audio
            src={file.url}
            controls
            className="mt-4 w-full max-w-md"
          >
            <track kind="captions" label="No captions available" />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // For DOCX files - use Microsoft Office Online viewer
    if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        file.mimeType.includes("word") && file.mimeType.includes("document")) {
      return (
        <div className="relative w-full h-[60vh] bg-muted rounded-lg">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url || "")}`}
            className="w-full h-full rounded-lg border"
            title={file.name}
          />
        </div>
      );
    }

    // For PPTX files - use Google Docs viewer for better presentation rendering
    if (file.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || 
        file.mimeType.includes("presentation") || 
        file.mimeType.includes("powerpoint")) {
      return (
        <div className="relative w-full h-[60vh] bg-muted rounded-lg">
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url || "")}&embedded=true`}
            className="w-full h-full rounded-lg border"
            title={file.name}
          />
        </div>
      );
    }

    // For other documents, spreadsheets, and files
    if (file.mimeType.includes("sheet") || 
        file.mimeType.includes("excel") || 
        file.mimeType.includes("document")) {
      return (
        <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
          {getFileIcon(file.mimeType, "lg")}
          <p className="mt-4 text-sm text-muted-foreground">
            Document preview not available
          </p>
          <Button onClick={onDownload} className="mt-4">
            <Download className="w-4 h-4 mr-2" />
            Download to View
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
        {getFileIcon(file.mimeType, "lg")}
        <p className="mt-4 text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-1/2 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getFileIcon(file.mimeType)}
            <span className="truncate">{file.name}</span>
          </DialogTitle>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>
              Uploaded {formatDistanceToNow(file.createdAt, { addSuffix: true })}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 my-4">
          {renderPreview()}
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button onClick={onDownload} variant="default">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleCopyLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={handleOpenInNewTab} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}