import { z } from 'zod';
import { Prisma, type Category } from '../generated/prisma/client.js';
import { db } from '../config/db.js';
import { accountFor } from './account.service.js';
import { statementSchema } from '../validators/index.js';
import { assert } from '../utils/errors.js';
import { brazilDayStart } from '../utils/money.js';
export const incoming = ['DEPOSIT', 'PIX_RECEIVED', 'REFUND'] as const;
export const outgoing = ['PIX_SENT', 'PURCHASE', 'TRANSFER'] as const;
export async function statement(
  userId: string,
  query: z.infer<typeof statementSchema>,
) {
  const account = await accountFor(userId);
  const types =
    query.filter === 'in'
      ? [...incoming]
      : query.filter === 'out'
        ? [...outgoing]
        : query.filter === 'pix'
          ? (['PIX_SENT', 'PIX_RECEIVED'] as const)
          : query.filter === 'purchases'
            ? (['PURCHASE'] as const)
            : query.filter === 'deposits'
              ? (['DEPOSIT'] as const)
              : undefined;
  const where: Prisma.TransactionWhereInput = {
    accountId: account.id,
    ...(types ? { type: { in: [...types] } } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.search
      ? { description: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from
              ? { gte: new Date(query.from + 'T00:00:00-03:00') }
              : {}),
            ...(query.to
              ? {
                  lt: new Date(
                    new Date(query.to + 'T00:00:00-03:00').getTime() + 86400000,
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.transaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        counterpartyAccount: { select: { user: { select: { name: true } } } },
      },
    }),
    db.transaction.count({ where }),
  ]);
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.ceil(total / query.limit),
  };
}
export async function detail(userId: string, id: string) {
  const account = await accountFor(userId);
  const row = await db.transaction.findFirst({
    where: { id, accountId: account.id },
    include: {
      account: {
        select: {
          agency: true,
          accountNumber: true,
          user: { select: { name: true } },
        },
      },
      counterpartyAccount: {
        select: {
          agency: true,
          accountNumber: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  assert(row, 404, 'TRANSACTION_NOT_FOUND', 'Transação não encontrada.');
  return row;
}
export async function categorize(
  userId: string,
  id: string,
  category: Category,
) {
  const account = await accountFor(userId);
  const result = await db.transaction.updateMany({
    where: { id, accountId: account.id },
    data: { category },
  });
  assert(
    result.count === 1,
    404,
    'TRANSACTION_NOT_FOUND',
    'Transação não encontrada.',
  );
  return detail(userId, id);
}
export async function summary(userId: string) {
  const account = await accountFor(userId);
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  const rows = await db.transaction.groupBy({
    by: ['type'],
    where: {
      accountId: account.id,
      status: 'COMPLETED',
      createdAt: { gte: new Date(month + '-01T00:00:00-03:00') },
    },
    _sum: { amount: true },
  });
  let income = 0,
    expenses = 0;
  for (const row of rows) {
    if (incoming.some((t) => t === row.type)) income += row._sum.amount ?? 0;
    else expenses += row._sum.amount ?? 0;
  }
  return {
    balance: account.balance,
    income,
    expenses,
    dailyPixLimit: account.dailyPixLimit,
    accountStatus: account.status,
  };
}
export async function monthly(userId: string) {
  const account = await accountFor(userId);
  // Aggregate in PostgreSQL to keep response and memory bounded.
  const rows = await db.$queryRaw<
    { month: string; income: bigint; expenses: bigint }[]
  >(Prisma.sql`
 SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') AS month,
 COALESCE(SUM(CASE WHEN type IN ('DEPOSIT','PIX_RECEIVED','REFUND') THEN amount ELSE 0 END),0)::bigint AS income,
 COALESCE(SUM(CASE WHEN type IN ('PIX_SENT','PURCHASE','TRANSFER') THEN amount ELSE 0 END),0)::bigint AS expenses
 FROM "Transaction" WHERE "accountId"=${account.id}::uuid AND status='COMPLETED'
 GROUP BY month ORDER BY month`);
  let balance = 0;
  const mapped = rows.map((r) => {
    balance += Number(r.income) - Number(r.expenses);
    return {
      month: r.month,
      income: Number(r.income),
      expenses: Number(r.expenses),
      balance,
    };
  });
  const current = brazilDayStart();
  const result = [];
  for (let n = 5; n >= 0; n--) {
    const d = new Date(
      Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - n, 1),
    );
    const month = d.toISOString().slice(0, 7);
    const found = mapped.find((r) => r.month === month);
    const previous = mapped.filter((r) => r.month < month).at(-1);
    result.push(
      found ?? {
        month,
        income: 0,
        expenses: 0,
        balance: previous?.balance ?? 0,
      },
    );
  }
  return result;
}
export async function categoryTotals(userId: string) {
  const account = await accountFor(userId);
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  const rows = await db.transaction.groupBy({
    by: ['category'],
    where: {
      accountId: account.id,
      type: { in: [...outgoing] },
      status: 'COMPLETED',
      createdAt: { gte: new Date(month + '-01T00:00:00-03:00') },
    },
    _sum: { amount: true },
  });
  return rows.map((r) => ({
    category: r.category,
    amount: r._sum.amount ?? 0,
  }));
}
