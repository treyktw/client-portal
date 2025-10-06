// app/w/[slug]/layout.tsx - Enhanced with Driver.js
"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import type { Doc } from "@telera/convex/_generated/dataModel";
import { ThemeProvider } from "@/providers/theme-provider";
import { DriverProvider } from "@/providers/DriverProvider";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/nextjs";
import { Settings, LogOut, Moon, Sun, ArrowLeft, Target } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import ClientSettingsModal from "@/components/client/ClientSettingsModal";
import WorkspaceSettingsModal from "@/components/admin/WorkspaceSettingsModal";
import MilestoneOverlay from "@/components/MilestoneOverlay";
import { WelcomeModal } from "@/components/WelcomeModal";
import { HelpButton } from "@/components/HelpButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FileText, CheckSquare, PenTool, Folder, CreditCard, MessageSquare } from "lucide-react";

export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("notes");
  const [showMilestones, setShowMilestones] = useState(false);
  
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, {
    slug: use(params).slug,
  });
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get milestone data for notification indicator
  const milestoneData = useQuery(
    api.milestones.getMilestones,
    workspace ? { workspaceId: workspace._id } : "skip"
  );

  // Check for recent milestone updates (notification indicator)
  const hasNewMilestone = useMemo(() => {
    if (!milestoneData?.milestones) return false;
    
    const lastViewed = localStorage.getItem(`milestones_viewed_${workspace?._id}`);
    if (!lastViewed) return true;
    
    const lastViewedTime = parseInt(lastViewed);
    return milestoneData.milestones.some(m => 
      m.createdAt > lastViewedTime || 
      (m.completedAt && m.completedAt > lastViewedTime)
    );
  }, [milestoneData, workspace?._id]);

  const handleOpenMilestones = useCallback(() => {
    setShowMilestones(true);
    if (workspace) {
      localStorage.setItem(`milestones_viewed_${workspace._id}`, Date.now().toString());
    }
  }, [workspace]);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (workspace === null) {
      router.push("/admin");
      return;
    }

    // Get active tab from URL
    const path = window.location.pathname.split("/").pop();
    if (path && ["notes", "tasks", "canvas", "files", "payment", "messages"].includes(path)) {
      setActiveTab(path);
    }
  }, [workspace, user, isLoaded, router]);

  if (!workspace || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider 
      defaultTheme={workspace.theme || "notebook"} 
      defaultDarkMode={workspace.darkMode || false}
    >
      <DriverProvider>
        <div className="min-h-screen flex flex-col">
          <WorkspaceHeader 
            workspace={workspace} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            params={params} 
            currentUser={currentUser}
            onOpenMilestones={handleOpenMilestones}
            hasNewMilestone={hasNewMilestone}
            milestoneProgress={milestoneData?.progress || 0}
          />
          
          <main className="flex-1 overflow-hidden">
            {children}
          </main>

          {/* Welcome Modal for first-time users */}
          {currentUser?.role !== "admin" && (
            <WelcomeModal workspaceName={workspace.name} />
          )}

          {/* Help Button - Always visible for clients */}
          {currentUser?.role !== "admin" && <HelpButton />}

          {/* Milestone Overlay */}
          <MilestoneOverlay
            workspaceId={workspace._id}
            open={showMilestones}
            onClose={() => setShowMilestones(false)}
          />
        </div>
      </DriverProvider>
    </ThemeProvider>
  );
}

function WorkspaceHeader({ 
  workspace, 
  activeTab,
  setActiveTab,
  currentUser,
  onOpenMilestones,
  hasNewMilestone,
  milestoneProgress
}: { 
  workspace: Doc<"workspaces">;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  params: Promise<{ slug: string }>;
  currentUser: Doc<"users"> | null | undefined;
  onOpenMilestones: () => void;
  hasNewMilestone: boolean;
  milestoneProgress: number;
}) {
  const { darkMode, setDarkMode } = useTheme();
  const { signOut } = useClerk();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  return (
    <>
      <header className="border-b bg-background">
        {/* Top row: Workspace name and actions */}
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-none">
              {workspace.name}
            </h1>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {workspace.theme}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Milestone Button with Progress */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenMilestones}
              className="relative h-8 px-3"
            >
              <Target className="w-4 h-4 mr-2" />
              <span className="text-sm">Milestones</span>
              <div className="ml-2 w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${milestoneProgress}%` }}
                />
              </div>
              {hasNewMilestone && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="h-8 w-8"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            {currentUser?.role === "admin" ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/admin")}
                className="h-8 w-8"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => signOut()}
                className="h-8 w-8"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Bottom row: Navigation tabs */}
        <div className="border-t bg-background/50">
          <div className="container mx-auto px-4 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
                <TabsTrigger value="notes" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/notes`} className="flex flex-col items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Notes</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="tasks" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/tasks`} className="flex flex-col items-center gap-1">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-xs">Tasks</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="canvas" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/canvas`} className="flex flex-col items-center gap-1">
                    <PenTool className="w-4 h-4" />
                    <span className="text-xs">Canvas</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="files" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/files`} className="flex flex-col items-center gap-1">
                    <Folder className="w-4 h-4" />
                    <span className="text-xs">Files</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="payment" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/payment`} className="flex flex-col items-center gap-1">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs">Payment</span>
                  </Link>
                </TabsTrigger>
                <TabsTrigger value="messages" asChild className="flex-col h-auto py-2 px-1">
                  <Link href={`/w/${workspace.slug}/messages`} className="flex flex-col items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs">Messages</span>
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Settings Modals */}
      {currentUser?.role === "admin" ? (
        <WorkspaceSettingsModal 
          workspace={workspace} 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      ) : (
        <ClientSettingsModal 
          workspace={workspace} 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      )}
    </>
  );
}