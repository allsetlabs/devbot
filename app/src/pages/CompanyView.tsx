import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ArrowLeft, User, TrendingUp, X, Send } from 'lucide-react';
import { companyHooks } from '../hooks/useCompany';
import { chatHooks } from '../hooks/useChat';
import { api } from '../lib/api';
import { extractErrorMessage } from '../lib/format';
import { ErrorBanner } from '../components/ErrorBanner';
import { MessageList } from '../components/MessageList';
import type { TaskMessage } from '../types';

export function CompanyView() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [feedbackModal, setFeedbackModal] = useState<'user' | 'investor' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const { data: company, error: companyError } = companyHooks.useGetCompany(companyId);
  const addFeedbackMutation = companyHooks.useAddFeedback();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', company?.masterChatId],
    queryFn: () => api.getChatMessages(company!.masterChatId!),
    enabled: !!company?.masterChatId,
    refetchInterval: 3000,
  });

  const { data: masterChat } = chatHooks.useGetChat(company?.masterChatId ?? undefined);

  const error = extractErrorMessage(companyError);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !companyId || !feedbackModal) return;
    addFeedbackMutation.mutate(
      { companyId, type: feedbackModal, prompt: feedbackText.trim() },
      {
        onSuccess: () => {
          setFeedbackText('');
          setFeedbackModal(null);
        },
      }
    );
  };

  // ChatMessage and TaskMessage share the same shape; cast for MessageList compatibility
  const taskMessages = messages as unknown as TaskMessage[];

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/companies')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold text-foreground">
            {company?.name ?? 'Loading...'}
          </h1>
          {company && (
            <p className="truncate text-xs text-muted-foreground">{company.directory}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFeedbackModal('user')}
          className="gap-1"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">User</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFeedbackModal('investor')}
          className="gap-1"
        >
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Investor</span>
        </Button>
      </div>

      <ErrorBanner error={error} />

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto">
        {company?.masterChatId ? (
          <MessageList
            messages={taskMessages}
            isRunning={masterChat?.isRunning ?? false}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Setting up company...</div>
          </div>
        )}
      </main>

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {feedbackModal === 'user' ? 'User Feedback' : 'Investor Feedback'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFeedbackModal(null);
                  setFeedbackText('');
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {addFeedbackMutation.error && (
              <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {addFeedbackMutation.error instanceof Error
                  ? addFeedbackMutation.error.message
                  : 'Failed to add feedback'}
              </div>
            )}
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackModal === 'user'
                    ? 'Report a bug, share your opinion...'
                    : 'Share investor feedback...'
                }
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                required
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFeedbackModal(null);
                    setFeedbackText('');
                  }}
                  className="flex-1"
                  disabled={addFeedbackMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-1"
                  disabled={addFeedbackMutation.isPending || !feedbackText.trim()}
                >
                  <Send className="h-4 w-4" />
                  {addFeedbackMutation.isPending ? 'Sending...' : 'Submit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
