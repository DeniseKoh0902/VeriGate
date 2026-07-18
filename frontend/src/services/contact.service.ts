import { apiFetch } from '@/lib/apiClient';
import type { AdminContact } from '@/types/contact.types';

export function getItAdminContacts() {
  return apiFetch<AdminContact[]>('/contact/it-admins');
}
