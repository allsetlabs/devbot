import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import type { FileIntellisenseItem } from '@allsetlabs/reusable/components/ui/file-intellisense-picker';

export interface UseFileIntellisenseResult {
  fileIntellisenseOpen: boolean;
  fileIntellisenseFilter: string;
  fileIntellisenseFiles: FileIntellisenseItem[];
  fileIntellisenseLoading: boolean;
  fileIntellisenseLoadingMore: boolean;
  fileIntellisenseHasMore: boolean;
  loadMoreFiles: () => Promise<void>;
}

export function useFileIntellisense(input: string, workingDir?: string, cursorPosition?: number): UseFileIntellisenseResult {
  // Use text up to cursor position (not full input) so @ works mid-text
  const textToCursor = cursorPosition != null ? input.substring(0, cursorPosition) : input;
  const fileAtMatch = textToCursor.match(/@([^@\n]*)$/);
  // Close picker if captured text ends with space (file was selected)
  const fileIntellisenseOpen = !!fileAtMatch && !fileAtMatch[1].endsWith(' ');
  const fileIntellisenseFilter = fileAtMatch?.[1]?.trim() ?? '';

  const [fileIntellisenseFiles, setFileIntellisenseFiles] = useState<FileIntellisenseItem[]>([]);
  const [fileIntellisenseLoading, setFileIntellisenseLoading] = useState(false);
  const [fileIntellisenseLoadingMore, setFileIntellisenseLoadingMore] = useState(false);
  const [fileIntellisenseHasMore, setFileIntellisenseHasMore] = useState(false);
  const fileIntellisenseOffsetRef = useRef(0);

  useEffect(() => {
    if (!fileIntellisenseOpen) return;

    const fetchFiles = async () => {
      const isFirstLoad = fileIntellisenseFiles.length === 0;
      if (isFirstLoad) setFileIntellisenseLoading(true);
      fileIntellisenseOffsetRef.current = 0;
      try {
        const result = await api.browseFiles(fileIntellisenseFilter, 0, 50, workingDir);
        setFileIntellisenseFiles(result.items);
        setFileIntellisenseHasMore(result.hasMore);
        fileIntellisenseOffsetRef.current = result.items.length;
      } catch (err) {
        console.error('Error fetching files:', err);
        setFileIntellisenseFiles([]);
        setFileIntellisenseHasMore(false);
      } finally {
        if (isFirstLoad) setFileIntellisenseLoading(false);
      }
    };

    const timer = setTimeout(fetchFiles, 300);
    return () => clearTimeout(timer);
  }, [fileIntellisenseOpen, fileIntellisenseFilter, workingDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreFiles = useCallback(async () => {
    if (fileIntellisenseLoadingMore || !fileIntellisenseHasMore) return;
    setFileIntellisenseLoadingMore(true);
    try {
      const result = await api.browseFiles(
        fileIntellisenseFilter,
        fileIntellisenseOffsetRef.current,
        50,
        workingDir
      );
      setFileIntellisenseFiles((prev) => [...prev, ...result.items]);
      setFileIntellisenseHasMore(result.hasMore);
      fileIntellisenseOffsetRef.current += result.items.length;
    } catch (err) {
      console.error('Error loading more files:', err);
    } finally {
      setFileIntellisenseLoadingMore(false);
    }
  }, [fileIntellisenseLoadingMore, fileIntellisenseHasMore, fileIntellisenseFilter]);

  return {
    fileIntellisenseOpen,
    fileIntellisenseFilter,
    fileIntellisenseFiles,
    fileIntellisenseLoading,
    fileIntellisenseLoadingMore,
    fileIntellisenseHasMore,
    loadMoreFiles,
  };
}
