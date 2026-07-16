export interface LoginFormValues {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'compliance' | 'employee';
  department: string;
}
