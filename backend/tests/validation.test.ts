import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { checkAmount, brazilDayStart } from '../src/utils/money.js';
import { registerSchema, transferSchema } from '../src/validators/index.js';
describe('Valores e validação', () => {
  it.each([0, -1, 1.5, NaN, Infinity, 1000001])(
    'rejeita valor inválido %s',
    (amount) => {
      expect(() => checkAmount(amount)).toThrow();
    },
  );
  it('aceita centavos inteiros', () => expect(checkAmount(30000)).toBe(30000));
  it('considera o dia brasileiro', () =>
    expect(brazilDayStart(new Date('2026-09-23T01:00:00Z')).toISOString()).toBe(
      '2026-09-22T03:00:00.000Z',
    ));
  it('rejeita saldo e role enviados no cadastro', () =>
    expect(
      registerSchema.safeParse({
        name: 'Pessoa Teste',
        cpf: '00000000001',
        email: 'teste@example.com',
        phone: '11900000000',
        birthDate: '1995-01-01',
        password: 'Teste@1234',
        role: 'ADMIN',
        balance: 999,
      }).success,
    ).toBe(false));
  it('rejeita PIX com valor fracionário', () =>
    expect(
      transferSchema.safeParse({
        key: 'a@example.com',
        pixKeyId: randomUUID(),
        amount: 0.1,
      }).success,
    ).toBe(false));
  it('exige referência à chave consultada antes do PIX', () => {
    const input = { key: 'a@example.com', amount: 30000 };
    expect(transferSchema.safeParse(input).success).toBe(false);
    expect(
      transferSchema.safeParse({ ...input, pixKeyId: randomUUID() }).success,
    ).toBe(true);
  });
});
