import 'dotenv/config';
import { z } from 'zod';
export const env = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().startsWith('postgres'),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    FRONTEND_URL: z.url(),
  })
  .refine(
    (e) => e.JWT_SECRET !== e.JWT_REFRESH_SECRET,
    'Use segredos diferentes',
  )
  .refine(
    (e) => e.NODE_ENV !== 'production' || e.FRONTEND_URL.startsWith('https://'),
    'Produção exige HTTPS',
  )
  .parse(process.env);
