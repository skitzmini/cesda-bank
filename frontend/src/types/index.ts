export type User = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  role: 'USER' | 'ADMIN';
  status: string;
  createdAt: string;
};
export type Account = {
  id: string;
  agency: string;
  accountNumber: string;
  balance: number;
  dailyPixLimit: number;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
};
export type PixKey = { id: string; type: string; key: string };
export type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  status: string;
  transactionCode: string;
  createdAt: string;
  counterpartyAccount?: {
    user: { name: string };
    agency?: string;
    accountNumber?: string;
  } | null;
  account?: { user: { name: string }; agency: string; accountNumber: string };
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};
export type Summary = {
  balance: number;
  income: number;
  expenses: number;
  dailyPixLimit: number;
  accountStatus: string;
};
export type Monthly = {
  month: string;
  income: number;
  expenses: number;
  balance: number;
};
export type Card = {
  id: string;
  demoNumber: string;
  lastFour: string;
  holder: string;
  expiresAt: string;
  blocked: boolean;
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};
export type Profile = User & { account: Account; pixKeys: PixKey[] };
