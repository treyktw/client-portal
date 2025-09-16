// app/w/[slug]/files/page.tsx
"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,

  FolderOpen,
  FolderPlus,
  Home,
  ChevronRight,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Edit,
  Copy,
  Move,
  X,
  CheckSquare,
  MousePointer,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import Image from "next/image";
import { getFileIcon, formatFileSize } from "@/lib/fileUtils";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { FolderDialog } from "@/components/files/FolderDialog";
import { cn } from "@/lib/utils";

interface FileWithUrl {
  _id: Id<"files">;
  name: string;
  mimeType: string;
  size: number;
  customId: string;
  fileType: string;
  folderId?: Id<"folders">;
  url?: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Folder {
  _id: Id<"folders">;
  name: string;
  color?: string;
  parentId?: Id<"folders">;
  createdAt: number;
}

interface ViewState {
  mode: "grid" | "list";
  searchQuery: string;
  currentFolderId: Id<"folders"> | null;
  selectedFile: FileWithUrl | null;
  previewOpen: boolean;
  folderDialogOpen: boolean;
  editingFolder: Folder | null;
  uploadProgress: number;
  isUploading: boolean;
  selectedItems: Set<string>;
  selectionMode: boolean;
  draggedItem: string | null;
  dragOverFolder: string | null;
}

export default function FilesPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Queries
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const files = useQuery(api.files.getWorkspaceFiles, 
    workspace?._id ? { workspaceId: workspace._id } : "skip"
  );
  const folders = useQuery(api.folders.getFolders, 
    workspace?._id ? { workspaceId: workspace._id } : "skip"
  );

  // Mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteFile = useMutation(api.files.deleteFile);
  const moveFileToFolder = useMutation(api.files.moveFileToFolder);
  const createFolder = useMutation(api.folders.createFolder);
  const updateFolder = useMutation(api.folders.updateFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const moveFolder = useMutation(api.folders.moveFolder);

  // State
  const [viewState, setViewState] = useState<ViewState>({
    mode: "grid",
    searchQuery: "",
    currentFolderId: null,
    selectedFile: null,
    previewOpen: false,
    folderDialogOpen: false,
    editingFolder: null,
    uploadProgress: 0,
    isUploading: false,
    selectedItems: new Set(),
    selectionMode: false,
    draggedItem: null,
    dragOverFolder: null,
  });

  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, []);

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(viewState.selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    updateViewState({ 
      selectedItems: newSelection,
      selectionMode: newSelection.size > 0 
    });
  };

  // Select all items
  const selectAll = () => {
    const allItems = new Set<string>();
    currentFolders.forEach(f => { allItems.add(`folder-${f._id}`); });
    currentFiles.forEach(f => { allItems.add(`file-${f._id}`); });
    updateViewState({ 
      selectedItems: allItems, 
      selectionMode: true 
    });
  };

  // Clear selection
  const clearSelection = useCallback(() => {
    updateViewState({ 
      selectedItems: new Set(), 
      selectionMode: false 
    });
  }, [updateViewState]);

