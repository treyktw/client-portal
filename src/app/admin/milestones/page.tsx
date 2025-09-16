// app/admin/milestones/page.tsx
"use client";

import { useReducer, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Target,
  Clock,
  CheckCircle,
  Lock,
  DollarSign,
  Calendar,
  Edit,
  Trash,
  Save,
  X,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import WorkspaceSelector from "@/components/admin/WorkspaceSelector";
import type { Id } from "@/convex/_generated/dataModel";

interface PageState {
  selectedWorkspaceId: string | null;
  isFormOpen: boolean;
  formMode: "create" | "edit";
  currentMilestone: {
    id?: string;
    workspaceId: string;
    phase: string;
    title: string;
    description: string;
    dueDate: string;
    paymentPercentage: number;
    paymentAmount: number;
    position: { x: number; y: number };
  } | null;

}

interface Data {
  _id: string;
  workspaceId: string;
  phase: string;
  title: string;
  description: string;
  dueDate?: number;
  paymentPercentage?: number;
  paymentAmount?: number;
  position: { x: number; y: number };
}

type PageAction =
  | { type: "SET_WORKSPACE"; workspaceId: string }
  | {
      type: "OPEN_CREATE";
      position: { x: number; y: number };
    }
  | {
      type: "OPEN_EDIT";
      milestone: {
        _id: string;
        workspaceId: string;
        phase: string;
        title: string;
        description: string;
        dueDate?: number;
        paymentPercentage?: number;
        paymentAmount?: number;
        position: { x: number; y: number };
      };
    }
  | { type: "CLOSE_FORM" }
  | { type: "SET_FIELD"; field: string; value: string | number }
  | { type: "SET_DESCRIPTION"; value: string };

const pageReducer = (state: PageState, action: PageAction): PageState => {
  switch (action.type) {
    case "SET_WORKSPACE":
      return { ...state, selectedWorkspaceId: action.workspaceId };
    case "OPEN_CREATE":
      if (!state.selectedWorkspaceId) return state;
      return {
        ...state,
        isFormOpen: true,
        formMode: "create",
        currentMilestone: {
          workspaceId: state.selectedWorkspaceId,
          phase: "Phase 1",
          title: "",
          description: "",
          dueDate: "",
          paymentPercentage: 0,
          paymentAmount: 0,
          position: action.position,
        },
      };
    case "OPEN_EDIT":
      return {
        ...state,
        isFormOpen: true,
        formMode: "edit",
        currentMilestone: {
          id: action.milestone._id,
          workspaceId: action.milestone.workspaceId,
          phase: action.milestone.phase,
          title: action.milestone.title,
          description: action.milestone.description,
          dueDate: action.milestone.dueDate
            ? format(new Date(action.milestone.dueDate), "yyyy-MM-dd")
            : "",
          paymentPercentage: action.milestone.paymentPercentage || 0,
          paymentAmount: action.milestone.paymentAmount || 0,
          position: action.milestone.position,
        },
      };
    case "CLOSE_FORM":
      return { ...state, isFormOpen: false, currentMilestone: null };
    case "SET_FIELD":
      if (!state.currentMilestone) return state;
      return {
        ...state,
        currentMilestone: {
          ...state.currentMilestone,
          [action.field]: action.value,
        },
      };
    case "SET_DESCRIPTION":
      if (!state.currentMilestone) return state;
      return {
        ...state,
        currentMilestone: {
          ...state.currentMilestone,
          description: action.value,
        },
      };
    default:
      return state;
  }
};

// Custom node component
const MilestoneNode = ({
  data,
}: {
  data: {
    _id: string;
    workspaceId: string;
    phase: string;
    title: string;
    description: string;
    dueDate?: number;
    paymentPercentage?: number;
    paymentAmount?: number;
    position: { x: number; y: number };
    status: string;
    onEdit: (data: Data) => void;
    onDelete: (id: string) => void;
  };
}) => {
  const getStatusIcon = () => {
    switch (data.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "blocked":
        return <Lock className="h-4 w-4 text-gray-600" />;
      default:
        return <Target className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case "completed":
        return "border-green-500 bg-green-50";
      case "in_progress":
        return "border-blue-500 bg-blue-50";
      case "blocked":
        return "border-gray-400 bg-gray-50";
      default:
        return "border-amber-500 bg-amber-50";
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[250px] ${getStatusColor()}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {data.phase}
            </p>
            <h3 className="font-semibold text-sm">{data.title}</h3>
          </div>
          {getStatusIcon()}
        </div>

        {data.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(data.dueDate), "MMM d, yyyy")}
          </div>
        )}

        {(data.paymentPercentage || data.paymentAmount) && (
          <div className="flex items-center gap-1 text-xs font-medium">
            <DollarSign className="h-3 w-3" />
            {data.paymentPercentage
              ? `${data.paymentPercentage}%`
              : `$${data.paymentAmount}`}
          </div>
        )}

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => data.onEdit(data)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => data.onDelete(data._id)}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const nodeTypes = {
  milestone: MilestoneNode,
};

