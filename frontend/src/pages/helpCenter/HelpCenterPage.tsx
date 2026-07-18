import { Link } from 'react-router-dom';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

interface Faq {
  question: string;
  answer: string;
}

interface FaqGroup {
  category: string;
  items: Faq[];
}

const faqGroups: FaqGroup[] = [
  {
    category: 'Getting started',
    items: [
      {
        question: 'What is VeriGate?',
        answer:
          'VeriGate is an AI governance gateway: a single place where employees submit prompts to approved AI tools, and where compliance/admin teams set the policies, detect sensitive data, and review the AI activity happening across the organization.',
      },
      {
        question: "What's the difference between an Employee, Compliance, and Admin account?",
        answer:
          'Employee accounts use AI Workspace, request access to new AI tools, and view their own compliance record. Admin and Compliance accounts manage policies, the AI tool registry, employee accounts, risk alerts, and appeals — the parts of VeriGate that set and enforce the rules.',
      },
      {
        question: 'I forgot my password — what do I do?',
        answer:
          'Click "Forgot Password?" on the sign-in page and enter your account email. If the account exists, you\'ll be emailed a reset link that expires in 30 minutes and can only be used once.',
      },
    ],
  },
  {
    category: 'AI Workspace',
    items: [
      {
        question: 'What happens to my prompt before it reaches the AI model?',
        answer:
          "It's checked against your organization's active Sensitive Data Rules first. Depending on what's found, it's forwarded as-is, sanitized (sensitive text like IC numbers or card numbers is masked before sending), or blocked outright and logged as a risk alert.",
      },
      {
        question: 'My prompt was flagged as "Sensitive information detected" — what now?',
        answer:
          "You'll see exactly what was found and a preview of the sanitized version that would be sent instead. You can confirm and send the sanitized version, edit your original prompt, or reject it entirely.",
      },
      {
        question: 'What does "New Chat" do?',
        answer:
          'It starts a fresh conversation thread. Your past conversations stay in the Chat History sidebar — click any of them to reopen that exact thread and keep going.',
      },
    ],
  },
  {
    category: 'Governance & appeals',
    items: [
      {
        question: 'A prompt of mine was blocked, or my AI tool request was rejected — can I contest it?',
        answer:
          'Yes. Open My Compliance Overview and file an appeal on the flagged item with your justification. A reviewer may resolve it directly or request more information from you first, which you\'ll be able to respond to from the same page.',
      },
      {
        question: 'How do I request access to an AI tool that isn\'t on the approved list?',
        answer:
          'Go to AI Tool Request in the sidebar, name the tool, and provide a business justification. An admin will review it and approve, reject, or ask follow-up questions.',
      },
    ],
  },
];

export function HelpCenterPage() {
  return (
    <InfoPageLayout
      title="Help Center"
      description="Answers to common questions about using VeriGate."
    >
      <div className="space-y-8">
        {faqGroups.map((group) => (
          <div key={group.category}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {group.category}
            </h2>
            <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {group.items.map((faq) => (
                <details key={faq.question} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-900 marker:content-none">
                    <span className="flex items-center justify-between gap-3">
                      {faq.question}
                      <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <p className="text-sm text-slate-500">
          Can't find what you're looking for?{' '}
          <Link to="/support" className="font-medium text-blue-600 hover:text-blue-700">
            Contact Support
          </Link>
          .
        </p>
      </div>
    </InfoPageLayout>
  );
}
