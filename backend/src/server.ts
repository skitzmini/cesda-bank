import { app } from './app.js';
import { env } from './config/env.js';
import { db } from './config/db.js';
import { logger } from './config/logger.js';
await db.$connect();
const server = app.listen(env.PORT, () =>
  logger.info({ port: env.PORT }, 'Cesda Bank API — simulação'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
