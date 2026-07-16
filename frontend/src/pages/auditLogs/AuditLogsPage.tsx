import { Download, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const logs = [
  {
    timestamp: '2026-07-16 14:23:01',
    employee: 'Aiman Rahman',
    department: 'Finance',
    model: 'GPT-4 Turbo',
    event: 'Prompt blocked — PII detected',
    result: 'critical' as const,
  },
  {
    timestamp: '2026-07-16 14:22:45',
    employee: 'Marcus Tan',
    department: 'Engineering',
    model: 'Claude 3 Opus',
    event: 'Prompt injection attempt blocked',
    result: 'critical' as const,
  },
  {
    timestamp: '2026-07-16 13:58:12',
    employee: 'Priya Nair',
    department: 'Legal',
    model: 'Gemini Pro',
    event: 'Prompt sanitized and forwarded',
    result: 'warning' as const,
  },
  {
    timestamp: '2026-07-16 13:41:07',
    employee: 'Wei Ling Chua',
    department: 'Marketing',
    model: 'Mistral Large',
    event: 'AI response delivered',
    result: 'good' as const,
  },
  {
    timestamp: '2026-07-16 12:55:33',
    employee: 'Denise Koh',
    department: 'IT Infrastructure',
    model: '—',
    event: 'Policy "Finance Data Handling" updated',
    result: 'good' as const,
  },
];

export function AuditLogsPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review AI usage history, user activities, governance events, and policy violations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="w-auto">
            <Download size={15} />
            Export CSV
          </Button>
          <Button variant="secondary" className="w-auto">
            <Download size={15} />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Filter size={15} className="text-slate-400" />
          <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            <option>All Departments</option>
            <option>Finance</option>
            <option>Engineering</option>
            <option>Legal</option>
            <option>Marketing</option>
            <option>IT Infrastructure</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            <option>All AI Models</option>
            <option>GPT-4 Turbo</option>
            <option>Claude 3 Opus</option>
            <option>Gemini Pro</option>
            <option>Mistral Large</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Timestamp</th>
              <th className="px-5 py-2 font-medium">Employee</th>
              <th className="px-5 py-2 font-medium">Department</th>
              <th className="px-5 py-2 font-medium">AI Model</th>
              <th className="px-5 py-2 font-medium">Event</th>
              <th className="px-5 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.timestamp + log.event} className="border-t border-slate-100">
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{log.timestamp}</td>
                <td className="px-5 py-3 text-slate-700">{log.employee}</td>
                <td className="px-5 py-3 text-slate-500">{log.department}</td>
                <td className="px-5 py-3 text-slate-500">{log.model}</td>
                <td className="px-5 py-3 text-slate-700">{log.event}</td>
                <td className="px-5 py-3">
                  <Badge status={log.result}>
                    {log.result === 'critical' ? 'Blocked' : log.result === 'warning' ? 'Sanitized' : 'Success'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
