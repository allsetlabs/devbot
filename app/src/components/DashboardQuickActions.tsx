import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Plus, Baby, Clock, Loader2 } from 'lucide-react';
import { chatHooks } from '../hooks/useChat';

export function DashboardQuickActions() {
  const navigate = useNavigate();
  const createChatMutation = chatHooks.useCreateChat();

  return (
    <div className="col-span-2">
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="flex h-auto flex-col gap-1 py-3"
          onClick={() =>
            createChatMutation.mutate({}, { onSuccess: (chat) => navigate(`/chat/${chat.id}`) })
          }
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
  );
}
