'use client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Monthly } from '@/types';
import { money, categories } from '@/utils/format';
import { Empty } from './ui';
export function EvolutionChart({ data }: { data: Monthly[] }) {
  return (
    <>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={data}
            margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#eef2f7"
              vertical={false}
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: '#8c9aaa' }}
              tickFormatter={(v) =>
                new Intl.DateTimeFormat('pt-BR', {
                  month: 'short',
                  timeZone: 'UTC',
                }).format(new Date(v + '-01T12:00:00Z'))
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: '#93a0af' }}
              tickFormatter={(v) =>
                v >= 100000
                  ? (v / 100000).toLocaleString('pt-BR') + ' mil'
                  : money(v)
              }
            />
            <Tooltip
              formatter={(v) => money(Number(v))}
              labelFormatter={(v) => String(v)}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e8edf3',
                fontSize: 11,
              }}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              name="Entradas"
              dataKey="income"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#incomeFill)"
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              name="Saídas"
              dataKey="expenses"
              stroke="#adc8ed"
              strokeWidth={2}
              fill="transparent"
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              name="Saldo"
              dataKey="balance"
              stroke="#0b1f3a"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot" />
          Entradas
        </span>
        <span>
          <i className="legend-dot pale" />
          Saídas
        </span>
        <span>
          <i className="legend-dot dark" />
          Saldo
        </span>
      </div>
      <details className="mt-4 text-[10px] text-slate-500">
        <summary>Ver dados do gráfico</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td>{money(r.income)}</td>
                  <td>{money(r.expenses)}</td>
                  <td>{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
const colors = [
  '#245caa',
  '#7099ce',
  '#afc9e8',
  '#d8e5f5',
  '#153459',
  '#93b2d5',
  '#406d9f',
  '#c7d7eb',
  '#5d7fa8',
  '#e1eaf5',
];
export function CategoryChart({
  data,
}: {
  data: { category: string; amount: number }[];
}) {
  if (!data.length)
    return (
      <Empty
        title="Um novo mês, novas escolhas"
        text="Seus gastos por categoria aparecerão aqui após a primeira saída."
      />
    );
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((sum, r) => sum + r.amount, 0);
  return (
    <>
      <div className="category-chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={sorted}
              dataKey="amount"
              nameKey="category"
              innerRadius={55}
              outerRadius={73}
              paddingAngle={4}
              stroke="none"
            >
              {sorted.map((r, i) => (
                <Cell key={r.category} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [
                money(Number(v)),
                categories[String(name)] ?? name,
              ]}
              contentStyle={{
                borderRadius: 10,
                fontSize: 11,
                border: '1px solid #e8edf3',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="category-center">
          <small>Total do mês</small>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div>
        {sorted.map((r, i) => (
          <div className="category-row" key={r.category}>
            <i
              className="legend-dot"
              style={{ background: colors[i % colors.length] }}
            />
            <span>{categories[r.category]}</span>
            <strong>{money(r.amount)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
