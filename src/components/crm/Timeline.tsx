// components/crm/Timeline.tsx
"use client";

import { useMemo, useCallback, useReducer } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InteractionWithUser } from "@/types/crm";
import type { Doc } from "@/convex/_generated/dataModel";

interface TimelineProps {
  interactions: InteractionWithUser[];
  onAddNote?: (note: string) => void;
  compact?: boolean;
}

interface TimelineState {
  showNoteForm: boolean;
  noteText: string;
  isSubmitting: boolean;
}

type TimelineAction =
  | { type: "SHOW_NOTE_FORM" }
  | { type: "HIDE_NOTE_FORM" }
  | { type: "SET_NOTE_TEXT"; payload: string }
  | { type: "START_SUBMIT" }
  | { type: "END_SUBMIT" }
  | { type: "RESET" };

const timelineReducer = (state: TimelineState, action: TimelineAction): TimelineState => {
  switch (action.type) {
    case "SHOW_NOTE_FORM":
      return { ...state, showNoteForm: true };
    case "HIDE_NOTE_FORM":
      return { ...state, showNoteForm: false, noteText: "" };
    case "SET_NOTE_TEXT":
      return { ...state, noteText: action.payload };
    case "START_SUBMIT":
      return { ...state, isSubmitting: true };
    case "END_SUBMIT":
      return { ...state, isSubmitting: false };
    case "RESET":
      return { showNoteForm: false, noteText: "", isSubmitting: false };
    default:
      return state;
  }
};

export default function Timeline({ interactions, onAddNote, compact = false }: TimelineProps) {
  const [state, dispatch] = useReducer(timelineReducer, {
    showNoteForm: false,
    noteText: "",
    isSubmitting: false,
  });

  const getInteractionIcon = useCallback((type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "call":
        return <Phone className={iconClass} />;
      case "sms":
        return <MessageSquare className={iconClass} />;
      case "email":
        return <Mail className={iconClass} />;
      case "note":
        return <FileText className={iconClass} />;
      case "meeting":
        return <Users className={iconClass} />;
      case "status_change":
        return <Calendar className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  }, []);

  const getInteractionColor = useCallback((type: string) => {
    switch (type) {
      case "call":
        return "bg-blue-100 text-blue-700";
      case "sms":
        return "bg-green-100 text-green-700";
      case "email":
        return "bg-purple-100 text-purple-700";
      case "note":
        return "bg-gray-100 text-gray-700";
      case "meeting":
        return "bg-amber-100 text-amber-700";
      case "status_change":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }, []);

  const getDirectionIcon = useCallback((direction?: "inbound" | "outbound") => {
    if (!direction) return null;
    return direction === "inbound" ? (
      <ArrowDownLeft className="h-3 w-3" />
    ) : (
      <ArrowUpRight className="h-3 w-3" />
    );
  }, []);

  const handleSubmitNote = useCallback(async () => {
    if (!state.noteText.trim() || !onAddNote) return;

    dispatch({ type: "START_SUBMIT" });
    try {
      await onAddNote(state.noteText.trim());
      dispatch({ type: "RESET" });
    } catch (error) {
      dispatch({ type: "END_SUBMIT" },);
    }
  }, [state.noteText, onAddNote]);

  const groupedInteractions = useMemo(() => {
    const groups: Record<string, InteractionWithUser[]> = {};
    
    interactions.forEach((interaction) => {
      const date = format(new Date(interaction.createdAt), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(interaction);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => b.createdAt - a.createdAt),
      }));
  }, [interactions]);

  if (interactions.length === 0 && !onAddNote) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No interactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onAddNote && !compact && (
        <div className="mb-4">
          {state.showNoteForm ? (
            <div className="space-y-2">
              <Textarea
                value={state.noteText}
                onChange={(e) => dispatch({ type: "SET_NOTE_TEXT", payload: e.target.value })}
                placeholder="Add a note..."
                rows={3}
                disabled={state.isSubmitting}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitNote}
                  disabled={!state.noteText.trim() || state.isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dispatch({ type: "HIDE_NOTE_FORM" })}
                  disabled={state.isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "SHOW_NOTE_FORM" })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}
        </div>
      )}

      <div className="space-y-6">
        {groupedInteractions.map(({ date, items }) => (
          <div key={date}>
            {!compact && (
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground font-medium">
                  {format(new Date(date), "MMMM d, yyyy")}
                </span>
                <div className="h-px bg-border flex-1" />
              </div>
            )}

            <div className="space-y-3">
              {items.map((interaction) => {
                const user = interaction.createdBy && typeof interaction.createdBy === 'object' 
                  ? interaction.createdBy as Doc<"users">
                  : null;

                return (
                  <div
                    key={interaction._id}
                    className={cn(
                      "flex gap-3",
                      compact ? "items-start" : "items-start p-3 rounded-lg border bg-card"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full p-2",
                        getInteractionColor(interaction.type)
                      )}
                    >
                      {getInteractionIcon(interaction.type)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">
                              {interaction.type.replace("_", " ")}
                            </span>
                            {interaction.direction && (
                              <Badge variant="outline" className="text-xs gap-1">
                                {getDirectionIcon(interaction.direction)}
                                {interaction.direction}
                              </Badge>
                            )}
                          </div>
                          
                          {interaction.subject && (
                            <p className="text-sm font-medium">{interaction.subject}</p>
                          )}
                          
                          {interaction.body && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {interaction.body}
                            </p>
                          )}

                          {interaction.metadata && interaction.type === "status_change" && (
                            <p className="text-sm">
                              <Badge variant="outline" className="mr-2">
                                {String(interaction.metadata.from || '')}
                              </Badge>
                              →
                              <Badge variant="outline" className="ml-2">
                                {String(interaction.metadata.to || '')}
                              </Badge>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {user && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback className="text-xs">
                                  {user.name?.[0] || user.email[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.name || user.email}</span>
                            </div>
                          )}
                          <span title={format(new Date(interaction.createdAt), "PPpp")}>
                            {formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}