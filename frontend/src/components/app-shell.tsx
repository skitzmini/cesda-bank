'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownUp,
  ReceiptText,
  CreditCard,
  ChartNoAxesCombined,
  Bell,
  UserRound,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  MoveUpRight,
} from 'lucide-react';
import { Logo, DemoNotice, ErrorMessage } from './ui';
import { useAuth } from './auth-provider';
const nav = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/pix', label: 'Área PIX', icon: ArrowDownUp },
  { href: '/transferencias', label: 'Transferências', icon: MoveUpRight },
  { href: '/extrato', label: 'Extrato', icon: ReceiptText },
  { href: '/cartoes', label: 'Meus cartões', icon: CreditCard },
  { href: '/financas', label: 'Minhas finanças', icon: ChartNoAxesCombined },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const links = (items: typeof nav) =>
    items.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={'nav-item ' + (path === href ? 'active' : '')}
        aria-current={path === href ? 'page' : undefined}
      >
        <Icon size={19} />
        <span>{label}</span>
        {path === href ? <span className="nav-dot" /> : null}
      </Link>
    ));
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      {open ? (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={'sidebar ' + (open ? 'is-open' : '')}>
        <div className="sidebar-brand">
          <Logo light />
          <button
            className="mobile-only icon-button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <p className="nav-label">SEU BANCO</p>
        <nav aria-label="Navegação principal">
          {links(nav)}
          <div className="nav-divider" />
          {links([
            { href: '/notificacoes', label: 'Notificações', icon: Bell },
            { href: '/perfil', label: 'Minha conta', icon: UserRound },
          ])}
          {user.role === 'ADMIN'
            ? links([
                { href: '/admin', label: 'Administração', icon: ShieldCheck },
              ])
            : null}
        </nav>
        <div className="sidebar-bottom">
          <div className="portfolio-card">
            <span className="tiny-dot" /> FEITO PARA EXPLORAR
            <h3>
              Seu próximo passo
              <br />
              começa aqui.
            </h3>
            <p>
              Um banco fictício.
              <br />
              Uma experiência completa.
            </p>
            <ArrowUpRight size={20} />
          </div>
          <button
            className="nav-item logout"
            onClick={() => logout().catch((e) => setError(e.message))}
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              aria-label="Abrir menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span className="topbar-title">Seu dinheiro. Seu controle.</span>
          </div>
          <div className="topbar-right">
            <span className="demo-badge">
              <span />
              CONTA DEMO
            </span>
            <Link
              href="/notificacoes"
              className="icon-button"
              aria-label="Notificações"
            >
              <Bell size={20} />
            </Link>
            <span className="topbar-separator" />
            <Link href="/perfil" className="user-chip">
              <span className="avatar">
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')}
              </span>
              <span>
                <strong>{user.name.split(' ')[0]}</strong>
                <small>Conta pessoal</small>
              </span>
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <ErrorMessage message={error} />
          {children}
          <footer className="app-footer">
            <DemoNotice />
            <span>© {new Date().getFullYear()} Cesda Bank</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
