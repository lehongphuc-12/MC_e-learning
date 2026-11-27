import { User } from '../../../types';

export const resolveUserRole = (user: { roleName?: unknown; role?: unknown }): User['role'] => {
  const role = String(user.roleName || user.role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'administrator') return 'admin';
  if (role === 'instructor' || role === 'teacher') return 'instructor';
  if (role === 'learner' || role === 'student') return 'student';
  return 'student';
};

export const getRoleHomePath = (role: User['role']): string => {
  if (role === 'admin') return '/admin';
  if (role === 'instructor') return '/instructor';
  return '/courses';
};
