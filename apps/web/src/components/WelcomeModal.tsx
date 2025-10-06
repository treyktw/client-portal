"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Rocket, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { useDriver } from "@/providers/DriverProvider";

interface WelcomeModalProps {
  workspaceName?: string;
}

export function WelcomeModal({ workspaceName }: WelcomeModalProps) {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { startTour } = useDriver();

  useEffect(() => {
    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      // Delay showing modal to ensure page is loaded
      const timer = setTimeout(() => {
        setOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("hasSeenWelcome", "true");
    }
    setOpen(false);
  };

  const handleStartTour = () => {
    handleClose();
    // Start tour after modal closes
    setTimeout(() => {
      startTour("workspaceOverview");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">
            Welcome to {workspaceName || "Your Workspace"}! 🎉
          </DialogTitle>
          <DialogDescription className="text-base mt-3">
            We're excited to have you here. This is your collaborative workspace where you can manage your project effectively.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Documentation</h4>
                <p className="text-xs text-muted-foreground">Create and organize notes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Task Management</h4>
                <p className="text-xs text-muted-foreground">Track progress visually</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Real-time Chat</h4>
                <p className="text-xs text-muted-foreground">Communicate instantly</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h4 className="font-medium text-sm">File Storage</h4>
                <p className="text-xs text-muted-foreground">Centralized file management</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 p-4">
            <p className="text-sm">
              <strong>💡 Pro tip:</strong> We've created a project brief template in your Notes section to help you get started!
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center space-x-2 mr-auto">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dontShow"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this again
            </label>
          </div>
          
          <Button variant="outline" onClick={handleClose}>
            Skip Tour
          </Button>
          <Button onClick={handleStartTour}>
            Take a Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}