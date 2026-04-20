import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { brl, formatDate } from '@/lib/utils';
import { AcoesTicket } from '../client';

export const metadata = { title: 'Ticket de manutenção · ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function TicketPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: t } = await supabase
    .from('manutencoes')
    .select(`
      *,
      imovel:imoveis(id, codigo, endereco, numero, bairro, cidade),
      fornecedor:fornecedores_manutencao(id, nome, telefone, especialidade),
      estada:estadas(id, codigo, data_checkin, data_checkout, hospede:hospedes(nome))
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!t) notFound();

  const { data: fornecedores } = await supabase
    .from('fornecedores_manutencao')
    .select('id, nome, especialidade')
    .eq('ativo', true)
    .order('nome');

  const im: any = Array.isArray(t.imovel) ? t.imovel[0] : t.imovel;
  const fo: any = Array.isArray(t.fornecedor) ? t.fornecedor[0] : t.fornecedor;
  const es: any = Array.isArray(t.estada) ? t.estada[0] : t.estada;
  const hos: any = es && (Array.isArray(es.hospede) ? es.hospede[0] : es.hospede);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <Link href="/admin/manutencao" className="text-xs text-ink-500 hover:underline">
        ← Voltar
      </Link>

      <div className="mt-2 mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Ticket · {t.tipo} · {t.prioridade}
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mt-1">{t.titulo}</h1>
        <div className="text-sm text-ink-500 mt-1">
          Aberto em {formatDate(t.aberta_em)} · origem <span className="capitalize">{t.origem}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="text-xs text-ink-500 font-semibold uppercase mb-2">Imóvel</div>
          <div className="font-semibold">{im?.codigo}</div>
          <div className="text-sm">{im?.endereco}{im?.numero ? `, ${im.numero}` : ''}</div>
          <div className="text-xs text-ink-500">{im?.bairro} · {im?.cidade}</div>
          {im?.id && (
            <Link href={`/admin/hospedagem/${im.id}`} className="mt-2 inline-block text-xs text-navy-900 hover:underline">
              Ver ficha de hospedagem →
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-soft">
          <div className="text-xs text-ink-500 font-semibold uppercase mb-2">Estada relacionada</div>
          {es ? (
            <>
              <div className="font-semibold">{hos?.nome ?? '—'}</div>
              <div className="text-sm font-mono">{es.codigo}</div>
              <div className="text-xs text-ink-500">
                {formatDate(es.data_checkin)} → {formatDate(es.data_checkout)}
              </div>
              <Link href={`/admin/estadas/${es.id}`} className="mt-2 inline-block text-xs text-navy-900 hover:underline">
                Abrir estada →
              </Link>
            </>
          ) : (
            <div className="text-sm text-ink-400 italic">Sem estada vinculada</div>
          )}
        </div>
      </div>

      {t.descricao && (
        <div className="bg-white rounded-xl p-5 shadow-soft mb-6">
          <div className="text-xs text-ink-500 font-semibold uppercase mb-2">Descrição</div>
          <p className="text-sm whitespace-pre-line">{t.descricao}</p>
        </div>
      )}

      {fo && (
        <div className="bg-white rounded-xl p-5 shadow-soft mb-6">
          <div className="text-xs text-ink-500 font-semibold uppercase mb-2">Fornecedor atual</div>
          <div className="font-semibold">{fo.nome}</div>
          {fo.especialidade && <div className="text-xs text-ink-500">{fo.especialidade}</div>}
          {fo.telefone && (
            <a
              href={`https://wa.me/${fo.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener"
              className="mt-1 inline-block text-xs text-emerald-700 hover:underline"
            >
              📱 {fo.telefone}
            </a>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-soft mb-6">
        <div className="text-xs text-ink-500 font-semibold uppercase mb-3">Status atual: {t.status.replace('_', ' ')}</div>
        {t.agendada_para && (
          <div className="text-sm mb-2">
            📅 Agendada para {new Date(t.agendada_para).toLocaleString('pt-BR')}
          </div>
        )}
        {t.resolvida_em && (
          <div className="text-sm mb-2">
            ✓ Resolvida em {new Date(t.resolvida_em).toLocaleString('pt-BR')}
          </div>
        )}
        {t.custo && (
          <div className="text-sm mb-2">💰 Custo: <strong>{brl(Number(t.custo))}</strong></div>
        )}
        {t.observacoes_resolucao && (
          <div className="text-sm mt-3 p-3 bg-emerald-50 rounded-lg">
            <div className="text-[10px] font-semibold uppercase text-emerald-700">Resolução</div>
            <p className="whitespace-pre-line">{t.observacoes_resolucao}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-soft">
        <h2 className="font-bold text-navy-900 mb-3">Ações</h2>
        <AcoesTicket
          id={t.id}
          status={t.status}
          custo={t.custo}
          obs={t.observacoes_resolucao}
          fornecedores={fornecedores ?? []}
          fornecedor_id={t.fornecedor_id}
        />
      </div>
    </div>
  );
}
