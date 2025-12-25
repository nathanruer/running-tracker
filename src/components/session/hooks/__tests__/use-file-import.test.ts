import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileImport } from '../use-file-import';
import * as csvParser from '@/lib/parsers/interval-csv-parser';

vi.mock('@/hooks/use-api-error-handler', () => ({
  useApiErrorHandler: () => ({
    handleError: vi.fn(),
    handleSuccess: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-file-input', () => ({
  useFileInput: () => ({
    fileInputRef: { current: null },
    triggerFileSelect: vi.fn(),
    resetFileInput: vi.fn(),
  }),
}));

describe('useFileImport', () => {
  const mockOnValuesChange = vi.fn();
  const mockOnIntervalModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    if (!File.prototype.text) {
      File.prototype.text = async function() {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(this as File);
        });
      };
    }
  });

  describe('CSV Import', () => {
    it('should parse CSV file and update form values', async () => {
      const mockCSVData = {
        steps: [
          { stepNumber: 1, stepType: 'effort', duration: '00:02:00', distance: null, pace: '04:00', hr: null },
          { stepNumber: 2, stepType: 'recovery', duration: '00:01:00', distance: null, pace: '05:30', hr: null },
        ],
        repetitionCount: 5,
        totalDuration: '00:15:00',
        totalDistance: 0,
        avgPace: '04:45',
        avgHeartRate: 0,
      };

      vi.spyOn(csvParser, 'parseIntervalCSV').mockReturnValue(mockCSVData);

      const { result } = renderHook(() =>
        useFileImport({
          onValuesChange: mockOnValuesChange,
          onIntervalModeChange: mockOnIntervalModeChange,
        })
      );

      const file = new File(['step,duration\neffort,00:02:00\nrecovery,00:01:00'], 'test.csv', {
        type: 'text/csv',
      });

      const event = {
        target: {
          files: [file],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleCSVImport(event);
      });

      await waitFor(() => {
        expect(csvParser.parseIntervalCSV).toHaveBeenCalled();
        expect(mockOnValuesChange).toHaveBeenCalledWith('sessionType', 'Fractionné');
        expect(mockOnValuesChange).toHaveBeenCalledWith('steps', expect.any(Array));
        expect(mockOnValuesChange).toHaveBeenCalledWith('repetitionCount', 5);
        expect(mockOnIntervalModeChange).toHaveBeenCalledWith('detailed');
      });
    });

    it('should handle invalid CSV file', async () => {
      vi.spyOn(csvParser, 'parseIntervalCSV').mockReturnValue(null);

      const { result } = renderHook(() =>
        useFileImport({
          onValuesChange: mockOnValuesChange,
          onIntervalModeChange: mockOnIntervalModeChange,
        })
      );

      const file = new File(['invalid data'], 'test.csv', { type: 'text/csv' });

      const event = {
        target: {
          files: [file],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleCSVImport(event);
      });

      await waitFor(() => {
        expect(mockOnValuesChange).not.toHaveBeenCalled();
        expect(mockOnIntervalModeChange).not.toHaveBeenCalled();
      });
    });

    it('should handle no file selected', async () => {
      const { result } = renderHook(() =>
        useFileImport({
          onValuesChange: mockOnValuesChange,
          onIntervalModeChange: mockOnIntervalModeChange,
        })
      );

      const event = {
        target: {
          files: null,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleCSVImport(event);
      });

      expect(mockOnValuesChange).not.toHaveBeenCalled();
      expect(mockOnIntervalModeChange).not.toHaveBeenCalled();
    });

    it('should handle parsing errors', async () => {
      vi.spyOn(csvParser, 'parseIntervalCSV').mockImplementation(() => {
        throw new Error('Parse error');
      });

      const { result } = renderHook(() =>
        useFileImport({
          onValuesChange: mockOnValuesChange,
          onIntervalModeChange: mockOnIntervalModeChange,
        })
      );

      const file = new File(['invalid'], 'test.csv', { type: 'text/csv' });

      const event = {
        target: {
          files: [file],
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleCSVImport(event);
      });

      await waitFor(() => {
        expect(mockOnValuesChange).not.toHaveBeenCalled();
        expect(mockOnIntervalModeChange).not.toHaveBeenCalled();
      });
    });
  });
});
