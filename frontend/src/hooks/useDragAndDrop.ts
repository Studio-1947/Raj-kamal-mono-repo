import { useState, useCallback, useRef } from 'react';

interface DragState {
  isDragging: boolean;
  draggedItem: any;
  draggedIndex: number;
}

interface DragDropCallbacks<T> {
  onDragStart?: (item: T, index: number) => void;
  onDragEnd?: (item: T, index: number) => void;
  onDrop?: (draggedItem: T, droppedOnItem: T, draggedIndex: number, droppedIndex: number) => void;
  onReorder?: (items: T[]) => void;
}

export const useDragAndDrop = <T>(items: T[], callbacks: DragDropCallbacks<T> = {}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedIndex: -1
  });

  const draggedElementRef = useRef<HTMLElement | null>(null);

  const handleDragStart = useCallback((item: T, index: number) => {
    setDragState({
      isDragging: true,
      draggedItem: item,
      draggedIndex: index
    });
    callbacks.onDragStart?.(item, index);
  }, [callbacks]);

  const handleDragEnd = useCallback(() => {
    const { draggedItem, draggedIndex } = dragState;
    setDragState({
      isDragging: false,
      draggedItem: null,
      draggedIndex: -1
    });
    callbacks.onDragEnd?.(draggedItem, draggedIndex);
  }, [dragState, callbacks]);

  const handleDrop = useCallback((targetItem: T, targetIndex: number) => {
    const { draggedItem, draggedIndex } = dragState;
    
    if (draggedIndex === targetIndex) return;

    callbacks.onDrop?.(draggedItem, targetItem, draggedIndex, targetIndex);

    // Reorder items
    if (callbacks.onReorder) {
      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);
      callbacks.onReorder(newItems);
    }

    handleDragEnd();
  }, [dragState, items, callbacks, handleDragEnd]);

  const getDragProps = useCallback((item: T, index: number) => ({
    draggable: true,
    onDragStart: () => handleDragStart(item, index),
    onDragEnd: handleDragEnd,
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleDrop(item, index);
    },
    className: dragState.isDragging && dragState.draggedIndex === index 
      ? 'opacity-50 cursor-grabbing' 
      : 'cursor-grab'
  }), [dragState, handleDragStart, handleDragEnd, handleDrop]);

  return {
    dragState,
    getDragProps
  };
};

// File upload drag and drop hook
interface FileDropCallbacks {
  onDrop: (files: File[]) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export const useFileDrop = (callbacks: FileDropCallbacks, accept?: string[]) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
    callbacks.onDragEnter?.();
  }, [callbacks]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    callbacks.onDragLeave?.();
  }, [callbacks]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    // Filter by accepted file types if specified
    const filteredFiles = accept 
      ? files.filter(file => accept.some(type => 
          type === file.type || 
          (type.startsWith('.') && file.name.endsWith(type))
        ))
      : files;

    callbacks.onDrop(filteredFiles);
  }, [callbacks, accept]);

  const getDropProps = useCallback(() => ({
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    className: isDragActive ? 'drag-active' : ''
  }), [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, isDragActive]);

  return {
    isDragActive,
    getDropProps
  };
};