import { randomUUID, createHash } from 'node:crypto';
import { Prisma, type Category } from '../generated/prisma/client.js';
import { db } from '../config/db.js';
import { assert, AppError } from '../utils/errors.js';
import { checkAmount, brazilDayStart, MAX_BALANCE } from '../utils/money.js';
type Operation =
  | { kind: 'DEPOSIT'; amount: number }
  | {
      kind: 'PIX';
      amount: number;
      key: string;
      pixKeyId: string;
      description: string;
    }
  | {
      kind: 'PURCHASE';
      amount: number;
      cardId: string;
      merchant: string;
      category: Category;
    };
export type LedgerHook = (tx: Prisma.TransactionClient) => Promise<void>;
export async function serializable<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code) &&
        attempt < 4
      )
        continue;
      throw error;
    }
  }
  throw new AppError(409, 'BUSY', 'A conta está ocupada. Tente novamente.');
}
export async function operate(
  userId: string,
  key: string,
  input: Operation,
  afterDebit?: LedgerHook,
) {
  checkAmount(input.amount);
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  const actor = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  assert(actor, 404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.');
  if (input.kind === 'PIX')
    await db.auditLog.create({
      data: { userId, event: 'PIX_TRANSFER_STARTED' },
    });
  try {
    return await serializable(async (tx) => {
      const account = await tx.account.findUnique({
        where: { userId },
        include: { user: { select: { status: true, name: true } } },
      });
      assert(account, 404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.');
      assert(
        account.status === 'ACTIVE' && account.user.status === 'ACTIVE',
        403,
        'ACCOUNT_BLOCKED',
        'Sua conta está bloqueada.',
      );
      const existing = await tx.idempotency.findUnique({
        where: { accountId_key: { accountId: account.id, key } },
      });
      if (existing) {
        assert(
          existing.fingerprint === fingerprint,
          409,
          'IDEMPOTENCY_CONFLICT',
          'Esta confirmação já foi usada para outra operação.',
        );
        return tx.transaction.findUniqueOrThrow({
          where: { id: existing.transactionId },
        });
      }
      let recipient: null | { id: string; userId: string; name: string } = null;
      if (input.kind === 'PIX') {
        const pix = await tx.pixKey.findUnique({
          where: { key: input.key.trim().toLowerCase() },
          include: {
            account: {
              include: { user: { select: { name: true, status: true } } },
            },
          },
        });
        assert(pix, 404, 'PIX_KEY_NOT_FOUND', 'Chave PIX não encontrada.');
        assert(
          pix.accountId !== account.id,
          422,
          'SELF_TRANSFER',
          'Escolha uma conta diferente da sua.',
        );
        assert(
          pix.id === input.pixKeyId,
          422,
          'PIX_RECIPIENT_CHANGED',
          'Esta chave PIX mudou. Busque o destinatário novamente antes de confirmar.',
        );
        assert(
          pix.account.status === 'ACTIVE' &&
            pix.account.user.status === 'ACTIVE',
          403,
          'RECIPIENT_BLOCKED',
          'A conta de destino está indisponível.',
        );
        const total = await tx.transaction.aggregate({
          where: {
            accountId: account.id,
            type: 'PIX_SENT',
            status: 'COMPLETED',
            createdAt: { gte: brazilDayStart() },
          },
          _sum: { amount: true },
        });
        assert(
          (total._sum.amount ?? 0) + input.amount <= account.dailyPixLimit,
          422,
          'DAILY_LIMIT_EXCEEDED',
          'Seu limite diário de PIX foi atingido.',
        );
        recipient = {
          id: pix.accountId,
          userId: pix.account.userId,
          name: pix.account.user.name,
        };
      }
      if (input.kind === 'PURCHASE') {
        const card = await tx.card.findFirst({
          where: { id: input.cardId, accountId: account.id },
        });
        assert(card, 404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');
        assert(
          !card.blocked && card.expiresAt > new Date(),
          403,
          'CARD_BLOCKED',
          'Cartão bloqueado ou vencido.',
        );
      }
      if (input.kind === 'DEPOSIT') {
        const updated = await tx.account.updateMany({
          where: {
            id: account.id,
            balance: { lte: MAX_BALANCE - input.amount },
          },
          data: { balance: { increment: input.amount } },
        });
        assert(
          updated.count === 1,
          422,
          'BALANCE_LIMIT',
          'O limite de saldo de demonstração foi atingido.',
        );
      } else {
        const updated = await tx.account.updateMany({
          where: { id: account.id, balance: { gte: input.amount } },
          data: { balance: { decrement: input.amount } },
        });
        assert(
          updated.count === 1,
          422,
          'INSUFFICIENT_BALANCE',
          'Saldo insuficiente.',
        );
        if (afterDebit) await afterDebit(tx);
      }
      const operationId = randomUUID();
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          counterpartyAccountId: recipient?.id,
          type:
            input.kind === 'PIX'
              ? 'PIX_SENT'
              : input.kind === 'PURCHASE'
                ? 'PURCHASE'
                : 'DEPOSIT',
          amount: input.amount,
          description:
            input.kind === 'PIX'
              ? input.description
              : input.kind === 'PURCHASE'
                ? input.merchant
                : 'Saldo fictício para demonstração',
          category: input.kind === 'PURCHASE' ? input.category : 'OUTROS',
          transactionCode: 'CESDA-' + randomUUID(),
          operationId,
          idempotencyKey: key,
        },
      });
      if (recipient) {
        const credited = await tx.account.updateMany({
          where: {
            id: recipient.id,
            balance: { lte: MAX_BALANCE - input.amount },
          },
          data: { balance: { increment: input.amount } },
        });
        assert(
          credited.count === 1,
          422,
          'RECIPIENT_LIMIT',
          'A conta de destino atingiu o limite de demonstração.',
        );
        await tx.transaction.create({
          data: {
            accountId: recipient.id,
            counterpartyAccountId: account.id,
            type: 'PIX_RECEIVED',
            amount: input.amount,
            description: 'PIX de ' + account.user.name,
            transactionCode: 'CESDA-' + randomUUID(),
            operationId,
          },
        });
        await tx.notification.create({
          data: {
            userId: recipient.userId,
            type: 'PIX_RECEIVED',
            title: 'PIX recebido',
            message:
              'Você recebeu ' +
              (input.amount / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }) +
              ' de ' +
              account.user.name +
              '.',
          },
        });
      }
      await tx.idempotency.create({
        data: {
          accountId: account.id,
          key,
          fingerprint,
          transactionId: transaction.id,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          type: transaction.type,
          title:
            input.kind === 'PIX'
              ? 'PIX enviado'
              : input.kind === 'PURCHASE'
                ? 'Compra simulada'
                : 'Saldo de teste adicionado',
          message: 'Operação fictícia concluída com sucesso.',
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          event:
            input.kind === 'PIX'
              ? 'PIX_TRANSFER_COMPLETED'
              : input.kind === 'PURCHASE'
                ? 'PURCHASE_COMPLETED'
                : 'DEMO_DEPOSIT_COMPLETED',
          resourceId: transaction.id,
        },
      });
      return transaction;
    });
  } catch (error) {
    if (input.kind === 'PIX')
      await db.auditLog.create({
        data: { userId, event: 'PIX_TRANSFER_FAILED' },
      });
    throw error;
  }
}
