import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (
    err &&
    typeof err === 'object' &&
    'type' in err &&
    err.type === 'entity.too.large'
  ) {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'A solicitação ultrapassou o tamanho permitido.',
      },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Confira os dados informados.',
        fields: err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Já existe um cadastro com esses dados.',
      },
    });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Requisição inválida.' },
    });
    return;
  }
  logger.error(
    { errorType: err instanceof Error ? err.name : 'Unknown' },
    'Request failed',
  );
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir. Tente novamente.',
    },
  });
};
