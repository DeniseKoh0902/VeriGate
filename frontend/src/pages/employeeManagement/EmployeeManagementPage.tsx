import { useMemo, useState } from 'react';
import { Search, Plus, Pencil, UserX, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

type EmployeeStatus = 'Active' | 'Deactivated';

const employees: {
  name: string;
  email: string;
  department: string;
  role: string;
  status: EmployeeStatus;
}[] = [
  { name: 'Denise Koh', email: 'denise.koh@company.com', department: 'IT Infrastructure', role: 'Admin', status: 'Active' },
  { name: 'Aiman Rahman', email: 'aiman.rahman@company.com', department: 'Finance', role: 'Employee', status: 'Active' },
  { name: 'Priya Nair', email: 'priya.nair@company.com', department: 'Legal', role: 'Employee', status: 'Active' },
  { name: 'Marcus Tan', email: 'marcus.tan@company.com', department: 'Engineering', role: 'Employee', status: 'Active' },
  { name: 'Siti Aminah', email: 'siti.aminah@company.com', department: 'HR', role: 'Employee', status: 'Deactivated' },
  { name: 'Wei Ling Chua', email: 'weiling.chua@company.com', department: 'Marketing', role: 'Employee', status: 'Active' },
];

export function EmployeeManagementPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(term) || employee.email.toLowerCase().includes(term),
    );
  }, [query]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, edit, deactivate, or delete employee accounts and manage permissions.
          </p>
        </div>
        <Button className="w-auto">
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <Input
            placeholder="Search by name or email"
            leftIcon={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Name</th>
              <th className="px-5 py-2 font-medium">Email</th>
              <th className="px-5 py-2 font-medium">Department</th>
              <th className="px-5 py-2 font-medium">Role</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((employee) => (
              <tr key={employee.email} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{employee.name}</td>
                <td className="px-5 py-3 text-slate-500">{employee.email}</td>
                <td className="px-5 py-3 text-slate-500">{employee.department}</td>
                <td className="px-5 py-3 text-slate-500">{employee.role}</td>
                <td className="px-5 py-3">
                  <Badge status={employee.status === 'Active' ? 'good' : 'neutral'}>
                    {employee.status}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button aria-label="Edit employee" className="hover:text-slate-700">
                      <Pencil size={15} />
                    </button>
                    <button aria-label="Deactivate employee" className="hover:text-orange-600">
                      <UserX size={15} />
                    </button>
                    <button aria-label="Delete employee" className="hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  No employees match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
