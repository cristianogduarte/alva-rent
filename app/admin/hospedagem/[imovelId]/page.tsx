import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AMENITIES_PADRAO, ENXOVAL_PADRAO, COZINHA_PADRAO } from '../schema';

export const metadata = { title: 'Ficha de Hospedagem' };
export const dynamic = 'force-dynamic';

export default async function FichaHospedagem({ params }: { params: { imovelId: string } }) {
  const supabase = createClient();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id, codigo, endereco, numero, bairro, cidade, uf, capacidade_hospedes, diaria_base, checkin_time, checkout_time, modalidade')
    .eq('id', params.imovelId)
    .single();

  if (!imovel) notFound();

  const { data: h } = await supabase
    .from('imovel_hospedagem')
    .select('*')
    .eq('imovel_id', params.imovelId)
    .maybeSingle();

  const vazia = !h;

  return (
    <div className="px-8 py-6 max-w-5xl">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-400 mb-2">
        <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        <span className="mx-1.5">/</span>
        <Link href="/admin/hospedagem" className="hover:underline">Hospedagem</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-500">{imovel.codigo}</span>
      </nav>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Ficha de hospedagem</div>
          <h1 className="text-2xl font-bold text-navy-900">{imovel.codigo}</h1>
          <p className="text-sm text-ink-500">
            {imovel.endereco}{imovel.numero ? `, ${imovel.numero}` : ''} · {imovel.bairro}, {imovel.cidade}/{imovel.uf}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/hospedagem/${imovel.id}/manual`}
            className="text-xs px-3 py-1.5 border border-navy-100 rounded-md font-semibold hover:bg-navy-50"
          >
            🖨️ cartão do hóspede
          </Link>
          <Link
            href={`/admin/hospedagem/${imovel.id}/editar`}
            className="text-xs px-3 py-1.5 bg-navy-900 text-white rounded-md font-semibold"
          >
            {vazia ? 'preencher ficha' : 'editar'}
          </Link>
        </div>
      </div>

      {vazia ? (
        <div className="bg-white rounded-xl shadow-soft p-10 text-center">
          <div className="text-5xl mb-3">📝</div>
          <h2 className="text-lg font-semibold text-navy-900 mb-1">Ficha ainda não preenchida</h2>
          <p className="text-sm text-ink-500 max-w-md mx-auto mb-4">
            Preencha a ficha padrão ALVA para que a IA do WhatsApp possa atender hóspedes e para gerar o cartão impresso da unidade.
          </p>
          <Link
            href={`/admin/hospedagem/${imovel.id}/editar`}
            className="text-sm px-4 py-2 bg-navy-900 text-white rounded-md font-semibold inline-block"
          >
            Preencher agora
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <Card titulo="🌐 Wi-Fi">
            <Kv k="Rede (SSID)" v={h.wifi_ssid} />
            <Kv k="Senha" v={h.wifi_senha} mono />
          </Card>

          <Card titulo="🚪 Acesso & chegada">
            <Kv k="Endereço completo" v={h.endereco_completo} />
            <Kv k="Ponto de referência" v={h.ponto_referencia} />
            <Kv k="Vagas de garagem" v={h.vagas_garagem != null ? `${h.vagas_garagem}${h.vaga_numero ? ` (nº ${h.vaga_numero})` : ''}` : null} />
            <Kv k="Tipo de acesso" v={h.tipo_acesso} />
            <Kv k="Código da fechadura" v={h.codigo_fechadura} mono />
            <Kv k="Portaria" v={h.portaria_info} />
            <Kv k="Síndico" v={h.sindico_nome ? `${h.sindico_nome} · ${h.sindico_telefone ?? ''}` : null} />
            <Kv k="Instruções" v={h.instrucoes_acesso} />
          </Card>

          <Card titulo="🎥 Vídeos principais">
            <Kv k="Check-in" v={h.video_checkin_url} link />
            <Kv k="Check-out" v={h.video_checkout_url} link />
            <Kv k="Tour da unidade" v={h.video_tour_url} link />
            {Array.isArray(h.videos_extras) && h.videos_extras.length > 0 && (
              <div className="pt-2 border-t border-navy-50">
                <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Extras</div>
                <ul className="space-y-1">
                  {h.videos_extras.map((v: any, i: number) => (
                    <li key={i} className="text-sm">
                      <span className="text-ink-500">{v.titulo}: </span>
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-navy-700 hover:underline break-all">{v.url}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card titulo="🛋️ Configuração">
            <Kv k="Quartos" v={h.qtd_quartos} />
            <Kv k="Banheiros" v={h.qtd_banheiros} />
            <Kv k="Camas casal" v={h.qtd_camas_casal} />
            <Kv k="Camas solteiro" v={h.qtd_camas_solteiro} />
            <Kv k="Sofá-cama" v={h.qtd_sofa_cama} />
            <Kv k="Capacidade" v={imovel.capacidade_hospedes} />
          </Card>

          <div className="grid grid-cols-3 gap-5">
            <Quadro titulo="🎁 Amenities ALVA" defs={AMENITIES_PADRAO as any} valores={h.amenities_padrao ?? {}} />
            <Quadro titulo="🛏️ Enxoval" defs={ENXOVAL_PADRAO as any} valores={h.enxoval ?? {}} />
            <Quadro titulo="🍳 Cozinha" defs={COZINHA_PADRAO as any} valores={h.cozinha ?? {}} />
          </div>

          <Card titulo="📏 Regras">
            <Kv k="Pets" v={h.aceita_pets ? 'Permitido' : 'Não permitido'} />
            <Kv k="Fumar" v={h.permite_fumar ? 'Permitido' : 'Não permitido'} />
            <Kv k="Festas" v={h.permite_festa ? 'Permitido' : 'Não permitido'} />
            <Kv k="Crianças" v={h.permite_criancas ? 'Permitido' : 'Não permitido'} />
            <Kv k="Silêncio" v={h.horario_silencio_inicio ? `${h.horario_silencio_inicio} às ${h.horario_silencio_fim}` : null} />
            <Kv k="Outras regras" v={h.regras_casa} />
          </Card>

          {Array.isArray(h.arredores) && h.arredores.length > 0 && (
            <Card titulo="📍 Arredores">
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {h.arredores.map((a: any, i: number) => (
                  <li key={i} className="text-ink-700">
                    <span className="text-ink-400">{a.tipo}:</span> <strong>{a.nome}</strong>
                    {a.distancia && <span className="text-ink-500"> · {a.distancia}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card titulo="🧹 Operacional">
            <Kv k="Observações de limpeza" v={h.observacoes_limpeza} />
            <Kv k="Notas internas" v={h.notas_operacionais} />
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-soft p-5">
      <h2 className="text-sm font-semibold text-navy-900 mb-3">{titulo}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Kv({ k, v, mono, link }: { k: string; v: any; mono?: boolean; link?: boolean }) {
  if (v == null || v === '') return null;
  return (
    <div className="flex gap-3 text-sm">
      <div className="w-48 text-ink-400 shrink-0">{k}</div>
      <div className={`text-ink-800 ${mono ? 'font-mono' : ''} break-words`}>
        {link ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-navy-700 hover:underline break-all">{String(v)}</a> : String(v)}
      </div>
    </div>
  );
}

function Quadro({
  titulo,
  defs,
  valores,
}: {
  titulo: string;
  defs: readonly { key: string; label: string; unidade?: string }[];
  valores: Record<string, number>;
}) {
  return (
    <section className="bg-white rounded-xl shadow-soft p-5">
      <h2 className="text-sm font-semibold text-navy-900 mb-3">{titulo}</h2>
      <ul className="space-y-1.5 text-sm">
        {defs.map((d) => (
          <li key={d.key} className="flex items-center justify-between">
            <span className="text-ink-600">{d.label}</span>
            <span className="tabular-nums font-semibold text-navy-900">
              {valores[d.key] ?? 0}
              {d.unidade && <span className="text-ink-400 font-normal ml-1">{d.unidade}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
