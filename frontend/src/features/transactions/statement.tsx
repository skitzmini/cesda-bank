'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import {
  PageHeader,
  ErrorMessage,
  Skeleton,
  Empty,
  Pagination,
} from '@/components/ui';
import { useResource } from '@/hooks/use-resource';
import { money, date, isIncome, categories, typeLabels } from '@/utils/format';
import type { Page, Transaction } from '@/types';
export function Statement() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    filter,
    page: String(page),
    limit: '15',
    ...(query ? { search: query } : {}),
    ...(category ? { category } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const { data, error, loading } = useResource<Page<Transaction>>(
    '/transactions?' + params,
  );
  const change = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <>
      <PageHeader
        title="Seu extrato, sem complicação."
        description="Cada movimentação. Cada detalhe. Tudo organizado."
      />
      <section className="panel">
        <div className="tabs" aria-label="Tipo de transação">
          {[
            ['all', 'Todas'],
            ['in', 'Entradas'],
            ['out', 'Saídas'],
            ['pix', 'PIX'],
            ['purchases', 'Compras'],
            ['deposits', 'Depósitos'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={'tab ' + (filter === value ? 'active' : '')}
              onClick={() => change(setFilter)(value)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            change(setQuery)(search);
          }}
        >
          <label>
            Buscar movimentação
            <input
              className="filter-input"
              placeholder="Descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
          </label>
          <label>
            Categoria
            <select
              className="filter-input"
              value={category}
              onChange={(e) => change(setCategory)(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            De
            <input
              type="date"
              className="filter-input"
              value={from}
              onChange={(e) => change(setFrom)(e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              className="filter-input"
              value={to}
              min={from}
              onChange={(e) => change(setTo)(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn btn-secondary self-end"
            aria-label="Aplicar busca"
          >
            <Search size={17} />
          </button>
        </form>
        <ErrorMessage message={error} />
        {loading ? (
          <Skeleton />
        ) : data?.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>MOVIMENTAÇÃO</th>
                    <th>DATA</th>
                    <th>CATEGORIA</th>
                    <th className="text-right">VALOR</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id}>
                      <td className="description">
                        <Link href={'/extrato/' + t.id}>
                          <span
                            className={
                              'transaction-icon ' +
                              (isIncome(t.type) ? 'in' : '')
                            }
                          >
                            {isIncome(t.type) ? (
                              <ArrowDownLeft size={17} />
                            ) : (
                              <ArrowUpRight size={17} />
                            )}
                          </span>
                          <span>
                            {t.counterpartyAccount?.user.name ?? t.description}
                            <small>{typeLabels[t.type]}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{date(t.createdAt)}</td>
                      <td>
                        <span className="badge">{categories[t.category]}</span>
                      </td>
                      <td
                        className={
                          'text-right font-semibold ' +
                          (isIncome(t.type) ? 'positive' : '')
                        }
                      >
                        {isIncome(t.type) ? '+ ' : '− '}
                        {money(t.amount)}
                      </td>
                      <td>
                        <Link
                          className="text-link"
                          href={'/extrato/' + t.id}
                          aria-label={'Ver detalhes de ' + t.description}
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={data.pages} onChange={setPage} />
          </>
        ) : (
          <Empty
            title="Nenhuma movimentação encontrada"
            text="Experimente outros filtros ou faça sua primeira operação fictícia."
          />
        )}
      </section>
    </>
  );
}
