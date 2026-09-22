'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1>Não foi possível abrir esta página.</h1>
      <p className="section-description mt-4">Tente novamente em instantes.</p>
      <button className="btn btn-primary" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
