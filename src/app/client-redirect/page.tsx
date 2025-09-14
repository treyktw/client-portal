// app/client-redirect/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

export default function ClientRedirect() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const { signOut } = useClerk();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const workspaces = useQuery(api.workspaces.getMyWorkspaces);
  const deleteWorkspace = useMutation(api.workspaces.deleteWorkspace);
  const createUser = useMutation(api.users.createOrUpdateUser);
  const allUsers = useQuery(api.users.debugAllUsers);

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

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    // Wait for currentUser to load (undefined = loading, null = not found)
    if (currentUser === undefined) return;

    // If currentUser is null, the user doesn't exist in our database
    if (currentUser === null) return;

    // For admin users, we don't need to wait for workspaces
    if (currentUser.role === "admin") {
      router.push("/admin");
      return;
    }

    // For non-admin users, wait for workspaces to load
    if (workspaces === undefined) return;

    // If a user record exists but is not a client, block access
    // Allow null (not yet created) to continue so we can inspect workspaces/UI
    if (currentUser && currentUser.role !== "client") {
      router.push("/access-denied");
      return;
    }

    // If client has no workspaces, show no access message
    if (workspaces.length === 0) {
      return; // Will show the no workspace UI below
    }

    // If client has exactly one workspace, redirect automatically
    if (workspaces.length === 1) {
      const workspace = workspaces[0];
      if (workspace.onboardingCompleted) {
        router.push(`/w/${workspace.slug}`);
      } else {
        router.push(`/onboarding/${workspace._id}/welcome`);
      }
      return;
    }

    // If client has multiple workspaces, they need to choose (handled in UI below)
  }, [user, isLoaded, currentUser, workspaces, router]);

  const handleSelectWorkspace = (workspace: { _id: string; slug: string; onboardingCompleted: boolean }) => {
    setSelectedWorkspace(workspace._id);
    
    // Redirect to the selected workspace
    if (workspace.onboardingCompleted) {
      router.push(`/w/${workspace.slug}`);
    } else {
      router.push(`/onboarding/${workspace._id}/welcome`);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: Id<"workspaces">) => {
    if (!confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkspace({ workspaceId });
      toast.success("Workspace deleted successfully");
      
      // Check remaining workspaces
      if (workspaces && workspaces.length === 2) {
        // After deleting, only one will remain, redirect to it
        const remainingWorkspace = workspaces.find(w => w._id !== workspaceId);
        if (remainingWorkspace) {
          handleSelectWorkspace(remainingWorkspace);
        }
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (!isLoaded || currentUser === undefined || workspaces === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // User not found in database
  if (currentUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>
              Your account exists in Clerk but not in our database. This usually happens for admin users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>Your Clerk ID:</strong> {user?.id}</p>
              <p><strong>Your Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            
            {/* Debug Information */}
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs space-y-1">
              <p><strong>Debug Info:</strong></p>
              <p>Current User: {currentUser ? "Found" : "Not Found"}</p>
              <p>All Users Count: {allUsers?.length || 0}</p>
              {allUsers && allUsers.length > 0 && (
                <div>
                  <p>Users in DB:</p>
                  <ul className="ml-2">
                    {allUsers.map((u) => (
                      <li key={u.id}>
                        {u.email} (ID: {u.clerkId}, Role: {u.role})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>For Admin Users:</strong> Use the <code>createAdminUser</code> mutation in Convex with your Clerk ID and admin secret.
              </p>
            </div>
            <Button 
              onClick={() => signOut()} 
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No workspaces state
  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle>No Workspace Found</CardTitle>
            <CardDescription>
              You haven't been invited to any workspaces yet. Please contact your administrator or wait for an invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your email: <span className="font-medium">{user?.emailAddresses[0].emailAddress}</span>
            </p>
            <Button 
              onClick={() => signOut()} 
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multiple workspaces - need to choose
  if (workspaces.length > 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle>Multiple Workspaces Detected</CardTitle>
            <CardDescription>
              You have access to multiple workspaces. As per our policy, each client should have only one active workspace. 
              Please select the workspace you want to keep and delete the others.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workspaces.map((workspace) => (
                <div 
                  key={workspace._id}
                  className={`border rounded-lg p-4 ${
                    selectedWorkspace === workspace._id ? 'border-primary bg-accent/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium">{workspace.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: {workspace.onboardingCompleted ? 'Active' : `Onboarding (Step ${workspace.onboardingStep}/7)`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(workspace.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSelectWorkspace(workspace)}
                        size="sm"
                        variant={selectedWorkspace === workspace._id ? "default" : "outline"}
                      >
                        Select & Continue
                      </Button>
                      {workspaces.length > 1 && (
                        <Button
                          onClick={() => handleDeleteWorkspace(workspace._id)}
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Deleting a workspace will permanently remove all associated data including notes, tasks, and files. 
                This action cannot be undone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should not be reached due to the useEffect redirect
  return null;
}