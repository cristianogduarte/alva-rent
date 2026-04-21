import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Histórico' };
export const dynamic = 'force-dynamic';

export default async function HistoricoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/historico');

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inquilino) redirect('/portal');

  const { data: itens } = await supabase
    .from('historico')
    .select('id, tipo, descricao, ocorrido_em, contrato:contratos!inner(inquilino_id, codigo)')
    .eq('contrato.inquilino_id', inquilino.id)
    .order('ocorrido_em', { ascending: false })
    .limit(100);

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-6 pb-5">
        <Link href="/portal" className="text-xs opacity-70 hover:opacity-100">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold mt-2">Histórico</h1>
      </header>

      <div className="px-5 py-4">
        {itens && itens.length > 0 ? (
          <div className="bg-white rounded-xl border border-navy-100 divide-y divide-navy-50">
            {itens.map((h) => (
              <div key={h.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-xs uppercase font-semibold text-navy-900 tracking-wider">
                    {h.tipo}
                  </div>
                  <div className="text-[10px] text-ink-500">
                    {formatDate(h.ocorrido_em)}
                  </div>
                </div>
                <div className="text-sm text-ink-600 mt-1">{h.descricao}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-ink-500">
            Nenhum evento registrado.
          </div>
        )}
      </div>
    </div>
  );
}
