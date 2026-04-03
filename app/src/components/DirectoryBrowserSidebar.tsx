import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';
import { Input } from '@subbiah/reusable/components/ui/input';
import { FileText, Folder, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

interface DirectoryBrowserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
}

export function DirectoryBrowserSidebar({
  isOpen,
  onClose,
  onSelectFile,
}: DirectoryBrowserSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the search query to avoid firing a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['browse-files', debouncedQuery],
    queryFn: async () => {
      const result = await api.browseFiles(debouncedQuery);
      return result.items as FileItem[];
    },
    enabled: isOpen,
    staleTime: 10_000,
  });

  const handleSelectFile = (filePath: string) => {
    onSelectFile(filePath);
    onClose();
  };

  // Sort files: directories first, then files, all alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Browse Files</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* File List */}
          <div className="max-h-96 overflow-y-auto rounded-md border border-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No files found' : 'No files available'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      if (file.type === 'file') {
                        handleSelectFile(file.path);
                      }
                    }}
                    disabled={file.type === 'directory'}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-60"
                  >
                    {file.type === 'directory' ? (
                      <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {file.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{file.path}</div>
                    </div>
                    {file.size !== undefined && (
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)}KB
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground">Tap a file to attach it to your message</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
