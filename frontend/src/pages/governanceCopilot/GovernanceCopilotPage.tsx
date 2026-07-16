import { useState, type FormEvent } from 'react';
import { Bot, User, SendHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

interface Message {
  role: 'user' | 'copilot';
  text: string;
}

const initialMessages: Message[] = [
  {
    role: 'user',
    text: 'Why did Gemini Pro drop from a Trust Score of 92 to 89 this week?',
  },
  {
    role: 'copilot',
    text: 'Gemini Pro\'s score dropped 3 points due to two flagged incidents: a delayed uptime response on 2026-07-14 (Availability -2) and a data-retention policy mismatch reported by the Legal department (Compliance -1). No security or privacy findings changed. Recommendation: keep Tier 2 approval, but monitor uptime over the next 7 days.',
  },
];

const suggestions = [
  'Summarize this week\'s policy violations',
  'Which department has the most high-risk prompts?',
  'Explain the Finance Data Handling Policy',
];

export function GovernanceCopilotPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');

  const ask = (question: string) => {
    if (!question.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: question },
      {
        role: 'copilot',
        text: 'Analyzing governance data, audit logs, and AI usage statistics… here is a summary based on the latest records, with supporting evidence available in Audit Logs.',
      },
    ]);
    setDraft('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Governance Copilot</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask governance questions and get insights, compliance explanations, and policy recommendations.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-600',
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
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600"
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
              className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
            >
              <SendHorizontal size={16} />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
