'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ReceiptText,
  CalendarDays,
  ShieldCheck,
  Wallet,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useResource } from '@/hooks/use-resource';
import { PageHeader, Skeleton, ErrorMessage, Empty } from '@/components/ui';
import { VirtualCard } from '@/components/virtual-card';
import { EvolutionChart, CategoryChart } from '@/components/charts';
import { TransactionList } from '@/components/transaction-list';
import { DepositModal } from '@/features/account/deposit-modal';
import type {
  Account,
  Card,
  Summary,
  Monthly,
  Page,
  Transaction,
} from '@/types';
import { money } from '@/utils/format';
export function Dashboard() {
  const { user } = useAuth();
  const summary = useResource<Summary>('/dashboard/summary');
  const account = useResource<Account>('/account');
  const monthly = useResource<Monthly[]>('/dashboard/monthly');
  const tx = useResource<Page<Transaction>>('/transactions?limit=4');
  const cats = useResource<{ category: string; amount: number }[]>(
    '/dashboard/categories',
  );
  const cards = useResource<Card[]>('/cards');
  const [visible, setVisible] = useState(true);
  const [deposit, setDeposit] = useState(false);
  const reload = () => {
    summary.reload();
    account.reload();
    monthly.reload();
    tx.reload();
    cats.reload();
  };
  const s = summary.data;
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(now),
  );
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <>
      <PageHeader
        eyebrow="BEM-VINDO AO SEU CESDA"
        title={greeting + ', ' + user.name.split(' ')[0] + '.'}
        description="Tudo o que você precisa, em um só lugar."
      >
        <span className="date-badge">
          <CalendarDays size={14} />
          {new Intl.DateTimeFormat('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(now)}
        </span>
      </PageHeader>
      <ErrorMessage
        message={
          summary.error ||
          account.error ||
          tx.error ||
          monthly.error ||
          cats.error ||
          cards.error
        }
      />
      {summary.loading && !s ? (
        <Skeleton />
      ) : s ? (
        <>
          <div className="balance-grid">
            <section className="balance-card">
              <div className="balance-label">
                Saldo disponível
                <button
                  className="icon-button"
                  aria-label={visible ? 'Ocultar saldo' : 'Mostrar saldo'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              <div className="balance-value">
                {visible ? money(s.balance) : 'R$ ••••••'}
              </div>
              <p className="account-caption">
                Agência {account.data?.agency ?? '—'}{' '}
                <span className="mx-1 opacity-40">|</span> Conta{' '}
                {account.data?.accountNumber ?? '—'}
              </p>
              <div className="balance-bottom">
                <span>
                  <ShieldCheck size={12} />
                  Seu saldo, sempre sob seu controle.
                </span>
                <strong>
                  CONTA {s.accountStatus === 'ACTIVE' ? 'ATIVA' : 'BLOQUEADA'}
                </strong>
              </div>
            </section>
            <section className="panel quick-panel">
              <div className="panel-header">
                <div>
                  <h2>O que vamos fazer hoje?</h2>
                  <p>Seu dia a dia, mais simples.</p>
                </div>
              </div>
              <div className="quick-actions">
                <Link className="quick-action" href="/pix">
                  <span className="quick-action-icon">
                    <ArrowDownUp size={20} />
                  </span>
                  PIX
                </Link>
                <Link className="quick-action" href="/transferencias">
                  <span className="quick-action-icon">
                    <ArrowUpRight size={20} />
                  </span>
                  Transferir
                </Link>
                <button
                  className="quick-action"
                  onClick={() => setDeposit(true)}
                >
                  <span className="quick-action-icon">
                    <Plus size={21} />
                  </span>
                  Depositar
                </button>
                <Link className="quick-action" href="/extrato">
                  <span className="quick-action-icon">
                    <ReceiptText size={19} />
                  </span>
                  Extrato
                </Link>
              </div>
            </section>
          </div>
          <div className="stats-grid">
            {[
              {
                label: 'Entradas do mês',
                value: s.income,
                icon: ArrowDownLeft,
                color: '',
                note: 'Tudo o que entrou na sua conta',
              },
              {
                label: 'Saídas do mês',
                value: s.expenses,
                icon: ArrowUpRight,
                color: 'red',
                note: 'Suas movimentações de saída',
              },
              {
                label: 'Balanço do mês',
                value: s.income - s.expenses,
                icon: Wallet,
                color: 'blue',
                note: 'Entradas menos saídas',
              },
            ].map(({ label, value, icon: Icon, color, note }) => (
              <section className="panel stat-card" key={label}>
                <span className={'stat-icon ' + color}>
                  <Icon size={19} />
                </span>
                <div>
                  <p className="stat-label">{label}</p>
                  <p className="stat-value">
                    {visible ? money(value) : 'R$ ••••••'}
                  </p>
                  <p className="stat-note">{note}</p>
                </div>
              </section>
            ))}
          </div>
          <div className="dashboard-middle">
            <section className="panel min-w-0">
              <div className="panel-header">
                <div>
                  <h2>Sua evolução financeira</h2>
                  <p>Uma visão clara das suas movimentações.</p>
                </div>
                <span className="period-badge flex items-center gap-2">
                  Últimos 6 meses
                  <ChevronDown size={11} />
                </span>
              </div>
              {monthly.data ? (
                <EvolutionChart data={monthly.data} />
              ) : (
                <Empty text="Carregando sua evolução…" />
              )}
            </section>
            <section className="panel dashboard-card-panel">
              <div className="panel-header">
                <div>
                  <h2>Seu cartão Cesda</h2>
                  <p>Praticidade que acompanha você.</p>
                </div>
                <Link className="text-link" href="/cartoes">
                  <ArrowUpRight size={17} />
                  <span className="sr-only">Ver cartões</span>
                </Link>
              </div>
              {cards.data?.length ? (
                <>
                  <VirtualCard card={cards.data[0]} />
                  <div
                    className={
                      'card-state ' + (cards.data[0].blocked ? 'blocked' : '')
                    }
                  >
                    <span />
                    {cards.data[0].blocked
                      ? 'Cartão bloqueado'
                      : 'Cartão virtual ativo'}
                    <Link href="/cartoes">
                      Gerenciar cartão <span aria-hidden>→</span>
                    </Link>
                  </div>
                </>
              ) : (
                <Empty
                  title="Seu próximo cartão está aqui"
                  text="Gere um cartão fictício em Meus cartões para simular compras."
                />
              )}
            </section>
          </div>
          <div className="dashboard-bottom">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Últimas movimentações</h2>
                  <p>Um resumo do que aconteceu por aqui.</p>
                </div>
                <Link className="text-link" href="/extrato">
                  Ver extrato
                  <ArrowRight size={13} />
                </Link>
              </div>
              <TransactionList items={tx.data?.items ?? []} />
            </section>
            <section className="panel min-w-0">
              <div className="panel-header">
                <div>
                  <h2>Para onde seu dinheiro vai</h2>
                  <p>Seus gastos por categoria neste mês.</p>
                </div>
              </div>
              <CategoryChart data={cats.data ?? []} />
            </section>
          </div>
        </>
      ) : null}
      {deposit ? (
        <DepositModal onClose={() => setDeposit(false)} onSuccess={reload} />
      ) : null}
    </>
  );
}
