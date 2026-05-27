import { Role } from '../models';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario general',
  VIEWER: 'Lector',
  EXTERNO: 'Externo',
  CARATULADOR: 'Caratulador',
  JEFE_AREA: 'Jefe de área',
};

export const ALL_ROLES: Role[] = ['ADMIN', 'USER', 'VIEWER', 'EXTERNO', 'CARATULADOR', 'JEFE_AREA'];

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}
