import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { ThreadView } from './client';

export const metadata = { title: 'Inbox · ALVA Rent' };
export const dynamic = 'force-dynamic';

type SP = { estada?: string };

export default async function InboxPage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();

  // Lista de estadas com mensagens (ou sem — admin pode iniciar conversa)
  const { data: estadas } = await supabase
    .from('estadas')
    .select(`
      id, codigo, data_checkin, data_checkout, status,
      hospede:hospedes (nome),
      imovel:imoveis (codigo)
    `)
    .order('data_checkin', { ascending: false })
    .limit(100);

  // Busca últimas mensagens por estada pra preview + contagem não lidas
  const ids = (estadas ?? []).map((e) => e.id);
  const { data: msgsTodas } = ids.length
    ? await supabase
        .from('estada_mensagens')
        .select('id, estada_id, origem, texto, created_at, lida, status')
        .in('estada_id', ids)
        .neq('status', 'arquivada')
        .order('created_at', { ascending: false })
    : { data: [] as any[] };

  const porEstada = new Map<string, { ultima?: any; naoLidas: number; total: number }>();
  for (const m of msgsTodas ?? []) {
    const e = porEstada.get(m.estada_id) ?? { naoLidas: 0, total: 0 };
    if (!e.ultima) e.ultima = m;
    if (m.origem === 'hospede' && !m.lida) e.naoLidas++;
    e.total++;
    porEstada.set(m.estada_id, e);
  }

  const threads = (estadas ?? [])
    .map((e) => ({ estada: e, ...(porEstada.get(e.id) ?? { naoLidas: 0, total: 0 }) }))
    .sort((a, b) => {
      const ta = a.ultima?.created_at ?? a.estada.data_checkin;
      const tb = b.ultima?.created_at ?? b.estada.data_checkin;
      return tb > ta ? 1 : -1;
    });

  const estadaAtiva = searchParams.estada ?? threads[0]?.estada.id;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Lista de threads */}
      <aside className="w-80 border-r border-navy-100 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-navy-100">
          <h1 className="font-bold text-navy-900">💬 Inbox</h1>
          <p className="text-xs text-ink-500">{threads.length} conversas</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="p-8 text-center text-sm text-ink-400">Sem estadas ainda.</div>
          )}
          {threads.map((t) => {
            const ativa = t.estada.id === estadaAtiva;
            const h: any = Array.isArray(t.estada.hospede) ? t.estada.hospede[0] : t.estada.hospede;
            const im: any = Array.isArray(t.estada.imovel) ? t.estada.imovel[0] : t.estada.imovel;
            return (
              <Link
                key={t.estada.id}
                href={`/admin/inbox?estada=${t.estada.id}`}
                className={`block px-4 py-3 border-b border-navy-50 hover:bg-navy-50 ${
                  ativa ? 'bg-navy-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-navy-900 truncate">
                        {h?.nome ?? 'Sem hóspede'}
                      </span>
                      {t.naoLidas > 0 && (
                        <span className="bg-emerald-600 text-white text-[10px] px-1.5 rounded-full font-bold">
                          {t.naoLidas}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-500 font-mono">
                      {im?.codigo} · {t.estada.codigo}
                    </div>
                    {t.ultima ? (
                      <div className="text-xs text-ink-600 truncate mt-1">
                        <span className="text-ink-400">
                          {t.ultima.origem === 'hospede' ? '👤' : t.ultima.origem === 'ia' ? '🤖' : '✍️'}
                        </span>{' '}
                        {t.ultima.texto}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-400 italic mt-1">sem mensagens</div>
                    )}
                  </div>
                  <div className="text-[10px] text-ink-400 whitespace-nowrap">
                    {t.ultima
                      ? new Date(t.ultima.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : formatDate(t.estada.data_checkin)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Thread + contexto */}
      {estadaAtiva ? (
        <ThreadPanel estadaId={estadaAtiva} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-ink-400">
          Selecione uma conversa
        </div>
      )}
    </div>
  );
}

async function ThreadPanel({ estadaId }: { estadaId: string }) {
  const supabase = createClient();

  const { data: estada } = await supabase
    .from('estadas')
    .select(`
      id, codigo, data_checkin, data_checkout, canal, status,
      hospede:hospedes (nome, telefone, email),
      imovel:imoveis (
        codigo, endereco, numero, bairro,
        hospedagem:imovel_hospedagem (wifi_ssid, wifi_senha, codigo_fechadura, regras_casa)
      )
    `)
    .eq('id', estadaId)
    .maybeSingle();

  if (!estada) {
    return <div className="flex-1 flex items-center justify-center text-ink-400">Estada não encontrada</div>;
  }

  const { data: mensagens } = await supabase
    .from('estada_mensagens')
    .select('*')
    .eq('estada_id', estadaId)
    .order('created_at', { ascending: true });

  const h: any = Array.isArray(estada.hospede) ? estada.hospede[0] : estada.hospede;
  const im: any = Array.isArray(estada.imovel) ? estada.imovel[0] : estada.imovel;
  const hosp: any = im && (Array.isArray(im.hospedagem) ? im.hospedagem[0] : im.hospedagem);

  return (
    <ThreadView
      estada={{
        id: estada.id,
        codigo: estada.codigo,
        canal: estada.canal,
        status: estada.status,
        data_checkin: estada.data_checkin,
        data_checkout: estada.data_checkout,
        hospede_nome: h?.nome ?? '—',
        hospede_telefone: h?.telefone ?? null,
        hospede_email: h?.email ?? null,
        imovel_codigo: im?.codigo ?? '',
        imovel_endereco: `${im?.endereco ?? ''}, ${im?.numero ?? ''} · ${im?.bairro ?? ''}`,
        wifi_ssid: hosp?.wifi_ssid ?? null,
        wifi_senha: hosp?.wifi_senha ?? null,
        codigo_fechadura: hosp?.codigo_fechadura ?? null,
        regras_casa: hosp?.regras_casa ?? null,
      }}
      mensagens={(mensagens ?? []) as any}
    />
  );
}
