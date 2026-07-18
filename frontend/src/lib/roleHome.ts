import type { Role } from '@/types/user.types';

export const roleHomePath: Record<Role, string> = {
  ADMIN: '/dashboard',
  COMPLIANCE: '/dashboard',
  EMPLOYEE: '/workspace',
};
