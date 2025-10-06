// app/admin/page.tsx
"use client";

import { useMemo, useCallback, useReducer } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import CreateWorkspaceModal from "@/components/admin/CreateWorkspaceModal";
import WorkspacesTable from "@/components/admin/WorkspaceTable";
import type { WorkspaceWithClient, DashboardStats } from "@/types/admin";

type ModalState = {
  createWorkspace: boolean;
};

type ModalAction = 
  | { type: "OPEN_CREATE_WORKSPACE" }
  | { type: "CLOSE_CREATE_WORKSPACE" }
  | { type: "CLOSE_ALL" };

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case "OPEN_CREATE_WORKSPACE":
      return { ...state, createWorkspace: true };
    case "CLOSE_CREATE_WORKSPACE":
      return { ...state, createWorkspace: false };
    case "CLOSE_ALL":
      return { createWorkspace: false };
    default:
      return state;
  }
};

export default function AdminOverviewPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [modals, dispatch] = useReducer(modalReducer, { createWorkspace: false });

  const currentUser = useQuery(api.users.getCurrentUser);
  const workspaces = useQuery(api.workspaces.getAllWorkspaces);
  const users = useQuery(api.users.getAllUsers);
  const createUser = useMutation(api.users.createOrUpdateUser);

  // Enrich workspaces with owner and creator data
  const enrichedWorkspaces = useMemo((): WorkspaceWithClient[] => {
    if (!workspaces || !users) return [];
    
    return workspaces.map((workspace) => {
      const owner = users.find((u) => u._id === workspace.ownerId) || null;
      const creator = users.find((u) => u._id === workspace.createdBy) || null;
      
      return {
        ...workspace,
        owner,
        creator,
      };
    });
  }, [workspaces, users]);

  // Calculate dashboard stats
  const stats = useMemo((): DashboardStats => {
    if (!workspaces) {
      return {
        totalWorkspaces: 0,
        activeClients: 0,
        pendingInvites: 0,
        messagesToday: 0,
      };
    }

    const activeClients = new Set(
      workspaces
        .filter((w) => w.onboardingCompleted)
        .map((w) => w.ownerId)
    ).size;

    const pendingInvites = workspaces.filter(
      (w) => w.inviteStatus === "pending"
    ).length;

    // TODO: Calculate actual messages today when messaging system is implemented
    const messagesToday = 0;

    return {
      totalWorkspaces: workspaces.length,
      activeClients,
      pendingInvites,
      messagesToday,
    };
  }, [workspaces]);

  // Create user if needed
  const handleUserCreation = useCallback(() => {
    if (user && !currentUser && isLoaded) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [user, currentUser, isLoaded, createUser]);

  // Run user creation
  useMemo(() => {
    handleUserCreation();
  }, [handleUserCreation]);

  // Check admin access
  const checkAdminAccess = useCallback(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (currentUser === undefined) return;

    if (currentUser && currentUser.role !== "admin") {
      router.push("/access-denied");
    }
  }, [isLoaded, user, currentUser, router]);

  // Run access check
  useMemo(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  if (!isLoaded || currentUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Manage workspaces and monitor client activity
          </p>
        </div>
        <Button onClick={() => dispatch({ type: "OPEN_CREATE_WORKSPACE" })}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Workspaces
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkspaces}</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              Completed onboarding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Invites
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvites}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages Today
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesToday}</div>
            <p className="text-xs text-muted-foreground">
              Across all workspaces
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workspaces Table */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <p className="text-sm text-muted-foreground">
            View and manage all client workspaces
          </p>
        </div>
        <WorkspacesTable 
          workspaces={enrichedWorkspaces} 
          loading={!workspaces || !users}
        />
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        open={modals.createWorkspace}
        onClose={() => dispatch({ type: "CLOSE_CREATE_WORKSPACE" })}
      />
    </div>
  );
}

