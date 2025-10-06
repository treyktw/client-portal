// components/admin/AdminSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Settings,
  LogOut,
  Sun,
  Moon,
  Users,
  Target,
} from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import type { NavItem } from "@/types/admin";
import AdminSettingsModal from "./AdminSettingsModal";

interface AdminSidebarProps {
  unreadCount?: number;
  mentionCount?: number;
  onToggle?: (isOpen: boolean) => void;
}

export default function AdminSidebar({ unreadCount = 0, mentionCount = 0, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { darkMode, setDarkMode } = useTheme();
  
  const [isOpen, setIsOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("admin-sidebar-state");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setIsOpen(parsed.isOpen ?? true);
        setExpandedItems(new Set(parsed.expandedItems ?? []));
        onToggle?.(parsed.isOpen ?? true);
      } catch (error) {
        console.error("Failed to load sidebar state:", error);
      }
    }
  }, [onToggle]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      "admin-sidebar-state",
      JSON.stringify({
        isOpen,
        expandedItems: Array.from(expandedItems),
      })
    );
  }, [isOpen, expandedItems]);

  const toggleSidebar = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  const toggleMenuItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isActive = (href: string) => {
    if (pathname === href) return true;
    // Only check startsWith for non-root paths to avoid false positives
    if (href !== "/admin" && pathname.startsWith(href + "/")) return true;
    return false;
  };

  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      id: "messages",
      label: "Messages",
      href: "/admin/messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: "payments",
      label: "Payments",
      href: "/admin/payments",
      icon: CreditCard,
    },
    {
      id: "crm",
      label: "CRM",
      href: "/admin/crm",
      icon: Users,
    },
    {
      id: "milestones",
      label: "Milestones",
      href: "/admin/milestones",
      icon: Target,
    },
  ];

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    // For parent items with children, check if any child is active
    // For items without children, check if the item itself is active
    const active = hasChildren 
      ? item.children?.some(child => isActive(child.href)) || false
      : isActive(item.href);

    return (
      <div key={item.id}>
        <div className={cn("group relative flex items-center", depth > 0 && "ml-4")}>
          {hasChildren ? (
            <Button
              onClick={() => toggleMenuItem(item.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors bg-transparent text-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                active && ""
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Link
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </Link>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">{item.children?.map((child) => renderNavItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="fixed left-0 top-0 z-40 h-screen">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mt-4 ml-4">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <Button
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-background border-r transition-transform duration-300 ease-in-out",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map((item) => renderNavItem(item))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2 h-auto"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
                    <AvatarFallback>
                      {user?.firstName?.charAt(0)}
                      {user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{user?.fullName}</span>
                    <span className="text-xs text-muted-foreground">Administrator</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="top" sideOffset={8}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark Mode
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Admin Settings Modal */}
      <AdminSettingsModal
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}