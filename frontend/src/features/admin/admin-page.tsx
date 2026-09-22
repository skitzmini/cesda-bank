'use client';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useResource } from '@/hooks/use-resource';
import { patch } from '@/services/api';
import {
  PageHeader,
  Button,
  ErrorMessage,
  Pagination,
  Modal,
} from '@/components/ui';
import { money, date, typeLabels } from '@/utils/format';
import type { Page } from '@/types';
type AdminRow = {
  id: string;
  name?: string;
  email?: string;
  cpf?: string;
  status?: string;
  accountNumber?: string;
  balance?: number;
  amount?: number;
  type?: string;
  description?: string;
  event?: string;
  resourceId?: string;
  createdAt: string;
  user?: { name: string; email: string };
};
export function AdminPage() {
  const { user } = useAuth();
  if (user.role !== 'ADMIN')
    return (
      <>
        <PageHeader
          title="Acesso restrito."
          description="Esta área está disponível apenas para administradores."
        />
        <ErrorMessage message="Você não possui permissão para acessar a administração." />
      </>
    );
  return <AdminContent />;
}
function AdminContent() {
  const stats = useResource<{
    users: number;
    activeAccounts: number;
    transactions: number;
    volume: number;
  }>('/admin/summary');
  const [tab, setTab] = useState('users');
  const [page, setPage] = useState(1);
  const rows = useResource<Page<AdminRow>>(
    '/admin/' + tab + '?page=' + page + '&limit=15',
  );
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function toggle() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await patch('/admin/accounts/' + selected.id + '/status', {
        status: selected.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE',
      });
      rows.reload();
      stats.reload();
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRAÇÃO CESDA"
        title="Uma visão de todo o banco."
        description="Gerencie contas e acompanhe a atividade da plataforma."
      >
        <ShieldCheck size={25} />
      </PageHeader>
      <ErrorMessage
        message={stats.error || rows.error || (!selected ? error : '')}
      />
      <div className="stats-grid admin-stats">
        {[
          ['Usuários cadastrados', stats.data?.users ?? 0],
          ['Contas ativas', stats.data?.activeAccounts ?? 0],
          ['Operações realizadas', stats.data?.transactions ?? 0],
          ['Volume simulado', money(stats.data?.volume ?? 0)],
        ].map(([label, value]) => (
          <div className="panel stat-card" key={label}>
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="tabs">
          {[
            ['users', 'Usuários'],
            ['accounts', 'Contas'],
            ['transactions', 'Transações'],
            ['audit', 'Auditoria'],
          ].map(([key, label]) => (
            <button
              className={'tab ' + (tab === key ? 'active' : '')}
              key={key}
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {tab === 'audit'
                    ? 'EVENTO'
                    : tab === 'transactions'
                      ? 'TRANSAÇÃO'
                      : tab === 'accounts'
                        ? 'CONTA'
                        : 'USUÁRIO'}
                </th>
                <th>DETALHE</th>
                <th>
                  {tab === 'transactions' || tab === 'accounts'
                    ? 'VALOR'
                    : 'IDENTIFICAÇÃO'}
                </th>
                <th>DATA</th>
                <th>STATUS / AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {rows.data?.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name ??
                      r.accountNumber ??
                      r.event ??
                      typeLabels[r.type ?? '']}
                  </td>
                  <td>
                    {r.email ??
                      r.user?.name ??
                      r.description ??
                      r.resourceId ??
                      '—'}
                  </td>
                  <td>
                    {r.balance !== undefined
                      ? money(r.balance)
                      : r.amount !== undefined
                        ? money(r.amount)
                        : (r.cpf ?? r.id.slice(0, 8))}
                  </td>
                  <td>{date(r.createdAt)}</td>
                  <td>
                    {tab === 'accounts' ? (
                      <Button
                        variant={r.status === 'ACTIVE' ? 'danger' : 'secondary'}
                        onClick={() => {
                          setSelected(r);
                          setError('');
                        }}
                      >
                        {r.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}
                      </Button>
                    ) : (
                      <span className="badge">{r.status ?? 'Registrado'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.data ? (
          <Pagination page={page} pages={rows.data.pages} onChange={setPage} />
        ) : null}
      </section>
      {selected ? (
        <Modal
          title={
            selected.status === 'ACTIVE'
              ? 'Bloquear esta conta?'
              : 'Desbloquear esta conta?'
          }
          onClose={() => setSelected(null)}
        >
          <p className="section-description">
            Conta {selected.accountNumber}, de {selected.user?.name}. Esta ação
            será registrada na auditoria.
            {selected.status === 'ACTIVE'
              ? ' Operações financeiras serão impedidas enquanto a conta estiver bloqueada.'
              : ''}
          </p>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={toggle}>
              Confirmar alteração
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
