import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  keys: string[];
  callback: () => void;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const { keys, callback, preventDefault = true } = shortcut;
      
      // Check if all keys in the combination are pressed
      const isMatch = keys.every(key => {
        switch (key.toLowerCase()) {
          case 'ctrl':
          case 'control':
            return event.ctrlKey;
          case 'alt':
            return event.altKey;
          case 'shift':
            return event.shiftKey;
          case 'meta':
          case 'cmd':
            return event.metaKey;
          default:
            return event.key.toLowerCase() === key.toLowerCase();
        }
      });

      if (isMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// Common keyboard shortcuts hook
export const useCommonShortcuts = (callbacks: {
  onSave?: () => void;
  onSearch?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (callbacks.onSave) {
    shortcuts.push({ keys: ['ctrl', 's'], callback: callbacks.onSave });
  }
  
  if (callbacks.onSearch) {
    shortcuts.push({ keys: ['ctrl', 'f'], callback: callbacks.onSearch });
  }
  
  if (callbacks.onNew) {
    shortcuts.push({ keys: ['ctrl', 'n'], callback: callbacks.onNew });
  }
  
  if (callbacks.onDelete) {
    shortcuts.push({ keys: ['delete'], callback: callbacks.onDelete });
  }
  
  if (callbacks.onRefresh) {
    shortcuts.push({ keys: ['f5'], callback: callbacks.onRefresh });
  }
  
  if (callbacks.onPrint) {
    shortcuts.push({ keys: ['ctrl', 'p'], callback: callbacks.onPrint });
  }
  
  if (callbacks.onExport) {
    shortcuts.push({ keys: ['ctrl', 'e'], callback: callbacks.onExport });
  }

  useKeyboardShortcuts(shortcuts);
};