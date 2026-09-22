import Link from 'next/link';
import { Logo, DemoNotice } from '@/components/ui';
export default function Forgot() {
  return (
    <main className="connection-error">
      <Logo />
      <div className="panel narrow">
        <h1>Recuperação de acesso</h1>
        <p className="section-description mt-4">
          Esta demonstração não envia e-mails de recuperação. Para uma conta de
          teste criada por você, abra uma nova conta com outro e-mail fictício.
          Para os usuários do seed, a senha é definida pelo responsável pela
          instalação.
        </p>
        <Link className="btn btn-primary" href="/login">
          Voltar para o login
        </Link>
        <DemoNotice />
      </div>
    </main>
  );
}
