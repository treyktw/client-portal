// app/w/[slug]/canvas/page.tsx - Improved saving reliability
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  PenTool, 
  Plus, 
  Save, 
  Share2, 
  Cloud, 
  CloudOff,
  Trash2,
  MoreVertical,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppState, ExcalidrawImperativeAPI, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

// Import CSS for Excalidraw
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading canvas...</p>
        </div>
      </div>
    )
  }
);

interface CanvasData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files?: BinaryFiles;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export default function CanvasPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const canvases = useQuery(api.canvases.getCanvases, 
    workspace?._id ? { workspaceId: workspace._id } : "skip"
  );
  
  const createCanvas = useMutation(api.canvases.createCanvas);
  const updateCanvas = useMutation(api.canvases.updateCanvas);
  const deleteCanvas = useMutation(api.canvases.deleteCanvas);
  
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>("");
  const isLoadingCanvasRef = useRef(false);
  const pendingSaveDataRef = useRef<string | null>(null);
  const saveRetryCountRef = useRef(0);
  const maxRetries = 3;
  
  // Derive selected canvas from canvases array
  const selectedCanvas = canvases?.find(c => c._id === selectedCanvasId) || null;

  // Load canvas data when switching
  useEffect(() => {
    if (selectedCanvas && excalidrawAPIRef.current && !isLoadingCanvasRef.current) {
      isLoadingCanvasRef.current = true;
      
      // Parse the canvas data
      let canvasData: CanvasData | null = null;
      try {
        if (selectedCanvas.data && selectedCanvas.data !== "{}") {
          canvasData = JSON.parse(selectedCanvas.data);
        }
      } catch (error) {
        console.error("Failed to parse canvas data:", error);
      }

      // Reset the Excalidraw scene with the new canvas data
      if (canvasData) {
        const currentAppState = excalidrawAPIRef.current.getAppState();
        excalidrawAPIRef.current.updateScene({
          elements: canvasData.elements || [],
          appState: { ...currentAppState, ...(canvasData.appState || {}) },
        });
      } else {
        // Clear the canvas if no data
        excalidrawAPIRef.current.resetScene();
      }
      
      // Reset save state
      lastSavedDataRef.current = selectedCanvas.data || "{}";
      setSaveStatus('saved');
      pendingSaveDataRef.current = null;
      saveRetryCountRef.current = 0;
      
      // Clear any pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      setTimeout(() => {
        isLoadingCanvasRef.current = false;
      }, 100);
    }
  }, [selectedCanvas]);

  // Reliable save function with retry logic
  const performSave = useCallback(async (retryCount = 0): Promise<boolean> => {
    if (!excalidrawAPIRef.current || !selectedCanvas || isLoadingCanvasRef.current) {
      return false;
    }
    
    setSaveStatus('saving');
    
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const files = excalidrawAPIRef.current.getFiles();
      
      const canvasData: CanvasData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          zoom: appState.zoom,
          offsetLeft: appState.offsetLeft,
          offsetTop: appState.offsetTop,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files: files || undefined,
      };

      const newDataString = JSON.stringify(canvasData);
      
      // Only save if data actually changed
      if (newDataString === lastSavedDataRef.current) {
        setSaveStatus('saved');
        return true;
      }
      
      // Store data we're trying to save
      pendingSaveDataRef.current = newDataString;
      
      await updateCanvas({
        canvasId: selectedCanvas._id,
        data: newDataString,
      });
      
      // Success!
      lastSavedDataRef.current = newDataString;
      pendingSaveDataRef.current = null;
      setSaveStatus('saved');
      setLastSaveTime(new Date());
      saveRetryCountRef.current = 0;
      
      return true;
    } catch (error) {
      console.error("Failed to save canvas:", error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        // console.log(`Retrying save... Attempt ${retryCount + 1}/${maxRetries}`);
        saveRetryCountRef.current = retryCount + 1;
        
        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = Math.pow(2, retryCount) * 1000;
        
        setTimeout(() => {
          performSave(retryCount + 1);
        }, retryDelay);
        
        setSaveStatus('saving');
        return false;
      } else {
        // Max retries reached
        setSaveStatus('error');
        toast.error("Failed to save canvas after multiple attempts", {
          action: {
            label: "Retry",
            onClick: () => performSave(0),
          },
        });
        return false;
      }
    }
  }, [selectedCanvas, updateCanvas]);

  // Debounced save handler
  const handleCanvasChange = useCallback(() => {
    // Don't track changes while loading a canvas
    if (isLoadingCanvasRef.current || !selectedCanvas) return;
    
    // Mark as unsaved
    if (saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (2 seconds for better responsiveness)
    saveTimeoutRef.current = setTimeout(() => {
      performSave(0);
    }, 2000);
  }, [performSave, selectedCanvas, saveStatus]);

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    const success = await performSave(0);
    if (success) {
      toast.success("Canvas saved successfully");
    }
  }, [performSave]);

  // Save before switching canvases
  const handleSelectCanvas = useCallback(async (canvasId: string) => {
    // Save current canvas before switching
    if (saveStatus === 'unsaved' && selectedCanvas) {
      await performSave(0);
    }
    
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setSelectedCanvasId(canvasId);
    setSaveStatus('saved');
  }, [saveStatus, selectedCanvas, performSave]);

  const handleCreateCanvas = async () => {
    if (!workspace) return;
    
    // Save current canvas first
    if (saveStatus === 'unsaved') {
      await performSave(0);
    }
    
    try {
      const emptyCanvasData: CanvasData = {
        elements: [],
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 1,
          zoom: { value: 1 } as AppState["zoom"],
        }
      };
      
      const canvasId = await createCanvas({
        workspaceId: workspace._id,
        name: `Canvas ${(canvases?.length || 0) + 1}`,
        data: JSON.stringify(emptyCanvasData),
      });
      
      if (excalidrawAPIRef.current) {
        excalidrawAPIRef.current.resetScene();
      }
      
      setSelectedCanvasId(canvasId);
      setSaveStatus('saved');
      toast.success("Canvas created");
    } catch (error) {
      console.error("Failed to create canvas:", error);
      toast.error("Failed to create canvas");
    }
  };

  const handleDeleteCanvas = async (canvasId: Id<"canvases">) => {
    try {
      await deleteCanvas({ canvasId });
      if (selectedCanvasId === canvasId) {
        setSelectedCanvasId(null);
        if (excalidrawAPIRef.current) {
          excalidrawAPIRef.current.resetScene();
        }
      }
      toast.success("Canvas deleted");
    } catch (error) {
      console.error("Failed to delete canvas:", error);
      toast.error("Failed to delete canvas");
    }
  };

  const handleRenameCanvas = async (canvasId: Id<"canvases">, newName: string) => {
    try {
      await updateCanvas({
        canvasId,
        name: newName,
      });
    } catch (error) {
      console.error("Failed to rename canvas:", error);
    }
  };

  // Auto-save on window blur or before unload
  useEffect(() => {
    const handleBlur = () => {
      if (saveStatus === 'unsaved') {
        performSave(0);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        performSave(0);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveStatus, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save any unsaved changes
      if (saveStatus === 'unsaved' && selectedCanvas) {
        performSave(0);
      }
    };
  }, [saveStatus, selectedCanvas, performSave]);

  // Get status badge
  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <Badge variant="outline" className="gap-1">
            <Cloud className="w-3 h-3" />
            Saved
          </Badge>
        );
      case 'saving':
        return (
          <Badge variant="secondary" className="gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Saving...
          </Badge>
        );
      case 'unsaved':
        return (
          <Badge variant="secondary" className="gap-1">
            <CloudOff className="w-3 h-3" />
            Unsaved
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Save Failed
          </Badge>
        );
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 p-4">
      {/* Sidebar */}
      <div className="w-80 border bg-card rounded-lg flex flex-col overflow-hidden">
        <div className="p-4 border-b space-y-2">
          <Button onClick={handleCreateCanvas} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Canvas
          </Button>
          
          {lastSaveTime && (
            <p className="text-xs text-muted-foreground text-center">
              Last saved: {lastSaveTime.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {canvases?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No canvases yet</p>
              <p className="text-xs mt-1">Create your first canvas to start drawing</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {canvases?.map((canvas) => (
                <Card
                  key={canvas._id}
                  className={`p-3 cursor-pointer hover:bg-foreground transition-colors dark:hover:bg-primary/50 ${
                    selectedCanvasId === canvas._id ? "bg-primary/30 ring-2 ring-primary/20" : ""
                  }`}
                  onClick={() => handleSelectCanvas(canvas._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{canvas.name}</h3>
                        {selectedCanvasId === canvas._id && saveStatus === 'unsaved' && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(canvas.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt("Enter new name:", canvas.name);
                            if (newName?.trim()) {
                              handleRenameCanvas(canvas._id, newName);
                            }
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this canvas?")) {
                              handleDeleteCanvas(canvas._id);
                            }
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col bg-card rounded-lg overflow-hidden">
        {selectedCanvas ? (
          <>
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <Input
                  value={selectedCanvas.name}
                  onChange={(e) => handleRenameCanvas(selectedCanvas._id, e.target.value)}
                  className="max-w-xs font-semibold"
                />
                {getStatusBadge()}
                {saveRetryCountRef.current > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Retry {saveRetryCountRef.current}/{maxRetries}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualSave} 
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  variant={saveStatus === 'unsaved' ? "default" : "outline"}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveStatus === 'saving' ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            
            {/* Excalidraw Container - Keep exact same structure as working version */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Excalidraw
                key={selectedCanvas._id}
                excalidrawAPI={(api) => {
                  excalidrawAPIRef.current = api;
                }}
                initialData={
                  selectedCanvas.data && selectedCanvas.data !== "{}" 
                    ? (() => {
                        try {
                          const parsed = JSON.parse(selectedCanvas.data);
                          lastSavedDataRef.current = selectedCanvas.data;
                          return parsed;
                        } catch {
                          return undefined;
                        }
                      })()
                    : undefined
                }
                onChange={handleCanvasChange}
                theme={document.documentElement.classList.contains('dark') ? "dark" : "light"}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a canvas to start drawing</p>
              <p className="text-sm mt-2">or create a new canvas</p>
              {canvases?.length === 0 && (
                <Button
                  onClick={handleCreateCanvas}
                  className="mt-4"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Canvas
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}