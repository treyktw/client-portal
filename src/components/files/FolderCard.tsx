// components/files/FolderCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, MoreVertical, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { Id } from "@/convex/_generated/dataModel";

interface FolderCardProps {
  folder: {
    _id: Id<"folders">;
    name: string;
    color?: string;
    parentId?: Id<"folders">;
  };
  thumbnails?: Array<{ url: string; name: string }>;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDrop: (itemId: string, itemType: "file" | "folder") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging?: boolean;
}

export function FolderCard({
  folder,
  thumbnails = [],
  onOpen,
  onEdit,
  onDelete,
  onDrop,
  onDragStart,
  onDragEnd,
  isDragging,
}: FolderCardProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("itemId", folder._id);
    e.dataTransfer.setData("itemType", "folder");
    onDragStart();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're dragging a file or folder
    const itemType = e.dataTransfer.types.includes("itemtype") || 
                     e.dataTransfer.types.includes("Files");
    if (itemType) {
      setDragOver(true);
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragOver to false if we're leaving the card entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    // Handle file drops from system
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // This is handled by parent component
      return;
    }
    
    // Handle internal drag and drop
    const itemId = e.dataTransfer.getData("itemId");
    const itemType = e.dataTransfer.getData("itemType") as "file" | "folder";
    
    if (itemId && itemType) {
      // Don't allow dropping a folder into itself
      if (itemType === "folder" && itemId === folder._id) {
        return;
      }
      onDrop(itemId, itemType);
    }
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-lg transition-all cursor-pointer relative overflow-visible",
        dragOver && "ring-2 ring-primary bg-primary/5",
        isDragging && "opacity-50"
      )}
      onDoubleClick={onOpen}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      draggable
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center">
          {/* Folder icon with thumbnail preview */}
          <div className="relative w-16 h-16 mb-2 pointer-events-none">
            {thumbnails.length > 0 ? (
              <div className="w-full h-full relative">
                <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-2 bg-muted rounded">
                  {thumbnails.slice(0, 4).map((thumb) => (
                    <div key={thumb.url} className="relative overflow-hidden rounded-sm">
                      <Image
                        src={thumb.url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
                <FolderOpen
                  className="absolute -bottom-1 -right-1 w-8 h-8 drop-shadow-md"
                  style={{ color: folder.color || "#6b7280" }}
                />
              </div>
            ) : (
              <FolderOpen
                className="w-full h-full"
                style={{ color: folder.color || "#6b7280" }}
              />
            )}
          </div>
          
          <p className="text-sm font-medium truncate w-full text-center">
            {folder.name}
          </p>
        </div>
        
        {/* Dropdown menu positioned relative to this card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
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
      </CardContent>
    </Card>
  );
} 