import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/utils';
import { RecalcularButton, OverrideCell, EventosPanel } from './client';

export const metadata = { title: 'Precificação dinâmica · ALVA Rent' };
export const dynamic = 'force-dynamic';

type SP = { imovel?: string };

export default async function PrecificacaoPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();

  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco, cidade, uf, diaria_base, diaria_minima, diaria_maxima')
    .eq('modalidade', 'short_stay')
    .order('codigo');

  const imovelAtivo = searchParams.imovel ?? imoveis?.[0]?.id;
  const imovel = imoveis?.find((i) => i.id === imovelAtivo);

  const { data: tarifas } = imovelAtivo
    ? await supabase
        .from('tarifas_dinamicas')
        .select('*')
        .eq('imovel_id', imovelAtivo)
        .gte('data', new Date().toISOString().slice(0, 10))
        .order('data', { ascending: true })
        .limit(120)
    : { data: [] as any[] };

  const { data: eventos } = await supabase
    .from('eventos_cidade')
    .select('*')
    .order('data_inicio');

  return (
    <div className="px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Operações</div>
          <h1 className="text-2xl font-bold text-navy-900">Precificação dinâmica</h1>
          <p className="text-sm text-ink-500 mt-1">
            Sugestão de diária baseada em dia da semana, estação, eventos locais e ocupação projetada. Override manual sempre possível.
          </p>
        </div>
      </div>

      {/* Seletor imóveis */}
      <div className="bg-white rounded-xl shadow-soft p-4 mb-6 overflow-x-auto">
        <div className="flex gap-2">
          {(imoveis ?? []).length === 0 && (
            <div className="text-sm text-ink-400 italic">
              Nenhum imóvel short_stay cadastrado.{' '}
              <Link href="/admin/imoveis" className="text-navy-900 hover:underline">Cadastre um →</Link>
            </div>
          )}
          {(imoveis ?? []).map((i) => (
            <Link
              key={i.id}
              href={`/admin/precificacao?imovel=${i.id}`}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                i.id === imovelAtivo ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-900 hover:bg-navy-100'
              }`}
            >
              <span className="font-mono text-xs">{i.codigo}</span>
              {i.diaria_base ? (
                <span className="ml-2 text-[11px] opacity-70">base {brl(Number(i.diaria_base))}</span>
              ) : (
                <span className="ml-2 text-[11px] text-amber-400">sem base</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {imovel && (
        <>
          {/* Header imóvel + ações */}
          <div className="bg-white rounded-xl shadow-soft p-5 mb-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-ink-500">{imovel.codigo}</div>
              <div className="text-sm font-semibold">{imovel.endereco}</div>
              <div className="text-xs text-ink-500">
                {imovel.cidade}/{imovel.uf} · Base {brl(Number(imovel.diaria_base ?? 0))}
                {imovel.diaria_minima && ` · Min ${brl(Number(imovel.diaria_minima))}`}
                {imovel.diaria_maxima && ` · Max ${brl(Number(imovel.diaria_maxima))}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/imoveis/${imovel.id}/editar`}>
                <Button variant="outline" size="sm">Ajustar base/limites</Button>
              </Link>
              <RecalcularButton imovelId={imovel.id} />
            </div>
          </div>

          {/* Grade de tarifas */}
          <div className="bg-white rounded-xl shadow-soft overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-navy-100">
              <h2 className="font-bold text-navy-900">Próximos 90 dias ({tarifas?.length ?? 0} datas)</h2>
              <p className="text-[11px] text-ink-500 mt-1">
                Clique no valor pra ajustar. Override em amarelo. Hover mostra a fórmula aplicada.
              </p>
            </div>
            {(tarifas ?? []).length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-400">
                Nenhuma tarifa gerada ainda. Clique em <strong>Recalcular</strong> acima.
              </div>
            ) : (
              <div className="p-4 grid grid-cols-7 gap-1 text-xs">
                {(tarifas ?? []).map((t: any) => (
                  <OverrideCell
                    key={t.data}
                    imovelId={imovel.id}
                    data={t.data}
                    calculada={Number(t.diaria_calculada)}
                    final={Number(t.diaria_final)}
                    override={t.override_manual}
                    regra={t.regra_aplicada}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Eventos */}
      <EventosPanel eventos={eventos ?? []} />
    </div>
  );
}
