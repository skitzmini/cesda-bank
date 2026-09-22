import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { assert, AppError } from '../utils/errors.js';
export const authenticate: RequestHandler = async (req, _res, next) => {
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(
      req.cookies?.cesda_access ?? '',
      env.JWT_SECRET,
      { algorithms: ['HS256'], issuer: 'cesda-bank', audience: 'cesda-web' },
    );
    if (typeof decoded === 'string') throw Error();
    payload = decoded;
  } catch {
    throw new AppError(
      401,
      'UNAUTHENTICATED',
      'Entre na sua conta para continuar.',
    );
  }
  assert(
    typeof payload.sub === 'string' && typeof payload.sid === 'string',
    401,
    'UNAUTHENTICATED',
    'Sessão inválida.',
  );
  const session = await db.session.findUnique({
    where: { id: payload.sid },
    include: { user: { select: { id: true, role: true, status: true } } },
  });
  assert(
    session &&
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.userId === payload.sub,
    401,
    'SESSION_EXPIRED',
    'Sua sessão expirou.',
  );
  assert(
    session.user.status === 'ACTIVE',
    403,
    'USER_BLOCKED',
    'Seu acesso está bloqueado.',
  );
  req.auth = {
    userId: session.userId,
    sessionId: session.id,
    role: session.user.role,
  };
  next();
};
export const adminOnly: RequestHandler = (req, _res, next) => {
  assert(
    req.auth?.role === 'ADMIN',
    403,
    'FORBIDDEN',
    'Acesso não autorizado.',
  );
  next();
};
export const originGuard: RequestHandler = (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    assert(
      req.headers.origin === new URL(env.FRONTEND_URL).origin,
      403,
      'INVALID_ORIGIN',
      'Origem da solicitação não autorizada.',
    );
    assert(
      req.headers['x-cesda-client'] === 'web',
      403,
      'CSRF_REJECTED',
      'Solicitação não autorizada.',
    );
  }
  next();
};
