import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, ShoppingBag } from 'lucide-react';
import type { Transaction } from '@/types';
import { money, date, isIncome, typeLabels, categories } from '@/utils/format';
import { Empty } from './ui';
export function TransactionList({ items }: { items: Transaction[] }) {
  if (!items.length) return <Empty />;
  return (
    <div className="transaction-list">
      {items.map((t) => (
        <Link key={t.id} href={'/extrato/' + t.id} className="transaction-row">
          <span
            className={'transaction-icon ' + (isIncome(t.type) ? 'in' : '')}
          >
            {isIncome(t.type) ? (
              <ArrowDownLeft size={17} />
            ) : t.type === 'PURCHASE' ? (
              <ShoppingBag size={16} />
            ) : (
              <ArrowUpRight size={17} />
            )}
          </span>
          <div className="transaction-copy">
            <strong>{t.counterpartyAccount?.user.name ?? t.description}</strong>
            <small>
              {typeLabels[t.type]} · {categories[t.category]}
            </small>
          </div>
          <div
            className={'transaction-amount ' + (isIncome(t.type) ? 'in' : '')}
          >
            {isIncome(t.type) ? '+ ' : '− '}
            {money(t.amount)}
            <small>{date(t.createdAt)}</small>
          </div>
        </Link>
      ))}
    </div>
  );
}
