import { db } from '../config/db.js';
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  birthDate: true,
  role: true,
  status: true,
  createdAt: true,
} as const;
export const findLoginUser = (email: string) =>
  db.user.findUnique({ where: { email } });
export function maskUser<T extends { cpf: string; phone: string }>(u: T) {
  return {
    ...u,
    cpf: '***.' + u.cpf.slice(3, 6) + '.***-**',
    phone: '(**) *****-' + u.phone.slice(-4),
  };
}
