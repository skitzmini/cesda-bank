import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
const pg = new EmbeddedPostgres({
  databaseDir: '.local/postgres',
  user: 'cesda',
  password: 'cesda_local',
  port: 5432,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
if (!existsSync('.local/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of ['cesda', 'cesda_test']) {
  const found = await client.query(
    'SELECT 1 FROM pg_database WHERE datname=$1',
    [name],
  );
  if (!found.rowCount) await pg.createDatabase(name);
}
await client.end();
console.log('PostgreSQL local pronto em 127.0.0.1:5432. Ctrl+C para encerrar.');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void pg.stop().then(() => process.exit(0));
  });
setInterval(() => {}, 60000);
