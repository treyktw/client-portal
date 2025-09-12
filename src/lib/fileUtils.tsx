// lib/fileUtils.ts
import {
  FileText,
  Film,
  Music,
  Archive,
  File,
  ImageIcon,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const getFileIcon = (mimeType: string, size: "sm" | "md" | "lg" = "md") => {
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-8 h-8";
  
  if (mimeType.startsWith("image/")) return <ImageIcon className={sizeClass} />;
  if (mimeType.startsWith("video/")) return <Film className={sizeClass} />;
  if (mimeType.startsWith("audio/")) return <Music className={sizeClass} />;
  if (mimeType.includes("pdf")) return <FileText className={cn(sizeClass, "text-red-500")} />;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) 
    return <FileSpreadsheet className={cn(sizeClass, "text-green-500")} />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) 
    return <FileText className={cn(sizeClass, "text-orange-500")} />;
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("text")) 
    return <FileText className={cn(sizeClass, "text-blue-500")} />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript")) 
    return <FileCode className={cn(sizeClass, "text-yellow-500")} />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) 
    return <Archive className={sizeClass} />;
  return <File className={sizeClass} />;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

export const getFileTypeFromMime = (mimeType: string): string => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "spreadsheet";
  if (mimeType.includes("document") || mimeType.includes("word")) return "document";
  if (mimeType.includes("text")) return "text";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "archive";
  return "file";
};