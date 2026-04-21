import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Portal do Inquilino' };
export const dynamic = 'force-dynamic';

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
      <div className="min-h-screen bg-navy-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-soft p-6 max-w-md text-center">
          <div className="text-4xl mb-2">😕</div>
          <h1 className="font-semibold text-navy-900 mb-1">Acesso não vinculado</h1>
          <p className="text-sm text-ink-500">
            Sua conta existe mas ainda não está vinculada a um inquilino. Entre em contato com a administração da ALVA Rent.
          </p>
        </div>
      </div>
    );
  }

  // Próximo boleto pendente
  const { data: proximoBoleto } = await supabase
    .from('boletos')
    .select('id, valor_total, data_vencimento, status, contrato:contratos!inner(inquilino_id)')
    .eq('contrato.inquilino_id', inquilino.id)
    .in('status', ['criado', 'enviado', 'visualizado'])
    .order('data_vencimento', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-8 pb-10 rounded-b-3xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs opacity-70">Olá,</div>
            <div className="font-semibold text-lg">{inquilino.nome}</div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs opacity-70 hover:opacity-100 border border-white/20 rounded-lg px-2 py-1"
            >
              Sair
            </button>
          </form>
        </div>

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
              <Link
                href={`/portal/boletos/${proximoBoleto.id}`}
                className="mt-4 block w-full bg-gold-500 text-navy-900 py-2.5 rounded-xl font-semibold text-sm text-center hover:bg-gold-400 transition"
              >
                Ver boleto + PIX
              </Link>
            </>
          ) : (
            <div className="text-sm opacity-80 mt-2">🎉 Nenhum boleto pendente.</div>
          )}
        </div>
      </header>

      <div className="px-5 py-4">
        <div className="text-xs uppercase font-semibold text-ink-400 tracking-wider mb-2">
          Atalhos
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Atalho href="/portal/boletos" icone="📜" titulo="Boletos" sub="Todas as cobranças" />
          <Atalho href="/portal/contrato" icone="📑" titulo="Contrato" sub="Dados e regras" />
          <Atalho href="/portal/manutencao" icone="🔧" titulo="Manutenção" sub="Abrir chamado" />
          <Atalho href="/portal/historico" icone="📊" titulo="Histórico" sub="Eventos" />
        </div>
      </div>
    </div>
  );
}

function Atalho({
  href,
  icone,
  titulo,
  sub,
}: {
  href: string;
  icone: string;
  titulo: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-navy-100 rounded-xl p-3 hover:border-navy-300 hover:shadow-soft transition block"
    >
      <div className="text-xl mb-1">{icone}</div>
      <div className="text-xs font-semibold text-navy-900">{titulo}</div>
      <div className="text-[10px] text-ink-500 mt-0.5">{sub}</div>
    </Link>
  );
}
