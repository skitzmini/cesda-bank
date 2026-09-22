import { Router, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import * as auth from '../controllers/auth.controller.js';
import { authenticate, adminOnly } from '../middlewares/auth.js';
import * as account from '../services/account.service.js';
import * as transactions from '../services/transaction.service.js';
import * as admin from '../services/admin.service.js';
import { operate } from '../services/ledger.service.js';
import { db } from '../config/db.js';
import { assert } from '../utils/errors.js';
import {
  depositSchema,
  transferSchema,
  purchaseSchema,
  pixSchema,
  profileSchema,
  pageSchema,
  statementSchema,
  idSchema,
  categorySchema,
} from '../validators/index.js';
export const router = Router();
const limited = (limit: number, windowMs = 60000) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
      },
    },
  });
const loginLimit = limited(10, 15 * 60000);
router.post('/auth/register', limited(5, 60 * 60000), auth.register);
router.post('/auth/login', loginLimit, auth.login);
router.post('/auth/refresh', limited(30), auth.refresh);
router.post('/auth/logout', auth.logout);
router.use(authenticate);
router.get('/auth/me', auth.me);
const send =
  (
    run: (req: Parameters<RequestHandler>[0]) => Promise<unknown>,
    status = 200,
  ): RequestHandler =>
  async (req, res) => {
    res.status(status).json({ success: true, data: await run(req) });
  };
const uid = (req: Parameters<RequestHandler>[0]) => req.auth!.userId;
const id = (req: Parameters<RequestHandler>[0]) =>
  idSchema.parse(req.params.id);
const idem = (req: Parameters<RequestHandler>[0]) =>
  idSchema.parse(req.get('Idempotency-Key'));
const financeLimit = limited(20);
router.get(
  '/account',
  send((r) => account.accountFor(uid(r))),
);
router.get(
  '/account/balance',
  send(async (r) => ({ balance: (await account.accountFor(uid(r))).balance })),
);
router.post(
  '/account/demo-deposit',
  financeLimit,
  send(
    (r) =>
      operate(uid(r), idem(r), {
        kind: 'DEPOSIT',
        ...depositSchema.parse(r.body),
      }),
    201,
  ),
);
router.get(
  '/pix/keys',
  send(async (r) =>
    db.pixKey.findMany({
      where: { accountId: (await account.accountFor(uid(r))).id },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
router.post(
  '/pix/keys',
  limited(10),
  send((r) => account.addPix(uid(r), pixSchema.parse(r.body)), 201),
);
router.delete('/pix/keys/:id', async (r, res) => {
  await account.deletePix(uid(r), id(r));
  res.status(204).end();
});
router.get(
  '/pix/search/:key',
  limited(15),
  send((r) =>
    account.searchPix(uid(r), z.string().min(1).max(254).parse(r.params.key)),
  ),
);
router.post(
  '/pix/transfer',
  financeLimit,
  send(
    (r) =>
      operate(uid(r), idem(r), {
        kind: 'PIX',
        ...transferSchema.parse(r.body),
      }),
    201,
  ),
);
router.get(
  '/transactions',
  send((r) => transactions.statement(uid(r), statementSchema.parse(r.query))),
);
router.get(
  '/transactions/:id',
  send((r) => transactions.detail(uid(r), id(r))),
);
router.patch(
  '/transactions/:id/category',
  send((r) =>
    transactions.categorize(
      uid(r),
      id(r),
      categorySchema.parse(r.body).category,
    ),
  ),
);
router.get(
  '/dashboard/summary',
  send((r) => transactions.summary(uid(r))),
);
router.get(
  '/dashboard/monthly',
  send((r) => transactions.monthly(uid(r))),
);
router.get(
  '/dashboard/categories',
  send((r) => transactions.categoryTotals(uid(r))),
);
router.get(
  '/cards',
  send(async (r) =>
    db.card.findMany({
      where: { accountId: (await account.accountFor(uid(r))).id },
    }),
  ),
);
router.post(
  '/cards',
  send((r) => account.createCard(uid(r)), 201),
);
router.patch(
  '/cards/:id/block',
  send((r) => account.blockCard(uid(r), id(r), true)),
);
router.patch(
  '/cards/:id/unblock',
  send((r) => account.blockCard(uid(r), id(r), false)),
);
router.post(
  '/purchases/simulate',
  financeLimit,
  send(
    (r) =>
      operate(uid(r), idem(r), {
        kind: 'PURCHASE',
        ...purchaseSchema.parse(r.body),
      }),
    201,
  ),
);
router.get(
  '/notifications',
  send(async (r) => {
    const { page, limit } = pageSchema.parse(r.query);
    const where = { userId: uid(r) };
    const [items, total, unread] = await db.$transaction([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { ...where, read: false } }),
    ]);
    return {
      items,
      total,
      unread,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }),
);
router.patch(
  '/notifications/read-all',
  send(async (r) => {
    await db.notification.updateMany({
      where: { userId: uid(r), read: false },
      data: { read: true },
    });
    return { message: 'Notificações lidas.' };
  }),
);
router.patch(
  '/notifications/:id/read',
  send(async (r) => {
    const result = await db.notification.updateMany({
      where: { id: id(r), userId: uid(r) },
      data: { read: true },
    });
    assert(result.count === 1, 404, 'NOT_FOUND', 'Notificação não encontrada.');
    return { message: 'Notificação lida.' };
  }),
);
router.get(
  '/profile',
  send((r) => account.profile(uid(r))),
);
router.patch(
  '/profile',
  send((r) => account.updateProfile(uid(r), profileSchema.parse(r.body))),
);
router.use('/admin', adminOnly);
router.get(
  '/admin/summary',
  send(() => admin.stats()),
);
for (const kind of ['users', 'accounts', 'transactions', 'audit'] as const)
  router.get(
    '/admin/' + kind,
    send((r) => {
      const { page, limit } = pageSchema.parse(r.query);
      return admin.list(kind, page, limit);
    }),
  );
router.patch(
  '/admin/accounts/:id/status',
  send((r) =>
    admin.setAccountStatus(
      uid(r),
      id(r),
      z
        .object({ status: z.enum(['ACTIVE', 'BLOCKED']) })
        .strict()
        .parse(r.body).status,
    ),
  ),
);
