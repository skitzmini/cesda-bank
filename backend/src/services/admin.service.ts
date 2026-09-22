import { db } from '../config/db.js';
import { safeUserSelect, maskUser } from '../repositories/user.repository.js';
import { assert } from '../utils/errors.js';
import { serializable } from './ledger.service.js';
export async function stats() {
  const [users, activeAccounts, transactions, volume] = await db.$transaction([
    db.user.count(),
    db.account.count({ where: { status: 'ACTIVE' } }),
    db.transaction.count({ where: { type: { not: 'PIX_RECEIVED' } } }),
    db.transaction.aggregate({
      where: { status: 'COMPLETED', type: { not: 'PIX_RECEIVED' } },
      _sum: { amount: true },
    }),
  ]);
  return {
    users,
    activeAccounts,
    transactions,
    volume: volume._sum.amount ?? 0,
  };
}
export async function list(
  kind: 'users' | 'accounts' | 'transactions' | 'audit',
  page: number,
  limit: number,
) {
  const paging = {
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' as const },
  };
  if (kind === 'users') {
    const [users, total] = await db.$transaction([
      db.user.findMany({ ...paging, select: safeUserSelect }),
      db.user.count(),
    ]);
    return {
      items: users.map(maskUser),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
  if (kind === 'accounts') {
    const [items, total] = await db.$transaction([
      db.account.findMany({
        ...paging,
        include: { user: { select: { name: true, email: true } } },
      }),
      db.account.count(),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
  if (kind === 'transactions') {
    const [items, total] = await db.$transaction([
      db.transaction.findMany(paging),
      db.transaction.count(),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
  const [items, total] = await db.$transaction([
    db.auditLog.findMany(paging),
    db.auditLog.count(),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
export async function setAccountStatus(
  adminId: string,
  id: string,
  status: 'ACTIVE' | 'BLOCKED',
) {
  return serializable(async (tx) => {
    const account = await tx.account.findUnique({ where: { id } });
    assert(account, 404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.');
    assert(
      account.userId !== adminId,
      422,
      'SELF_BLOCK',
      'Não é possível alterar sua própria conta administrativa.',
    );
    const updated = await tx.account.update({
      where: { id },
      data: { status },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        event: status === 'BLOCKED' ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
        resourceId: id,
      },
    });
    await tx.notification.create({
      data: {
        userId: account.userId,
        type: 'ACCOUNT_STATUS',
        title: status === 'BLOCKED' ? 'Conta bloqueada' : 'Conta desbloqueada',
        message: 'A administração atualizou o status da sua conta.',
      },
    });
    return updated;
  });
}
