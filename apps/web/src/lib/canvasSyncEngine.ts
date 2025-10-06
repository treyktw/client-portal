// lib/canvasSyncEngine.ts
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import { Id } from "@telera/convex";

interface CanvasData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files?: Record<string, unknown>;
}

type OperationType = 'update' | 'create' | 'delete' | 'rename';

interface OperationBase<TType extends OperationType, TData> {
  id: string;
  type: TType;
  canvasId: string;
  data: TData;
  timestamp: number;
  retries: number;
}

type UpdateOperation = OperationBase<'update', { data: string }>;
type CreateOperation = OperationBase<'create', { name: string; data?: string }>;
type DeleteOperation = OperationBase<'delete', Record<string, never>>;
type RenameOperation = OperationBase<'rename', { name: string }>;

type SyncOperation = UpdateOperation | CreateOperation | DeleteOperation | RenameOperation;

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: boolean;
  error: string | null;
}

class CanvasSyncEngine {
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private mutations: Mutations | null = null;
  private workspaceId: Id<"workspaces"> | null = null;
  private currentCanvasId: string | null = null;
  private lastSavedData: Map<string, string> = new Map();
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: false,
    error: null,
  };
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingData: Map<string, CanvasData> = new Map();

  constructor() {
    // Load any pending operations from localStorage
    this.loadPendingOperations();
  }

  init(mutations: Mutations, workspaceId: Id<"workspaces">) {
    this.mutations = mutations;
    this.workspaceId = workspaceId;
    
    // Start background sync every 5 seconds
    this.startSync();
  }

  private loadPendingOperations() {
    if (typeof window === 'undefined') return;
    
    const pending = localStorage.getItem('canvas-pending-sync');
    if (pending) {
      try {
        this.syncQueue = JSON.parse(pending);
      } catch {
        this.syncQueue = [];
      }
    }
  }

  private savePendingOperations() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('canvas-pending-sync', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  private updateStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyStatusListeners();
  }

  private notifyStatusListeners() {
    this.statusListeners.forEach((listener) => {
      listener(this.syncStatus);
    });
  }

  onStatusChange(listener: (status: SyncStatus) => void) {
    this.statusListeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  setCurrentCanvas(canvasId: string | null) {
    // If switching canvases, immediately process any pending changes
    if (this.currentCanvasId && this.currentCanvasId !== canvasId) {
      this.processPendingData();
    }
    this.currentCanvasId = canvasId;
  }

  // Queue canvas data for saving with debouncing
  queueCanvasUpdate(canvasId: string, data: CanvasData) {
    if (!this.mutations || !canvasId) return;

    const dataString = JSON.stringify(data);
    
    // Check if data actually changed
    const lastSaved = this.lastSavedData.get(canvasId);
    if (lastSaved === dataString) {
      return; // No changes to save
    }

    // Store pending data
    this.pendingData.set(canvasId, data);
    this.updateStatus({ pendingChanges: true });

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer (2 seconds)
    this.debounceTimer = setTimeout(() => {
      this.processPendingData();
    }, 2000);
  }

  // Process all pending data immediately
  private processPendingData() {
    if (this.pendingData.size === 0) return;

    // Convert pending data to operations
    for (const [canvasId, data] of this.pendingData.entries()) {
      this.addOperation({
        type: 'update',
        canvasId,
        data: {
          data: JSON.stringify(data),
        },
      });
    }

    // Clear pending data
    this.pendingData.clear();
    
    // Process queue immediately
    this.processSyncQueue();
  }

  // Force save immediately (e.g., when switching canvases)
  async forceSave() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.processPendingData();
    await this.processSyncQueue();
  }

  private addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>) {
    // Check if there's already a pending operation for this canvas
    const existingIndex = this.syncQueue.findIndex(
      op => op.canvasId === operation.canvasId && op.type === operation.type
    );

    const newOp = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    } as SyncOperation;

    if (existingIndex !== -1) {
      // Replace existing operation with newer one
      this.syncQueue[existingIndex] = newOp;
    } else {
      this.syncQueue.push(newOp);
    }
    
    this.savePendingOperations();
    this.updateStatus({ pendingChanges: true });
  }

  private startSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 5000); // Sync every 5 seconds
  }

  private async processSyncQueue() {
    if (this.isProcessing || !this.mutations || this.syncQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    this.updateStatus({ isSyncing: true, error: null });
    
    const operationsToProcess = [...this.syncQueue];
    const failedOperations: SyncOperation[] = [];
    
    for (const operation of operationsToProcess) {
      try {
        await this.processOperation(operation);
        
        // Update last saved data
        if (operation.type === 'update' && operation.data.data) {
          this.lastSavedData.set(operation.canvasId, operation.data.data);
        }
        
        // Remove successful operation from queue
        this.syncQueue = this.syncQueue.filter(op => op.id !== operation.id);
        this.updateStatus({ lastSyncTime: Date.now() });
      } catch (error) {
        console.error('Canvas sync operation failed:', error);
        operation.retries++;
        
        // Keep operation if under retry limit
        if (operation.retries < 3) {
          failedOperations.push(operation);
        } else {
          this.updateStatus({ 
            error: `Failed to sync canvas after ${operation.retries} attempts` 
          });
        }
      }
    }
    
    // Update queue with failed operations
    this.syncQueue = [...failedOperations, ...this.syncQueue.filter(
      op => !operationsToProcess.find(p => p.id === op.id)
    )];
    
    this.savePendingOperations();
    this.isProcessing = false;
    
    const hasPending = this.syncQueue.length > 0 || this.pendingData.size > 0;
    this.updateStatus({ 
      isSyncing: false, 
      pendingChanges: hasPending 
    });
  }

  private async processOperation(operation: SyncOperation) {
    if (!this.mutations || !this.workspaceId) return;

    switch (operation.type) {
      case 'create':
        await this.mutations.createCanvas({
          workspaceId: this.workspaceId,
          name: operation.data.name,
          data: operation.data.data ?? JSON.stringify({ elements: [], appState: {} }),
        });
        break;
      case 'update':
        await this.mutations.updateCanvas({
          canvasId: operation.canvasId as Id<'canvases'>,
          data: operation.data.data,
        });
        break;
      case 'delete':
        await this.mutations.deleteCanvas({
          canvasId: operation.canvasId as Id<'canvases'>,
        });
        break;
      case 'rename':
        await this.mutations.updateCanvas({
          canvasId: operation.canvasId as Id<'canvases'>,
          name: operation.data.name,
        });
        break;
    }
  }

  // Create a new canvas
  async createCanvas(name: string, initialData?: CanvasData): Promise<string | null> {
    if (!this.mutations || !this.workspaceId) return null;

    try {
      const data = initialData || {
        elements: [],
        appState: {
          viewBackgroundColor: "#ffffff",
          currentItemFontFamily: 1,
          zoom: { value: 1 } as AppState["zoom"],
        },
      };

      const canvasId = await this.mutations.createCanvas({
        workspaceId: this.workspaceId,
        name,
        data: JSON.stringify(data),
      });

      // Store as last saved
      this.lastSavedData.set(canvasId, JSON.stringify(data));
      
      return canvasId;
    } catch (error) {
      console.error('Failed to create canvas:', error);
      this.updateStatus({ error: 'Failed to create canvas' });
      return null;
    }
  }

  // Delete a canvas
  deleteCanvas(canvasId: string) {
    // Clear any pending updates for this canvas
    this.pendingData.delete(canvasId);
    this.lastSavedData.delete(canvasId);
    
    // Remove any pending operations for this canvas
    this.syncQueue = this.syncQueue.filter(op => op.canvasId !== canvasId);
    
    this.addOperation({
      type: 'delete',
      canvasId,
      data: {},
    });
    
    // Process immediately
    this.processSyncQueue();
  }

  // Rename a canvas
  renameCanvas(canvasId: string, name: string) {
    this.addOperation({
      type: 'rename',
      canvasId,
      data: { name },
    });
    
    // Process immediately for quick feedback
    this.processSyncQueue();
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // Check if a canvas has unsaved changes
  hasUnsavedChanges(canvasId: string): boolean {
    return this.pendingData.has(canvasId) || 
           this.syncQueue.some(op => op.canvasId === canvasId);
  }

  destroy() {
    // Save any pending changes
    this.forceSave();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.statusListeners.clear();
  }
}

// Export singleton instance
export const canvasSyncEngine = new CanvasSyncEngine();

// Explicit mutations contract to avoid any
interface Mutations {
  createCanvas(args: {
    workspaceId: Id<'workspaces'>;
    name: string;
    data: string;
  }): Promise<string>;

  updateCanvas(args: {
    canvasId: Id<'canvases'>;
    name?: string;
    data?: string;
  }): Promise<null>;

  deleteCanvas(args: {
    canvasId: Id<'canvases'>;
  }): Promise<null>;
}