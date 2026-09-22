'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  ShoppingBag,
  ShieldCheck,
  Plus,
  Check,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { post, patch, ApiError } from '@/services/api';
import {
  PageHeader,
  Button,
  ErrorMessage,
  Empty,
  Modal,
  DemoNotice,
} from '@/components/ui';
import { VirtualCard } from '@/components/virtual-card';
import type { Card, Transaction } from '@/types';
import { categories, parseMoney, money } from '@/utils/format';
export function CardsPage() {
  const cards = useResource<Card[]>('/cards');
  const card = cards.data?.[0];
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [purchase, setPurchase] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('COMPRAS');
  const [attempted, setAttempted] = useState(false);
  const idem = useRef(crypto.randomUUID());
  async function create() {
    setBusy(true);
    setError('');
    try {
      await post('/cards', {});
      cards.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    if (!card) return;
    setBusy(true);
    setError('');
    try {
      await patch(
        '/cards/' + card.id + '/' + (card.blocked ? 'unblock' : 'block'),
      );
      cards.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function buy() {
    if (!card || busy) return;
    setBusy(true);
    setError('');
    try {
      setAttempted(true);
      const tx = await post<Transaction>(
        '/purchases/simulate',
        { cardId: card.id, merchant, amount: parseMoney(amount), category },
        idem.current,
      );
      router.push('/extrato/' + tx.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setAttempted(false);
        idem.current = crypto.randomUUID();
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Seu Cesda, na palma da mão."
        description="Um cartão virtual para explorar novas possibilidades."
      />
      <ErrorMessage message={cards.error || (!purchase ? error : '')} />
      <div className="two-columns">
        <section className="panel">
          {card ? (
            <>
              <div className="panel-header">
                <div>
                  <h2>Cartão virtual</h2>
                  <p>Seu companheiro nas compras de demonstração.</p>
                </div>
                <span className={'badge ' + (card.blocked ? 'red' : 'green')}>
                  {card.blocked ? 'Bloqueado' : 'Ativo'}
                </span>
              </div>
              <VirtualCard card={card} revealed={visible} large />
              <div className="card-controls">
                <Button
                  variant="secondary"
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}{' '}
                  {visible ? 'Ocultar dados' : 'Mostrar dados'}
                </Button>
                <Button
                  variant={card.blocked ? 'secondary' : 'danger'}
                  loading={busy}
                  onClick={toggle}
                >
                  {card.blocked ? (
                    <UnlockKeyhole size={16} />
                  ) : (
                    <LockKeyhole size={16} />
                  )}{' '}
                  {card.blocked ? 'Desbloquear' : 'Bloquear cartão'}
                </Button>
              </div>
              {visible ? (
                <div className="info-card mt-5">
                  Código de demonstração (CVV): 000. O número contém “DEMO” e
                  não funciona em redes de pagamento.
                </div>
              ) : null}
              <Button
                className="full-width mt-5"
                disabled={card.blocked}
                onClick={() => {
                  setPurchase(true);
                  setError('');
                  setConfirm(false);
                  setAttempted(false);
                  idem.current = crypto.randomUUID();
                }}
              >
                <ShoppingBag size={17} />
                Simular compra
              </Button>
            </>
          ) : (
            <>
              <Empty
                title="Seu primeiro cartão Cesda"
                text="Gere um cartão virtual fictício e comece a explorar."
              />
              <Button
                className="full-width"
                loading={busy || cards.loading}
                onClick={create}
              >
                <Plus size={17} />
                Gerar cartão fictício
              </Button>
            </>
          )}
        </section>
        <div>
          <div className="panel">
            <h2>Mais liberdade. Mais controle.</h2>
            <ul className="notice-list list-none p-0">
              <li>
                <ShieldCheck size={19} />
                <span>Bloqueie ou desbloqueie seu cartão quando precisar.</span>
              </li>
              <li>
                <ShoppingBag size={19} />
                <span>Simule compras e veja cada movimentação no extrato.</span>
              </li>
              <li>
                <Check size={19} />
                <span>
                  Organize suas compras por categoria e acompanhe os gastos.
                </span>
              </li>
            </ul>
            <div className="mt-7">
              <DemoNotice />
            </div>
          </div>
        </div>
      </div>
      {purchase ? (
        <Modal
          busy={busy}
          title={confirm ? 'Confirmar compra fictícia' : 'Simular uma compra'}
          onClose={() => {
            if (!busy) setPurchase(false);
          }}
        >
          {confirm ? (
            <>
              <p className="muted text-xs">Você está comprando em</p>
              <h2 className="mt-2">{merchant}</h2>
              <div className="confirmation-value">
                {money(parseMoney(amount))}
              </div>
              <p className="muted text-xs">
                {categories[category]} · Cartão final {card?.lastFour}
              </p>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  disabled={busy || attempted}
                  onClick={() => setConfirm(false)}
                >
                  Voltar
                </Button>
                <Button loading={busy} onClick={buy}>
                  {attempted ? 'Tentar novamente' : 'Confirmar compra'}
                </Button>
              </div>
            </>
          ) : (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  parseMoney(amount);
                  setError('');
                  setConfirm(true);
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              <div className="field">
                <label htmlFor="merchant">Estabelecimento fictício</label>
                <input
                  id="merchant"
                  placeholder="Ex.: Café da Praça"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="purchase-amount">Valor (R$)</label>
                <input
                  id="purchase-amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="purchase-category">Categoria</label>
                <select
                  id="purchase-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {Object.entries(categories).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Revisar compra</Button>
            </form>
          )}
          <ErrorMessage message={error} />
          <div className="mt-6">
            <DemoNotice />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
