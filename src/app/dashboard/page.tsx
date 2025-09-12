// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  Users,
  Settings,
  LogOut,
  MoreVertical,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Moon,
  Sun,
  Palette,
  Copy,
  ExternalLink,
  ShieldOff,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import CreateWorkspaceModal from "@/components/dashboard/CreateWorkspaceModal";
import WorkspaceSettingsModal from "@/components/dashboard/WorkspaceSettingsModal";
import type { Doc } from "@/convex/_generated/dataModel";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "accepted":
      return "secondary";
    case "pending":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4" />;
    case "accepted":
      return <Clock className="w-4 h-4" />;
    case "pending":
      return <Mail className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const workspaces = useQuery(api.workspaces.getMyWorkspaces);

  const createUser = useMutation(api.users.createOrUpdateUser);

  // Create/update user on first load
  // Check if user is admin
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    // Wait for currentUser to load
    if (currentUser === undefined) return;

    // If user exists but is not admin, redirect them
    if (currentUser && currentUser.role !== "admin") {
      // Check if they have any workspaces
      if (workspaces && workspaces.length > 0) {
        // Redirect to their first workspace
        const firstWorkspace = workspaces[0];
        if (firstWorkspace.onboardingCompleted) {
          router.push(`/w/${firstWorkspace.slug}`);
        } else {
          router.push(`/onboarding/${firstWorkspace._id}/welcome`);
        }
      } else {
        // No workspaces, show access denied
        router.push("/access-denied");
      }
      return;
    }
  }, [user, isLoaded, currentUser, workspaces, router]);

  // Create/update user on first load
  useEffect(() => {
    if (user && !currentUser && isLoaded) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [user, currentUser, isLoaded, createUser]);

  // Show loading state while checking permissions
  if (!isLoaded || currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Double-check admin access
  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
              <ShieldOff className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is restricted to administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group workspaces by status
  const activeWorkspaces =
    workspaces?.filter((w) => w.onboardingCompleted) || [];
  const pendingWorkspaces =
    workspaces?.filter((w) => !w.onboardingCompleted) || [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              {currentUser?.role === "admin" && (
                <Badge variant="secondary">Admin</Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button onClick={() => router.push("/dashboard/payment")}>
                Payments
              </Button>
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user?.imageUrl}
                        alt={user?.fullName || ""}
                      />
                      <AvatarFallback>
                        {user?.firstName?.charAt(0)}
                        {user?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.fullName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.emailAddresses[0].emailAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Workspaces
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workspaces?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeWorkspaces.length} active, {pendingWorkspaces.length}{" "}
                pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeWorkspaces.length}
              </div>
              <p className="text-xs text-muted-foreground">Ready to use</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Setup
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingWorkspaces.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting onboarding
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {currentUser?.role || "Client"}
              </div>
              <p className="text-xs text-muted-foreground">
                Client Code:{" "}
                <span className="font-mono">{currentUser?.clientCode}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workspaces Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Workspaces</h2>
            {currentUser?.role === "admin" && (
              <div className="flex items-center justify-between space-x-4">
                {currentUser?.role === "admin" && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Button>
                )}
              </div>
            )}
          </div>

          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Active ({activeWorkspaces.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingWorkspaces.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({workspaces?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeWorkspaces.map((workspace) => (
                  <WorkspaceCard key={workspace._id} workspace={workspace} />
                ))}
              </div>
              {activeWorkspaces.length === 0 && (
                <EmptyState
                  title="No active workspaces"
                  description="Complete the onboarding process to activate your workspaces."
                />
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingWorkspaces.map((workspace) => (
                  <WorkspaceCard key={workspace._id} workspace={workspace} />
                ))}
              </div>
              {pendingWorkspaces.length === 0 && (
                <EmptyState
                  title="No pending workspaces"
                  description="All workspaces have been set up successfully."
                />
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workspaces?.map((workspace) => (
                  <WorkspaceCard key={workspace._id} workspace={workspace} />
                ))}
              </div>
              {workspaces?.length === 0 && (
                <EmptyState
                  title="No workspaces yet"
                  description={
                    currentUser?.role === "admin"
                      ? "Create your first workspace to get started."
                      : "You haven't been invited to any workspaces yet."
                  }
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <CreateWorkspaceModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}

// Workspace Card Component
function WorkspaceCard({ workspace }: { workspace: Doc<"workspaces"> }) {
  const router = useRouter();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleNavigate = () => {
    if (workspace.onboardingCompleted) {
      router.push(`/w/${workspace.slug}`);
    } else {
      router.push(`/onboarding/${workspace._id}/welcome`);
    }
  };

  const handleCopyInvite = async () => {
    if (workspace.inviteToken) {
      const inviteLink = `${window.location.origin}/invite/${workspace.inviteToken}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!");
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
              <CardDescription className="text-xs">
                Created {new Date(workspace.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNavigate}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                {workspace.inviteToken &&
                  workspace.inviteStatus === "pending" && (
                    <DropdownMenuItem onClick={handleCopyInvite}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Invite Link
                    </DropdownMenuItem>
                  )}
                <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(workspace.inviteStatus)}>
              {getStatusIcon(workspace.inviteStatus)}
              <span className="ml-1">{workspace.inviteStatus}</span>
            </Badge>
            {workspace.theme && (
              <Badge variant="outline">
                <Palette className="mr-1 h-3 w-3" />
                {workspace.theme}
              </Badge>
            )}
          </div>

          {!workspace.onboardingCompleted && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Setup Progress</span>
                <span className="font-medium">
                  {Math.round((workspace.onboardingStep / 7) * 100)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(workspace.onboardingStep / 7) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{workspace.invitedEmail}</span>
          </div>

          <Button
            onClick={handleNavigate}
            className="w-full"
            variant={workspace.onboardingCompleted ? "default" : "outline"}
          >
            {workspace.onboardingCompleted
              ? "Open Workspace"
              : "Continue Setup"}
          </Button>
        </CardContent>
      </Card>

      <WorkspaceSettingsModal
        workspace={workspace}
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onDelete={() => window.location.reload()} // Refresh after delete
      />
    </>
  );
}

// Empty State Component
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Building2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

// Theme Toggle Component
function ThemeToggle() {
  const { darkMode, setDarkMode } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
