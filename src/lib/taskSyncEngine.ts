// lib/taskSyncEngine.ts
import type { Id } from "@/convex/_generated/dataModel";

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'reorder';
  taskId: string;
  data: any;
  timestamp: number;
  retries: number;
}

class TaskSyncEngine {
  private syncQueue: SyncOperation[] = [];
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private mutations: any = null;
  private workspaceId: Id<"workspaces"> | null = null;

  constructor() {
    // Load pending operations from localStorage
    this.loadPendingOperations();
  }

  init(mutations: any, workspaceId: Id<"workspaces">) {
    this.mutations = mutations;
    this.workspaceId = workspaceId;
    
    // Start background sync every 2 seconds
    this.startSync();
  }

  private loadPendingOperations() {
    const pending = localStorage.getItem('pending-sync-operations');
    if (pending) {
      try {
        this.syncQueue = JSON.parse(pending);
      } catch {
        this.syncQueue = [];
      }
    }
  }

  private savePendingOperations() {
    localStorage.setItem('pending-sync-operations', JSON.stringify(this.syncQueue));
  }

  addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>) {
    const op: SyncOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.syncQueue.push(op);
    this.savePendingOperations();
    
    // Process immediately if not already processing
    if (!this.isProcessing) {
      this.processSyncQueue();
    }
  }

  private startSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 2000); // Sync every 2 seconds
  }

  private async processSyncQueue() {
    if (this.isProcessing || !this.mutations || !this.workspaceId) return;
    if (this.syncQueue.length === 0) return;
    
    this.isProcessing = true;
    
    const operationsToProcess = [...this.syncQueue];
    const failedOperations: SyncOperation[] = [];
    
    for (const operation of operationsToProcess) {
      try {
        await this.processOperation(operation);
        // Remove successful operation from queue
        this.syncQueue = this.syncQueue.filter(op => op.id !== operation.id);
      } catch (error) {
        console.error('Sync operation failed:', error);
        operation.retries++;
        
        // Keep operation if under retry limit
        if (operation.retries < 3) {
          failedOperations.push(operation);
        }
      }
    }
    
    // Update queue with failed operations
    this.syncQueue = [...failedOperations, ...this.syncQueue.filter(
      op => !operationsToProcess.find(p => p.id === op.id)
    )];
    
    this.savePendingOperations();
    this.isProcessing = false;
  }

  private async processOperation(operation: SyncOperation) {
    switch (operation.type) {
      case 'create':
        await this.mutations.createTask({
          workspaceId: this.workspaceId,
          ...operation.data
        });
        break;
        
      case 'reorder':
        await this.mutations.reorderTasks({
          workspaceId: this.workspaceId,
          taskId: operation.taskId as Id<"tasks">,
          newStatus: operation.data.newStatus,
          newPosition: operation.data.newPosition,
        });
        break;
        
      case 'update':
        await this.mutations.updateTask({
          taskId: operation.taskId as Id<"tasks">,
          ...operation.data
        });
        break;
        
      case 'delete':
        await this.mutations.deleteTask({
          taskId: operation.taskId as Id<"tasks">
        });
        break;
    }
  }

  getSyncStatus() {
    return {
      pendingOperations: this.syncQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const taskSyncEngine = new TaskSyncEngine();