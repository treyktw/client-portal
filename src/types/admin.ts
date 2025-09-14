// types/admin.ts
import type { Doc, Id } from "@/convex/_generated/dataModel";

// Sidebar types
export interface SidebarState {
  isOpen: boolean;
  expandedItems: Set<string>;
}

export type SidebarAction =
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_SIDEBAR"; payload: boolean }
  | { type: "TOGGLE_MENU_ITEM"; payload: string }
  | { type: "SET_EXPANDED_ITEMS"; payload: Set<string> };

// Workspace display types
export interface WorkspaceWithClient extends Doc<"workspaces"> {
  owner?: Doc<"users"> | null;
  creator?: Doc<"users"> | null;
}

export type WorkspaceStatus = "active" | "pending" | "archived";

export interface WorkspaceFilters {
  status: WorkspaceStatus | "all";
  search: string;
  sortBy: "name" | "createdAt" | "status";
  sortOrder: "asc" | "desc";
}

export type WorkspaceFilterAction =
  | { type: "SET_STATUS"; payload: WorkspaceStatus | "all" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_SORT"; payload: { field: WorkspaceFilters["sortBy"]; order: WorkspaceFilters["sortOrder"] } }
  | { type: "RESET_FILTERS" };

// Stats types
export interface DashboardStats {
  totalWorkspaces: number;
  activeClients: number;
  pendingInvites: number;
  messagesToday: number;
}

// Message types (for future implementation)
export interface Thread {
  _id: Id<"threads">;
  workspaceId: Id<"workspaces">;
  title: string;
  createdBy: Id<"users">;
  isDefault: boolean;
  lastMessageAt: number;
  pinnedMessageIds?: Id<"messages">[];
  unreadCount?: number;
}

export interface Message {
  _id: Id<"messages">;
  threadId: Id<"threads">;
  workspaceId: Id<"workspaces">;
  authorId: Id<"users">;
  body: string;
  files?: Id<"files">[];
  links?: Array<{ url: string; title?: string }>;
  mentions?: Id<"users">[];
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
}

// Navigation types
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavItem[];
}