export default function MilestonesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state with workspace from URL if present
  const initialWorkspaceId = searchParams.get("workspace");
  
  const [state, dispatch] = useReducer(pageReducer, {
    selectedWorkspaceId: initialWorkspaceId,
    isFormOpen: false,
    formMode: "create",
    currentMilestone: null,
  });

  // Update URL when workspace changes
  useEffect(() => {
    if (state.selectedWorkspaceId) {
      const params = new URLSearchParams(searchParams);
      params.set("workspace", state.selectedWorkspaceId);
      router.replace(`/admin/milestones?${params.toString()}`);
    }
  }, [state.selectedWorkspaceId, router, searchParams]);

  // Fetch milestones for selected workspace
  const milestones = useQuery(
    api.milestones.getMilestones,
    state.selectedWorkspaceId 
      ? { workspaceId: state.selectedWorkspaceId as Id<"workspaces"> }
      : "skip"
  );

  const createMilestone = useMutation(api.milestones.createMilestone);
  const updateMilestone = useMutation(api.milestones.updateMilestone);
  const deleteMilestone = useMutation(api.milestones.deleteMilestone);

  // Convert milestones to React Flow nodes and edges
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!milestones?.milestones) return { nodes: [], edges: [] };

    const nodes: Node[] = milestones.milestones.map((milestone) => ({
      id: milestone._id,
      type: "milestone",
      position: milestone.position,
      data: {
        ...milestone,
        onEdit: (data: Data) =>
          dispatch({ type: "OPEN_EDIT", milestone: data }),
        onDelete: async (id: string) => {
          try {
            await deleteMilestone({ milestoneId: id as Id<"milestones"> });
            toast.success("Milestone deleted");
          } catch (error) {
            toast.error("Failed to delete milestone", {
              description: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
      },
    }));

    const edges: Edge[] = [];
    milestones.milestones.forEach((milestone) => {
      if (milestone.dependencies) {
        milestone.dependencies.forEach((depId) => {
          edges.push({
            id: `${depId}-${milestone._id}`,
            source: depId,
            target: milestone._id,
            animated: milestone.status === "in_progress",
          });
        });
      }
    });

    return { nodes, edges };
  }, [milestones, deleteMilestone]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when flowNodes change
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  // Update edges when flowEdges change
  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = useCallback(async () => {
    if (!state.currentMilestone || !state.selectedWorkspaceId) return;

    try {
      const description = state.currentMilestone.description;

      if (state.formMode === "create") {
        await createMilestone({
          workspaceId: state.selectedWorkspaceId as Id<"workspaces">,
          phase: state.currentMilestone.phase,
          title: state.currentMilestone.title,
          description,
          position: state.currentMilestone.position,
          dueDate: state.currentMilestone.dueDate
            ? new Date(state.currentMilestone.dueDate).getTime()
            : undefined,
          paymentPercentage:
            state.currentMilestone.paymentPercentage || undefined,
          paymentAmount: state.currentMilestone.paymentAmount || undefined,
          order: nodes.length,
        });
        toast.success("Milestone created");
      } else {
        await updateMilestone({
          milestoneId: state.currentMilestone.id as Id<"milestones">,
          phase: state.currentMilestone.phase,
          title: state.currentMilestone.title,
          description,
          dueDate: state.currentMilestone.dueDate
            ? new Date(state.currentMilestone.dueDate).getTime()
            : undefined,
          paymentPercentage:
            state.currentMilestone.paymentPercentage || undefined,
          paymentAmount: state.currentMilestone.paymentAmount || undefined,
        });
        toast.success("Milestone updated");
      }

      dispatch({ type: "CLOSE_FORM" });
    } catch (error) {
      toast.error("Failed to save milestone", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [state, createMilestone, updateMilestone, nodes.length]);

  const onCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (!state.selectedWorkspaceId) {
        toast.error("Please select a workspace first");
        return;
      }

      // Get click position relative to the canvas
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // Only open if clicking on empty space (not on a node)
      if (
        (event.target as HTMLElement).classList.contains("react-flow__pane")
      ) {
        dispatch({ type: "OPEN_CREATE", position });
      }
    },
    [state.selectedWorkspaceId]
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Milestone Management</h1>
              {state.selectedWorkspaceId && milestones && (
                <p className="text-muted-foreground">
                  {milestones.completed || 0} of {milestones.total || 0} completed
                  • {Math.round(milestones.progress || 0)}% progress
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <WorkspaceSelector
              value={state.selectedWorkspaceId || undefined}
              onValueChange={(value) => dispatch({ type: "SET_WORKSPACE", workspaceId: value })}
              className="w-[300px]"
            />
            
            <Button
              onClick={() => {
                if (!state.selectedWorkspaceId) {
                  toast.error("Please select a workspace first");
                  return;
                }
                dispatch({
                  type: "OPEN_CREATE",
                  position: { x: 100, y: 100 },
                });
              }}
              disabled={!state.selectedWorkspaceId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {!state.selectedWorkspaceId ? (
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-md p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Select a Workspace</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Choose a workspace to view and manage its milestones
                  </p>
                </div>
                <WorkspaceSelector
                  value={state.selectedWorkspaceId || undefined}
                  onValueChange={(value) => dispatch({ type: "SET_WORKSPACE", workspaceId: value })}
                  className="w-full"
                />
              </div>
            </Card>
          </div>
        ) : milestones?.milestones?.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-md p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">No Milestones Yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Click anywhere on the canvas or use the button to create your first milestone
                  </p>
                </div>
                <Button
                  onClick={() =>
                    dispatch({
                      type: "OPEN_CREATE",
                      position: { x: 400, y: 300 },
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Milestone
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onClick={onCanvasClick}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        )}
      </div>

      {/* Milestone Form Drawer */}
      <Sheet
        open={state.isFormOpen}
        onOpenChange={() => dispatch({ type: "CLOSE_FORM" })}
      >
        <SheetContent className="w-full overflow-y-auto p-2">
          <SheetHeader>
            <SheetTitle>
              {state.formMode === "create"
                ? "Create Milestone"
                : "Edit Milestone"}
            </SheetTitle>
            <SheetDescription>
              Define milestone details and requirements
            </SheetDescription>
          </SheetHeader>

          {state.currentMilestone && (
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Phase</Label>
                <Select
                  value={state.currentMilestone.phase}
                  onValueChange={(value) =>
                    dispatch({ type: "SET_FIELD", field: "phase", value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phase 1">
                      Phase 1: Discovery & Planning
                    </SelectItem>
                    <SelectItem value="Phase 2">
                      Phase 2: Design & Setup
                    </SelectItem>
                    <SelectItem value="Phase 3">
                      Phase 3: Development & Integration
                    </SelectItem>
                    <SelectItem value="Phase 4">
                      Phase 4: Launch & Support
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={state.currentMilestone.title}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "title",
                      value: e.target.value,
                    })
                  }
                  placeholder="e.g., Kickoff Meeting"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={state.currentMilestone.description}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "description",
                      value: e.target.value,
                    })
                  }
                  placeholder="Describe the milestone requirements and deliverables..."
                  rows={8}
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={state.currentMilestone.dueDate}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "dueDate",
                      value: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Percentage</Label>
                  <Input
                    type="number"
                    value={state.currentMilestone.paymentPercentage}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "paymentPercentage",
                        value: Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 20"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    type="number"
                    value={state.currentMilestone.paymentAmount}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "paymentAmount",
                        value: Number(e.target.value),
                      })
                    }
                    placeholder="e.g., 1000"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => dispatch({ type: "CLOSE_FORM" })}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {state.formMode === "create" ? "Create" : "Update"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}