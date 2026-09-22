import type { CookieOptions, RequestHandler, Response } from 'express';
import * as auth from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import { env } from '../config/env.js';
import { db } from '../config/db.js';
import { maskUser, safeUserSelect } from '../repositories/user.repository.js';
const cookie: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api',
};
function setCookies(res: Response, pair: { access: string; refresh: string }) {
  res.cookie('cesda_access', pair.access, { ...cookie, maxAge: 15 * 60000 });
  res.cookie('cesda_refresh', pair.refresh, {
    ...cookie,
    maxAge: 7 * 86400000,
  });
}
export const register: RequestHandler = async (req, res) => {
  const result = await auth.register(registerSchema.parse(req.body));
  setCookies(res, result.tokens);
  res.status(201).json({ success: true, data: result.user });
};
export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await auth.login(input.email, input.password);
  setCookies(res, result.tokens);
  res.json({ success: true, data: { message: 'Bem-vindo ao Cesda Bank.' } });
};
export const refresh: RequestHandler = async (req, res) => {
  setCookies(res, await auth.refresh(req.cookies?.cesda_refresh ?? ''));
  res.json({ success: true, data: { message: 'Sessão renovada.' } });
};
export const logout: RequestHandler = async (req, res) => {
  await auth.logout(req.cookies?.cesda_refresh);
  res.clearCookie('cesda_access', cookie);
  res.clearCookie('cesda_refresh', cookie);
  res.status(204).end();
};
export const me: RequestHandler = async (req, res) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: req.auth!.userId },
    select: safeUserSelect,
  });
  res.json({ success: true, data: maskUser(user) });
};
