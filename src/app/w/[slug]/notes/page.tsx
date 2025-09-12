// app/w/[slug]/notes/page.tsx
"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import BlockNoteEditor from "@/components/editor/BlockNoteEditor";
import {
  Archive,
  FileText,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Trash,
  FileArchive,
  Sparkles,
} from "lucide-react";
import {
  getGeneralNoteTemplate,
  markdownToBlockNote,
} from "@/lib/noteTemplates";
import { Badge } from "@/components/ui/badge";

export default function NotesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const notes = useQuery(api.notes.getNotes, {
    workspaceId: workspace?._id as Id<"workspaces">,
    includeArchived: false,
  });

  const createNote = useMutation(api.notes.createNote);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const hasAutoCreated = useRef(false);

  // Get the selected note from the notes array
  const selectedNote = notes?.find((n) => n._id === selectedNoteId) || null;

  const handleCreateBlankNote = async () => {
    if (!workspace || creatingNote) return;
    setCreatingNote(true);

    try {
      const noteId = await createNote({
        workspaceId: workspace._id,
        title: "Untitled Note",
        content: JSON.stringify([
          {
            id: crypto.randomUUID(),
            type: "paragraph",
            props: {},
            content: [
              {
                type: "text",
                text: "",
                styles: {},
              },
            ],
            children: [],
          },
        ]),
      });

      setSelectedNoteId(noteId);
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleCreateTemplateNote = async () => {
    if (!workspace || creatingNote) return;
    setCreatingNote(true);
  
    try {
      // Pass the full workspace object to get all onboarding data
      const template = getGeneralNoteTemplate(workspace);
      const content = markdownToBlockNote(template);
  
      const noteId = await createNote({
        workspaceId: workspace._id,
        title: "Project Brief",
        content,
      });
  
      setSelectedNoteId(noteId);
    } catch (error) {
      console.error("Error creating template note:", error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: Id<"notes">, content: string) => {
    await updateNote({
      noteId,
      content,
    });
  };

  const handleUpdateTitle = async (noteId: Id<"notes">, title: string) => {
    await updateNote({
      noteId,
      title,
    });
  };

  const handlePinNote = async (noteId: Id<"notes">, isPinned: boolean) => {
    await updateNote({
      noteId,
      isPinned: !isPinned,
    });
  };

  const handleArchiveNote = async (noteId: Id<"notes">) => {
    await updateNote({
      noteId,
      isArchived: true,
    });
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  };

  const handleDeleteNote = async (noteId: Id<"notes">) => {
    await deleteNote({ noteId });
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  };

  const filteredNotes =
    notes?.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  // Sort notes: pinned first, then by updated date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  // Auto-create template on first visit (directly in render logic)
  if (
    workspace &&
    notes &&
    notes.length === 0 &&
    !creatingNote &&
    !hasAutoCreated.current
  ) {
    hasAutoCreated.current = true;
    handleCreateTemplateNote();
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 p-4">
      {/* Sidebar */}
      <div className="w-80 border bg-card rounded-lg flex flex-col">
        <div className="p-4 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" disabled={creatingNote}>
                <Plus className="w-4 h-4 mr-2" />
                {creatingNote ? "Creating..." : "New Note"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem
                onClick={handleCreateBlankNote}
                disabled={creatingNote}
              >
                <FileText className="w-4 h-4 mr-2" />
                Blank Note
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCreateTemplateNote}
                disabled={creatingNote}
              >
                <FileArchive className="w-4 h-4 mr-2" />
                Project Brief Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-2 border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes yet</p>
              <p className="text-xs mt-1">
                Create your first note to get started
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {sortedNotes.map((note) => (
                <Card
                  key={note._id}
                  className={`p-3 cursor-pointer hover:bg-accent/50 transition-colors mb-2 ${
                    selectedNoteId === note._id
                      ? "bg-accent ring-2 ring-primary/20 text-black"
                      : "text-foreground"
                  }`}
                  onClick={() => setSelectedNoteId(note._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {note.title === "Project Brief" ? (
                          <Sparkles className="w-4 h-4 text-primary" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                        <h3 className="font-medium truncate">{note.title}</h3>
                        {note.isPinned && (
                          <Pin className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinNote(note._id, note.isPinned);
                          }}
                        >
                          <Pin className="w-4 h-4 mr-2" />
                          {note.isPinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveNote(note._id);
                          }}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note._id);
                          }}
                          className="text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col bg-card rounded-lg">
        {selectedNote ? (
          <>
            <div className="p-4 border-b flex items-center gap-4">
              <Input
                value={selectedNote.title}
                onChange={(e) =>
                  handleUpdateTitle(selectedNote._id, e.target.value)
                }
                className="text-xl font-semibold border-none px-0 focus-visible:ring-0 flex-1"
                placeholder="Untitled"
              />
              {selectedNote.title === "Project Brief" && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  Template
                </Badge>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <BlockNoteEditor
                key={selectedNote._id}
                content={selectedNote.content}
                onChange={(content) =>
                  handleUpdateNote(selectedNote._id, content)
                }
                showToolbar={true}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a note to start editing</p>
              <p className="text-sm mt-2">or create a new note</p>
              {notes?.length === 0 && !creatingNote && (
                <Button
                  onClick={handleCreateTemplateNote}
                  className="mt-4"
                  variant="outline"
                  disabled={creatingNote}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start with Project Brief
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
