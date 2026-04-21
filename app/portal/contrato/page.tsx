import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';

export const metadata = { title: 'Meu contrato' };
export const dynamic = 'force-dynamic';

export default async function ContratoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/contrato');

  const { data: inquilino } = await supabase
    .from('inquilinos')
    .select('id, nome, email, whatsapp')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inquilino) redirect('/portal');

  const { data: contratos } = await supabase
    .from('contratos')
    .select(`
      id, codigo, data_inicio, data_fim, dia_vencimento,
      valor_aluguel, valor_condominio, valor_iptu_mensal, outras_taxas,
      indice_reajuste, multa_atraso_pct, juros_dia_pct,
      imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf)
    `)
    .eq('inquilino_id', inquilino.id)
    .order('data_inicio', { ascending: false });

  return (
    <div className="min-h-screen bg-navy-50 pb-10">
      <header className="bg-navy-900 text-white px-5 pt-6 pb-5">
        <Link href="/portal" className="text-xs opacity-70 hover:opacity-100">
          ← Voltar
        </Link>
        <h1 className="text-xl font-semibold mt-2">Meu contrato</h1>
      </header>

      <div className="px-5 py-4 space-y-4">
        {contratos && contratos.length > 0 ? (
          contratos.map((cRaw) => {
            const c = {
              ...cRaw,
              imovel: Array.isArray(cRaw.imovel) ? cRaw.imovel[0] : cRaw.imovel,
            };
            return (
            <div key={c.id} className="bg-white rounded-xl p-4 border border-navy-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-ink-500">Contrato</div>
                  <div className="font-semibold text-navy-900">{c.codigo}</div>
                </div>
                <div className="text-xs text-ink-500 text-right">
                  Vencimento dia {c.dia_vencimento}
                </div>
              </div>

              {c.imovel && (
                <div className="mt-3 text-sm">
                  <div className="text-xs text-ink-500 uppercase font-semibold tracking-wider mb-1">
                    Imóvel
                  </div>
                  <div className="text-navy-900">
                    {c.imovel.endereco}{c.imovel.numero ? `, ${c.imovel.numero}` : ''}
                  </div>
                  <div className="text-xs text-ink-500">
                    {c.imovel.bairro} · {c.imovel.cidade}/{c.imovel.uf}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <Info label="Início" value={formatDate(c.data_inicio)} />
                <Info label="Fim" value={formatDate(c.data_fim)} />
                <Info label="Aluguel" value={brl(Number(c.valor_aluguel))} />
                {Number(c.valor_condominio) > 0 && (
                  <Info label="Condomínio" value={brl(Number(c.valor_condominio))} />
                )}
                {Number(c.valor_iptu_mensal) > 0 && (
                  <Info label="IPTU" value={brl(Number(c.valor_iptu_mensal))} />
                )}
                <Info label="Reajuste" value={c.indice_reajuste} />
                <Info label="Multa atraso" value={`${c.multa_atraso_pct}%`} />
                <Info label="Juros dia" value={`${c.juros_dia_pct}%`} />
              </div>
            </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-ink-500">
            Nenhum contrato encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-ink-400 font-semibold tracking-wider">{label}</div>
      <div className="text-navy-900 text-sm">{value ?? '—'}</div>
    </div>
  );
}
