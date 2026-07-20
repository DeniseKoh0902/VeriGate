import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  SendHorizontal,
  Bot,
  User,
  Clock,
  AlertTriangle,
  ShieldOff,
  ArrowRight,
  Plus,
  Paperclip,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MarkdownMessage } from '@/components/ui/MarkdownMessage';
import { useToast } from '@/context/ToastContext';
import * as promptService from '@/services/prompt.service';
import { ModelSelector } from './ModelSelector';
import { AttachmentPreview } from '@/components/AttachmentPreview';
import type { AvailableModel, ChatSession, PromptSubmitResult, RiskLevel } from '@/types/prompt.types';

const riskLevelBadge: Record<RiskLevel, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

// Kept in sync with the backend's attachment_service limits/allow-list —
// this is just an early, friendlier check; the backend re-validates
// regardless since it's the source of truth.
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
];

interface Turn {
  id: string;
  userPrompt: string;
  result: PromptSubmitResult | null;
  isRevealed: boolean;
  createdAt: Date;
  pendingFiles: File[];
}

export function AiWorkspacePage() {
  const toast = useToast();
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const loadSessions = () => {
    promptService
      .listChatSessions()
      .then(setSessions)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load chats.'));
  };

  useEffect(() => {
    loadSessions();
    promptService
      .getAvailableModels()
      .then((result) => {
        setModels(result);
        setSelectedModel((current) => current || result[0]?.name || '');
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load AI models.'))
      .finally(() => setIsLoadingModels(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = () => {
    setCurrentSessionId(null);
    setTurns([]);
    setPrompt('');
  };

  const openSession = async (session: ChatSession) => {
    if (session.id === currentSessionId) return;
    setCurrentSessionId(session.id);
    setIsLoadingMessages(true);
    try {
      const history = await promptService.getSessionMessages(session.id);
      setTurns(
        history.map((item) => ({
          id: item.promptId,
          userPrompt: item.promptText,
          result: {
            promptId: item.promptId,
            sessionId: session.id,
            status: item.status,
            sanitizedText: item.sanitizedText,
            riskFindings: item.riskFindings,
            sanitizationChanges: [],
            responseText: item.responseText,
            attachments: item.attachments,
          },
          isRevealed: true,
          createdAt: new Date(item.createdAt),
          pendingFiles: [],
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load this chat.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file later
    if (selected.length === 0) return;

    const accepted: File[] = [];
    for (const file of selected) {
      if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" isn't a supported file type.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" exceeds the ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB attachment limit.`);
        continue;
      }
      accepted.push(file);
    }

    setAttachedFiles((prev) => {
      const next = [...prev, ...accepted];
      if (next.length > MAX_ATTACHMENTS) {
        toast.error(`You can attach at most ${MAX_ATTACHMENTS} files per message.`);
        return next.slice(0, MAX_ATTACHMENTS);
      }
      return next;
    });
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!prompt.trim() && attachedFiles.length === 0) || isSubmitting || !selectedModel) return;
    const id = crypto.randomUUID();
    const userPrompt = prompt;
    const files = attachedFiles;
    setTurns((prev) => [
      ...prev,
      { id, userPrompt, result: null, isRevealed: false, createdAt: new Date(), pendingFiles: files },
    ]);
    setPrompt('');
    setAttachedFiles([]);
    setIsSubmitting(true);
    try {
      const submitted = await promptService.submitPrompt({
        aiToolName: selectedModel,
        promptText: userPrompt,
        sessionId: currentSessionId,
        files,
      });
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === id
            ? { ...turn, result: submitted, isRevealed: submitted.status !== 'SANITIZED' }
            : turn,
        ),
      );
      if (!currentSessionId) {
        setCurrentSessionId(submitted.sessionId);
      }
      loadSessions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit prompt.');
      setTurns((prev) => prev.filter((turn) => turn.id !== id));
      setPrompt(userPrompt);
      setAttachedFiles(files);
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
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-8 lg:h-full lg:grid-cols-4 lg:grid-rows-1">
      <div className="flex min-h-[70vh] flex-col lg:col-span-3 lg:min-h-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">AI Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select an approved AI model, submit prompts, and view AI responses.
          </p>
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {isLoadingMessages && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading conversation…
              </div>
            )}

            {!isLoadingMessages && turns.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Your conversation will appear here after you submit a prompt.
              </div>
            )}

            {!isLoadingMessages &&
              turns.map((turn) => (
                <div key={turn.id} id={`turn-${turn.id}`} className="space-y-3">
                  <div className="flex justify-end">
                    <div className="flex max-w-lg items-start gap-2">
                      {turn.userPrompt.trim() && (
                        <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm leading-relaxed text-white">
                          {turn.userPrompt}
                        </div>
                      )}
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <User size={14} />
                      </span>
                    </div>
                  </div>

                  {(turn.result?.attachments.length ?? turn.pendingFiles.length) > 0 && (
                    <div className="flex flex-wrap justify-end gap-2 pr-9">
                      {turn.result
                        ? turn.result.attachments.map((attachment) => (
                            <AttachmentPreview key={attachment.id} attachment={attachment} />
                          ))
                        : turn.pendingFiles.map((file, index) => (
                            <span
                              key={index}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-500"
                            >
                              <Paperclip size={12} />
                              {file.name}
                            </span>
                          ))}
                    </div>
                  )}

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

                  {turn.result?.status === 'PENDING_APPROVAL' && (
                    <div className="ml-10 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-600" />
                        <Badge status="serious">Held For Approval</Badge>
                      </div>

                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Matched Use Case Policy
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

                      <p className="mt-3 flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                        This prompt was not sent to the AI model yet — it's waiting on a
                        governance admin to review and approve it.
                      </p>

                      <div className="mt-4 flex gap-2">
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

                  {turn.result?.status === 'FORWARDED' && turn.result.riskFindings.length > 0 && (
                    <div className="ml-10 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                        <AlertTriangle size={13} className="text-amber-600" />
                        Flagged (still sent)
                      </div>
                      {turn.result.riskFindings.map((finding, index) => (
                        <p key={index} className="mt-1 text-xs text-amber-700">
                          <span className="font-medium">{finding.category}</span>
                          {finding.note ? ` — ${finding.note}` : null}
                        </p>
                      ))}
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

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1.5 text-xs text-slate-600"
                  >
                    <Paperclip size={12} className="shrink-0 text-slate-400" />
                    <span className="max-w-[10rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(index)}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                selectedModel ? `Message ${selectedModel}…` : 'Waiting for an approved AI model…'
              }
              rows={2}
              disabled={!selectedModel}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <div className="mt-2 flex items-center justify-between">
              {!isLoadingModels && models.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No AI tools are approved yet — ask an admin to approve one in AI Tool Management.
                </p>
              ) : (
                <ModelSelector models={models} selected={selectedModel} onSelect={setSelectedModel} />
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-auto px-3"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedModel || attachedFiles.length >= MAX_ATTACHMENTS}
                  title="Attach a file or image"
                >
                  <Paperclip size={15} />
                </Button>
                <Button
                  className="w-auto"
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  disabled={!selectedModel}
                >
                  Submit Prompt
                  <SendHorizontal size={15} />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex h-full min-h-[280px] flex-col overflow-hidden p-4 lg:min-h-0">
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
                className={
                  'flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-slate-50' +
                  (session.id === currentSessionId ? ' bg-blue-50' : '')
                }
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
