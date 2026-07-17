import { useEffect, useRef, useState } from 'react';
import { SendHorizontal, Bot, User, Clock, AlertTriangle, ShieldOff, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MarkdownMessage } from '@/components/ui/MarkdownMessage';
import { useToast } from '@/context/ToastContext';
import * as promptService from '@/services/prompt.service';
import { ModelSelector, type AiModelOption } from './ModelSelector';
import type { PromptSubmitResult, RiskLevel } from '@/types/prompt.types';

const models: AiModelOption[] = [
  { name: 'GPT-4 Turbo', trustScore: 98, recommended: true },
  { name: 'Claude 3 Opus', trustScore: 96 },
  { name: 'Gemini Pro', trustScore: 89 },
  { name: 'Mistral Large', trustScore: 91 },
  { name: 'Llama 3 (Local)', trustScore: 74 },
];

const riskLevelBadge: Record<RiskLevel, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

interface Turn {
  id: string;
  userPrompt: string;
  result: PromptSubmitResult | null;
  isRevealed: boolean;
  createdAt: Date;
}

export function AiWorkspacePage() {
  const toast = useToast();
  const [selectedModel, setSelectedModel] = useState(models[0].name);
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    promptService.getPromptHistory().then((history) => {
      setTurns(
        history.map((item) => ({
          id: item.promptId,
          userPrompt: item.promptText,
          result: {
            promptId: item.promptId,
            status: item.status,
            sanitizedText: item.sanitizedText,
            riskFindings: item.riskFindings,
            sanitizationChanges: [],
            responseText: item.responseText,
          },
          isRevealed: true,
          createdAt: new Date(item.createdAt),
        })),
      );
    });
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || isSubmitting) return;
    const id = crypto.randomUUID();
    const userPrompt = prompt;
    setTurns((prev) => [
      ...prev,
      { id, userPrompt, result: null, isRevealed: false, createdAt: new Date() },
    ]);
    setPrompt('');
    setIsSubmitting(true);
    try {
      const submitted = await promptService.submitPrompt({
        aiToolName: selectedModel,
        promptText: userPrompt,
      });
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === id
            ? { ...turn, result: submitted, isRevealed: submitted.status !== 'SANITIZED' }
            : turn,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit prompt.');
      setTurns((prev) => prev.filter((turn) => turn.id !== id));
      setPrompt(userPrompt);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReveal = (id: string) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, isRevealed: true } : turn)));
  };

  const handleEditTurn = (turn: Turn) => {
    setPrompt(turn.userPrompt);
    setTurns((prev) => prev.filter((t) => t.id !== turn.id));
  };

  const handleDiscardTurn = (id: string) => {
    setTurns((prev) => prev.filter((turn) => turn.id !== id));
  };

  return (
    <div className="grid h-full grid-cols-4 grid-rows-1 gap-6 p-8">
      <div className="col-span-3 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">AI Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select an approved AI model, submit prompts, and view AI responses.
          </p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {turns.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Your conversation will appear here after you submit a prompt.
              </div>
            )}

            {turns.map((turn) => (
              <div key={turn.id} id={`turn-${turn.id}`} className="space-y-3">
                <div className="flex justify-end">
                  <div className="flex max-w-lg items-start gap-2">
                    <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm leading-relaxed text-white">
                      {turn.userPrompt}
                    </div>
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <User size={14} />
                    </span>
                  </div>
                </div>

                {!turn.result && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Bot size={15} />
                    </span>
                    <p className="text-sm text-slate-400">Checking governance policy…</p>
                  </div>
                )}

                {turn.result?.status === 'BLOCKED' && (
                  <div className="ml-10 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldOff size={16} className="text-red-600" />
                      <Badge status="critical">Prompt Blocked</Badge>
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-800">
                      Detected Sensitive Data
                    </p>
                    <div className="mt-2 space-y-2">
                      {turn.result.riskFindings.map((finding, index) => (
                        <div key={index} className="rounded-lg bg-white p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">{finding.category}</p>
                            <Badge status={riskLevelBadge[finding.riskLevel]}>
                              {finding.riskLevel}
                            </Badge>
                          </div>
                          {finding.note && (
                            <p className="mt-1 text-xs text-slate-500">{finding.note}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 flex items-start gap-2 text-sm text-red-800">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-500" />
                      This prompt was not forwarded to the AI model. It has been logged and escalated
                      to the Risk Alert Center.
                    </p>

                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        className="w-auto"
                        onClick={() => handleEditTurn(turn)}
                      >
                        Edit Prompt
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-auto"
                        onClick={() => handleDiscardTurn(turn.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {turn.result?.status === 'SANITIZED' && !turn.isRevealed && (
                  <div className="ml-10 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-600" />
                      <p className="text-sm font-semibold text-red-800">
                        Sensitive information detected
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-red-700">
                      We found the following sensitive data in your prompt:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...new Set(turn.result.riskFindings.map((f) => f.category))].map(
                        (category) => (
                          <span
                            key={category}
                            className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700"
                          >
                            {category}
                          </span>
                        ),
                      )}
                    </div>

                    {turn.result.sanitizationChanges.length > 0 && (
                      <>
                        <p className="mt-4 border-t border-red-200 pt-3 text-xs font-semibold uppercase tracking-wide text-red-800">
                          Changes made
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {turn.result.sanitizationChanges.map((change, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span className="font-mono text-slate-700">{change.original}</span>
                              <ArrowRight size={13} className="shrink-0 text-slate-400" />
                              <span className="font-mono font-medium text-blue-700">
                                {change.replacement}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Original
                        </p>
                        <p className="mt-1 rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-700">
                          {turn.userPrompt}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Sanitized (to be sent)
                        </p>
                        <p className="mt-1 rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-slate-700">
                          {turn.result.sanitizedText}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button className="w-auto" onClick={() => handleReveal(turn.id)}>
                        Confirm &amp; Send
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-auto"
                        onClick={() => handleEditTurn(turn)}
                      >
                        Edit Sanitized Prompt
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-auto"
                        onClick={() => handleDiscardTurn(turn.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {turn.result?.responseText &&
                  (turn.result.status === 'FORWARDED' || turn.isRevealed) && (
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Bot size={15} />
                      </span>
                      <div className="max-w-lg rounded-2xl bg-slate-100 px-4 py-2.5 text-slate-700">
                        <MarkdownMessage content={turn.result.responseText} />
                      </div>
                    </div>
                  )}
              </div>
            ))}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={`Message ${selectedModel}…`}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="mt-2 flex items-center justify-between">
              <ModelSelector models={models} selected={selectedModel} onSelect={setSelectedModel} />
              <Button className="w-auto" onClick={handleSubmit} isLoading={isSubmitting}>
                Submit Prompt
                <SendHorizontal size={15} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex h-full flex-col overflow-hidden p-4">
        <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Chat History
        </h2>
        {turns.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">No messages yet this session.</p>
        ) : (
          <div className="-mr-2 flex-1 space-y-1 overflow-y-auto pr-2">
            {[...turns].reverse().map((turn) => (
              <button
                key={turn.id}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`turn-${turn.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <span className="truncate text-sm font-medium text-slate-700">
                  {turn.userPrompt}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />
                  {turn.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
