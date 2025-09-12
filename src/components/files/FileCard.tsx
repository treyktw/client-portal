// components/files/FileCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, 
  Download, 
  Move, 
  Trash2, 
  Eye,
  Copy,
  FolderOpen,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getFileIcon, formatFileSize } from "@/lib/fileUtils";
import type { Id } from "@/convex/_generated/dataModel";

interface FileCardProps {
  file: {
    _id: Id<"files">;
    name: string;
    mimeType: string;
    size: number;
    url?: string | null;
  };
  folders?: Array<{ _id: Id<"folders">; name: string; color?: string }>;
  isDragging?: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onCopyLink: () => void;
  onMove: (folderId: Id<"folders"> | null) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function FileCard({
  file,
  folders = [],
  isDragging,
  onPreview,
  onDownload,
  onCopyLink,
  onMove,
  onDelete,
  onDragStart,
  onDragEnd,
}: FileCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("fileId", file._id);
    onDragStart();
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all cursor-pointer",
        isDragging && "opacity-50"
      )}
      onClick={onPreview}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* File preview or icon */}
          <div className="w-16 h-16 mb-2 flex items-center justify-center">
            {file.mimeType.startsWith("image/") && file.url ? (
              <div className="relative w-full h-full">
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
            ) : (
              getFileIcon(file.mimeType, "lg")
            )}
          </div>
          
          <p className="text-xs font-medium truncate w-full text-center">
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 h-6 w-6"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Move className="w-4 h-4 mr-2" />
                  Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onMove(null)}>
                    <Home className="w-4 h-4 mr-2" />
                    Root
                  </DropdownMenuItem>
                  {folders.map((folder) => (
                    <DropdownMenuItem
                      key={folder._id}
                      onClick={() => onMove(folder._id)}
                    >
                      <FolderOpen 
                        className="w-4 h-4 mr-2" 
                        style={{ color: folder.color }}
                      />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}