// components/editor/BlockNoteEditor.tsx
"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useRef, useCallback, useEffect, useState } from "react";
import EditorToolbar from "./EditorToolbar";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  showToolbar?: boolean;
}

export default function BlockNoteEditor({ content, onChange, showToolbar = true }: EditorProps) {
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  const lastContentRef = useRef<string>(content);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Parse initial content safely
  const initialContent = content ? (() => {
    try {
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  })() : undefined;
  
  const editor = useCreateBlockNote({
    initialContent,
  });
  
  // Track dark mode changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const update = () => setIsDarkMode(root.classList.contains('dark'));
    update();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          update();
        }
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Handle content changes with debouncing
  const handleChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const blocks = editor.document;
      const newContent = JSON.stringify(blocks);
      
      // Only call onChange if content actually changed
      if (newContent !== lastContentRef.current) {
        lastContentRef.current = newContent;
        onChange(newContent);
      }
    }, 500);
  }, [editor, onChange]);

  // Update editor when external content changes
  useEffect(() => {
    if (content && content !== lastContentRef.current) {
      try {
        const parsedContent = JSON.parse(content);
        // Only update if the parsed content is actually different
        if (JSON.stringify(editor.document) !== content) {
          editor.replaceBlocks(editor.document, parsedContent);
          lastContentRef.current = content;
        }
      } catch (error) {
        console.error("Failed to parse content:", error);
      }
    }
  }, [content, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {showToolbar && (
        <EditorToolbar editor={editor} />
      )}
      <div className="flex-1 overflow-y-auto">
        <BlockNoteView 
          editor={editor} 
          theme={isDarkMode ? "dark" : "light"}
          onChange={handleChange}
          className="h-full"
        />
      </div>
    </div>
  );
}