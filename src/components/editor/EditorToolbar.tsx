// components/editor/EditorToolbar.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import  type { BlockNoteEditor } from "@blocknote/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Image,
  Table,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

interface EditorToolbarProps {
  editor: BlockNoteEditor; // BlockNote editor instance
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const handleFormat = (type: string) => {
    if (!editor) return;
    
    switch (type) {
      case 'bold':
        editor.toggleStyles({ bold: true });
        break;
      case 'italic':
        editor.toggleStyles({ italic: true });
        break;
      case 'underline':
        editor.toggleStyles({ underline: true });
        break;
      case 'strike':
        editor.toggleStyles({ strike: true });
        break;
      case 'code':
        editor.toggleStyles({ code: true });
        break;
    }
  };

  const handleBlock = (type: string) => {
    if (!editor) return;
    
    const currentBlock = editor.getTextCursorPosition().block;
    
    switch (type) {
      case 'paragraph':
        editor.updateBlock(currentBlock, { type: 'paragraph' });
        break;
      case 'h1':
        editor.updateBlock(currentBlock, { type: 'heading', props: { level: 1 } });
        break;
      case 'h2':
        editor.updateBlock(currentBlock, { type: 'heading', props: { level: 2 } });
        break;
      case 'h3':
        editor.updateBlock(currentBlock, { type: 'heading', props: { level: 3 } });
        break;
      case 'bulletList':
        editor.updateBlock(currentBlock, { type: 'bulletListItem' });
        break;
      case 'numberedList':
        editor.updateBlock(currentBlock, { type: 'numberedListItem' });
        break;
      case 'checkList':
        editor.updateBlock(currentBlock, { type: 'checkListItem' });
        break;
      case 'quote':
        editor.updateBlock(currentBlock, { type: 'quote' });
        break;
    }
  };

  const handleAlign = (alignment: string) => {
    if (!editor) return;
    
    const currentBlock = editor.getTextCursorPosition().block;
    editor.updateBlock(currentBlock, { 
      props: { ...currentBlock.props, textAlignment: alignment as "left" | "center" | "right" | "justify" } 
    });
  };

  const handleInsert = (type: string) => {
    if (!editor) return;
    
    switch (type) {
      case 'table':
        editor.insertBlocks([
          { type: 'table', content: { type: 'tableContent', rows: [
            { cells: ['', '', ''] },
            { cells: ['', '', ''] },
          ]}}
        ], editor.getTextCursorPosition().block, 'after');
        break;
      case 'image': {
        const url = prompt('Enter image URL:');
        if (url) {
          editor.insertBlocks([
            { type: 'image', props: { url } }
          ], editor.getTextCursorPosition().block, 'after');
        }
        break;
      }
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-wrap">
      {/* Text Style */}
      <Select defaultValue="paragraph" onValueChange={handleBlock}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
        </SelectContent>
      </Select>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Format buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleFormat('bold')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleFormat('italic')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleFormat('underline')}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleFormat('strike')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleFormat('code')}
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleBlock('bulletList')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleBlock('numberedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleBlock('checkList')}
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Alignment */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleAlign('left')}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleAlign('center')}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleAlign('right')}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Insert */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleBlock('quote')}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleInsert('image')}
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleInsert('table')}
      >
        <Table className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor?.undo()}
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => editor?.redo()}
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
}