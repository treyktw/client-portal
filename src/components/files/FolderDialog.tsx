// components/files/FolderDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const FOLDER_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: {
    _id: string;
    name: string;
    color?: string;
  } | null;
  onSave: (name: string, color: string) => void;
}

export function FolderDialog({ 
  open, 
  onOpenChange, 
  folder, 
  onSave 
}: FolderDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [error, setError] = useState("");

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color || "#6b7280");
    } else {
      setName("");
      setColor("#6b7280");
    }
    setError("");
  }, [folder]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    if (name.length > 50) {
      setError("Folder name must be less than 50 characters");
      return;
    }

    onSave(name.trim(), color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" style={{ color }} />
            {folder ? "Edit Folder" : "Create New Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="Enter folder name"
              className={cn(error && "border-destructive")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Folder Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {FOLDER_COLORS.map((colorOption) => (
                <Button
                  key={colorOption.value}
                  onClick={() => setColor(colorOption.value)}
                  className={cn(
                    "relative h-10 rounded-md border-2 transition-all hover:scale-105",
                    color === colorOption.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                >
                  {color === colorOption.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                  <span className="sr-only">{colorOption.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <FolderOpen className="w-12 h-12" style={{ color }} />
              <span className="text-sm font-medium">{name || "New Folder"}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {folder ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}