'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  KeyRound,
  Plus,
  Trash2,
  Copy,
  ShieldCheck,
  UserRound,
  Check,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api, post, ApiError } from '@/services/api';
import {
  Button,
  PageHeader,
  ErrorMessage,
  Empty,
  Modal,
  DemoNotice,
} from '@/components/ui';
import type { PixKey, Transaction, Summary } from '@/types';
import { money, parseMoney } from '@/utils/format';
export function PixPage({ transferOnly = false }: { transferOnly?: boolean }) {
  const keys = useResource<PixKey[]>('/pix/keys');
  const summary = useResource<Summary>('/dashboard/summary');
  const router = useRouter();
  const [key, setKey] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState<{
    pixKeyId: string;
    name: string;
    institution: string;
  } | null>(null);
  const [step, setStep] = useState<'search' | 'amount' | 'confirm'>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyError, setKeyError] = useState('');
  const [add, setAdd] = useState(false);
  const [keyType, setKeyType] = useState('RANDOM');
  const [remove, setRemove] = useState<PixKey | null>(null);
  const [copied, setCopied] = useState('');
  const [attempted, setAttempted] = useState(false);
  const idem = useRef(crypto.randomUUID());
  async function search() {
    setLoading(true);
    setError('');
    try {
      setRecipient(await api('/pix/search/' + encodeURIComponent(key.trim())));
      setStep('amount');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function confirm() {
    try {
      parseMoney(amount);
      setError('');
      setStep('confirm');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function transfer() {
    if (loading || !recipient) return;
    setLoading(true);
    setError('');
    try {
      setAttempted(true);
      const result = await post<Transaction>(
        '/pix/transfer',
        {
          key: key.trim(),
          pixKeyId: recipient.pixKeyId,
          amount: parseMoney(amount),
          description: description.trim() || 'PIX enviado',
        },
        idem.current,
      );
      router.push('/extrato/' + result.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setAttempted(false);
        idem.current = crypto.randomUUID();
        if (e.code === 'PIX_RECIPIENT_CHANGED') {
          setRecipient(null);
          setStep('search');
        }
      }
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function addKey() {
    setLoading(true);
    setKeyError('');
    try {
      await post('/pix/keys', { type: keyType });
      keys.reload();
      setAdd(false);
    } catch (e) {
      setKeyError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="CONEXÕES QUE SIMPLIFICAM"
        title={transferOnly ? 'Transferir ficou simples.' : 'Sua área PIX.'}
        description="Envie, receba e organize suas chaves. Tudo por aqui."
      />
      <div className="two-columns">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                {step === 'confirm' ? 'Confira seu PIX' : 'Enviar PIX fictício'}
              </h2>
              <p>
                {step === 'search'
                  ? 'Para quem vamos transferir?'
                  : step === 'amount'
                    ? 'Quanto você deseja enviar?'
                    : 'Um último olhar antes de confirmar.'}
              </p>
            </div>
            <span className="feature-icon mb-0">
              <ArrowUpRight size={21} />
            </span>
          </div>
          {step === 'search' ? (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <div className="field">
                <label htmlFor="pix-key">Chave PIX do destinatário</label>
                <input
                  id="pix-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="E-mail, CPF, telefone ou chave aleatória"
                  maxLength={254}
                  required
                />
                <small>Somente contas cadastradas no Cesda Bank.</small>
              </div>
              <Button loading={loading} type="submit">
                Encontrar destinatário
                <ArrowUpRight size={16} />
              </Button>
            </form>
          ) : (
            <>
              <div className="recipient-box">
                <span className="avatar">
                  <UserRound size={19} />
                </span>
                <div>
                  <strong>{recipient?.name}</strong>
                  <small>
                    {recipient?.institution} · Conta de demonstração
                  </small>
                </div>
              </div>
              {step === 'amount' ? (
                <form
                  className="form-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    confirm();
                  }}
                >
                  <div className="field">
                    <label htmlFor="pix-amount">Valor (R$)</label>
                    <input
                      id="pix-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                      required
                    />
                    <small>
                      Saldo disponível: {money(summary.data?.balance ?? 0)} ·
                      Limite diário: {money(summary.data?.dailyPixLimit ?? 0)}
                    </small>
                  </div>
                  <div className="field">
                    <label htmlFor="pix-description">
                      Descrição (opcional)
                    </label>
                    <input
                      id="pix-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={140}
                      placeholder="Sobre o que é esse PIX?"
                    />
                  </div>
                  <div className="form-actions">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setStep('search')}
                    >
                      Voltar
                    </Button>
                    <Button type="submit">
                      Revisar PIX
                      <ArrowUpRight size={15} />
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="muted text-xs mt-6">Você está enviando</p>
                  <div className="confirmation-value">
                    {money(parseMoney(amount))}
                  </div>
                  <p className="section-description">
                    para <strong>{recipient?.name}</strong>. O valor será
                    debitado do seu saldo fictício.
                  </p>
                  <div className="form-actions">
                    <Button
                      variant="secondary"
                      disabled={loading || attempted}
                      onClick={() => setStep('amount')}
                    >
                      Cancelar
                    </Button>
                    <Button loading={loading} onClick={transfer}>
                      {attempted ? 'Tentar novamente' : 'Confirmar PIX'}
                      <Check size={16} />
                    </Button>
                  </div>
                  {attempted ? (
                    <p className="muted text-[10px] mt-3">
                      Em caso de falha de conexão, tente novamente aqui. A
                      confirmação permanece a mesma para evitar duplicidade.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
          <ErrorMessage message={error} />
          <div className="mt-7">
            <DemoNotice />
          </div>
        </section>
        <div>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Minhas chaves PIX</h2>
                <p>Seu jeito mais fácil de receber.</p>
              </div>
              <Button
                variant="ghost"
                aria-label="Adicionar chave"
                onClick={() => {
                  setKeyError('');
                  setAdd(true);
                }}
              >
                <Plus size={18} />
              </Button>
            </div>
            <ErrorMessage message={keys.error || keyError} />
            {keys.data?.length ? (
              keys.data.map((k) => (
                <div className="key-row" key={k.id}>
                  <KeyRound size={17} />
                  <div>
                    <strong>{k.key}</strong>
                    <small>
                      {k.type === 'RANDOM'
                        ? 'Chave aleatória'
                        : k.type === 'PHONE'
                          ? 'Telefone'
                          : k.type === 'EMAIL'
                            ? 'E-mail'
                            : 'CPF fictício'}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={'Copiar chave ' + k.type}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(k.key)
                        .then(() => setCopied(k.id))
                        .catch(() =>
                          setKeyError(
                            'Não foi possível copiar. Selecione o texto da chave.',
                          ),
                        )
                    }
                  >
                    {copied === k.id ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={'Excluir chave ' + k.type}
                    onClick={() => setRemove(k)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="Sua primeira chave espera por você"
                text="Cadastre uma chave para receber PIX de outras contas Cesda."
              />
            )}
          </section>
          <div className="info-card mt-5">
            <ShieldCheck size={21} />
            <div>
              <h3>Você no controle, sempre.</h3>Confira o nome do destinatário
              antes de confirmar. Todas as transferências desta plataforma são
              fictícias.
            </div>
          </div>
        </div>
      </div>
      {add ? (
        <Modal title="Nova chave PIX" onClose={() => setAdd(false)}>
          <p className="section-description">
            As chaves de CPF, e-mail e telefone usam os dados fictícios do seu
            cadastro. Você também pode gerar uma chave aleatória.
          </p>
          <div className="field">
            <label htmlFor="key-type">Tipo de chave</label>
            <select
              id="key-type"
              value={keyType}
              onChange={(e) => setKeyType(e.target.value)}
            >
              <option value="RANDOM">Chave aleatória</option>
              <option value="EMAIL">E-mail</option>
              <option value="CPF">CPF fictício</option>
              <option value="PHONE">Telefone</option>
            </select>
          </div>
          <ErrorMessage message={keyError} />
          <Button
            className="full-width mt-6"
            loading={loading}
            onClick={addKey}
          >
            Cadastrar chave
          </Button>
        </Modal>
      ) : null}
      {remove ? (
        <Modal title="Excluir chave PIX?" onClose={() => setRemove(null)}>
          <p className="section-description">
            Você deixará de receber PIX por esta chave. Seu saldo e histórico
            serão preservados.
          </p>
          <ErrorMessage message={keyError} />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setRemove(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await api('/pix/keys/' + remove.id, { method: 'DELETE' });
                  keys.reload();
                  setRemove(null);
                } catch (e) {
                  setKeyError((e as Error).message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Excluir chave
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
