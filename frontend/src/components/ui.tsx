'use client';
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { LoaderCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={'logo ' + (light ? 'light' : '')}
      aria-label="Cesda Bank, início"
    >
      <span className="logo-mark" aria-hidden="true">
        <svg width="27" height="27" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="currentColor" />
          <path
            d="M27 23C23 19 13 20 13 32S23 45 27 41M36 21H40C55 21 55 43 40 43H36V21Z"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        cesda<span className="logo-bank">bank</span>
      </span>
    </Link>
  );
}
export function Button({
  children,
  loading,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={'btn btn-' + variant + ' ' + className}
    >
      {loading ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <div role="alert" className="error-message">
      {message}
    </div>
  ) : null;
}
export function Empty({
  title = 'Tudo tranquilo por aqui',
  text = 'Suas movimentações aparecerão aqui.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <ArrowRight size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Skeleton() {
  return (
    <div aria-label="Carregando" className="skeleton-grid">
      <div className="skeleton tall" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function PageHeader({
  eyebrow = 'SUA CONTA, DO SEU JEITO',
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function DemoNotice() {
  return (
    <div className="demo-notice">
      <ShieldCheck size={15} />
      <span>
        Ambiente de demonstração. Nenhuma operação movimenta dinheiro real.
      </span>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
      aria-busy={busy}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Fechar"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page} de {Math.max(1, pages)}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}
