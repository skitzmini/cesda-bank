'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Printer, Share2, ArrowLeft } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { patch } from '@/services/api';
import {
  PageHeader,
  Button,
  ErrorMessage,
  Skeleton,
  DemoNotice,
} from '@/components/ui';
import {
  money,
  date,
  time,
  categories,
  typeLabels,
  isIncome,
} from '@/utils/format';
import type { Transaction } from '@/types';
export function Receipt({ id }: { id: string }) {
  const {
    data: t,
    error,
    loading,
    reload,
  } = useResource<Transaction>('/transactions/' + id);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  if (loading) return <Skeleton />;
  if (!t) return <ErrorMessage message={error} />;
  async function share() {
    if (!t) return;
    const text =
      typeLabels[t.type] +
      ' — ' +
      money(t.amount) +
      '\nCesda Bank (simulação)\n' +
      date(t.createdAt) +
      ' ' +
      time(t.createdAt) +
      '\n' +
      t.transactionCode;
    try {
      if (navigator.share)
        await navigator.share({ title: 'Comprovante Cesda Bank', text });
      else {
        await navigator.clipboard.writeText(text);
        setMessage('Comprovante copiado.');
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError')
        setMessage('Use Imprimir / PDF para salvar o comprovante.');
    }
  }
  const owner = t.account?.user.name ?? 'Sua conta';
  const other = t.counterpartyAccount?.user.name;
  return (
    <>
      <PageHeader
        title="Cada detalhe, com clareza."
        description="Comprovante de uma operação de demonstração."
      >
        <Link href="/extrato" className="text-link">
          <ArrowLeft size={14} />
          Voltar ao extrato
        </Link>
      </PageHeader>
      <section className="panel receipt">
        <div className="receipt-success">
          <span className="receipt-check">
            <Check size={25} />
          </span>
          <h1>
            {typeLabels[t.type]} {t.status === 'COMPLETED' ? 'com sucesso' : ''}
          </h1>
          <div className="confirmation-value">{money(t.amount)}</div>
          <p className="muted text-xs mt-2">Operação fictícia · Cesda Bank</p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Origem</dt>
            <dd>
              {isIncome(t.type) ? (other ?? 'Saldo de demonstração') : owner}
            </dd>
          </div>
          <div>
            <dt>Destino</dt>
            <dd>{isIncome(t.type) ? owner : (other ?? t.description)}</dd>
          </div>
          <div>
            <dt>Instituição</dt>
            <dd>Cesda Bank</dd>
          </div>
          <div>
            <dt>Data e horário</dt>
            <dd>
              {date(t.createdAt)} · {time(t.createdAt)}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="badge green">
                {t.status === 'COMPLETED' ? 'Concluída' : t.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Descrição</dt>
            <dd>{t.description}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{categories[t.category]}</dd>
          </div>
          <div>
            <dt>Identificador</dt>
            <dd className="receipt-code">{t.transactionCode}</dd>
          </div>
        </dl>
        <div className="field mt-6 no-print">
          <label htmlFor="transaction-category">
            Organizar em outra categoria
          </label>
          <select
            id="transaction-category"
            disabled={saving}
            value={t.category}
            onChange={async (e) => {
              setSaving(true);
              setMessage('');
              try {
                await patch('/transactions/' + id + '/category', {
                  category: e.target.value,
                });
                reload();
              } catch (err) {
                setMessage((err as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {message ? (
          <p role="status" className="info-card mt-4 no-print">
            {message}
          </p>
        ) : null}
        <div className="form-actions no-print">
          <Button variant="secondary" onClick={share}>
            <Share2 size={16} />
            Compartilhar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir / PDF
          </Button>
        </div>
        <div className="mt-7">
          <DemoNotice />
        </div>
      </section>
    </>
  );
}
