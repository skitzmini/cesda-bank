import pino from 'pino';
export const logger = pino({
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers.set-cookie',
    'password',
    'passwordHash',
    'token',
    'cvv',
  ],
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
});
