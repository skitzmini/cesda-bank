import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownUp,
  ShieldCheck,
  ChartNoAxesCombined,
  CreditCard,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Logo, DemoNotice } from '@/components/ui';
import { VirtualCard } from '@/components/virtual-card';
export default function Home() {
  return (
    <div className="public-page">
      <header className="public-nav">
        <Logo />
        <nav className="public-nav-links">
          <a href="#possibilidades">Conheça o Cesda</a>
          <Link href="/login">Entrar</Link>
          <Link href="/cadastro" className="btn btn-primary">
            Criar conta <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="public-hero">
          <div>
            <p className="eyebrow">MENOS COMPLICAÇÃO. MAIS POSSIBILIDADES.</p>
            <h1>
              Seu dinheiro.
              <br />
              <span>Seu controle.</span>
            </h1>
            <p>
              Uma experiência financeira simples, segura e moderna. Feita para
              acompanhar você.
            </p>
            <div className="hero-actions">
              <Link href="/cadastro" className="btn btn-primary">
                Comece sua experiência <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Já tenho conta
              </Link>
            </div>
            <div className="hero-note">
              <ShieldCheck size={14} />
              100% fictício. 100% para explorar.
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-label">
              UM NOVO JEITO DE CUIDAR DO SEU DIA A DIA
            </span>
            <VirtualCard />
            <div className="hero-float">
              <span>
                <Check size={19} />
              </span>
              <div>
                <strong>Simplicidade em cada escolha</strong>
                <small>Seu banco, no seu ritmo.</small>
              </div>
            </div>
          </div>
        </section>
        <section id="possibilidades" className="public-features">
          <div className="features-inner">
            {[
              {
                icon: ArrowDownUp,
                title: 'PIX sem complicação',
                text: 'Envie e receba PIX fictício entre contas Cesda em poucos passos.',
              },
              {
                icon: ChartNoAxesCombined,
                title: 'Tudo sob controle',
                text: 'Acompanhe entradas, organize seus gastos e entenda suas finanças.',
              },
              {
                icon: CreditCard,
                title: 'Seu cartão virtual',
                text: 'Uma nova forma de explorar. Simule compras com seu cartão digital.',
              },
              {
                icon: ShieldCheck,
                title: 'Segurança em cada etapa',
                text: 'Acesso protegido e confirmação antes de cada transferência.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="feature-icon">
                  <Icon size={21} />
                </span>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <span>
          © {new Date().getFullYear()} Cesda Bank · Projeto de portfólio
        </span>
        <DemoNotice />
      </footer>
    </div>
  );
}
