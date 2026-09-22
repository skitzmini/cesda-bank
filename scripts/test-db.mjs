import { config } from 'dotenv';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
config({ path: 'backend/.env', quiet: true });
const source = new URL(
  process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://cesda:cesda_local@localhost:5432/cesda',
);
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname))
  throw Error(
    'Este comando cria apenas banco local. Para CI externo configure cesda_test manualmente.',
  );
source.pathname = '/postgres';
const pool = new pg.Pool({ connectionString: source.toString() });
try {
  const exists = await pool.query(
    "SELECT 1 FROM pg_database WHERE datname='cesda_test'",
  );
  if (!exists.rowCount) await pool.query('CREATE DATABASE cesda_test');
} finally {
  await pool.end();
}
source.pathname = '/cesda_test';
const result = spawnSync(
  process.execPath,
  ['../node_modules/prisma/build/index.js', 'migrate', 'deploy'],
  {
    cwd: 'backend',
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: source.toString() },
  },
);
process.exitCode = result.status ?? 1;
