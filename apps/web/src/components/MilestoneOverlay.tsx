// components/workspace/MilestoneOverlay.tsx
"use client";

import { useReducer, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  CheckCircle,
  Clock,
  Lock,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MilestoneOverlayProps {
  workspaceId: Id<"workspaces">;
  open: boolean;
  onClose: () => void;
}

interface OverlayState {
  expandedPhase: string | null;
  completingId: string | null;
}

type OverlayAction =
  | { type: "TOGGLE_PHASE"; phase: string }
  | { type: "START_COMPLETE"; id: string }
  | { type: "END_COMPLETE" };

const overlayReducer = (state: OverlayState, action: OverlayAction): OverlayState => {
  switch (action.type) {
    case "TOGGLE_PHASE":
      return {
        ...state,
        expandedPhase: state.expandedPhase === action.phase ? null : action.phase,
      };
    case "START_COMPLETE":
      return { ...state, completingId: action.id };
    case "END_COMPLETE":
      return { ...state, completingId: null };
    default:
      return state;
  }
};

export default function MilestoneOverlay({ workspaceId, open, onClose }: MilestoneOverlayProps) {
  const data = useQuery(api.milestones.getMilestones, { workspaceId });
  const completeMilestone = useMutation(api.milestones.completeMilestone);
  const updateMilestone = useMutation(api.milestones.updateMilestone);

  const [state, dispatch] = useReducer(overlayReducer, {
    expandedPhase: null,
    completingId: null,
  });

  const handleComplete = useCallback(async (milestoneId: Id<"milestones">, currentStatus: string) => {
    dispatch({ type: "START_COMPLETE", id: milestoneId });
    
    try {
      if (currentStatus === "completed") {
        // Uncomplete
        await updateMilestone({
          milestoneId,
          status: "pending" as const,
        });
        toast.success("Milestone marked as pending");
      } else {
        // Complete
        await completeMilestone({
          milestoneId,
          notes: "Completed via client portal",
        });
        toast.success("Milestone completed!");
      }
    } catch (error) {
      toast.error("Failed to update milestone", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      dispatch({ type: "END_COMPLETE" });
    }
  }, [completeMilestone, updateMilestone]);

  // Group milestones by phase
  const phaseGroups = useMemo(() => {
    if (!data?.milestones) return {};
    
    return data.milestones.reduce((acc, milestone) => {
      if (!acc[milestone.phase]) {
        acc[milestone.phase] = {
          milestones: [],
          completed: 0,
          total: 0,
        };
      }
      acc[milestone.phase].milestones.push(milestone);
      acc[milestone.phase].total++;
      if (milestone.status === "completed") {
        acc[milestone.phase].completed++;
      }
      return acc;
    }, {} as Record<string, { milestones: typeof data.milestones; completed: number; total: number }>);
  }, [data]);

  if (!data) return null;

  const { milestones, progress, total, completed } = data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[70vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5" />
              <span>Project Milestones</span>
            </div>
            <div className="text-sm font-normal text-muted-foreground mt-2">
              {completed} of {total} completed
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* Overall Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Milestones by Phase */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {Object.entries(phaseGroups).map(([phaseName, phaseData]) => {
              const phaseProgress = (phaseData.completed / phaseData.total) * 100;
              const isExpanded = state.expandedPhase === phaseName;

              return (
                <div
                  key={phaseName}
                  className="rounded-lg overflow-hidden"
                >
                  {/* Phase Header */}
                  <Button
                    onClick={() => dispatch({ type: "TOGGLE_PHASE", phase: phaseName })}
                    className="w-full p-4 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{phaseName}</span>
                        <span className="text-xs text-muted-accent ">
                          {phaseData.completed}/{phaseData.total} completed
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={phaseProgress} className="w-24 h-2" />
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </Button>

                  {/* Phase Milestones */}
                  {isExpanded && (
                    <div className="divide-y">
                      {phaseData.milestones.map((milestone) => {
                        const isCompleted = milestone.status === "completed";
                        const isBlocked = milestone.status === "blocked";
                        const isInProgress = milestone.status === "in_progress";
                        const isCompleting = state.completingId === milestone._id;

                        return (
                          <div
                            key={milestone._id}
                            className={cn(
                              "p-4 flex items-center gap-4",
                              isCompleted && "bg-green-50/50",
                              isBlocked && "opacity-50"
                            )}
                          >
                            {/* Checkbox */}
                            <Checkbox
                              checked={isCompleted}
                              disabled={isBlocked || isCompleting}
                              onCheckedChange={() => handleComplete(milestone._id, milestone.status)}
                              className="h-5 w-5"
                            />

                            {/* Milestone Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium",
                                  isCompleted && "line-through text-muted-foreground"
                                )}>
                                  {milestone.title}
                                </span>
                                {isInProgress && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    In Progress
                                  </Badge>
                                )}
                                {isBlocked && (
                                  <Badge variant="outline" className="text-xs">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Blocked
                                  </Badge>
                                )}
                              </div>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {milestone.description}
                                </p>
                              )}
                            </div>

                            {/* Due Date & Payment */}
                            <div className="flex items-center gap-4 text-sm">
                              {milestone.dueDate && !isCompleted && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(milestone.dueDate), "MMM d")}
                                </div>
                              )}
                              
                              {(milestone.paymentPercentage || milestone.paymentAmount) && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {milestone.paymentPercentage
                                    ? `${milestone.paymentPercentage}%`
                                    : `$${milestone.paymentAmount}`}
                                  {milestone.paymentStatus === "paid" && (
                                    <CheckCircle className="h-3 w-3 text-green-600 ml-1" />
                                  )}
                                </div>
                              )}

                              {isCompleted && milestone.completedAt && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {format(new Date(milestone.completedAt), "MMM d")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}