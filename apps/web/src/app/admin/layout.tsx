// app/admin/layout.tsx
"use client";

import { useMemo, useReducer, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme-provider";

type SidebarLayoutState = {
  isOpen: boolean;
};

type SidebarLayoutAction = 
  | { type: "SET_SIDEBAR_OPEN"; payload: boolean };

const layoutReducer = (state: SidebarLayoutState, action: SidebarLayoutAction): SidebarLayoutState => {
  switch (action.type) {
    case "SET_SIDEBAR_OPEN":
      return { ...state, isOpen: action.payload };
    default:
      return state;
  }
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get unread message counts (placeholder for now - will be implemented with messaging system)
  const currentUser = useQuery(api.users.getCurrentUser);
  const [layoutState, dispatch] = useReducer(layoutReducer, { isOpen: true });
  
  // Calculate unread counts (will be replaced with actual queries when messaging is implemented)
  const unreadCount = useMemo(() => {
    // TODO: Query actual unread messages
    return 0;
  }, []);

  const mentionCount = useMemo(() => {
    // TODO: Query actual mentions
    return 0;
  }, []);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    return currentUser?.role === "admin";
  }, [currentUser]);

  const handleSidebarToggle = useCallback((isOpen: boolean) => {
    dispatch({ type: "SET_SIDEBAR_OPEN", payload: isOpen });
  }, []);

  if (currentUser === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            This area is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-background">
      <AdminSidebar 
        unreadCount={unreadCount} 
        mentionCount={mentionCount}
        onToggle={handleSidebarToggle}
      />
      
      {/* Main content area with smooth transition based on sidebar state */}
      <div 
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          layoutState.isOpen ? "lg:ml-64" : "lg:ml-0"
        )}
      >
        <main className="w-full">
          {children}
        </main>
      </div>
    </div>
    </ThemeProvider>
  );
}