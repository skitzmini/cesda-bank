'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, ShieldCheck, UserRound } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { useAuth } from '@/components/auth-provider';
import { patch } from '@/services/api';
import { PageHeader, Button, ErrorMessage, Skeleton } from '@/components/ui';
import { date, money } from '@/utils/format';
import type { Profile } from '@/types';
const schema = z.object({
  name: z.string().min(3, 'Informe seu nome completo.').max(100),
  phone: z
    .string()
    .regex(/^\d{10,13}$/, 'Informe DDD e telefone.')
    .or(z.literal('')),
});
export function ProfilePage() {
  const { data, error, loading, reload } = useResource<Profile>('/profile');
  const { refreshUser } = useAuth();
  const [failure, setFailure] = useState('');
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { name: data?.name ?? '', phone: '' },
  });
  const save = handleSubmit(async (values) => {
    setFailure('');
    setSuccess(false);
    try {
      await patch('/profile', {
        name: values.name,
        ...(values.phone ? { phone: values.phone } : {}),
      });
      await refreshUser();
      reload();
      setSuccess(true);
    } catch (e) {
      setFailure((e as Error).message);
    }
  });
  if (loading && !data) return <Skeleton />;
  return (
    <>
      <PageHeader
        title="Sua conta, do seu jeito."
        description="Seus dados e as informações que importam."
      />
      <ErrorMessage message={error || failure} />
      {data ? (
        <div className="two-columns">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Dados pessoais</h2>
                <p>Mantenha suas informações atualizadas.</p>
              </div>
              <span className="avatar">
                <UserRound size={20} />
              </span>
            </div>
            <form className="form-grid" onSubmit={save}>
              <div className="field">
                <label htmlFor="profile-name">Nome completo</label>
                <input id="profile-name" {...register('name')} />
                {errors.name ? (
                  <small className="field-error">{errors.name.message}</small>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="profile-email">E-mail</label>
                <input id="profile-email" value={data.email} readOnly />
                <small>O e-mail é usado para identificar sua conta.</small>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="profile-cpf">CPF fictício</label>
                  <input id="profile-cpf" value={data.cpf} readOnly />
                </div>
                <div className="field">
                  <label htmlFor="profile-phone">Novo telefone fictício</label>
                  <input
                    id="profile-phone"
                    placeholder={data.phone}
                    {...register('phone')}
                    inputMode="tel"
                  />
                  {errors.phone ? (
                    <small className="field-error">
                      {errors.phone.message}
                    </small>
                  ) : (
                    <small>Deixe em branco para manter o atual.</small>
                  )}
                </div>
              </div>
              {success ? (
                <p className="success-message" role="status">
                  Seus dados foram atualizados.
                </p>
              ) : null}
              <Button type="submit" loading={isSubmitting}>
                <Save size={16} />
                Salvar alterações
              </Button>
            </form>
          </section>
          <section className="panel h-fit">
            <div className="panel-header">
              <h2>Sua conta Cesda</h2>
              <ShieldCheck size={20} className="text-blue-600" />
            </div>
            <dl className="detail-list">
              <div>
                <dt>Instituição</dt>
                <dd>Cesda Bank</dd>
              </div>
              <div>
                <dt>Agência</dt>
                <dd>{data.account.agency}</dd>
              </div>
              <div>
                <dt>Conta</dt>
                <dd>{data.account.accountNumber}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={
                      'badge ' +
                      (data.account.status === 'ACTIVE' ? 'green' : 'red')
                    }
                  >
                    {data.account.status === 'ACTIVE' ? 'Ativa' : 'Bloqueada'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Limite diário de PIX</dt>
                <dd>{money(data.account.dailyPixLimit)}</dd>
              </div>
              <div>
                <dt>Cliente desde</dt>
                <dd>{date(data.createdAt)}</dd>
              </div>
              <div>
                <dt>Chaves PIX</dt>
                <dd>{data.pixKeys.length} cadastradas</dd>
              </div>
            </dl>
            <div className="info-card mt-6">
              <ShieldCheck size={18} />
              <span>
                Seus dados sensíveis aparecem mascarados. Esta conta é
                exclusivamente demonstrativa.
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
