import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Portal do Inquilino' };

export default async function PortalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/portal');

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id, nome')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inquilino) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-ink-500">Não encontramos seu cadastro.</p>
      </div>
    );
  }

  // Próximo boleto
  const { data: proximoBoleto } = await supabase
    .from('boletos')
    .select('valor_total, data_vencimento, status, contrato:contratos!inner(inquilino_id)')
    .eq('contrato.inquilino_id', inquilino.id)
    .in('status', ['criado', 'enviado', 'visualizado'])
    .order('data_vencimento', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-navy-50">
      <header className="bg-navy-900 text-white px-5 pt-8 pb-10 rounded-b-3xl">
        <div className="text-xs opacity-70">Olá,</div>
        <div className="font-semibold text-lg">{inquilino.nome}</div>

        <div className="mt-6">
          <div className="text-[10px] uppercase opacity-60 font-semibold tracking-wider">
            Próximo boleto
          </div>
          {proximoBoleto ? (
            <>
              <div className="text-3xl font-bold mt-1">{brl(proximoBoleto.valor_total)}</div>
              <div className="text-xs opacity-80 mt-0.5">
                Vence em {formatDate(proximoBoleto.data_vencimento)}
              </div>
              <button className="mt-4 w-full bg-gold-500 text-navy-900 py-2.5 rounded-xl font-semibold text-sm">
                Ver boleto + PIX
              </button>
            </>
          ) : (
            <div className="text-sm opacity-80 mt-2">Nenhum boleto pendente.</div>
          )}
        </div>
      </header>

      <div className="px-5 py-4">
        <div className="text-xs uppercase font-semibold text-ink-400 tracking-wider mb-2">
          Atalhos
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Atalho icone="📜" titulo="2ª via" />
          <Atalho icone="🔧" titulo="Manutenção" />
          <Atalho icone="📑" titulo="Contrato" />
          <Atalho icone="📊" titulo="Histórico" />
        </div>
      </div>
    </div>
  );
}

function Atalho({ icone, titulo }: { icone: string; titulo: string }) {
  return (
    <div className="bg-white border border-navy-100 rounded-xl p-3">
      <div className="text-xl mb-1">{icone}</div>
      <div className="text-xs font-semibold text-navy-900">{titulo}</div>
    </div>
  );
}
