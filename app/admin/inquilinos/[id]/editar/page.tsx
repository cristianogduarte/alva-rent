import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { atualizarInquilino } from '../../actions';
import { InquilinoForm } from '../../inquilino-form';
import { EnviarAcessoButton } from '../../enviar-acesso-button';

export const metadata = { title: 'Editar inquilino' };
export const dynamic = 'force-dynamic';

export default async function EditarInquilinoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!inquilino) notFound();

  const action = atualizarInquilino.bind(null, params.id);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Inquilinos
        </div>
        <h1 className="text-2xl font-bold text-navy-900">
          Editar {inquilino.nome}
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6 mb-4">
        <InquilinoForm action={action} initial={inquilino} submitLabel="Salvar alterações" />
      </div>

      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-navy-900">Acesso ao portal</h2>
            <p className="text-sm text-ink-500 mt-0.5">
              {inquilino.user_id
                ? 'Este inquilino já tem acesso ao Portal. Você pode reenviar/regerar a senha.'
                : 'O inquilino ainda não tem login. Crie agora e enviaremos email + WhatsApp com a senha provisória.'}
            </p>
          </div>
          <div>
            {inquilino.user_id ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Acesso ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ● Sem acesso
              </span>
            )}
          </div>
        </div>

        <EnviarAcessoButton
          inquilinoId={inquilino.id}
          jaTemAcesso={!!inquilino.user_id}
          temEmail={!!inquilino.email}
          variant={inquilino.user_id ? 'outline' : 'primary'}
        />

        {!inquilino.email && (
          <p className="mt-2 text-xs text-rose-700">
            ⚠️ Cadastre um email no formulário acima pra habilitar o acesso ao portal.
          </p>
        )}
      </div>
    </div>
  );
}
