import { randomUUID, randomInt, createHash } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { registerSchema } from '../validators/index.js';
import {
  findLoginUser,
  safeUserSelect,
  maskUser,
} from '../repositories/user.repository.js';
import { assert, AppError } from '../utils/errors.js';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const refreshOptions = {
  algorithm: 'HS256',
  issuer: 'cesda-bank',
  audience: 'cesda-refresh',
  expiresIn: '7d',
} as const;
function tokens(userId: string, sessionId: string) {
  return {
    access: jwt.sign({ sid: sessionId }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: userId,
      issuer: 'cesda-bank',
      audience: 'cesda-web',
      expiresIn: '15m',
    }),
    refresh: jwt.sign(
      { sid: sessionId, jti: randomUUID() },
      env.JWT_REFRESH_SECRET,
      { ...refreshOptions, subject: userId },
    ),
  };
}
export async function createSession(userId: string) {
  const id = randomUUID();
  const pair = tokens(userId, id);
  await db.session.create({
    data: {
      id,
      userId,
      refreshHash: hash(pair.refresh),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  return pair;
}
export async function register(input: z.infer<typeof registerSchema>) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  const number = randomInt(10000000, 99999999).toString();
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: input.name,
        cpf: input.cpf,
        email: input.email,
        phone: input.phone,
        birthDate: new Date(input.birthDate),
        passwordHash,
        account: {
          create: {
            accountNumber: number.slice(0, -1) + '-' + number.slice(-1),
          },
        },
      },
      select: safeUserSelect,
    });
    await tx.auditLog.createMany({
      data: [
        { userId: u.id, event: 'USER_REGISTERED' },
        { userId: u.id, event: 'ACCOUNT_CREATED' },
      ],
    });
    return u;
  });
  return { user: maskUser(user), tokens: await createSession(user.id) };
}
let dummyHash: Promise<string> | undefined;
export async function login(email: string, password: string) {
  const user = await findLoginUser(email);
  dummyHash ??= argon2.hash('unusable-dummy-password', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  const valid = await argon2.verify(
    user?.passwordHash ?? (await dummyHash),
    password,
  );
  if (!user || !valid) {
    await db.auditLog.create({ data: { event: 'LOGIN_FAILED' } });
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou senha incorretos.',
    );
  }
  assert(
    user.status === 'ACTIVE',
    403,
    'USER_BLOCKED',
    'Seu acesso está bloqueado.',
  );
  await db.auditLog.create({ data: { event: 'USER_LOGIN', userId: user.id } });
  return { tokens: await createSession(user.id) };
}
export async function refresh(token: string) {
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'cesda-bank',
      audience: 'cesda-refresh',
    });
    if (typeof decoded === 'string') throw Error();
    payload = decoded;
  } catch {
    throw new AppError(
      401,
      'SESSION_EXPIRED',
      'Sua sessão expirou. Entre novamente.',
    );
  }
  assert(
    typeof payload.sid === 'string' && typeof payload.sub === 'string',
    401,
    'SESSION_EXPIRED',
    'Sua sessão expirou.',
  );
  const session = await db.session.findUnique({
    where: { id: payload.sid },
    include: { user: { select: { status: true } } },
  });
  assert(
    session &&
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.userId === payload.sub &&
      session.user.status === 'ACTIVE',
    401,
    'SESSION_EXPIRED',
    'Sua sessão expirou.',
  );
  const pair = tokens(session.userId, session.id);
  const rotated = await db.session.updateMany({
    where: { id: session.id, refreshHash: hash(token), revokedAt: null },
    data: { refreshHash: hash(pair.refresh) },
  });
  if (rotated.count !== 1) {
    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      401,
      'TOKEN_REUSED',
      'Sessão encerrada. Entre novamente.',
    );
  }
  return pair;
}
export async function logout(token?: string) {
  if (token)
    await db.session.updateMany({
      where: { refreshHash: hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
}
