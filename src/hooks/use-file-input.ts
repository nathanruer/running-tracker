import { useRef, useState } from 'react';

/**
 * Hook for managing file input refs and operations
 * Provides utilities for file selection and input clearing
 *
 * @returns Object with file input ref and utility functions
 *
 * @example
 * const { fileInputRef, resetFileInput, triggerFileSelect } = useFileInput();
 *
 * <input
 *   ref={fileInputRef}
 *   type="file"
 *   accept=".tcx"
 *   onChange={handleFile}
 *   className="hidden"
 * />
 * <Button onClick={triggerFileSelect}>Upload</Button>
 */
export function useFileInput() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Clears the file input value
   * Useful after successful upload to allow re-uploading the same file
   */
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Programmatically triggers the file input click
   * Opens the file selection dialog
   */
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  /**
   * Gets the currently selected file (if any)
   * @returns File object or null
   */
  const getSelectedFile = (): File | null => {
    return fileInputRef.current?.files?.[0] || null;
  };

  /**
   * Sets the accepted file types
   * @param accept File types to accept (e.g., ".tcx,.csv")
   */
  const setAcceptedTypes = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
    }
  };

  return {
    fileInputRef,
    resetFileInput,
    triggerFileSelect,
    getSelectedFile,
    setAcceptedTypes,
  };
}

/**
 * Hook for managing multiple file inputs
 * Useful when you need to handle different file types separately
 *
 * @param count Number of file inputs to create
 * @returns Array of file input utilities
 *
 * @example
 * const [tcxInput, csvInput] = useMultipleFileInputs(2);
 *
 * <input ref={tcxInput.fileInputRef} type="file" accept=".tcx" />
 * <input ref={csvInput.fileInputRef} type="file" accept=".csv" />
 */
export function useMultipleFileInputs(count: number) {
  const [inputs] = useState(() =>
    Array.from({ length: count }, () => {
      const fileInputRef = { current: null } as unknown as React.RefObject<HTMLInputElement>;

      return {
        fileInputRef,
        resetFileInput: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        triggerFileSelect: () => {
          fileInputRef.current?.click();
        },
        getSelectedFile: (): File | null => {
          return fileInputRef.current?.files?.[0] || null;
        },
      };
    })
  );

  return inputs;
}
