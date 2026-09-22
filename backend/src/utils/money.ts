import { AppError } from './errors.js';
export const MAX_BALANCE = 100_000_000;
export function checkAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000)
    throw new AppError(
      422,
      'INVALID_AMOUNT',
      'Informe um valor entre R$ 0,01 e R$ 10.000,00.',
    );
  return amount;
}
export function brazilDayStart(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(date + 'T00:00:00-03:00');
}
