import { z } from 'zod';
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (v) => !/[<>\u0000-\u001f]/.test(v),
      'Remova caracteres inválidos.',
    );
export const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^a-zA-Z0-9]/);
export const registerSchema = z
  .object({
    name: text(100).min(3),
    cpf: z.string().regex(/^\d{11}$/),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z.string().regex(/^\d{10,13}$/),
    birthDate: z.iso.date().refine((v) => {
      const d = new Date(v);
      return d < new Date() && d > new Date('1900-01-01');
    }, 'Data inválida'),
    password,
  })
  .strict();
export const loginSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const amountSchema = z.number().int().positive().max(1_000_000);
export const depositSchema = z.object({ amount: amountSchema }).strict();
export const transferSchema = z
  .object({
    key: z.string().trim().min(1).max(254),
    pixKeyId: z.uuid(),
    amount: amountSchema,
    description: text(140).default('PIX enviado'),
  })
  .strict();
export const categories = [
  'ALIMENTACAO',
  'TRANSPORTE',
  'COMPRAS',
  'LAZER',
  'EDUCACAO',
  'SAUDE',
  'ASSINATURAS',
  'CASA',
  'VIAGEM',
  'OUTROS',
] as const;
export const purchaseSchema = z
  .object({
    cardId: z.uuid(),
    merchant: text(100),
    amount: amountSchema,
    category: z.enum(categories),
  })
  .strict();
export const pixSchema = z
  .object({
    type: z.enum(['CPF', 'EMAIL', 'PHONE', 'RANDOM']),
    key: z.string().trim().max(254).optional(),
  })
  .strict();
export const profileSchema = z
  .object({
    name: text(100).min(3).optional(),
    phone: z
      .string()
      .regex(/^\d{10,13}$/)
      .optional(),
  })
  .strict();
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const statementSchema = pageSchema.extend({
  filter: z
    .enum(['all', 'in', 'out', 'pix', 'purchases', 'deposits'])
    .default('all'),
  search: z.string().trim().max(100).optional(),
  category: z.enum(categories).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export const idSchema = z.uuid();
export const categorySchema = z
  .object({ category: z.enum(categories) })
  .strict();
