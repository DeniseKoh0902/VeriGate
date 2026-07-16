import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function PromptSanitizationPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prompt Sanitization</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review a safer, sanitized version of your prompt before resubmitting it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Original Prompt
          </h2>
          <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            Please draft a follow-up email to customer NRIC{' '}
            <span className="rounded bg-red-100 px-1 text-red-700 line-through">S1234567A</span> at{' '}
            <span className="rounded bg-red-100 px-1 text-red-700 line-through">9123-4567</span>{' '}
            regarding their account balance of{' '}
            <span className="rounded bg-red-100 px-1 text-red-700 line-through">$12,450.30</span> and
            next steps for the refund.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sanitized Prompt
          </h2>
          <p className="mt-2 rounded-lg bg-emerald-50 p-4 text-sm leading-relaxed text-slate-700">
            Please draft a follow-up email to customer{' '}
            <span className="rounded bg-emerald-100 px-1 font-medium text-emerald-700">
              [CUSTOMER_ID]
            </span>{' '}
            at{' '}
            <span className="rounded bg-emerald-100 px-1 font-medium text-emerald-700">
              [PHONE_NUMBER]
            </span>{' '}
            regarding their account balance of{' '}
            <span className="rounded bg-emerald-100 px-1 font-medium text-emerald-700">
              [ACCOUNT_BALANCE]
            </span>{' '}
            and next steps for the refund.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Placeholders preserve the original intent while masking confidential values.
          </p>
        </Card>
      </div>

      <div className="mt-6 flex gap-2">
        <Button className="w-auto">Accept &amp; Resubmit</Button>
        <Button variant="secondary" className="w-auto">
          Edit Sanitized Prompt
        </Button>
        <Button variant="ghost" className="w-auto">
          Reject
        </Button>
      </div>
    </div>
  );
}
