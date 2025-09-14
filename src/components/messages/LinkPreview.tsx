// components/messages/LinkPreview.tsx
"use client";

import { ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface LinkPreviewProps {
  url: string;
  title?: string;
  className?: string;
}

export default function LinkPreview({ url, title, className }: LinkPreviewProps) {
  // Parse URL for display
  const getDisplayInfo = () => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Use provided title or create one
      const displayTitle = title || domain;
      
      // Get favicon URL (works for many sites)
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      
      return {
        domain,
        displayTitle,
        faviconUrl,
      };
    } catch {
      return {
        domain: 'Link',
        displayTitle: title || 'External Link',
        faviconUrl: null,
      };
    }
  };

  const { domain, displayTitle, faviconUrl } = getDisplayInfo();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5",
        "transition-colors hover:bg-muted hover:border-primary/50",
        "max-w-full",
        className
      )}
    >
      {faviconUrl ? (
        <Image 
          src={faviconUrl} 
          alt={domain}
          className="h-4 w-4 flex-shrink-0"
          fill
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}
      <span className="text-sm font-medium truncate">{displayTitle}</span>
      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
    </a>
  );
}