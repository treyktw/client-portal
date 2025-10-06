// components/NavigationProgress.tsx
"use client";

import { useEffect, useState } from "react";

export function NavigationProgress() {

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleStart = () => setLoading(true);


    window.addEventListener("beforeunload", handleStart);
    return () => {
      window.removeEventListener("beforeunload", handleStart);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-50">
      <div className="h-full bg-primary animate-pulse" style={{ width: "70%" }} />
    </div>
  );
}