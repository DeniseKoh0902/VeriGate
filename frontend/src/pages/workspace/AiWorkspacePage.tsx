import { useState } from 'react';
import { Sparkles, SendHorizontal, Bot, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const models = [
  { name: 'GPT-4 Turbo', trustScore: 98, recommended: true },
  { name: 'Claude 3 Opus', trustScore: 96, recommended: false },
  { name: 'Gemini Pro', trustScore: 89, recommended: false },
  { name: 'Mistral Large', trustScore: 91, recommended: false },
];

const chatHistory = [
  { title: 'Summarize Q2 sales report', time: '2h ago' },
  { title: 'Draft customer follow-up email', time: 'Yesterday' },
  { title: 'Explain refund policy clause', time: '2 days ago' },
];

const detectedCategories = [
  { category: 'Personal Data (PII)', risk: 'critical' as const, note: 'Customer NRIC and phone number detected.' },
  { category: 'Financial Data', risk: 'serious' as const, note: 'Account balance figures detected.' },
];

const violatedPolicies = [
  'External LLM Usage Policy — customer identifiers must not be sent to external models.',
  'Finance Data Handling Policy — account figures require Tier-1 approved models only.',
];

const SENSITIVE_TRIGGERS = ['nric', 'balance', 'account', 'password', 'ic number'];

type Stage = 'idle' | 'risk' | 'sanitize' | 'response';

function containsSensitiveData(text: string) {
  const lower = text.toLowerCase();
  return SENSITIVE_TRIGGERS.some((trigger) => lower.includes(trigger));
}

export function AiWorkspacePage() {
  const [selectedModel, setSelectedModel] = useState(models[0].name);
  const [prompt, setPrompt] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [response, setResponse] = useState<string | null>(null);

  const generateResponse = (finalPrompt: string) => {
    setResponse(
      `Response from ${selectedModel}: Here is a draft based on your request — "${finalPrompt.slice(0, 60)}${finalPrompt.length > 60 ? '…' : ''}". This prompt passed governance validation with no sensitive data detected.`,
    );
    setStage('response');
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    if (containsSensitiveData(prompt)) {
      setStage('risk');
    } else {
      generateResponse(prompt);
    }
  };

  const handleNewPrompt = () => {
    setPrompt('');
    setResponse(null);
    setStage('idle');
  };

  return (
    <div className="grid h-screen grid-cols-4 gap-6 p-8">
      <div className="col-span-3 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">AI Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select an approved AI model, submit prompts, and view AI responses.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-3">
          {models.map((model) => (
            <button
              key={model.name}
              type="button"
              onClick={() => setSelectedModel(model.name)}
              className={`relative rounded-xl border p-3 text-left transition-colors ${
                selectedModel === model.name
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {model.recommended && (
                <span className="absolute -top-2 right-2 flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Sparkles size={10} />
                  Recommended
                </span>
              )}
              <p className="text-sm font-semibold text-slate-900">{model.name}</p>
              <p className="text-xs text-slate-400">Trust Score {model.trustScore}</p>
            </button>
          ))}
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            {stage === 'idle' && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Your AI response will appear here after you submit a prompt.
              </div>
            )}

            {stage === 'risk' && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Badge status="critical">Critical Risk Detected</Badge>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Detected Sensitive Data
                </p>
                <div className="mt-2 space-y-3">
                  {detectedCategories.map((item) => (
                    <div key={item.category} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{item.category}</p>
                        <Badge status={item.risk}>
                          {item.risk === 'critical' ? 'Critical' : 'High'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Violated Policies
                </p>
                <ul className="mt-2 space-y-2">
                  {violatedPolicies.map((policy) => (
                    <li key={policy} className="flex items-start gap-2 text-sm text-slate-600">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-500" />
                      {policy}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex gap-2">
                  <Button className="w-auto" onClick={() => setStage('sanitize')}>
                    View Sanitized Suggestion
                  </Button>
                  <Button variant="secondary" className="w-auto" onClick={() => setStage('idle')}>
                    Edit Prompt
                  </Button>
                  <Button variant="ghost" className="w-auto" onClick={handleNewPrompt}>
                    Cancel Submission
                  </Button>
                </div>
              </div>
            )}

            {stage === 'sanitize' && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Original Prompt
                </p>
                <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {prompt.split(/(\d[\d-]{6,}|\bNRIC\S*\b|\$[\d,.]+)/gi).map((part, index) =>
                    /(\d[\d-]{6,}|\bNRIC\S*\b|\$[\d,.]+)/i.test(part) ? (
                      <span key={index} className="rounded bg-red-100 px-1 text-red-700 line-through">
                        {part}
                      </span>
                    ) : (
                      <span key={index}>{part}</span>
                    ),
                  )}
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sanitized Prompt
                </p>
                <p className="mt-2 rounded-lg bg-emerald-50 p-4 text-sm leading-relaxed text-slate-700">
                  {prompt.replace(/\d[\d-]{6,}|\bNRIC\S*\b/gi, '[REDACTED]').replace(/\$[\d,.]+/g, '[AMOUNT]')}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Placeholders preserve the original intent while masking confidential values.
                </p>

                <div className="mt-5 flex gap-2">
                  <Button
                    className="w-auto"
                    onClick={() =>
                      generateResponse(
                        prompt.replace(/\d[\d-]{6,}|\bNRIC\S*\b/gi, '[REDACTED]').replace(/\$[\d,.]+/g, '[AMOUNT]'),
                      )
                    }
                  >
                    Accept &amp; Resubmit
                  </Button>
                  <Button variant="secondary" className="w-auto" onClick={() => setStage('idle')}>
                    Edit Sanitized Prompt
                  </Button>
                  <Button variant="ghost" className="w-auto" onClick={handleNewPrompt}>
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {stage === 'response' && response && (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Bot size={15} />
                </span>
                <div className="max-w-lg rounded-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
                  {response}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Message ${selectedModel}…`}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="mt-2 flex justify-end">
              <Button className="w-auto" onClick={handleSubmit}>
                Submit Prompt
                <SendHorizontal size={15} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Chat History
        </h2>
        <div className="space-y-1">
          {chatHistory.map((chat) => (
            <button
              key={chat.title}
              type="button"
              className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="text-sm font-medium text-slate-700">{chat.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Clock size={11} />
                {chat.time}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
