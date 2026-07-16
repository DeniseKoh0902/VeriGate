import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const pastRequests = [
  {
    tool: 'Perplexity Pro',
    department: 'Marketing',
    status: 'good' as const,
    statusLabel: 'Approved',
    note: 'Approved for competitive research use cases.',
  },
  {
    tool: 'Midjourney',
    department: 'Marketing',
    status: 'critical' as const,
    statusLabel: 'Rejected',
    note: 'Trust Score evaluation: image outputs cannot be watermark-verified for IP compliance. Resubmit with a vendor DPA.',
  },
  {
    tool: 'Notion AI',
    department: 'Engineering',
    status: 'warning' as const,
    statusLabel: 'Pending',
    note: 'Awaiting AI Trust Score evaluation.',
  },
];

export function AiToolRequestPage() {
  const [toolName, setToolName] = useState('');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Tool Request</h1>
        <p className="mt-1 text-sm text-slate-500">
          Request approval for an AI tool that isn't yet on the approved list.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            New Request
          </h2>
          <div className="space-y-4">
            <Input
              label="AI Tool Name"
              placeholder="e.g. Perplexity Pro"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Department
              </label>
              <select className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10">
                <option>Finance</option>
                <option>Engineering</option>
                <option>Legal</option>
                <option>Marketing</option>
                <option>HR</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Business Justification
              </label>
              <textarea
                rows={4}
                placeholder="Describe the intended business purpose…"
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <Button>Submit Request</Button>
          </div>
        </Card>

        <Card className="col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Your Requests</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {pastRequests.map((request) => (
              <div key={request.tool} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{request.tool}</p>
                    <p className="text-xs text-slate-400">{request.department}</p>
                  </div>
                  <Badge status={request.status}>{request.statusLabel}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{request.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
