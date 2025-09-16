// components/admin/WorkspaceSelector.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { format } from "date-fns";

interface WorkspaceSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function WorkspaceSelector({
  value,
  onValueChange,
  placeholder = "Select a workspace",
  className,
}: WorkspaceSelectorProps) {
  const workspaces = useQuery(api.workspaces.getAllWorkspaces) || [];

  // Group workspaces by status
  const activeWorkspaces = workspaces.filter(w => w.onboardingCompleted);
  const pendingWorkspaces = workspaces.filter(w => !w.onboardingCompleted);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>
                {workspaces.find(w => w._id === value)?.name || value}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {activeWorkspaces.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Active Workspaces
            </div>
            {activeWorkspaces.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workspace.invitedEmail}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">
                    {format(new Date(workspace.createdAt), "MMM d")}
                  </span>
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {pendingWorkspaces.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Pending Onboarding
            </div>
            {pendingWorkspaces.map((workspace) => (
              <SelectItem key={workspace._id} value={workspace._id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 opacity-50" />
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workspace.invitedEmail} • Step {workspace.onboardingStep}/7
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">
                    Pending
                  </span>
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {workspaces.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No workspaces found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}