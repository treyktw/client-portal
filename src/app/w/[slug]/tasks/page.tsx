// app/w/[slug]/tasks/page.tsx
"use client";

import { useState, useCallback, memo, useEffect, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, GripVertical, RefreshCw, Cloud, Calendar, Flag, Edit, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { taskSyncEngine } from "@/lib/taskSyncEngine";
import TaskEditModal from "@/components/task/TaskEditModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const columns = [
  { id: "todo", title: "To Do", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100 dark:bg-blue-900" },
  { id: "review", title: "Review", color: "bg-yellow-100 dark:bg-yellow-900" },
  { id: "done", title: "Done", color: "bg-green-100 dark:bg-green-900" },
];

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  position: number;
  dueDate?: number;
}

interface TasksState {
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}


// Memoized Task Card Component
const TaskCard = memo(function TaskCard({ 
  task, 
  index, 
  getPriorityColor,
  onEdit,
  onDelete,
  isMobile = false
}: { 
  task: Task; 
  index: number; 
  getPriorityColor: (priority: string) => string;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isMobile?: boolean;
}) {
  return (
    <Draggable key={task._id} draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          <Card 
            className={`${isMobile ? 'p-2' : 'p-3'} bg-card transition-shadow ${
              snapshot.isDragging 
                ? "shadow-lg ring-2 ring-primary/20" 
                : "hover:shadow-md"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div
                  {...provided.dragHandleProps}
                  className={`${isMobile ? 'mt-0.5' : 'mt-1'} cursor-grab hover:text-primary touch-manipulation`}
                >
                  <GripVertical className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`${isMobile ? 'text-sm' : ''} font-medium line-clamp-2`}>
                    {task.title}
                  </h4>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} touch-manipulation`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(task._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {task.description && (
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground line-clamp-2 ${isMobile ? 'ml-5' : 'ml-6'}`}>
                  {task.description}
                </p>
              )}
              <div className={`flex items-center gap-2 ${isMobile ? 'ml-5' : 'ml-6'} ${isMobile ? 'flex-wrap' : ''}`}>
                <Badge 
                  variant={getPriorityColor(task.priority) as "destructive" | "default" | "secondary" | "outline"}
                  className={`gap-1 ${isMobile ? 'text-xs' : ''}`}
                >
                  {task.priority === "urgent" && <Flag className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />}
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <div className={`flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                    <Calendar className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
});

export default function TasksPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const serverTasks = useQuery(api.tasks.getTasks, {
    workspaceId: workspace?._id as Id<"workspaces">,
  });
  
  const createTask = useMutation(api.tasks.createTask);
  const reorderTasks = useMutation(api.tasks.reorderTasks);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  
  const mutations = useMemo(() => ({
    createTask,
    reorderTasks,
    updateTask,
    deleteTask,
  }), [createTask, reorderTasks, updateTask, deleteTask]);

  // Local state for immediate UI updates
  const [localTasks, setLocalTasks] = useState<TasksState | null>(null);
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [syncStatus, setSyncStatus] = useState({ pendingOperations: 0, isProcessing: false });
  const isDraggingRef = useRef(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  }, []);

  const handleSaveTask = useCallback((taskId: string, updates: Partial<Task>) => {
    // Update local state immediately
    setLocalTasks((current: TasksState | null) => {
      if (!current) return current;
      
      const newTasks = { ...current };
      for (const status in newTasks) {
        const taskList = newTasks[status as keyof TasksState];
        const taskIndex = taskList.findIndex(t => t._id === taskId);
        if (taskIndex !== -1) {
          taskList[taskIndex] = { ...taskList[taskIndex], ...updates };
          break;
        }
      }
      return newTasks;
    });

    // Queue sync operation
    taskSyncEngine.addOperation({
      type: 'update',
      taskId,
      data: updates
    });
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    // Update local state immediately
    setLocalTasks((current: TasksState | null) => {
      if (!current) return current;
      
      const newTasks = { ...current };
      for (const status in newTasks) {
        newTasks[status as keyof TasksState] = newTasks[status as keyof TasksState].filter(
          t => t._id !== taskId
        );
      }
      return newTasks;
    });

    // Queue sync operation
    taskSyncEngine.addOperation({
      type: 'delete',
      taskId,
      data: {}
    });
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize sync engine
  useEffect(() => {
    if (workspace?._id) {
      taskSyncEngine.init(mutations, workspace._id);
      
      // Update sync status periodically
      const interval = setInterval(() => {
        setSyncStatus(taskSyncEngine.getSyncStatus());
      }, 500);
      
      return () => {
        clearInterval(interval);
        taskSyncEngine.destroy();
      };
    }
  }, [workspace?._id, mutations]);

  // Initialize local tasks from server
  useEffect(() => {
    if (serverTasks && !localTasks && !isDraggingRef.current) {
      setLocalTasks(serverTasks);
    }
  }, [serverTasks, localTasks]);

  // Sync server updates when not dragging
  useEffect(() => {
    if (serverTasks && !isDraggingRef.current) {
      // Only update if we're not actively dragging
      const timeout = setTimeout(() => {
        if (!isDraggingRef.current) {
          setLocalTasks(serverTasks);
        }
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [serverTasks]);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    isDraggingRef.current = false;
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Update local state immediately
    setLocalTasks((currentTasks: TasksState | null) => {
      if (!currentTasks) return currentTasks;
      
      const newTasks = { ...currentTasks };
      const sourceList = [...newTasks[source.droppableId as keyof TasksState]];
      const destList = source.droppableId === destination.droppableId 
        ? sourceList 
        : [...newTasks[destination.droppableId as keyof TasksState]];
      
      const [movedTask] = sourceList.splice(source.index, 1);
      
      if (source.droppableId !== destination.droppableId) {
        movedTask.status = destination.droppableId as TaskStatus;
      }
      
      destList.splice(destination.index, 0, movedTask);
      
      newTasks[source.droppableId as keyof TasksState] = sourceList;
      if (source.droppableId !== destination.droppableId) {
        newTasks[destination.droppableId as keyof TasksState] = destList;
      }
      
      return newTasks;
    });

    // Queue sync operation
    taskSyncEngine.addOperation({
      type: 'reorder',
      taskId: draggableId,
      data: {
        newStatus: destination.droppableId,
        newPosition: destination.index,
      }
    });
  }, []);

  const handleCreateTask = useCallback((status: string) => {
    if (!newTaskTitle.trim() || !workspace) return;
    
    const tempId = `temp-${Date.now()}`;
    const newTask = {
      _id: tempId,
      title: newTaskTitle,
      status,
      priority: "medium",
      position: localTasks?.[status as keyof TasksState]?.length || 0,
      syncStatus: 'pending',
    };
    
    // Update local state immediately
    setLocalTasks((current: TasksState | null) => {
      if (!current) return null;
      return {
        ...current,
        [status]: [...current[status as keyof TasksState], newTask]
      };
    });
    
    // Queue sync operation
    taskSyncEngine.addOperation({
      type: 'create',
      taskId: tempId,
      data: {
        title: newTaskTitle,
        status,
        priority: "medium",
      }
    });
    
    setNewTaskTitle("");
    setIsAddingTask(null);
  }, [newTaskTitle, workspace, localTasks]);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  }, []);

  const tasks = localTasks || serverTasks;

  if (!tasks) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
      {/* Sync Status Indicator */}
      <div className="absolute top-4 right-4 z-10">
        {syncStatus.pendingOperations > 0 ? (
          <Badge variant="secondary" className="gap-2">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {isMobile ? `(${syncStatus.pendingOperations})` : `Syncing (${syncStatus.pendingOperations})`}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-2">
            <Cloud className="w-3 h-3" />
            {isMobile ? "" : "Synced"}
          </Badge>
        )}
      </div>
      
      <div className={`${isMobile ? 'p-2' : 'p-6'} h-full flex-1 overflow-hidden`}>
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className={`flex ${isMobile ? 'gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent' : 'gap-6'} h-full`}>
            {columns.map((column) => {
              const columnTasks = tasks[column.id as keyof typeof tasks] || [];
              
              return (
                <div key={column.id} className={`${isMobile ? 'w-72 flex-shrink-0' : 'w-80'} flex flex-col h-full`}>
                  <div className={`${isMobile ? 'p-2' : 'p-3'} rounded-t-lg ${column.color} flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`${isMobile ? 'text-sm' : ''} font-semibold`}>{column.title}</h3>
                      <Badge variant="secondary" className={isMobile ? 'text-xs' : ''}>
                        {columnTasks.length}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-muted/20 rounded-b-lg p-3 flex flex-col min-h-0">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-3 overflow-y-auto transition-colors ${
                            snapshot.isDraggingOver ? "bg-muted/20 rounded" : ""
                          }`}
                          style={{ minHeight: '100px' }}
                        >
                          {columnTasks.map((task: Task, index: number) => (
                            <TaskCard
                              key={task._id}
                              task={task}
                              index={index}
                              getPriorityColor={getPriorityColor}
                              onEdit={handleEditTask}
                              onDelete={handleDeleteTask}
                              isMobile={isMobile}
                            />
                          ))}
                          {provided.placeholder}
                          
                          {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              No tasks yet
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>

                    <div className="mt-3 flex-shrink-0">
                      {isAddingTask === column.id ? (
                        <Card className="p-3">
                          <Input
                            placeholder="Enter task title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateTask(column.id);
                              if (e.key === "Escape") {
                                setIsAddingTask(null);
                                setNewTaskTitle("");
                              }
                            }}
                            autoFocus
                            className={isMobile ? 'text-sm' : ''}
                          />
                          <div className={`flex gap-2 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                            <Button 
                              size="sm" 
                              onClick={() => handleCreateTask(column.id)}
                              disabled={!newTaskTitle.trim()}
                              className={isMobile ? 'w-full' : ''}
                            >
                              Add
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setIsAddingTask(null);
                                setNewTaskTitle("");
                              }}
                              className={isMobile ? 'w-full' : ''}
                            >
                              Cancel
                            </Button>
                          </div>
                        </Card>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => setIsAddingTask(column.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add task
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <TaskEditModal
        task={editingTask}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={(taskId) => {
          handleDeleteTask(taskId);
          setShowEditModal(false);
        }}
      />
    </div>
  );
}