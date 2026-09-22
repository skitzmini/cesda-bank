import { Wifi } from 'lucide-react';
import type { Card } from '@/types';
export function VirtualCard({
  card,
  revealed = false,
  large = false,
}: {
  card?: Card;
  revealed?: boolean;
  large?: boolean;
}) {
  return (
    <div className={'mini-card ' + (large ? 'card-large' : '')}>
      <div className="card-top">
        <strong className="card-brand">
          cesda<span>bank</span>
        </strong>
        <span className="card-demo">VIRTUAL · DEMO</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="chip" />
        <Wifi size={17} className="mt-5 rotate-90 opacity-50" />
      </div>
      <div className="card-number">
        {revealed && card
          ? card.demoNumber
          : '•••• •••• •••• ' + (card?.lastFour ?? '4821')}
      </div>
      <div className="card-foot">
        <span className="card-holder">{card?.holder ?? 'SEU NOME AQUI'}</span>
        <span className="card-expiry">
          {card
            ? new Intl.DateTimeFormat('pt-BR', {
                month: '2-digit',
                year: '2-digit',
              }).format(new Date(card.expiresAt))
            : '09/31'}
        </span>
      </div>
    </div>
  );
}
