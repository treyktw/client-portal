// components/admin/WorkspacesTable.tsx
"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Doc, Id } from "@telera/convex";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  ExternalLink,
  Settings,
  Copy,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import WorkspaceSettingsModal from "@/components/admin/WorkspaceSettingsModal";
import type {
  WorkspaceWithClient,
  WorkspaceFilters,
  WorkspaceFilterAction,
  WorkspaceStatus,
} from "@/types/admin";

const filterReducer = (state: WorkspaceFilters, action: WorkspaceFilterAction): WorkspaceFilters => {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_SORT":
      return { ...state, sortBy: action.payload.field, sortOrder: action.payload.order };
    case "RESET_FILTERS":
      return { status: "all", search: "", sortBy: "createdAt", sortOrder: "desc" };
    default:
      return state;
  }
};

interface WorkspacesTableProps {
  workspaces: WorkspaceWithClient[];
  loading?: boolean;
}

export default function WorkspacesTable({ workspaces, loading = false }: WorkspacesTableProps) {
  const router = useRouter();
  const [filters, dispatch] = useReducer(filterReducer, {
    status: "all",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [selectedWorkspace, setSelectedWorkspace] = useReducer(
    (state: Doc<"workspaces"> | null, action: Doc<"workspaces"> | null) => action,
    null
  );

  const getWorkspaceStatus = useCallback((workspace: Doc<"workspaces">): WorkspaceStatus => {
    if (workspace.onboardingCompleted) return "active";
    if (workspace.inviteStatus === "pending") return "pending";
    return "archived";
  }, []);

  const filteredWorkspaces = useMemo(() => {
    let filtered = [...workspaces];

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter((w) => getWorkspaceStatus(w) === filters.status);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.invitedEmail.toLowerCase().includes(searchLower) ||
          w.owner?.name?.toLowerCase().includes(searchLower) ||
          w.owner?.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          comparison = getWorkspaceStatus(a).localeCompare(getWorkspaceStatus(b));
          break;
        case "createdAt":
        default:
          comparison = a.createdAt - b.createdAt;
          break;
      }
      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [workspaces, filters, getWorkspaceStatus]);

  const handleSort = useCallback((field: WorkspaceFilters["sortBy"]) => {
    dispatch({
      type: "SET_SORT",
      payload: {
        field,
        order: filters.sortBy === field && filters.sortOrder === "asc" ? "desc" : "asc",
      },
    });
  }, [filters.sortBy, filters.sortOrder]);

  const handleCopyInvite = useCallback(async (workspace: Doc<"workspaces">) => {
    if (workspace.inviteToken) {
      const inviteLink = `${window.location.origin}/invite/${workspace.inviteToken}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!");
    }
  }, []);

  const handleNavigate = useCallback((workspace: Doc<"workspaces">) => {
    if (workspace.onboardingCompleted) {
      router.push(`/w/${workspace.slug}`);
    } else {
      router.push(`/onboarding/${workspace._id}/welcome`);
    }
  }, [router]);

  const getStatusBadge = useCallback((status: WorkspaceStatus) => {
    const variants = {
      active: { variant: "default" as const, label: "Active" },
      pending: { variant: "secondary" as const, label: "Pending" },
      archived: { variant: "outline" as const, label: "Archived" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }, []);

  const getInitials = useCallback((name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border">
        <div className="p-8 text-center text-muted-foreground">
          Loading workspaces...
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workspaces or clients..."
              value={filters.search}
              onChange={(e) => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              dispatch({ type: "SET_STATUS", payload: value as WorkspaceStatus | "all" })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort("name")}
                >
                  Workspace Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort("createdAt")}
                >
                  Last Activity
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkspaces.map((workspace) => {
                const status = getWorkspaceStatus(workspace);
                const client = workspace.owner;
                
                return (
                  <TableRow key={workspace._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client?.imageUrl} alt={client?.name || ""} />
                          <AvatarFallback>
                            {getInitials(client?.name, client?.email || workspace.invitedEmail)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {client?.name || "Pending Client"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client?.email || workspace.invitedEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{workspace.name}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(workspace.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleNavigate(workspace)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Workspace
                          </DropdownMenuItem>
                          {workspace.inviteToken && status === "pending" && (
                            <DropdownMenuItem onClick={() => handleCopyInvite(workspace)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Invite Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setSelectedWorkspace(workspace)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Settings Modal */}
      <WorkspaceSettingsModal
        workspace={selectedWorkspace}
        open={!!selectedWorkspace}
        onClose={() => setSelectedWorkspace(null)}
        onDelete={() => {
          setSelectedWorkspace(null);
          window.location.reload();
        }}
      />
    </>
  );
}