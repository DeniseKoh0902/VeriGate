import { apiFetch } from '@/lib/apiClient';
import type { Employee, EmployeeCreateInput, EmployeeUpdateInput } from '@/types/user.types';

export function listEmployees() {
  return apiFetch<Employee[]>('/users');
}

export function createEmployee(input: EmployeeCreateInput) {
  return apiFetch<Employee>('/users', { method: 'POST', body: JSON.stringify(input) });
}

export function updateEmployee(id: string, input: EmployeeUpdateInput) {
  return apiFetch<Employee>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteEmployee(id: string) {
  return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
