import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (!existsSync('backend/.env'))
  writeFileSync(
    'backend/.env',
    [
      'NODE_ENV=development',
      'PORT=4000',
      'DATABASE_URL=postgresql://cesda:cesda_local@localhost:5432/cesda',
      'JWT_SECRET=' + randomBytes(48).toString('hex'),
      'JWT_REFRESH_SECRET=' + randomBytes(48).toString('hex'),
      'FRONTEND_URL=http://localhost:3000',
      'SEED_PASSWORD=Cesda!' + randomBytes(12).toString('base64url'),
      '',
    ].join('\n'),
  );
if (!existsSync('frontend/.env.local'))
  writeFileSync(
    'frontend/.env.local',
    'NEXT_PUBLIC_API_URL=/api\nAPI_INTERNAL_URL=http://localhost:4000\n',
  );
console.log(
  'Configurações locais preparadas. A senha dos usuários de demonstração está em backend/.env (SEED_PASSWORD).',
);
