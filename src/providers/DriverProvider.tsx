"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { driver } from "driver.js";
import type { Driver, Config } from "driver.js";
import "driver.js/dist/driver.css";

interface DriverContextType {
  startTour: (tourId: string) => void;
  resetTour: (tourId: string) => void;
  hasSeenTour: (tourId: string) => boolean;
  markTourAsSeen: (tourId: string) => void;
}

const DriverContext = createContext<DriverContextType | null>(null);

export function useDriver() {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error("useDriver must be used within DriverProvider");
  }
  return context;
}

interface DriverProviderProps {
  children: React.ReactNode;
}

export function DriverProvider({ children }: DriverProviderProps) {
  const driverRef = useRef<Driver | null>(null);
  const [seenTours, setSeenTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load seen tours from localStorage
    const storedTours = localStorage.getItem("seenTours");
    if (storedTours) {
      setSeenTours(new Set(JSON.parse(storedTours)));
    }
  }, []);

  const hasSeenTour = (tourId: string) => {
    return seenTours.has(tourId);
  };

  const markTourAsSeen = (tourId: string) => {
    setSeenTours((prev) => {
      const newSet = new Set(prev);
      newSet.add(tourId);
      localStorage.setItem("seenTours", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const resetTour = (tourId: string) => {
    setSeenTours((prev) => {
      const newSet = new Set(prev);
      newSet.delete(tourId);
      localStorage.setItem("seenTours", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const startTour = (tourId: string) => {
    // Get the tour configuration based on tourId
    const tourConfig = getTourConfig(tourId);
    if (!tourConfig) return;

    // Initialize driver with the tour config
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    driverRef.current = driver(tourConfig);
    driverRef.current.drive();

    // Mark tour as seen when completed
    const originalOnDestroy = tourConfig.onDestroyed;
    tourConfig.onDestroyed = (element, step, options) => {
      markTourAsSeen(tourId);
      originalOnDestroy?.(element, step, options);
    };
  };

  return (
    <DriverContext.Provider value={{ startTour, resetTour, hasSeenTour, markTourAsSeen }}>
      {children}
    </DriverContext.Provider>
  );
}

// Tour configurations
function getTourConfig(tourId: string): Config | null {
  const commonConfig: Partial<Config> = {
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayColor: "rgba(0, 0, 0, 0.75)",
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it!",
  };

  const tours: Record<string, Config> = {
    workspaceOverview: {
      ...commonConfig,
      steps: [
        {
          element: 'h1',
          popover: {
            title: "Welcome to Your Workspace! 👋",
            description: "This is your collaborative workspace where you can manage notes, tasks, files, and communicate with your team. Let me show you around!",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/notes"]',
          popover: {
            title: "📝 Notes",
            description: "Create and organize project documentation, meeting notes, and briefs. Your first note has been created with a project template!",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/tasks"]',
          popover: {
            title: "✅ Tasks",
            description: "Manage your project tasks with our Kanban board. Drag and drop tasks between columns to update their status.",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/canvas"]',
          popover: {
            title: "🎨 Canvas",
            description: "Collaborate visually with our drawing canvas. Create diagrams, wireframes, and brainstorm ideas.",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/files"]',
          popover: {
            title: "📁 Files",
            description: "Store and organize all your project files in one place. Drag and drop to upload, create folders to organize.",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/payment"]',
          popover: {
            title: "💳 Payment",
            description: "View invoices and manage payments for your project.",
            // position: "bottom",
          },
        },
        {
          element: '[href*="/messages"]',
          popover: {
            title: "💬 Messages",
            description: "Communicate with your team in real-time. Ask questions, share updates, and stay connected.",
            // position: "bottom",
          },
        },
        {
          element: 'button:has(svg[class*="Target"])',
          popover: {
            title: "🎯 Milestones",
            description: "Track your project progress with milestones. See what's been completed and what's coming up next.",
            // position: "left",
          },
        },
        {
          element: 'button[aria-label*="Settings"], button:has(svg[class*="Settings"])',
          popover: {
            title: "⚙️ Settings",
            description: "Customize your workspace appearance, manage notifications, and update your information.",
            // position: "left",
          },
        },
      ],
    },
    
    notesPage: {
      ...commonConfig,
      steps: [
        {
          element: 'button:has(svg[class*="Plus"])',
          popover: {
            title: "Create New Notes",
            description: "Click here to create a new note. You can choose between a blank note or use our project brief template.",
            // position: "right",
          },
        },
        {
          element: 'input[placeholder*="Search"]',
          popover: {
            title: "Search Your Notes",
            description: "Quickly find any note by searching for keywords in the title.",
            // position: "bottom",
          },
        },
        {
          element: '.bn-editor',
          popover: {
            title: "Rich Text Editor",
            description: "Write and format your notes with our powerful editor. Add headings, lists, images, and more!",
            // position: "left",
          },
        },
        {
          element: 'button:has(svg[class*="MoreVertical"])',
          popover: {
            title: "Note Actions",
            description: "Pin important notes, archive old ones, or delete notes you no longer need.",
            // position: "left",
          },
        },
      ],
    },

    tasksPage: {
      ...commonConfig,
      steps: [
        {
          element: 'div:has(> div > h3:contains("To Do"))',
          popover: {
            title: "Task Columns",
            description: "Tasks are organized in columns: To Do, In Progress, Review, and Done. Each column represents a stage in your workflow.",
            // position: "bottom",
          },
        },
        {
          element: 'button:has(svg[class*="Plus"])',
          popover: {
            title: "Add New Tasks",
            description: "Click 'Add task' at the bottom of any column to create a new task.",
            // position: "top",
          },
        },
        {
          element: 'div[draggable="true"]',
          popover: {
            title: "Drag & Drop Tasks",
            description: "Click and drag tasks between columns to update their status. You can also reorder tasks within a column.",
            // position: "right",
          },
        },
        {
          element: 'span:contains("Synced"), span:contains("Syncing")',
          popover: {
            title: "Auto-Save",
            description: "All your changes are automatically saved and synced in real-time. Look for the sync indicator here.",
            // position: "left",
          },
        },
      ],
    },

    canvasPage: {
      ...commonConfig,
      steps: [
        {
          element: 'button:has(svg[class*="Plus"])',
          popover: {
            title: "Create Canvases",
            description: "Start by creating a new canvas for your drawings and diagrams.",
            // position: "right",
          },
        },
        {
          element: '.excalidraw',
          popover: {
            title: "Drawing Tools",
            description: "Use the toolbar to draw shapes, add text, insert images, and collaborate visually. All changes are automatically saved.",
            // position: "center",
          },
        },
        {
          element: 'button:has(svg[class*="Save"])',
          popover: {
            title: "Manual Save",
            description: "While changes auto-save, you can also manually save at any time.",
            // position: "bottom",
          },
        },
      ],
    },

    filesPage: {
      ...commonConfig,
      steps: [
        {
          element: 'div[class*="border-dashed"]',
          popover: {
            title: "Upload Files",
            description: "Drag and drop files here or click to browse. You can upload multiple files at once.",
            // position: "bottom",
          },
        },
        {
          element: 'button:has(svg[class*="FolderPlus"])',
          popover: {
            title: "Create Folders",
            description: "Organize your files in folders. Create nested folders for better organization.",
            // position: "left",
          },
        },
        {
          element: 'button:has(svg[class*="MousePointer"])',
          popover: {
            title: "Select Multiple Files",
            description: "Enter selection mode to select multiple files and perform batch operations.",
            // position: "left",
          },
        },
        {
          element: 'input[placeholder*="Search"]',
          popover: {
            title: "Search Files",
            description: "Quickly find files by searching their names.",
            // position: "bottom",
          },
        },
      ],
    },

    messagesPage: {
      ...commonConfig,
      steps: [
        {
          element: 'div:has(> h3:contains("Threads")), div:has(button:contains("general"))',
          popover: {
            title: "Conversation Threads",
            description: "All your conversations are organized in threads. Click on a thread to view and participate in the discussion.",
            // position: "right",
          },
        },
        {
          element: 'textarea[placeholder*="Type"], input[placeholder*="message"]',
          popover: {
            title: "Send Messages",
            description: "Type your message here and press Enter to send. You can also add attachments and format your text.",
            // position: "top",
          },
        },
        {
          element: 'button:has(svg[class*="PanelRight"])',
          popover: {
            title: "Thread Details",
            description: "View thread information, members, and settings in the right sidebar.",
            // position: "left",
          },
        },
      ],
    },
  };

  return tours[tourId] || null;
}