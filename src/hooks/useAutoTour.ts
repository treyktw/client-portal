"use client";

import { useEffect, useRef } from "react";
import { useDriver } from "@/providers/DriverProvider";
import { useUser } from "@clerk/nextjs";

interface UseAutoTourOptions {
  tourId: string;
  delay?: number;
  enabled?: boolean;
  dependencies?: any[];
}

export function useAutoTour({ 
  tourId, 
  delay = 1000, 
  enabled = true,
  dependencies = []
}: UseAutoTourOptions) {
  const { startTour, hasSeenTour } = useDriver();
  const { user } = useUser();
  const hasStarted = useRef(false);

  useEffect(() => {
    // Don't run if already started or disabled
    if (hasStarted.current || !enabled) return;
    
    // Don't show tour if user has already seen it
    if (hasSeenTour(tourId)) return;
    
    // Only show tour for logged-in users
    if (!user) return;

    // Mark as started to prevent duplicate runs
    hasStarted.current = true;

    // Start tour after a delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      startTour(tourId);
    }, delay);

    return () => clearTimeout(timer);
  }, [tourId, delay, enabled, user, startTour, hasSeenTour, ...dependencies]);
}

// Hook to manually trigger tour (e.g., from a help button)
export function useManualTour() {
  const { startTour, resetTour } = useDriver();
  
  return {
    startTour,
    resetTour,
  };
}