// app/w/[slug]/layout.tsx
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ThemeProvider } from "@/providers/theme-provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/nextjs";
import { 
  FileText, 
  CheckSquare, 
  PenTool, 
  Folder,
  Settings,
  LogOut,
  Moon,
  Sun,
  CreditCard,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/providers/theme-provider";
import ClientSettingsModal from "@/components/client/ClientSettingsModal";

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
  
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, {
    slug: use(params).slug,
  });

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
    if (path && ["notes", "tasks", "canvas", "files"].includes(path)) {
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
      <div className="min-h-screen flex flex-col">
        <WorkspaceHeader workspace={workspace} activeTab={activeTab} setActiveTab={setActiveTab} params={params} />
        <main className="flex-1 overflow-hidden w-full">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}

function WorkspaceHeader({ 
  workspace, 
  activeTab, 
  setActiveTab,
  params 
}: { 
  workspace: Doc<"workspaces">;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  params: Promise<{ slug: string }>;
}) {
  const { darkMode, setDarkMode } = useTheme();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  
  return (

    <>
    <header className="border-b bg-background">
      {/* Top row: Workspace name and actions */}
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-none">{workspace.name}</h1>
          <span className="text-xs text-muted-foreground hidden lg:inline">
            {workspace.theme}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="h-8 w-8"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => signOut()}
            className="h-8 w-8"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Bottom row: Navigation tabs */}
      <div className="border-t bg-background/50">
        <div className="container mx-auto px-4 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
              <TabsTrigger value="notes" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/notes`} className="flex flex-col items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Notes</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="tasks" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/tasks`} className="flex flex-col items-center gap-1">
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-xs">Tasks</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="canvas" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/canvas`} className="flex flex-col items-center gap-1">
                  <PenTool className="w-4 h-4" />
                  <span className="text-xs">Canvas</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="files" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/files`} className="flex flex-col items-center gap-1">
                  <Folder className="w-4 h-4" />
                  <span className="text-xs">Files</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="payment" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/payment`} className="flex flex-col items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Payment</span>
                </Link>
              </TabsTrigger>
              <TabsTrigger value="messages" asChild className="flex-col h-auto py-2 px-1">
                <Link href={`/w/${use(params).slug}/messages`} className="flex flex-col items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Messages</span>
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </header>

    <ClientSettingsModal workspace={workspace} open={open} onClose={() => setOpen(false)} />
    
    </>
  );
}