import { randomUUID, randomInt } from 'node:crypto';
import { z } from 'zod';
import { db } from '../config/db.js';
import { assert } from '../utils/errors.js';
import { pixSchema, profileSchema } from '../validators/index.js';
import { maskUser, safeUserSelect } from '../repositories/user.repository.js';
import { serializable } from './ledger.service.js';
export const accountFor = (userId: string) =>
  db.account.findUniqueOrThrow({ where: { userId } });
export async function profile(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: safeUserSelect,
  });
  const account = await accountFor(userId);
  return {
    ...maskUser(user),
    account,
    pixKeys: await db.pixKey.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    }),
  };
}
export async function updateProfile(
  userId: string,
  input: z.infer<typeof profileSchema>,
) {
  await db.$transaction(async (tx) => {
    if (input.phone) {
      const account = await tx.account.findUniqueOrThrow({ where: { userId } });
      await tx.pixKey.deleteMany({
        where: {
          accountId: account.id,
          type: 'PHONE',
          key: { not: input.phone },
        },
      });
    }
    await tx.user.update({ where: { id: userId }, data: input });
    await tx.auditLog.create({ data: { userId, event: 'PROFILE_UPDATED' } });
  });
  return profile(userId);
}
export async function addPix(userId: string, input: z.infer<typeof pixSchema>) {
  return serializable(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({
      where: { userId },
      include: { user: { select: { cpf: true, email: true, phone: true } } },
    });
    assert(
      account.status === 'ACTIVE',
      403,
      'ACCOUNT_BLOCKED',
      'Sua conta está bloqueada.',
    );
    assert(
      (await tx.pixKey.count({ where: { accountId: account.id } })) < 5,
      422,
      'KEY_LIMIT',
      'Você pode cadastrar até cinco chaves.',
    );
    const key =
      input.type === 'RANDOM'
        ? randomUUID()
        : input.type === 'CPF'
          ? account.user.cpf
          : input.type === 'EMAIL'
            ? account.user.email
            : account.user.phone;
    assert(
      !input.key || input.key.toLowerCase() === key,
      422,
      'KEY_OWNERSHIP',
      'Use os dados cadastrados na sua conta.',
    );
    const result = await tx.pixKey.create({
      data: { accountId: account.id, type: input.type, key },
    });
    await tx.auditLog.create({
      data: { userId, event: 'PIX_KEY_CREATED', resourceId: result.id },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'PIX_KEY_CREATED',
        title: 'Nova chave PIX',
        message: 'Uma chave foi cadastrada na sua conta de demonstração.',
      },
    });
    return result;
  });
}
export async function deletePix(userId: string, id: string) {
  await serializable(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({ where: { userId } });
    assert(
      account.status === 'ACTIVE',
      403,
      'ACCOUNT_BLOCKED',
      'Sua conta está bloqueada.',
    );
    const result = await tx.pixKey.deleteMany({
      where: { id, accountId: account.id },
    });
    assert(result.count === 1, 404, 'NOT_FOUND', 'Chave não encontrada.');
    await tx.auditLog.create({
      data: { userId, event: 'PIX_KEY_DELETED', resourceId: id },
    });
  });
}
export async function searchPix(userId: string, key: string) {
  const pix = await db.pixKey.findUnique({
    where: { key: key.trim().toLowerCase() },
    select: {
      id: true,
      accountId: true,
      account: {
        select: {
          status: true,
          userId: true,
          user: { select: { name: true, status: true } },
        },
      },
    },
  });
  assert(
    pix &&
      pix.account.status === 'ACTIVE' &&
      pix.account.user.status === 'ACTIVE',
    404,
    'PIX_KEY_NOT_FOUND',
    'Chave PIX não encontrada.',
  );
  assert(
    pix.account.userId !== userId,
    422,
    'SELF_TRANSFER',
    'Escolha uma conta diferente da sua.',
  );
  return {
    pixKeyId: pix.id,
    name: pix.account.user.name,
    institution: 'Cesda Bank',
  };
}
export async function createCard(userId: string) {
  return serializable(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({
      where: { userId },
      include: { user: { select: { name: true } } },
    });
    assert(
      account.status === 'ACTIVE',
      403,
      'ACCOUNT_BLOCKED',
      'Sua conta está bloqueada.',
    );
    assert(
      (await tx.card.count({ where: { accountId: account.id } })) < 1,
      409,
      'CARD_EXISTS',
      'Você já possui um cartão virtual.',
    );
    const lastFour = randomInt(1000, 10000).toString();
    const result = await tx.card.create({
      data: {
        accountId: account.id,
        lastFour,
        demoNumber:
          'DEMO ' +
          randomInt(1000, 10000) +
          ' ' +
          randomInt(1000, 10000) +
          ' ' +
          lastFour,
        holder: account.user.name.toUpperCase(),
        expiresAt: new Date(
          new Date().setFullYear(new Date().getFullYear() + 5),
        ),
      },
    });
    await tx.auditLog.create({
      data: { userId, event: 'CARD_CREATED', resourceId: result.id },
    });
    return result;
  });
}
export async function blockCard(userId: string, id: string, blocked: boolean) {
  return serializable(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({ where: { userId } });
    assert(
      account.status === 'ACTIVE',
      403,
      'ACCOUNT_BLOCKED',
      'Sua conta está bloqueada.',
    );
    const updated = await tx.card.updateMany({
      where: { id, accountId: account.id },
      data: { blocked },
    });
    assert(updated.count === 1, 404, 'NOT_FOUND', 'Cartão não encontrado.');
    await tx.auditLog.create({
      data: {
        userId,
        event: blocked ? 'CARD_BLOCKED' : 'CARD_UNBLOCKED',
        resourceId: id,
      },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'CARD_STATUS',
        title: blocked ? 'Cartão bloqueado' : 'Cartão desbloqueado',
        message: 'O status do seu cartão fictício foi atualizado.',
      },
    });
    return tx.card.findUniqueOrThrow({ where: { id } });
  });
}
