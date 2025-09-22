"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, PlayCircle, RefreshCw, BookOpen } from "lucide-react";
import { useManualTour } from "@/hooks/useAutoTour";
import { usePathname } from "next/navigation";

export function HelpButton() {
  const { startTour, resetTour } = useManualTour();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const getTourForCurrentPage = () => {
    if (pathname.includes("/notes")) return "notesPage";
    if (pathname.includes("/tasks")) return "tasksPage";
    if (pathname.includes("/canvas")) return "canvasPage";
    if (pathname.includes("/files")) return "filesPage";
    if (pathname.includes("/messages")) return "messagesPage";
    return "workspaceOverview";
  };

  const handleStartTour = (tourId?: string) => {
    const tour = tourId || getTourForCurrentPage();
    startTour(tour);
    setIsOpen(false);
  };

  const handleResetTour = (tourId?: string) => {
    const tour = tourId || getTourForCurrentPage();
    resetTour(tour);
    handleStartTour(tour);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
          title="Help & Tours"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Help & Tours</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleStartTour()}>
          <PlayCircle className="mr-2 h-4 w-4" />
          Start Page Tour
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleResetTour()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Restart Page Tour
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleStartTour("workspaceOverview")}>
          <BookOpen className="mr-2 h-4 w-4" />
          Workspace Overview
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => window.open("https://help.telera.io", "_blank")}
          className="text-muted-foreground"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Documentation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}