import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { chatHooks } from '../hooks/useChat';

const QA_SYSTEM_PROMPT =
  'This is a question-and-answer session. The user is asking about specific text they selected in the app. Answer their questions clearly and concisely. Do not edit code, create files, or run commands unless the user explicitly asks you to. Focus on explaining and clarifying.';

interface TextSelectionProviderProps {
  children: React.ReactNode;
}

function getSelectedText(): string {
  return window.getSelection()?.toString().trim() ?? '';
}

function isInputActive(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function TextSelectionProvider({ children }: TextSelectionProviderProps) {
  const [selectedText, setSelectedText] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChatView = location.pathname.startsWith('/chat/');

  const createQaMutation = chatHooks.useCreateChat();

  const checkSelection = useCallback(() => {
    const text = getSelectedText();
    if (isChatView || isInputActive() || !text) {
      setSelectedText('');
      return;
    }
    setSelectedText(text);
  }, [isChatView]);

  useEffect(() => {
    const handleSelectionChange = () => checkSelection();

    // touchend fallback for iOS — selection may not be finalized during selectionchange
    const handleTouchEnd = () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(checkSelection, 300);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('touchend', handleTouchEnd);
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [checkSelection]);

  // Clear on route change
  useEffect(() => {
    setSelectedText('');
  }, [location.pathname]);

  const handleAsk = useCallback(() => {
    if (!selectedText || createQaMutation.isPending) return;
    const pagePath = location.pathname;
    const pageParams = location.search;
    const prefill = `User has a question on "${selectedText}" from page ${pagePath}${pageParams}. The question is `;
    createQaMutation.mutate(
      { name: 'Q&A', systemPrompt: QA_SYSTEM_PROMPT, type: 'qa' },
      {
        onSuccess: (chat) => {
          window.getSelection()?.removeAllRanges();
          setSelectedText('');
          navigate(`/chat/${chat.id}?prefill=${encodeURIComponent(prefill)}`);
        },
        onError: (err) => {
          console.error('[TextSelection] Failed to create Q&A chat:', err);
        },
      }
    );
  }, [selectedText, createQaMutation]);

  return (
    <>
      {children}

      {selectedText && !isChatView && (
        <Button
          size="icon"
          onClick={handleAsk}
          disabled={createQaMutation.isPending}
          className="fixed right-4 top-4 z-50 h-10 w-10 rounded-full shadow-lg"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      )}
    </>
  );
}
