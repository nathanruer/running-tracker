import { renderHook, act } from '@testing-library/react';
import { useFileInput, useMultipleFileInputs } from '../use-file-input';
import { vi } from 'vitest';

describe('useFileInput', () => {
  it('should initialize with file input ref', () => {
    const { result } = renderHook(() => useFileInput());
    
    expect(result.current.fileInputRef).toBeDefined();
    expect(result.current.fileInputRef.current).toBeNull();
  });

  describe('resetFileInput', () => {
    it('should clear file input value', () => {
      const { result } = renderHook(() => useFileInput());
      
      const mockInput = {
        value: 'test-file.csv',
      };
      result.current.fileInputRef.current = mockInput as unknown as HTMLInputElement;
      
      act(() => {
        result.current.resetFileInput();
      });
      
      expect(mockInput.value).toBe('');
    });

    it('should handle null ref gracefully', () => {
      const { result } = renderHook(() => useFileInput());
      
      expect(() => {
        result.current.resetFileInput();
      }).not.toThrow();
    });
  });

  describe('triggerFileSelect', () => {
    it('should trigger click on file input', () => {
      const { result } = renderHook(() => useFileInput());
      
      const mockClick = vi.fn();
      const mockInput = {
        click: mockClick,
      };
      result.current.fileInputRef.current = mockInput as unknown as HTMLInputElement;
      
      act(() => {
        result.current.triggerFileSelect();
      });
      
      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle null ref gracefully', () => {
      const { result } = renderHook(() => useFileInput());
      
      expect(() => {
        result.current.triggerFileSelect();
      }).not.toThrow();
    });
  });

  describe('getSelectedFile', () => {
    it('should return selected file', () => {
      const { result } = renderHook(() => useFileInput());
      
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const mockInput = {
        files: [mockFile],
      };
      result.current.fileInputRef.current = mockInput as unknown as HTMLInputElement;
      
      const selectedFile = result.current.getSelectedFile();
      
      expect(selectedFile).toEqual(mockFile);
    });

    it('should return null when no file is selected', () => {
      const { result } = renderHook(() => useFileInput());
      
      const selectedFile = result.current.getSelectedFile();
      
      expect(selectedFile).toBeNull();
    });

    it('should return null when files array is empty', () => {
      const { result } = renderHook(() => useFileInput());
      
      const mockInput = {
        files: [],
      };
      result.current.fileInputRef.current = mockInput as unknown as HTMLInputElement;
      
      const selectedFile = result.current.getSelectedFile();
      
      expect(selectedFile).toBeNull();
    });
  });

  describe('setAcceptedTypes', () => {
    it('should set accepted file types', () => {
      const { result } = renderHook(() => useFileInput());
      
      const mockInput = {
        accept: '',
      };
      result.current.fileInputRef.current = mockInput as unknown as HTMLInputElement;
      
      act(() => {
        result.current.setAcceptedTypes('.csv');
      });
      
      expect(mockInput.accept).toBe('.csv');
    });

    it('should handle null ref gracefully', () => {
      const { result } = renderHook(() => useFileInput());
      
      expect(() => {
        result.current.setAcceptedTypes('.csv');
      }).not.toThrow();
    });
  });
});

describe('useMultipleFileInputs', () => {
  it('should create specified number of file inputs', () => {
    const { result } = renderHook(() => useMultipleFileInputs(3));
    
    expect(result.current.length).toBe(3);
    
    result.current.forEach((input) => {
      expect(input.fileInputRef).toBeDefined();
      expect(input.resetFileInput).toBeInstanceOf(Function);
      expect(input.triggerFileSelect).toBeInstanceOf(Function);
      expect(input.getSelectedFile).toBeInstanceOf(Function);
    });
  });

  it('should handle zero count', () => {
    const { result } = renderHook(() => useMultipleFileInputs(0));
    
    expect(result.current.length).toBe(0);
  });

  it('should handle negative count', () => {
    const { result } = renderHook(() => useMultipleFileInputs(-1));
    
    expect(result.current.length).toBe(0);
  });

  describe('individual input operations', () => {
    it('should allow independent operations on each input', () => {
      const { result } = renderHook(() => useMultipleFileInputs(2));
      
      const mockInput1 = {
        value: 'file1.csv',
        click: vi.fn(),
        files: [new File(['test1'], 'test1.csv')],
      };
      
      const mockInput2 = {
        value: 'file2.csv',
        click: vi.fn(),
        files: [new File(['test2'], 'test2.csv')],
      };
      
      result.current[0].fileInputRef.current = mockInput1 as unknown as HTMLInputElement;
      result.current[1].fileInputRef.current = mockInput2 as unknown as HTMLInputElement;
      
      act(() => {
        result.current[0].resetFileInput();
      });
      expect(mockInput1.value).toBe('');
      expect(mockInput2.value).toBe('file2.csv');
      
      act(() => {
        result.current[1].triggerFileSelect();
      });
      expect(mockInput2.click).toHaveBeenCalled();
      expect(mockInput1.click).not.toHaveBeenCalled();
      
      const file1 = result.current[0].getSelectedFile();
      const file2 = result.current[1].getSelectedFile();
      
      expect(file1).toEqual(mockInput1.files[0]);
      expect(file2).toEqual(mockInput2.files[0]);
    });

    it('should handle null refs gracefully', () => {
      const { result } = renderHook(() => useMultipleFileInputs(2));
      
      expect(() => {
        result.current[0].resetFileInput();
        result.current[1].triggerFileSelect();
        result.current[0].getSelectedFile();
      }).not.toThrow();
    });
  });
});