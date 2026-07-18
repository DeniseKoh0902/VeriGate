import { useEffect, useState } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';
import * as contactService from '@/services/contact.service';
import type { AdminContact } from '@/types/contact.types';

export function ContactItPage() {
  const [contacts, setContacts] = useState<AdminContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contactService
      .getItAdminContacts()
      .then(setContacts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load contacts.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <InfoPageLayout
      title="Contact IT Infrastructure"
      description="Locked out, need an account, or something's not working? Reach your organization's IT Infrastructure team directly."
    >
      <div className="space-y-6">
        {isLoading && <p className="text-sm text-slate-400">Loading contacts…</p>}

        {!isLoading && error && <p className="text-sm text-red-600">{error}</p>}

        {!isLoading && !error && contacts.length === 0 && (
          <p className="text-sm text-slate-500">
            No IT Infrastructure contacts are available right now. Try again later, or see{' '}
            the Support page if this is a problem with VeriGate itself rather than your account.
          </p>
        )}

        {!isLoading && !error && contacts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {contacts.map((contact) => (
              <div key={contact.email} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="shrink-0 text-blue-600" />
                  <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                </div>
                <a
                  href={`mailto:${contact.email}`}
                  className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Mail size={14} />
                  {contact.email}
                </a>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400">
          This is your organization's own IT Infrastructure team, not the developers of VeriGate — for
          questions about how the platform itself works, see the Support page instead.
        </p>
      </div>
    </InfoPageLayout>
  );
}
