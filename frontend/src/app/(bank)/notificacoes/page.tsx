'use client';
import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import {
  PageHeader,
  Button,
  ErrorMessage,
  Empty,
  Pagination,
} from '@/components/ui';
import { useResource } from '@/hooks/use-resource';
import { patch } from '@/services/api';
import { date, time } from '@/utils/format';
import type { Page, Notification } from '@/types';
export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useResource<
    Page<Notification> & { unread: number }
  >('/notifications?page=' + page + '&limit=12');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  async function read(id?: string) {
    setBusy(true);
    setFailure('');
    try {
      await patch('/notifications/' + (id ? id + '/read' : 'read-all'));
      reload();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Você por dentro de tudo."
        description={
          data?.unread
            ? data.unread + ' notificações ainda não lidas.'
            : 'As novidades da sua conta, em um só lugar.'
        }
      >
        <Button
          variant="secondary"
          loading={busy}
          disabled={!data?.unread}
          onClick={() => read()}
        >
          <CheckCheck size={15} />
          Marcar todas como lidas
        </Button>
      </PageHeader>
      <ErrorMessage message={error || failure} />
      <section className="panel">
        {data?.items.length ? (
          data.items.map((n) => (
            <article
              className={'notification ' + (n.read ? 'read' : '')}
              key={n.id}
            >
              <span className="transaction-icon">
                <Bell size={17} />
              </span>
              <div className="notification-copy">
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <small>
                  {date(n.createdAt)} · {time(n.createdAt)}
                </small>
              </div>
              {!n.read ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => read(n.id)}
                >
                  Marcar como lida
                </Button>
              ) : null}
            </article>
          ))
        ) : (
          <Empty
            title="Tudo em dia"
            text="Suas notificações aparecerão aqui."
          />
        )}
        {data ? (
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        ) : null}
      </section>
    </>
  );
}
