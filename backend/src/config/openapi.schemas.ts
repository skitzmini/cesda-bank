import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  depositSchema,
  transferSchema,
  purchaseSchema,
  pixSchema,
  profileSchema,
  categorySchema,
  categories,
} from '../validators/index.js';
export const requestSchemas = {
  Register: z.toJSONSchema(registerSchema, { io: 'input' }),
  Login: z.toJSONSchema(loginSchema, { io: 'input' }),
  Deposit: z.toJSONSchema(depositSchema, { io: 'input' }),
  Transfer: z.toJSONSchema(transferSchema, { io: 'input' }),
  Purchase: z.toJSONSchema(purchaseSchema, { io: 'input' }),
  PixKey: z.toJSONSchema(pixSchema, { io: 'input' }),
  Profile: z.toJSONSchema(profileSchema, { io: 'input' }),
  Category: z.toJSONSchema(categorySchema, { io: 'input' }),
  AccountStatus: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: { status: { type: 'string', enum: ['ACTIVE', 'BLOCKED'] } },
  },
  Error: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { const: false },
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: { code: { type: 'string' }, message: { type: 'string' } },
      },
    },
  },
};
export const bodies: Record<string, [string, string]> = {
  '/auth/register': ['post', 'Register'],
  '/auth/login': ['post', 'Login'],
  '/account/demo-deposit': ['post', 'Deposit'],
  '/pix/transfer': ['post', 'Transfer'],
  '/purchases/simulate': ['post', 'Purchase'],
  '/pix/keys': ['post', 'PixKey'],
  '/profile': ['patch', 'Profile'],
  '/transactions/{id}/category': ['patch', 'Category'],
  '/admin/accounts/{id}/status': ['patch', 'AccountStatus'],
};
export const paginationParameters = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];
export const statementParameters = [
  {
    name: 'filter',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['all', 'in', 'out', 'pix', 'purchases', 'deposits'],
    },
  },
  { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
  {
    name: 'category',
    in: 'query',
    schema: { type: 'string', enum: categories },
  },
  ...['from', 'to'].map((name) => ({
    name,
    in: 'query',
    schema: { type: 'string', format: 'date' },
  })),
];
