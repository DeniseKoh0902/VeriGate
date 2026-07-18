import { Mail, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InfoPageLayout } from '@/components/layout/InfoPageLayout';

interface TeamMember {
  name: string;
  email: string;
  degree: string;
}

const team: TeamMember[] = [
  {
    name: 'Khor Cheng Hooi',
    email: 'kchooi0425@gmail.com',
    degree: 'Bachelor of Computer Science (Information Systems)',
  },
  {
    name: 'Denise Koh Wei Sin',
    email: 'denisekoh@gmail.com',
    degree: 'Bachelor of Computer Science (Software Engineering)',
  },
];

export function SupportPage() {
  return (
    <InfoPageLayout
      title="Support"
      description="VeriGate is built and maintained by team K&K, Universiti Malaya."
    >
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-slate-700">
          For bugs, account issues, or questions about how VeriGate works, check the{' '}
          <Link to="/help-center" className="font-medium text-blue-600 hover:text-blue-700">
            Help Center
          </Link>{' '}
          first — most common questions are answered there. Anything else, reach out to either of us
          directly below.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {team.map((member) => (
            <div key={member.email} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <GraduationCap size={13} className="shrink-0" />
                {member.degree}
              </p>
              <p className="mt-1 text-xs text-slate-400">Universiti Malaya</p>
              <a
                href={`mailto:${member.email}`}
                className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Mail size={14} />
                {member.email}
              </a>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          VeriGate is an academic prototype built by team K&amp;K for Case Study 3: AI Governance &amp;
          Responsible AI in Enterprise — not a commercial product or a 24/7 support line.
        </p>
      </div>
    </InfoPageLayout>
  );
}
