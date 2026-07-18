import type { Role } from '@/types/user.types';

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  department: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}