  // Batch delete
  const batchDelete = async () => {
    const items = Array.from(viewState.selectedItems);
    const confirmMsg = `Delete ${items.length} item(s)?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      for (const item of items) {
        const [type, id] = item.split("-");
        if (type === "file") {
          await deleteFile({ fileId: id as Id<"files"> });
        } else if (type === "folder") {
          await deleteFolder({ folderId: id as Id<"folders"> });
        }
      }
      toast.success(`Deleted ${items.length} items`);
      clearSelection();
    } catch (error) {
      toast.error("Failed to delete some items", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Batch move
  const batchMove = useCallback(async (targetFolderId: Id<"folders"> | null) => {
    const items = Array.from(viewState.selectedItems);
    
    try {
      for (const item of items) {
        const [type, id] = item.split("-");
        if (type === "file") {
          await moveFileToFolder({ 
            fileId: id as Id<"files">, 
            folderId: targetFolderId || undefined 
          });
        } else if (type === "folder" && targetFolderId !== id) {
          await moveFolder({ 
            folderId: id as Id<"folders">, 
            parentId: targetFolderId || undefined 
          });
        }
      }
      toast.success(`Moved ${items.length} items`);
      clearSelection();
    } catch (error) {
      toast.error("Failed to move some items", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [viewState.selectedItems, moveFileToFolder, moveFolder, clearSelection]);

  // File upload
  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!workspace) return;
    
    updateViewState({ isUploading: true });
    const totalFiles = acceptedFiles.length;
    let uploaded = 0;

    try {
      for (const file of acceptedFiles) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) throw new Error("Upload failed");
        const { storageId } = await result.json();

        await saveFile({
          storageId,
          workspaceId: workspace._id,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          fileType: "document",
          folderId: viewState.currentFolderId || undefined,
        });

        uploaded++;
        updateViewState({ uploadProgress: (uploaded / totalFiles) * 100 });
      }

      toast.success(`Uploaded ${totalFiles} file(s)`);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      updateViewState({ isUploading: false, uploadProgress: 0 });
    }
  }, [workspace, viewState.currentFolderId, generateUploadUrl, saveFile, updateViewState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    multiple: true,
    noClick: viewState.selectionMode,
  });

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    updateViewState({ draggedItem: itemId });
    
    // If item is selected, we're dragging all selected items
    if (viewState.selectedItems.has(itemId)) {
      e.dataTransfer.setData('selectedItems', JSON.stringify(Array.from(viewState.selectedItems)));
    }
  }, [viewState.selectedItems, updateViewState]);

  const handleDragOver = useCallback((e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (folderId && folderId !== viewState.draggedItem) {
      updateViewState({ dragOverFolder: folderId });
    }
  }, [viewState.draggedItem, updateViewState]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    updateViewState({ dragOverFolder: null });
  }, [updateViewState]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const itemId = e.dataTransfer.getData('text/plain');
    const selectedItemsData = e.dataTransfer.getData('selectedItems');
    
    updateViewState({ draggedItem: null, dragOverFolder: null });
    
    try {
      if (selectedItemsData) {
        // Multiple items
        const selectedItems = JSON.parse(selectedItemsData);
        for (const item of selectedItems) {
          const [type, id] = item.split("-");
          if (type === "file") {
            await moveFileToFolder({ 
              fileId: id as Id<"files">, 
              folderId: targetFolderId as Id<"folders"> | undefined 
            });
          } else if (type === "folder" && targetFolderId !== id) {
            await moveFolder({ 
              folderId: id as Id<"folders">, 
              parentId: targetFolderId as Id<"folders"> | undefined 
            });
          }
        }
        toast.success(`Moved ${selectedItems.length} items`);
        clearSelection();
      } else {
        // Single item
        const [type, id] = itemId.split("-");
        if (type === "file") {
          await moveFileToFolder({ 
            fileId: id as Id<"files">, 
            folderId: targetFolderId as Id<"folders"> | undefined 
          });
          toast.success("File moved");
        } else if (type === "folder" && targetFolderId !== id) {
          await moveFolder({ 
            folderId: id as Id<"folders">, 
            parentId: targetFolderId as Id<"folders"> | undefined 
          });
          toast.success("Folder moved");
        }
      }
    } catch (error) {
      toast.error("Failed to move items", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [moveFileToFolder, moveFolder, clearSelection, updateViewState]);

  // Filter current items
  const currentFolder = folders?.find(f => f._id === viewState.currentFolderId);
  const currentFolders = folders?.filter(f => 
    viewState.currentFolderId ? f.parentId === viewState.currentFolderId : !f.parentId
  ) || [];
  const currentFiles = files?.filter(f => 
    (viewState.currentFolderId ? f.folderId === viewState.currentFolderId : !f.folderId) &&
    f.name.toLowerCase().includes(viewState.searchQuery.toLowerCase())
  ) || [];

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{ id: Id<"folders"> | null; name: string }> = [{ id: null, name: "All Files" }];
    if (currentFolder && folders) {
      let folder = currentFolder;
      const trail = [folder];
      while (folder.parentId) {
        const parent = folders.find(f => f._id === folder.parentId);
        if (parent) {
          trail.unshift(parent);
          folder = parent;
        } else break;
      }
      breadcrumbs.push(...trail.map(f => ({ id: f._id, name: f.name })));
    }
    return breadcrumbs;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            {getBreadcrumbs().map((crumb, index) => (
              <div key={crumb.id || "root"} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer hover:text-primary flex items-center"
                    onClick={() => updateViewState({ currentFolderId: crumb.id })}
                  >
                    {index === 0 && <Home className="w-4 h-4 mr-1" />}
                    {crumb.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center gap-2">
           {viewState.selectionMode ? (
             <>
               <Button onClick={selectAll} variant="outline" size="sm">
                 <CheckSquare className="w-4 h-4 mr-2" />
                 Select All
               </Button>
               <Button onClick={clearSelection} variant="outline" size="sm">
                 <X className="w-4 h-4 mr-2" />
                 Clear
               </Button>
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="outline" size="sm">
                     <Move className="w-4 h-4 mr-2" />
                     Move {viewState.selectedItems.size} items
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent>
                   <DropdownMenuItem onClick={() => batchMove(null)}>
                     <Home className="w-4 h-4 mr-2" />
                     Move to Root
                   </DropdownMenuItem>
                   {folders?.map(folder => (
                     <DropdownMenuItem 
                       key={folder._id}
                       onClick={() => batchMove(folder._id)}
                     >
                       <FolderOpen className="w-4 h-4 mr-2" style={{ color: folder.color }} />
                       {folder.name}
                     </DropdownMenuItem>
                   ))}
                 </DropdownMenuContent>
               </DropdownMenu>
               <Button onClick={batchDelete} variant="destructive" size="sm">
                 <Trash2 className="w-4 h-4 mr-2" />
                 Delete {viewState.selectedItems.size} items
               </Button>
             </>
           ) : (
            <>
              <Button
                onClick={() => updateViewState({ selectionMode: true })}
                variant="outline"
                size="sm"
              >
                <MousePointer className="w-4 h-4 mr-2" />
                Select
              </Button>
              <Button
                onClick={() => updateViewState({ folderDialogOpen: true, editingFolder: null })}
                variant="outline"
                size="sm"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </>
          )}
          
          <Input
            placeholder="Search..."
            value={viewState.searchQuery}
            onChange={(e) => updateViewState({ searchQuery: e.target.value })}
            className="w-48"
          />
        </div>
      </div>

      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed mb-4 transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          viewState.selectionMode ? "cursor-default" : "cursor-pointer"
        )}
      >
        <CardContent className="py-6 text-center">
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">
            {isDragActive ? "Drop files here" : "Drag & drop or click to upload"}
          </p>
          {viewState.isUploading && (
            <Progress value={viewState.uploadProgress} className="h-2 mt-4 max-w-xs mx-auto" />
          )}
        </CardContent>
      </Card>

       {/* Files Grid - Using native HTML5 drag and drop */}
       <section 
         className="flex-1 overflow-auto"
         onDragOver={(e) => handleDragOver(e, viewState.currentFolderId || undefined)}
         onDrop={(e) => handleDrop(e, viewState.currentFolderId || undefined)}
         aria-label="Files and folders grid"
       >
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-1">
          {/* Folders */}
          {currentFolders.map((folder) => (
            <Card
              key={folder._id}
              draggable={!viewState.selectionMode || viewState.selectedItems.has(`folder-${folder._id}`)}
              onDragStart={(e) => handleDragStart(e, `folder-${folder._id}`)}
              onDragOver={(e) => handleDragOver(e, folder._id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder._id)}
              className={cn(
                "group transition-all cursor-pointer relative",
                viewState.dragOverFolder === folder._id && "ring-2 ring-primary bg-primary/5 scale-105",
                viewState.draggedItem === `folder-${folder._id}` && "opacity-50",
                viewState.selectedItems.has(`folder-${folder._id}`) && "ring-2 ring-primary"
              )}
              onDoubleClick={() => !viewState.selectionMode && updateViewState({ currentFolderId: folder._id })}
              onClick={() => viewState.selectionMode && toggleItemSelection(`folder-${folder._id}`)}
            >
              <CardContent className="p-4">
                {viewState.selectionMode && (
                  <Checkbox
                    checked={viewState.selectedItems.has(`folder-${folder._id}`)}
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {(!viewState.selectionMode || viewState.selectedItems.has(`folder-${folder._id}`)) && (
                  <GripVertical className="absolute top-2 left-2 w-4 h-4 opacity-0 group-hover:opacity-50" />
                )}
                <div className="flex flex-col items-center">
                  <FolderOpen 
                    className="w-12 h-12 mb-2" 
                    style={{ color: folder.color || "#6b7280" }}
                  />
                  <p className="text-sm font-medium truncate w-full text-center">
                    {folder.name}
                  </p>
                </div>
                
                {!viewState.selectionMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateViewState({ currentFolderId: folder._id })}>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateViewState({ 
                        editingFolder: folder, 
                        folderDialogOpen: true 
                      })}>
                        <Edit className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteFolder({ folderId: folder._id })}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {currentFiles.map((file) => (
            <Card
              key={file._id}
              draggable={!viewState.selectionMode || viewState.selectedItems.has(`file-${file._id}`)}
              onDragStart={(e) => handleDragStart(e, `file-${file._id}`)}
              className={cn(
                "group transition-all cursor-pointer relative",
                viewState.draggedItem === `file-${file._id}` && "opacity-50",
                viewState.selectedItems.has(`file-${file._id}`) && "ring-2 ring-primary"
              )}
              onClick={() => {
                if (viewState.selectionMode) {
                  toggleItemSelection(`file-${file._id}`);
                } else {
                  updateViewState({ selectedFile: file, previewOpen: true });
                }
              }}
            >
              <CardContent className="p-4">
                {viewState.selectionMode && (
                  <Checkbox
                    checked={viewState.selectedItems.has(`file-${file._id}`)}
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {(!viewState.selectionMode || viewState.selectedItems.has(`file-${file._id}`)) && (
                  <GripVertical className="absolute top-2 left-2 w-4 h-4 opacity-0 group-hover:opacity-50" />
                )}
                <div className="flex flex-col items-center">
                  {file.mimeType.startsWith("image/") && file.url ? (
                    <div className="relative w-12 h-12 mb-2">
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 mb-2 flex items-center justify-center">
                      {getFileIcon(file.mimeType, "lg")}
                    </div>
                  )}
                  <p className="text-xs font-medium truncate w-full text-center">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                
                {!viewState.selectionMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        updateViewState({ selectedFile: file, previewOpen: true });
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement("a");
                        link.href = file.url || "";
                        link.download = file.name;
                        link.click();
                      }}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        if (file.url) {
                          navigator.clipboard.writeText(file.url);
                          toast.success("Link copied");
                        }
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile({ fileId: file._id });
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
         </div>
       </section>

      {/* Dialogs */}
      <FilePreviewDialog
        file={viewState.selectedFile}
        open={viewState.previewOpen}
        onOpenChange={(open) => updateViewState({ previewOpen: open })}
        onDownload={() => {/* handle download */}}
      />

      <FolderDialog
        open={viewState.folderDialogOpen}
        onOpenChange={(open) => updateViewState({ folderDialogOpen: open })}
        folder={viewState.editingFolder}
        onSave={(name, color) => {
          if (viewState.editingFolder) {
            updateFolder({ folderId: viewState.editingFolder._id, name, color });
          } else if (workspace) {
            createFolder({
              workspaceId: workspace._id,
              name,
              parentId: viewState.currentFolderId || undefined,
              color,
            });
          }
          updateViewState({ folderDialogOpen: false });
        }}
      />
    </div>
  );
}