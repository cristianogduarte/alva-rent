import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Meus boletos' };
export const dynamic = 'force-dynamic';

const badge: Record<string, string> = {
  criado: 'bg-navy-50 text-navy-900',
  enviado: 'bg-sky-50 text-sky-700',
  visualizado: 'bg-indigo-50 text-indigo-700',
  pago: 'bg-emerald-50 text-emerald-700',
  vencido: 'bg-rose-50 text-rose-700',
  cancelado: 'bg-ink-100 text-ink-600',
  expirado: 'bg-ink-100 text-ink-600',
};

export default async function BoletosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/boletos');

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inquilino) redirect('/portal');

  const { data: boletos } = await supabase
    .from('boletos')
    .select('id, competencia, data_vencimento, valor_total, status, contrato:contratos!inner(inquilino_id)')
    .eq('contrato.inquilino_id', inquilino.id)
    .order('data_vencimento', { ascending: false });

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-6 pb-5">
        <Link href="/portal" className="text-xs opacity-70 hover:opacity-100">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold mt-2">Meus boletos</h1>
      </header>

      <div className="px-5 py-4 space-y-2">
        {boletos && boletos.length > 0 ? (
          boletos.map((b) => (
            <Link
              key={b.id}
              href={`/portal/boletos/${b.id}`}
              className="bg-white border border-navy-100 rounded-xl p-4 flex items-center justify-between hover:border-navy-300 transition block"
            >
              <div>
                <div className="text-xs text-ink-500">{b.competencia}</div>
                <div className="font-semibold text-navy-900 mt-0.5">{brl(b.valor_total)}</div>
                <div className="text-xs text-ink-500 mt-0.5">
                  Venc. {formatDate(b.data_vencimento)}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-1 rounded-full font-semibold ${badge[b.status] ?? 'bg-ink-100 text-ink-600'}`}>
                {b.status}
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-ink-500">
            Nenhum boleto encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
