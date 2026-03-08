import { useEffect, useCallback, useState } from "react";
import { MESH_EXTENSIONS, PHOTO_EXTENSIONS as IMAGE_EXTENSIONS } from "./importConstants";

export interface DropZoneState {
  isDragging: boolean;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/**
 * Hook for global drag-and-drop file import.
 * Detects file type and routes to the appropriate handler.
 */
export function useDropZone(handlers: {
  onPhotos: (files: File[]) => void;
  onArchScan: (file: File) => void;
  onToothModels: (files: File[]) => void;
}): DropZoneState {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      if (c === 0) setIsDragging(true);
      return c + 1;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      const next = c - 1;
      if (next <= 0) {
        setIsDragging(false);
        return 0;
      }
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      const imageFiles: File[] = [];
      const meshFiles: File[] = [];

      for (const file of files) {
        const ext = getExtension(file.name);
        if (IMAGE_EXTENSIONS.has(ext)) {
          imageFiles.push(file);
        } else if (MESH_EXTENSIONS.has(ext)) {
          meshFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        handlers.onPhotos(imageFiles);
      }

      if (meshFiles.length === 1) {
        // Single mesh: treat as arch scan
        handlers.onArchScan(meshFiles[0]);
      } else if (meshFiles.length > 1) {
        // Multiple meshes: treat as tooth models
        handlers.onToothModels(meshFiles);
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  return { isDragging };
}
