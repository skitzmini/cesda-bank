import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Cesda Bank — Seu dinheiro. Seu controle.',
    template: '%s | Cesda Bank',
  },
  description:
    'Uma experiência financeira simples, segura e moderna. Banco digital fictício para demonstração.',
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <footer className="author-credit">feito por Enrico Dantas</footer>
      </body>
    </html>
  );
}
