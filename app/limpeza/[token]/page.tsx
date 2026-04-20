import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { LimpezaMobile } from './client';

export const metadata = { title: 'Limpeza — ALVA Rent' };
export const dynamic = 'force-dynamic';

export default async function LimpezaPublicaPage({ params }: { params: { token: string } }) {
  const supabase = createAdminClient();

  const { data: l } = await supabase
    .from('limpezas')
    .select(`
      id, status, token_publico, agendada_para, iniciada_em, concluida_em,
      checklist_json, observacoes,
      imovel:imoveis (codigo, endereco, numero, bairro, cidade, uf),
      equipe:equipe_limpeza (nome)
    `)
    .eq('token_publico', params.token)
    .maybeSingle();
  if (!l) notFound();

  const im: any = Array.isArray(l.imovel) ? l.imovel[0] : l.imovel;
  const eq: any = Array.isArray(l.equipe) ? l.equipe[0] : l.equipe;
  const checklist: { item: string; ok: boolean }[] = Array.isArray(l.checklist_json)
    ? l.checklist_json
    : [];

  // Busca infos de hospedagem (wifi, instrucoes, etc.) pra equipe ter contexto
  const { data: hosp } = await supabase
    .from('imovel_hospedagem')
    .select('codigo_fechadura, instrucoes_acesso, observacoes_limpeza')
    .eq('imovel_id', (await supabase.from('imoveis').select('id').eq('codigo', im?.codigo).maybeSingle()).data?.id ?? '')
    .maybeSingle();

  return (
    <LimpezaMobile
      token={params.token}
      status={l.status}
      imovel={{
        codigo: im?.codigo ?? '',
        endereco: `${im?.endereco ?? ''}, ${im?.numero ?? ''}`,
        bairro: `${im?.bairro ?? ''} · ${im?.cidade ?? ''}/${im?.uf ?? ''}`,
      }}
      equipe={eq?.nome ?? null}
      checklist={checklist}
      observacoes={l.observacoes ?? ''}
      instrucoes={hosp?.instrucoes_acesso ?? null}
      fechadura={hosp?.codigo_fechadura ?? null}
      obsLimpeza={hosp?.observacoes_limpeza ?? null}
    />
  );
}
