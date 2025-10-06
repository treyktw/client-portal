// components/MobileCheck.tsx
"use client";

import { useEffect, useState } from "react";
import { Smartphone, Monitor, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileCheckProps {
  children: React.ReactNode;
}

export default function MobileCheck({ children }: MobileCheckProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      // Check if user agent is mobile
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
      const isSmallScreen = window.innerWidth < 768; // Tablets typically 768px+
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Consider it mobile if:
      // 1. It matches mobile keywords AND has small screen, OR
      // 2. It's a small screen with touch capability (covers touch laptops, etc.)
      // This prevents tablets from being blocked while catching mobile devices
      const isMobileDevice = (mobileKeywords.test(userAgent) && isSmallScreen) || 
                            (isSmallScreen && isTouchDevice && window.innerWidth < 640);
      
      setIsMobile(isMobileDevice);
    };

    checkDevice();
    
    // Re-check on resize in case user rotates device or changes window size
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Loading state while checking
  if (isMobile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mobile blocker screen
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Smartphone className="h-20 w-20 text-primary" />
              <div className="absolute -top-2 -right-2">
                <span className="flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-primary items-center justify-center text-xs text-white">!</span>
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              Desktop Access Required
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              We noticed you're on a mobile device. Please log in on a desktop or tablet to continue.
            </p>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">
              Mobile App Coming Soon!
            </span>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-muted-foreground">
            I'm actively working on the mobile app experience. Stay tuned for updates!
          </p>

          {/* Optional: Allow override for development */}
          {process.env.NODE_ENV === "development" && (
            <div className="pt-6 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobile(false)}
                className="text-xs"
              >
                Continue anyway (Dev Mode)
              </Button>
            </div>
          )}

          {/* Desktop Icon for clarity */}
          <div className="pt-6">
            <Monitor className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">
              Works best on screens 768px and wider
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children for desktop/tablet users
  return <>{children}</>;
}