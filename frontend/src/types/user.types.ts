export type Role = 'ADMIN' | 'EMPLOYEE';

export interface Employee {
  id: string;
  email: string;
  name: string;
  department: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeCreateInput {
  email: string;
  password: string;
  name: string;
  department: string;
  role: Role;
}

export interface EmployeeUpdateInput {
  name?: string;
  department?: string;
  role?: Role;
  isActive?: boolean;
}
