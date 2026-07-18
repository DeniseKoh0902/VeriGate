import { useEffect, useState, type FormEvent } from 'react';
import { Bot, User, SendHorizontal, Loader2, Clock, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useToast } from '@/context/ToastContext';
import * as governanceCopilotService from '@/services/governanceCopilot.service';
import type { ChatMessage, GovernanceCopilotSession } from '@/types/governanceCopilot.types';

const suggestions = [
  'Summarize this week\'s policy violations',
  'Which department has the most high-risk prompts?',
  'Explain the Finance Data Handling Policy',
];

export function GovernanceCopilotPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GovernanceCopilotSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const loadSessions = () => {
    governanceCopilotService
      .listCopilotSessions()
      .then(setSessions)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load chats.'));
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setDraft('');
    setError(null);
  };

  const openSession = async (session: GovernanceCopilotSession) => {
    if (session.id === currentSessionId) return;
    setCurrentSessionId(session.id);
    setError(null);
    setIsLoadingMessages(true);
    try {
      const history = await governanceCopilotService.getCopilotSessionMessages(session.id);
      setMessages(history.map((item) => ({ role: item.role, text: item.text })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load this chat.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setDraft('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await governanceCopilotService.askGovernanceCopilot(
        trimmed,
        currentSessionId,
      );
      setMessages((prev) => [...prev, response.message]);
      if (!currentSessionId) {
        setCurrentSessionId(response.sessionId);
      }
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setMessages((prev) => prev.slice(0, -1));
      setDraft(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  return (
    <div className="grid h-screen grid-cols-4 grid-rows-1 gap-6 p-8">
      <div className="col-span-3 flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Governance Copilot</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ask governance questions and get insights, compliance explanations, and policy
            recommendations.
          </p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {isLoadingMessages && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading conversation…
              </div>
            )}

            {!isLoadingMessages && messages.length === 0 && (
              <p className="text-sm text-slate-400">
                Ask a question below or pick a suggestion to get started.
              </p>
            )}

            {!isLoadingMessages &&
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-blue-50 text-blue-600',
                    )}
                  >
                    {message.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                  </span>
                  <div
                    className={cn(
                      'max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={15} className="animate-spin" />
                Thinking…
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  disabled={isLoading}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask the Governance Copilot…"
                disabled={isLoading}
                className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={isLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendHorizontal size={16} />
              </button>
            </form>
          </div>
        </Card>
      </div>

      <Card className="flex h-full flex-col overflow-hidden p-4">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Chat History
          </h2>
          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={13} />
            New Chat
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">No conversations yet.</p>
        ) : (
          <div className="-mr-2 flex-1 space-y-1 overflow-y-auto pr-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => openSession(session)}
                className={cn(
                  'flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-slate-50',
                  session.id === currentSessionId && 'bg-blue-50',
                )}
              >
                <span className="truncate text-sm font-medium text-slate-700">
                  {session.preview}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />
                  {new Date(session.lastMessageAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
