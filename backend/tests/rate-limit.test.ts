import { afterAll, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';
afterAll(() => db.$disconnect());
it('retorna 429 após tentativas repetidas de login', async () => {
  const statuses: number[] = [];
  for (let n = 0; n < 11; n++) {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('X-Cesda-Client', 'web')
      .send({ email: 'missing@example.com', password: 'SenhaErrada@123' });
    statuses.push(response.status);
  }
  expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
  expect(statuses[10]).toBe(429);
});
