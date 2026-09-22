import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { router } from './routes/index.js';
import { errorHandler } from './middlewares/errors.js';
import { originGuard } from './middlewares/auth.js';
import { openapi } from './config/openapi.js';
export const app = express();
app.disable('x-powered-by');
if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-Cesda-Client', 'Idempotency-Key'],
  }),
);
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    logger.info(
      {
        method: req.method,
        route: req.route?.path ?? 'unmatched',
        status: res.statusCode,
        duration: Date.now() - start,
      },
      'HTTP',
    ),
  );
  next();
});
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.get('/api/health', (_req, res) =>
  res.json({ success: true, data: { status: 'ok', mode: 'simulation' } }),
);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas solicitações. Tente novamente em instantes.',
      },
    },
  }),
  originGuard,
  router,
);
app.use((_req, res) =>
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
  }),
);
app.use(errorHandler);
