import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { db } from '../src/config/db.js';
import { register } from '../src/services/auth.service.js';
import { operate } from '../src/services/ledger.service.js';
import { addPix, createCard } from '../src/services/account.service.js';
import { password as passwordSchema } from '../src/validators/index.js';
const password = passwordSchema.parse(process.env.SEED_PASSWORD);
const people = [
  {
    name: 'Enrico Dantas',
    email: 'enrico@cesdabank.local',
    cpf: '00000000001',
    phone: '11900000001',
  },
  {
    name: 'Lucas Almeida',
    email: 'lucas@cesdabank.local',
    cpf: '00000000002',
    phone: '11900000002',
  },
  {
    name: 'Marina Costa',
    email: 'marina@cesdabank.local',
    cpf: '00000000003',
    phone: '11900000003',
  },
  {
    name: 'Admin Cesda',
    email: 'admin@cesdabank.local',
    cpf: '00000000004',
    phone: '11900000004',
  },
];
try {
  for (const person of people) {
    if (await db.user.findUnique({ where: { email: person.email } })) continue;
    const { user } = await register({
      ...person,
      password,
      birthDate: '1995-05-15',
    });
    if (person.email.startsWith('admin'))
      await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    await addPix(user.id, { type: 'EMAIL' });
    const card = await createCard(user.id);
    await operate(user.id, randomUUID(), {
      kind: 'DEPOSIT',
      amount: 1_000_000,
    });
    if (person.email.startsWith('enrico')) {
      for (const [merchant, amount, category] of [
        ['Mercado Verde', 48500, 'ALIMENTACAO'],
        ['Casa & Design', 62000, 'CASA'],
        ['Livraria Horizonte', 19500, 'EDUCACAO'],
        ['Café da Praça', 7500, 'ALIMENTACAO'],
        ['Cinema Aurora', 12500, 'LAZER'],
      ] as const)
        await operate(user.id, randomUUID(), {
          kind: 'PURCHASE',
          amount,
          merchant,
          category,
          cardId: card.id,
        });
    }
    await db.session.deleteMany({ where: { userId: user.id } });
  }
  console.log(
    'Seed concluído. Dados fictícios; senha definida em SEED_PASSWORD.',
  );
} finally {
  await db.$disconnect();
}
