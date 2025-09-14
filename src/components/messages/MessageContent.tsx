// components/messages/MessageContent.tsx
"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

interface MessageContentProps {
  content: string;
  className?: string;
}

export default function MessageContent({ content, className }: MessageContentProps) {
  const processedContent = useMemo(() => {
    // Parse markdown-style links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    match = linkRegex.exec(content);
    while (match !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the link as a component
      const [, linkText, url] = match;
      parts.push(
        <a
          key={`${match.index}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
        >
          <span>{linkText}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      );

      lastIndex = match.index + match[0].length;
      match = linkRegex.exec(content);
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  }, [content]);

  return (
    <p className={className}>
      {processedContent}
    </p>
  );
}