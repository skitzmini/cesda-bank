export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
export const time = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const isIncome = (type: string) =>
  ['DEPOSIT', 'PIX_RECEIVED', 'REFUND'].includes(type);
export const categories: Record<string, string> = {
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  COMPRAS: 'Compras',
  LAZER: 'Lazer',
  EDUCACAO: 'Educação',
  SAUDE: 'Saúde',
  ASSINATURAS: 'Assinaturas',
  CASA: 'Casa',
  VIAGEM: 'Viagem',
  OUTROS: 'Outros',
};
export const typeLabels: Record<string, string> = {
  PIX_SENT: 'PIX enviado',
  PIX_RECEIVED: 'PIX recebido',
  DEPOSIT: 'Depósito de teste',
  PURCHASE: 'Compra simulada',
  TRANSFER: 'Transferência',
  REFUND: 'Reembolso',
};
export function parseMoney(value: string) {
  if (!/^(?:\d{1,7}|\d{1,3}(?:\.\d{3}){1,2})(?:,\d{1,2})?$/.test(value.trim()))
    throw Error('Use vírgula para os centavos, como 100,00.');
  const normalized = value.trim().replace(/\./g, '');
  if (!/^\d{1,7}(,\d{1,2})?$/.test(normalized))
    throw Error('Informe um valor válido, como 100,00.');
  const [whole, fraction = ''] = normalized.split(',');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (result <= 0 || result > 1000000)
    throw Error('Informe entre R$ 0,01 e R$ 10.000,00.');
  return result;
}
