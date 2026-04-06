import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Plus, Baby, Clock, Loader2, X } from 'lucide-react';
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Chat</h2>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
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
        </div>
      )}
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
