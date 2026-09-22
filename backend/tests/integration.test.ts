import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { db } from '../src/config/db.js';
import { app } from '../src/app.js';
import { operate } from '../src/services/ledger.service.js';
import { register } from '../src/services/auth.service.js';
import {
  addPix,
  createCard,
  blockCard,
  updateProfile,
  searchPix,
  deletePix,
} from '../src/services/account.service.js';
import { brazilDayStart } from '../src/utils/money.js';
const origin = 'http://localhost:3000';
describe('Proteções adicionais', () => {
  it('depósito repetido credita uma única vez', async () => {
    const key = randomUUID();
    await operate(a, key, { kind: 'DEPOSIT', amount: 50000 });
    await operate(a, key, { kind: 'DEPOSIT', amount: 50000 });
    expect(await balance(a)).toBe(150000);
  });
  it('compra em cartão bloqueado não debita saldo', async () => {
    const card = await createCard(a);
    await blockCard(a, card.id, true);
    await expect(
      operate(a, randomUUID(), {
        kind: 'PURCHASE',
        amount: 1000,
        cardId: card.id,
        merchant: 'Loja Teste',
        category: 'COMPRAS',
      }),
    ).rejects.toMatchObject({ code: 'CARD_BLOCKED' });
    expect(await balance(a)).toBe(100000);
  });
  it('não permite usar cartão de outra conta', async () => {
    const card = await createCard(b);
    await expect(
      operate(a, randomUUID(), {
        kind: 'PURCHASE',
        amount: 1000,
        cardId: card.id,
        merchant: 'Loja Teste',
        category: 'COMPRAS',
      }),
    ).rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });
  it('falha ao creditar limite do destinatário também desfaz débito', async () => {
    await db.account.update({
      where: { userId: b },
      data: { balance: 100000000 },
    });
    await expect(operate(a, randomUUID(), pix())).rejects.toMatchObject({
      code: 'RECIPIENT_LIMIT',
    });
    expect(await balance(a)).toBe(100000);
    expect(await balance(b)).toBe(100000000);
  });
  it('mudança de telefone remove chave anterior atomicamente', async () => {
    await addPix(a, { type: 'PHONE' });
    await updateProfile(a, { phone: '11900000099' });
    expect(await db.pixKey.count({ where: { key: '11900000001' } })).toBe(0);
  });
  it('recusa mutações sem cabeçalho CSRF', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', origin)
          .send({ email: 'a@example.com', password })
      ).status,
    ).toBe(403);
  });
  it('limita tamanho do corpo da requisição', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', origin)
          .set('X-Cesda-Client', 'web')
          .send({ email: 'a@example.com', password: 'a'.repeat(20000) })
      ).status,
    ).toBe(413);
  });
});
let a: string, b: string, pixKeyId: string;
const password = 'Teste@1234';
const pix = (amount = 30000) => ({
  kind: 'PIX' as const,
  amount,
  key: 'b@example.com',
  pixKeyId,
  description: 'PIX de teste',
});
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('/cesda_test'))
    throw Error('Testes exigem banco cesda_test isolado.');
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
  a = (
    await register({
      name: 'Conta A',
      cpf: '00000000001',
      email: 'a@example.com',
      phone: '11900000001',
      birthDate: '1990-01-01',
      password,
    })
  ).user.id;
  b = (
    await register({
      name: 'Conta B',
      cpf: '00000000002',
      email: 'b@example.com',
      phone: '11900000002',
      birthDate: '1990-01-01',
      password,
    })
  ).user.id;
  pixKeyId = (await addPix(b, { type: 'EMAIL' })).id;
  await operate(a, randomUUID(), { kind: 'DEPOSIT', amount: 100000 });
});
const balance = async (userId: string) =>
  (await db.account.findUniqueOrThrow({ where: { userId } })).balance;
