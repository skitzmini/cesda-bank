'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Logo, Button, ErrorMessage, DemoNotice } from '@/components/ui';
import { VirtualCard } from '@/components/virtual-card';
import { post } from '@/services/api';
const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});
const registerSchema = z
  .object({
    name: z.string().min(3, 'Informe seu nome completo.').max(100),
    cpf: z.string().regex(/^\d{11}$/, 'Informe 11 números fictícios.'),
    email: z.email('Informe um e-mail válido.'),
    phone: z.string().regex(/^\d{10,13}$/, 'Informe o telefone com DDD.'),
    birthDate: z.string().min(1, 'Informe sua data de nascimento.'),
    password: z
      .string()
      .min(8, 'Use pelo menos 8 caracteres.')
      .max(128)
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/,
        'Inclua maiúscula, minúscula, número e símbolo.',
      ),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas precisam ser iguais.',
  });
type Fields = {
  email: string;
  password: string;
  name?: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  confirm?: string;
};
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const signup = mode === 'register';
  const router = useRouter();
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(signup ? registerSchema : loginSchema),
  });
  const submit = handleSubmit(async (values) => {
    setError('');
    try {
      if (signup) {
        const { confirm: _confirm, ...data } = values;
        await post('/auth/register', data);
      } else
        await post('/auth/login', {
          email: values.email,
          password: values.password,
        });
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    }
  });
  const field = (
    key: keyof Fields,
    label: string,
    type = 'text',
    placeholder = '',
    autoComplete?: string,
  ) => (
    <div className="field">
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...register(key)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? key + '-error' : undefined}
      />
      {errors[key] ? (
        <small className="field-error" id={key + '-error'}>
          {errors[key]?.message}
        </small>
      ) : null}
    </div>
  );
  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <Logo light />
        <div className="auth-brand-copy">
          <p className="eyebrow">BEM-VINDO A UMA NOVA EXPERIÊNCIA</p>
          <h1>
            Seu dinheiro.
            <br />
            Seu controle.
            <br />
            Seu Cesda.
          </h1>
          <p>
            Mais clareza para suas escolhas. Mais simplicidade para o seu dia.
          </p>
          <VirtualCard />
        </div>
        <div className="auth-brand-footer">
          <ShieldCheck size={14} />
          Uma experiência fictícia. Possibilidades reais de aprender.
        </div>
      </aside>
      <main className="auth-main">
        <div className={'auth-form ' + (signup ? 'register' : '')}>
          <div className="auth-mobile-logo">
            <Logo />
          </div>
          <p className="eyebrow">
            {signup ? 'SEU PRÓXIMO PASSO COMEÇA AQUI' : 'BOM TER VOCÊ DE VOLTA'}
          </p>
          <h1>{signup ? 'Abra sua conta Cesda.' : 'Entre na sua conta.'}</h1>
          <p className="auth-subtitle">
            {signup
              ? 'É simples, gratuito e feito para explorar.'
              : 'Acesse seu banco e sinta-se em casa.'}
          </p>
          <form className="form-grid" onSubmit={submit} noValidate>
            {signup ? (
              <>
                {field(
                  'name',
                  'Nome completo',
                  'text',
                  'Como podemos chamar você?',
                  'name',
                )}
                <div className="form-row">
                  {field('cpf', 'CPF fictício', 'text', '11 números', 'off')}
                  {field(
                    'phone',
                    'Telefone fictício',
                    'tel',
                    'DDD + número',
                    'tel',
                  )}
                </div>
                {field('birthDate', 'Data de nascimento', 'date', '', 'bday')}
              </>
            ) : null}
            {field('email', 'E-mail', 'email', 'voce@exemplo.com', 'email')}
            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="password-wrap">
                <input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  placeholder={signup ? 'Crie uma senha segura' : 'Sua senha'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password ? (
                <small className="field-error">{errors.password.message}</small>
              ) : signup ? (
                <small>
                  8 caracteres ou mais, com maiúscula, minúscula, número e
                  símbolo.
                </small>
              ) : null}
            </div>
            {signup ? (
              field(
                'confirm',
                'Confirmar senha',
                'password',
                'Repita sua senha',
                'new-password',
              )
            ) : (
              <div className="forgot-row">
                <Link href="/esqueci-senha">Esqueci minha senha</Link>
              </div>
            )}
            <ErrorMessage message={error} />
            <Button loading={isSubmitting} type="submit" className="full-width">
              {signup ? 'Criar minha conta' : 'Entrar'}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="auth-bottom">
            {signup ? 'Já faz parte do Cesda?' : 'Ainda não tem uma conta?'}{' '}
            <Link href={signup ? '/login' : '/cadastro'}>
              {signup ? 'Entrar' : 'Crie sua conta'}
            </Link>
          </p>
          <div className="auth-security">
            <LockKeyhole size={12} />
            Seus dados protegidos, sempre.
          </div>
          <DemoNotice />
        </div>
      </main>
    </div>
  );
}
