import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/forge/components/ui/drawer';
import { Plus, Baby, Clock, Loader2 } from 'lucide-react';
import { chatHooks } from '../hooks/useChat';
import { WorkingDirSelector, useValidateAndSaveDir } from './WorkingDirSelector';
import type { PermissionMode, ClaudeModel } from '../types';

export function DashboardQuickActions() {
  const navigate = useNavigate();
  const createChatMutation = chatHooks.useCreateChat();
  const [modalOpen, setModalOpen] = useState(false);
  const [workingDir, setWorkingDir] = useState('');
  const [validationError, setValidationError] = useState('');
  const validateAndSaveDir = useValidateAndSaveDir();

  const handleOpenModal = () => {
    setWorkingDir('');
    setValidationError('');
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setWorkingDir('');
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    const trimmedDir = workingDir.trim();

    try {
      await validateAndSaveDir(trimmedDir);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Directory does not exist');
      return;
    }

    createChatMutation.mutate(
      {
        mode: 'dangerous' as PermissionMode,
        model: 'sonnet' as ClaudeModel,
        ...(trimmedDir ? { workingDir: trimmedDir } : {}),
      },
      {
        onSuccess: (chat) => {
          handleClose();
          navigate(`/chat/${chat.id}`);
        },
      }
    );
  };

  const isPending = createChatMutation.isPending;

  return (
    <>
      <Drawer
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <DrawerContent className="safe-area-bottom">
          <DrawerHeader className="text-left">
            <DrawerTitle>New Chat</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {(createChatMutation.error || validationError) && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {validationError ||
                  (createChatMutation.error instanceof Error
                    ? createChatMutation.error.message
                    : 'Failed to create chat')}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <WorkingDirSelector
                value={workingDir}
                onChange={setWorkingDir}
                onValidationError={setValidationError}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Chat'}
                </Button>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
      <div className="col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="flex h-auto flex-col gap-1 py-3"
            onClick={handleOpenModal}
            disabled={createChatMutation.isPending}
          >
            {createChatMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span className="text-xs">Chat</span>
          </Button>
          <Button
            variant="outline"
            className="flex h-auto flex-col gap-1 py-3"
            onClick={() => navigate('/baby-logs?add=true')}
          >
            <Baby className="h-5 w-5" />
            <span className="text-xs">Baby Log</span>
          </Button>
          <Button
            variant="outline"
            className="flex h-auto flex-col gap-1 py-3"
            onClick={() => navigate('/scheduler')}
          >
            <Clock className="h-5 w-5" />
            <span className="text-xs">Schedule</span>
          </Button>
        </div>
      </div>
    </>
  );
}
