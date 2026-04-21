import { FolderRoot } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { WorkingDirSelector } from './WorkingDirSelector';

interface ChatWorkingDirDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDir: string;
  isPending: boolean;
  onSave: (dir: string) => void;
}

export function ChatWorkingDirDrawer({
  open,
  onOpenChange,
  currentDir,
  isPending,
  onSave,
}: ChatWorkingDirDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FolderRoot className="h-5 w-5" />
            Working Directory
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Change the working directory for this chat session. Tools like Bash, Read, and Edit will operate relative to this directory.
          </p>
          <WorkingDirSelector
            value={currentDir}
            onChange={(dir) => {
              if (!isPending) onSave(dir);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
