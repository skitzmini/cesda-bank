'use client';
import { useRef, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { Button, Modal, ErrorMessage, DemoNotice } from '@/components/ui';
import { post, ApiError } from '@/services/api';
import { parseMoney, money } from '@/utils/format';
export function DepositModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('500,00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const key = useRef(crypto.randomUUID());
  const [locked, setLocked] = useState(false);
  async function deposit() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const cents = parseMoney(amount);
      setLocked(true);
      await post('/account/demo-deposit', { amount: cents }, key.current);
      setDone(true);
      onSuccess();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setLocked(false);
        key.current = crypto.randomUUID();
      }
      setError(
        e instanceof Error ? e.message : 'Não foi possível adicionar saldo.',
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <Modal title="Adicionar saldo de teste" onClose={onClose} busy={loading}>
      {done ? (
        <div className="receipt-success">
          <span className="receipt-check">
            <CheckCircle2 />
          </span>
          <h2>Saldo fictício adicionado</h2>
          <p className="confirmation-value">{money(parseMoney(amount))}</p>
          <Button className="mt-6 full-width" onClick={onClose}>
            Continuar
          </Button>
        </div>
      ) : (
        <>
          <p className="section-description">
            Explore todas as possibilidades do Cesda com saldo de demonstração.
          </p>
          <div className="preset-grid">
            {['100,00', '500,00', '1.000,00'].map((value) => (
              <Button
                key={value}
                disabled={locked}
                variant={amount === value ? 'primary' : 'secondary'}
                onClick={() => setAmount(value)}
              >
                R$ {value.split(',')[0]}
              </Button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="deposit-amount">Outro valor (R$)</label>
            <input
              id="deposit-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              disabled={locked}
            />
            <small>Até R$ 10.000,00 por operação.</small>
          </div>
          <ErrorMessage message={error} />
          <Button
            loading={loading}
            className="full-width mt-6 mb-4"
            onClick={deposit}
          >
            <Plus size={17} />
            {locked ? 'Tentar novamente' : 'Adicionar saldo fictício'}
          </Button>
          <DemoNotice />
        </>
      )}
    </Modal>
  );
}
