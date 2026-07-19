import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/context/ToastContext';
import { DEPARTMENTS } from '@/lib/departments';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';
import * as userService from '@/services/user.service';
import type { Employee, EmployeeCreateInput, Role } from '@/types/user.types';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

const PAGE_SIZE = 10;

interface FormState {
  email: string;
  password: string;
  name: string;
  department: string;
  role: Role;
}

const emptyForm: FormState = {
  email: '',
  password: '',
  name: '',
  department: DEPARTMENTS[0],
  role: 'EMPLOYEE',
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function EmployeeManagementPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setEmployees(await userService.listEmployees());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load employees.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesTerm =
        !term ||
        employee.name.toLowerCase().includes(term) ||
        employee.email.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? employee.isActive : !employee.isActive);
      const matchesRole = roleFilter === 'ALL' || employee.role === roleFilter;
      const matchesDepartment =
        departmentFilter === 'ALL' || employee.department === departmentFilter;
      return matchesTerm && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [employees, query, statusFilter, roleFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      email: employee.email,
      password: '',
      name: employee.name,
      department: employee.department,
      role: employee.role,
    });
  };

  const save = async () => {
    if (!form) return;
    if (!editingId) {
      const passwordError = validatePassword(form.password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }
    try {
      if (editingId) {
        const updated = await userService.updateEmployee(editingId, {
          name: form.name,
          department: form.department,
          role: form.role,
        });
        setEmployees((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        toast.success('Employee updated successfully.');
      } else {
        const input: EmployeeCreateInput = {
          email: form.email,
          password: form.password,
          name: form.name,
          department: form.department,
          role: form.role,
        };
        const created = await userService.createEmployee(input);
        setEmployees((prev) => [created, ...prev]);
        toast.success('Employee added successfully.');
      }
      setForm(null);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save employee.');
    }
  };

  const toggleActive = async (employee: Employee) => {
    const nextActive = !employee.isActive;
    if (!window.confirm(`${nextActive ? 'Reactivate' : 'Deactivate'} ${employee.name}?`)) return;
    try {
      const updated = await userService.updateEmployee(employee.id, { isActive: nextActive });
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? updated : e)));
      toast.success(`${employee.name} ${nextActive ? 'reactivated' : 'deactivated'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update employee status.');
    }
  };

  const remove = async (employee: Employee) => {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) return;
    try {
      await userService.deleteEmployee(employee.id);
      setEmployees((prev) => prev.filter((e) => e.id !== employee.id));
      toast.success('Employee deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete employee.');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, edit, deactivate, or delete employee accounts and manage permissions.
          </p>
        </div>
        <Button className="w-auto" onClick={startCreate}>
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="w-72">
            <Input
              placeholder="Search by name or email"
              leftIcon={<Search size={16} />}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | 'ALL');
              setPage(1);
            }}
          >
            <option value="ALL">All Roles</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>

        {form && (
          <div className="grid grid-cols-6 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <Input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {!editingId && (
              <>
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  placeholder="Temporary password"
                  type="password"
                  title={PASSWORD_HINT}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </>
            )}
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div className="flex gap-2">
              <Button
                className="w-auto"
                onClick={save}
                disabled={
                  !form.name ||
                  !form.department ||
                  (!editingId && (!form.email || !form.password))
                }
              >
                Save
              </Button>
              <Button variant="ghost" className="w-auto" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

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
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  {employees.length === 0
                    ? 'No employees yet — add one to get started.'
                    : 'No employees match your search/filter.'}
                </td>
              </tr>
            )}
            {paginated.map((employee) => (
              <tr key={employee.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{employee.name}</td>
                <td className="px-5 py-3 text-slate-500">{employee.email}</td>
                <td className="px-5 py-3 text-slate-500">{employee.department}</td>
                <td className="px-5 py-3 text-slate-500">{roleLabels[employee.role]}</td>
                <td className="px-5 py-3">
                  <Badge status={employee.isActive ? 'good' : 'neutral'}>
                    {employee.isActive ? 'Active' : 'Deactivated'}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      aria-label="Edit employee"
                      className="hover:text-slate-700"
                      onClick={() => startEdit(employee)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label={employee.isActive ? 'Deactivate employee' : 'Reactivate employee'}
                      className="hover:text-orange-600"
                      onClick={() => toggleActive(employee)}
                    >
                      {employee.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                    <button
                      aria-label="Delete employee"
                      className="hover:text-red-600"
                      onClick={() => remove(employee)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="border-t border-slate-100"
        />
      </Card>
    </div>
  );
}
