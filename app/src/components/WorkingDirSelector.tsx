import { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { useWorkingDirectories, useCreateWorkingDirectory } from '../hooks/useWorkingDirectories';
import { VITE_DEVBOT_PROJECTS_DIR } from '../lib/env';

interface WorkingDirSelectorProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with an error message if validation fails, empty string to clear */
  onValidationError?: (error: string) => void;
}

export function WorkingDirSelector({ value, onChange, onValidationError }: WorkingDirSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: savedDirs = [] } = useWorkingDirectories();

  // Check if the currently selected directory is a root directory
  const selectedDir = savedDirs.find((d) => d.path === value);
  const isRootSelected = selectedDir?.isRootDirectory ?? false;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleSelectDir = (path: string) => {
    onChange(path);
    setDropdownOpen(false);
    onValidationError?.('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="mb-2 block text-sm font-medium text-foreground">Working Directory</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onValidationError?.('');
          }}
          onFocus={() => savedDirs.length > 0 && setDropdownOpen(true)}
          placeholder={VITE_DEVBOT_PROJECTS_DIR}
          className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 ${
            isRootSelected
              ? 'border-warning bg-background focus:border-warning focus:ring-warning'
              : 'border-border bg-background focus:border-primary focus:ring-primary'
          }`}
        />
        {savedDirs.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>
      {dropdownOpen && savedDirs.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-background shadow-lg">
          {savedDirs.map((dir) => (
            <Button
              key={dir.id}
              variant="ghost"
              type="button"
              onClick={() => handleSelectDir(dir.path)}
              className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left hover:bg-muted"
            >
              <div className="flex-1 min-w-0">
                <span className="truncate text-sm text-foreground block">{dir.path}</span>
                {dir.label && <span className="text-xs text-muted-foreground">{dir.label}</span>}
              </div>
              {dir.isDefault && <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />}
              {dir.isRootDirectory && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />}
            </Button>
          ))}
        </div>
      )}
      {isRootSelected ? (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-warning">Danger: Root Directory</p>
            <p className="text-xs text-warning/80">
              This is DevBot&apos;s own source code directory. Changes made here will modify the code
              that DevBot is currently running. Proceed with extreme caution.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {savedDirs.length > 0
            ? 'Select from saved directories or enter a new path'
            : 'Leave blank to use the default directory'}
        </p>
      )}
    </div>
  );
}

/**
 * Hook to validate and save a new working directory before creating a chat.
 * Returns a function that resolves if valid, rejects with error message if not.
 */
export function useValidateAndSaveDir() {
  const createDirMutation = useCreateWorkingDirectory();
  const { data: savedDirs = [] } = useWorkingDirectories();

  return async (dirPath: string): Promise<void> => {
    if (!dirPath) return; // empty = use default, skip validation
    const isAlreadySaved = savedDirs.some((d) => d.path === dirPath);
    if (!isAlreadySaved) {
      await createDirMutation.mutateAsync({ path: dirPath });
    }
  };
}
