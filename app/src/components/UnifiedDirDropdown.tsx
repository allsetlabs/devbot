import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Check, Star } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@allsetlabs/forge/components/ui/dropdown-menu';
import { unifiedChatApi } from '../lib/api';
import type { UnifiedDir } from '../types';

function shortDir(displayPath: string): string {
  const parts = displayPath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? displayPath;
}

interface UnifiedDirDropdownProps {
  encoded: string;
}

export function UnifiedDirDropdown({ encoded }: UnifiedDirDropdownProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['unified-dirs'],
    queryFn: () => unifiedChatApi.listDirs(),
  });

  const dirs = data?.dirs ?? [];
  const defaultDir = data?.defaultDir ?? null;
  const currentDir = dirs.find((d) => d.encoded === encoded);
  const isDefault = defaultDir === encoded;

  const setDefaultMutation = useMutation({
    mutationFn: (enc: string) => unifiedChatApi.setDefaultDir(enc),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unified-dirs'] }),
  });

  const handleDirSelect = (dir: UnifiedDir) => {
    navigate(`/unified/dir/${encodeURIComponent(dir.encoded)}`);
  };

  const handleSetDefault = (e: React.MouseEvent, dir: UnifiedDir) => {
    e.stopPropagation();
    setDefaultMutation.mutate(dir.encoded);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-[140px] gap-1 text-xs">
          <span className="truncate">{currentDir ? shortDir(currentDir.displayPath) : 'Dir'}</span>
          {isDefault && <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />}
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-72 max-h-80 overflow-y-auto"
      >
        {dirs.map((dir) => (
          <DropdownMenuItem
            key={dir.encoded}
            className="flex items-center gap-2 px-3 py-2.5"
            onSelect={() => handleDirSelect(dir)}
          >
            {dir.encoded === encoded ? (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{shortDir(dir.displayPath)}</p>
              <p className="truncate text-xs text-muted-foreground">{dir.displayPath}</p>
            </div>
            {dir.encoded === defaultDir ? (
              <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2"
                onClick={(e) => handleSetDefault(e, dir)}
                disabled={setDefaultMutation.isPending}
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
