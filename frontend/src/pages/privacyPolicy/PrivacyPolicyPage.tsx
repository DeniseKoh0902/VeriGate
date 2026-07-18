import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

const sections = [
  {
    heading: '1. What this policy covers',
    body: [
      `VeriGate is an academic prototype built for Case Study 3: AI Governance & Responsible AI in Enterprise. It is not a commercial product and has not been reviewed by legal counsel — this page describes, in good faith, the kind of privacy commitments a production version of VeriGate would make, and reflects how the current prototype actually handles data.`,
    ],
  },
  {
    heading: '2. Information we collect',
    body: [
      `Account information: name, work email, department, and role (Employee, Compliance, or Admin), provided when your account is created by an administrator.`,
      `Prompt activity: the text of prompts you submit through AI Workspace, the AI tool selected, the sanitized version of your prompt (if sensitive data was detected), and the AI-generated response.`,
      `Governance records: risk findings, risk alerts, appeals you file, and audit log entries generated as a result of your activity — these exist specifically so that governance decisions (why a prompt was blocked, who approved a tool, who reviewed an appeal) stay traceable.`,
    ],
  },
  {
    heading: '3. Sensitive data detection',
    body: [
      `Before a prompt reaches an AI model, VeriGate scans it against active Sensitive Data Rules (configured in Policy Management) for categories such as IC numbers, credit card numbers, salary information, and API keys/credentials. Depending on what's found, a prompt is forwarded unchanged, sanitized (sensitive spans replaced with a placeholder before being sent onward), or blocked entirely and escalated to the Risk Alert Center.`,
      `This scanning happens on our own backend before any prompt is sent to a third-party AI provider — it exists to reduce, not increase, what leaves the organization.`,
    ],
  },
  {
    heading: '4. Third-party processing',
    body: [
      `Prompts that pass or are sanitized by our detection rules are sent to Google's Gemini API to generate a response. Blocked prompts are never sent anywhere outside VeriGate. We don't share account information, audit logs, or governance records with any third party.`,
    ],
  },
  {
    heading: '5. Data retention',
    body: [
      `Prompt history, risk findings, and audit logs are retained to support the governance and appeals workflows this tool exists for (e.g. reviewing why a decision was made). Deactivating an account preserves its historical records for audit continuity rather than deleting them outright.`,
    ],
  },
  {
    heading: '6. Security measures',
    body: [
      `Passwords are hashed with bcrypt and never stored or logged in plain text. Sessions are authenticated with signed, expiring JSON Web Tokens. Password reset links are single-use and expire automatically. Access to administrative functions (Policy Management, Employee Management, AI Tool Management) is restricted by role.`,
    ],
  },
  {
    heading: '7. Contact',
    body: [
      `Questions about this policy or your data can be sent to the team listed on the Support page.`,
    ],
  },
];

export function PrivacyPolicyPage() {
  return (
    <InfoPageLayout
      title="Privacy Policy"
      description="Last updated July 2026 — how VeriGate collects, uses, and protects your information."
    >
      <div className="space-y-7">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {section.heading}
            </h2>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </InfoPageLayout>
  );
}
