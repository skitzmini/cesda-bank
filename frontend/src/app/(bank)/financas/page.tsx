'use client';
import { PageHeader, ErrorMessage, Skeleton } from '@/components/ui';
import { EvolutionChart, CategoryChart } from '@/components/charts';
import { useResource } from '@/hooks/use-resource';
import { money } from '@/utils/format';
import type { Summary, Monthly } from '@/types';
export default function Finance() {
  const summary = useResource<Summary>('/dashboard/summary');
  const monthly = useResource<Monthly[]>('/dashboard/monthly');
  const cats = useResource<{ category: string; amount: number }[]>(
    '/dashboard/categories',
  );
  return (
    <>
      <PageHeader
        title="Clareza para suas escolhas."
        description="Entenda suas movimentações e acompanhe sua evolução."
      />
      <ErrorMessage message={summary.error || monthly.error || cats.error} />
      {summary.loading ? (
        <Skeleton />
      ) : (
        <>
          <div className="stats-grid">
            {[
              ['Entradas do mês', summary.data?.income ?? 0],
              ['Saídas do mês', summary.data?.expenses ?? 0],
              ['Saldo disponível', summary.data?.balance ?? 0],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <p className="stat-label">{label}</p>
                <p className="stat-value">{money(Number(value))}</p>
              </div>
            ))}
          </div>
          <div className="two-columns">
            <section className="panel min-w-0">
              <div className="panel-header">
                <div>
                  <h2>Evolução financeira</h2>
                  <p>Entradas, saídas e saldo nos últimos seis meses.</p>
                </div>
              </div>
              <EvolutionChart data={monthly.data ?? []} />
            </section>
            <section className="panel min-w-0">
              <div className="panel-header">
                <div>
                  <h2>Gastos por categoria</h2>
                  <p>Este mês, em perspectiva.</p>
                </div>
              </div>
              <CategoryChart data={cats.data ?? []} />
            </section>
          </div>
        </>
      )}
    </>
  );
}