describe('PostgreSQL: garantias financeiras', () => {
  it('não envia para outra conta que cadastrou a chave após a consulta', async () => {
    const original = await addPix(b, { type: 'PHONE' });
    const recipient = await searchPix(a, original.key);
    await deletePix(b, original.id);
    const other = (
      await register({
        name: 'Conta C',
        cpf: '00000000003',
        email: 'c@example.com',
        phone: original.key,
        birthDate: '1990-01-01',
        password,
      })
    ).user.id;
    await addPix(other, { type: 'PHONE' });
    await expect(
      operate(a, randomUUID(), {
        ...pix(),
        key: original.key,
        pixKeyId: recipient.pixKeyId,
      }),
    ).rejects.toMatchObject({ code: 'PIX_RECIPIENT_CHANGED' });
    expect(await balance(a)).toBe(100000);
    expect(await balance(b)).toBe(0);
    expect(await balance(other)).toBe(0);
  });
  it('recusa confirmação antiga após exclusão e novo cadastro da chave PIX', async () => {
    const recipient = await searchPix(a, 'b@example.com');
    const input = { ...pix(), pixKeyId: recipient.pixKeyId };
    await deletePix(b, pixKeyId);
    const replacement = await addPix(b, { type: 'EMAIL' });
    await expect(operate(a, randomUUID(), input)).rejects.toMatchObject({
      code: 'PIX_RECIPIENT_CHANGED',
    });
    expect(await balance(a)).toBe(100000);
    expect(await balance(b)).toBe(0);
    expect(await db.transaction.count({ where: { type: 'PIX_SENT' } })).toBe(0);
    await operate(a, randomUUID(), { ...input, pixKeyId: replacement.id });
    expect(await balance(a)).toBe(70000);
    expect(await balance(b)).toBe(30000);
  });
  it('reenvio de PIX concluído preserva o resultado após remoção da chave', async () => {
    const key = randomUUID();
    const input = pix();
    const original = await operate(a, key, input);
    await deletePix(b, pixKeyId);
    const replay = await operate(a, key, input);
    expect(replay.id).toBe(original.id);
    expect(await balance(a)).toBe(70000);
    expect(await balance(b)).toBe(30000);
  });
  it('R$ 1.000 - R$ 300 = R$ 700; B recebe R$ 300', async () => {
    await operate(a, randomUUID(), pix());
    expect(await balance(a)).toBe(70000);
    expect(await balance(b)).toBe(30000);
  });
  it('rollback após falha entre débito e crédito', async () => {
    await expect(
      operate(a, randomUUID(), pix(), async () => {
        throw Error('Falha injetada');
      }),
    ).rejects.toThrow('Falha injetada');
    expect(await balance(a)).toBe(100000);
    expect(await balance(b)).toBe(0);
    expect(await db.transaction.count({ where: { type: 'PIX_SENT' } })).toBe(0);
    expect(await db.idempotency.count()).toBe(1);
  });
  it('rejeita saldo insuficiente', async () => {
    await expect(operate(a, randomUUID(), pix(100001))).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });
  it('rejeita conta inexistente', async () => {
    await expect(
      operate(randomUUID(), randomUUID(), pix()),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });
  it('rejeita chave inexistente', async () => {
    await expect(
      operate(a, randomUUID(), { ...pix(), key: 'missing@example.com' }),
    ).rejects.toMatchObject({ code: 'PIX_KEY_NOT_FOUND' });
  });
  it('rejeita remetente bloqueado', async () => {
    await db.account.update({
      where: { userId: a },
      data: { status: 'BLOCKED' },
    });
    await expect(operate(a, randomUUID(), pix())).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
    });
  });
  it('rejeita destinatário bloqueado', async () => {
    await db.account.update({
      where: { userId: b },
      data: { status: 'BLOCKED' },
    });
    await expect(operate(a, randomUUID(), pix())).rejects.toMatchObject({
      code: 'RECIPIENT_BLOCKED',
    });
  });
  it('respeita limite diário acumulado', async () => {
    await db.account.update({
      where: { userId: a },
      data: { dailyPixLimit: 50000 },
    });
    await operate(a, randomUUID(), pix());
    await expect(operate(a, randomUUID(), pix())).rejects.toMatchObject({
      code: 'DAILY_LIMIT_EXCEEDED',
    });
    expect(await balance(a)).toBe(70000);
  });
  it('não processa duas vezes a mesma chave', async () => {
    const key = randomUUID();
    const x = await operate(a, key, pix());
    const y = await operate(a, key, pix());
    expect(x.id).toBe(y.id);
    expect(await balance(a)).toBe(70000);
  });
  it('rejeita chave repetida com conteúdo diferente', async () => {
    const key = randomUUID();
    await operate(a, key, pix());
    await expect(operate(a, key, pix(10000))).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
    });
  });
  it('duas transferências concorrentes não gastam o mesmo saldo', async () => {
    const results = await Promise.allSettled([
      operate(a, randomUUID(), pix(70000)),
      operate(a, randomUUID(), pix(70000)),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(a)).toBe(30000);
    expect(await balance(b)).toBe(70000);
  });
  it('idempotência funciona com requisições concorrentes', async () => {
    const key = randomUUID();
    const results = await Promise.all([
      operate(a, key, pix()),
      operate(a, key, pix()),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await balance(b)).toBe(30000);
  });
  it('limite diário resiste à concorrência', async () => {
    await db.account.update({
      where: { userId: a },
      data: { dailyPixLimit: 50000 },
    });
    const results = await Promise.allSettled([
      operate(a, randomUUID(), pix()),
      operate(a, randomUUID(), pix()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(b)).toBe(30000);
  });
  it('rejeita auto transferência', async () => {
    await addPix(a, { type: 'EMAIL' });
    await expect(
      operate(a, randomUUID(), { ...pix(), key: 'a@example.com' }),
    ).rejects.toMatchObject({ code: 'SELF_TRANSFER' });
  });
  it('constraint impede saldo negativo diretamente no banco', async () => {
    await expect(
      db.account.update({ where: { userId: a }, data: { balance: -1 } }),
    ).rejects.toThrow();
  });
  it('dia financeiro usa São Paulo', () =>
    expect(brazilDayStart(new Date('2026-09-23T02:00:00Z')).toISOString()).toBe(
      '2026-09-22T03:00:00.000Z',
    ));
});
describe('API: autenticação e autorização', () => {
  it('cria conta com saldo zero e hash Argon2', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .send({
        name: 'Pessoa Nova',
        email: 'nova@example.com',
        cpf: '00000000003',
        phone: '11900000003',
        birthDate: '1991-01-01',
        password,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(await balance(response.body.data.id)).toBe(0);
    const u = await db.user.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(u.passwordHash).toMatch(/^\$argon2id\$/);
  });
  it('login não expõe hash e usa cookie HTTP-only', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .send({ email: 'a@example.com', password });
    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
  it('nega acesso sem sessão', async () => {
    expect((await request(app).get('/api/account')).status).toBe(401);
  });
  it('nega origem externa', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Origin', 'https://evil.example')
          .set('X-Cesda-Client', 'web')
          .send({ email: 'a@example.com', password })
      ).status,
    ).toBe(403);
  });
  it('role é validada no backend; protege transações de outros usuários', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .send({ email: 'a@example.com', password });
    expect((await agent.get('/api/admin/users')).status).toBe(403);
    const row = await operate(b, randomUUID(), {
      kind: 'DEPOSIT',
      amount: 100,
    });
    expect((await agent.get('/api/transactions/' + row.id)).status).toBe(404);
  });
  it('logout revoga sessão', async () => {
    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .send({ email: 'a@example.com', password });
    expect((await agent.get('/api/account')).status).toBe(200);
    await agent
      .post('/api/auth/logout')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web');
    expect((await agent.get('/api/account')).status).toBe(401);
  });
  it('refresh rotaciona token e reutilização revoga a sessão', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .send({ email: 'a@example.com', password });
    const cookies = response.headers['set-cookie'];
    const first = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .set('Cookie', cookies);
    expect(first.status).toBe(200);
    const reused = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('X-Cesda-Client', 'web')
      .set('Cookie', cookies);
    expect(reused.status).toBe(401);
    expect(
      (
        await request(app)
          .get('/api/account')
          .set('Cookie', first.headers['set-cookie'])
      ).status,
    ).toBe(401);
  });
});
