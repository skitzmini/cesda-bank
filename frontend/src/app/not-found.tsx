import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="connection-error">
      <h1>Página não encontrada</h1>
      <p>Este endereço não está disponível.</p>
      <Link href="/" className="btn btn-primary">
        Voltar ao início
      </Link>
    </main>
  );
}
