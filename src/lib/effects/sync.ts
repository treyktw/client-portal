import { Effect, pipe } from 'effect';
import { DatabaseError, logError } from './errors';

// Sync operation types
export interface SyncOperation {
  readonly id: string;
  readonly type: 'create' | 'update' | 'delete';
  readonly data: unknown;
  readonly retries: number;
  readonly timestamp: number;
}

// Create sync operation
export const createSyncOperation = (
  type: SyncOperation['type'],
  data: unknown,
  id: string = Math.random().toString(36).substr(2, 9)
): SyncOperation => ({
  id,
  type,
  data,
  retries: 0,
  timestamp: Date.now(),
});

// Execute sync operation with Effect
export const executeSyncOperation = (
  operation: SyncOperation,
  mutations: {
    create: (data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
    update: (id: string, data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
    delete: (id: string) => Effect.Effect<unknown, DatabaseError, never>;
  }
): Effect.Effect<unknown, DatabaseError, never> => {
  const executeEffect = (() => {
    switch (operation.type) {
      case 'create':
        return mutations.create(operation.data);
      case 'update':
        return mutations.update(operation.id, operation.data);
      case 'delete':
        return mutations.delete(operation.id);
      default:
        return Effect.fail(new DatabaseError({ 
          message: `Unknown operation type: ${operation.type}`,
          operation: operation.type,
        }));
    }
  })();

  return pipe(
    executeEffect,
    Effect.retry({ times: 3 }),
    logError(`Sync operation ${operation.type} for ${operation.id}`)
  );
};

// Process sync operations with retry logic
export const processSyncOperations = (
  operations: SyncOperation[],
  mutations: {
    create: (data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
    update: (id: string, data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
    delete: (id: string) => Effect.Effect<unknown, DatabaseError, never>;
  }
): Effect.Effect<{ successful: number; failed: number }, never, never> =>
  Effect.gen(function* () {
    let successful = 0;
    let failed = 0;
    
    for (const operation of operations) {
      const result = yield* Effect.either(executeSyncOperation(operation, mutations));
      
      if (result._tag === 'Right') {
        successful++;
      } else {
        failed++;
        console.error(`Failed to sync operation ${operation.type} for ${operation.id}:`, result.left);
      }
    }
    
    return { successful, failed };
  });

// Canvas sync operations
export const createCanvasSyncOperations = (mutations: {
  createCanvas: (data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
  updateCanvas: (id: string, data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
  deleteCanvas: (id: string) => Effect.Effect<unknown, DatabaseError, never>;
}) => ({
  create: mutations.createCanvas,
  update: mutations.updateCanvas,
  delete: mutations.deleteCanvas,
});

// Task sync operations
export const createTaskSyncOperations = (mutations: {
  createTask: (data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
  updateTask: (id: string, data: unknown) => Effect.Effect<unknown, DatabaseError, never>;
  deleteTask: (id: string) => Effect.Effect<unknown, DatabaseError, never>;
}) => ({
  create: mutations.createTask,
  update: mutations.updateTask,
  delete: mutations.deleteTask,
});
