import { Id } from "./_generated/dataModel";
export * as api from "./_generated/api";
export type { Id, Doc } from "./_generated/dataModel";
export type { DataModel } from "./_generated/dataModel";

// Helper type exports for common IDs
export type WorkspaceId = Id<"workspaces">;
export type UserId = Id<"users">;
export type NoteId = Id<"notes">;
export type TaskId = Id<"tasks">;
export type FileId = Id<"files">;
export type ThreadId = Id<"threads">;
export type MessageId = Id<"messages">;
