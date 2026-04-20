/**
 * Edge Function: roda diariamente às 06:00 BRT (09:00 UTC).
 * Para cada contrato ativo cujo próximo vencimento está dentro de 7 dias e
 * ainda não tem boleto da competência, emite via API Inter e enfileira o envio.
 *
 * Deploy: supabase functions deploy cron-emitir-boletos
 * Schedule (no painel Supabase ou via pg_cron):
 *   select cron.schedule('emitir-boletos', '0 9 * * *',
 *     $$select net.http_post(
 *       url := 'https://<project>.functions.supabase.co/cron-emitir-boletos',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}'::jsonb
 *     )$$);
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface Contrato {
  id: string;
  codigo: string;
  valor_aluguel: number;
  valor_condominio: number;
  valor_iptu_mensal: number;
  outras_taxas: number;
  dia_vencimento: number;
  canal_envio: string[];
  inquilino: {
    cpf: string;
    nome: string;
    email: string | null;
    whatsapp: string | null;
  };
  imovel: {
    endereco: string;
    cidade: string;
    uf: string;
    cep: string | null;
  };
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const hoje = new Date();
  const limite = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: contratos, error } = await supabase
    .from('contratos')
    .select(`
      id, codigo, valor_aluguel, valor_condominio, valor_iptu_mensal, outras_taxas,
      dia_vencimento, canal_envio,
      inquilino:inquilinos(cpf, nome, email, whatsapp),
      imovel:imoveis(endereco, cidade, uf, cep)
    `)
    .eq('status', 'ativo')
    .lte('data_inicio', hoje.toISOString())
    .gte('data_fim', hoje.toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const resultados: { contrato_id: string; ok: boolean; motivo?: string }[] = [];

  for (const c of (contratos as Contrato[]) ?? []) {
    const venc = nextVencimento(c.dia_vencimento, hoje);
    if (venc > limite) {
      resultados.push({ contrato_id: c.id, ok: false, motivo: 'fora_da_janela' });
      continue;
    }

    const competencia = new Date(venc.getFullYear(), venc.getMonth(), 1);
    const valor =
      Number(c.valor_aluguel) +
      Number(c.valor_condominio) +
      Number(c.valor_iptu_mensal) +
      Number(c.outras_taxas);

    // Idempotência
    const { data: existing } = await supabase
      .from('boletos')
      .select('id')
      .eq('contrato_id', c.id)
      .eq('competencia', competencia.toISOString().slice(0, 10))
      .maybeSingle();

    if (existing) {
      resultados.push({ contrato_id: c.id, ok: false, motivo: 'ja_existe' });
      continue;
    }

    // TODO: chamar API Inter aqui (fetch ao invés de axios; importar os helpers)
    // Por enquanto, apenas marca pendente — a chamada real fica num próximo deploy.
    await supabase.from('boletos').insert({
      contrato_id: c.id,
      competencia: competencia.toISOString().slice(0, 10),
      valor_total: valor,
      data_vencimento: venc.toISOString().slice(0, 10),
      status: 'criado',
    });

    await supabase.from('historico').insert({
      contrato_id: c.id,
      tipo: 'boleto_emitido',
      titulo: `Boleto de ${formatCompetencia(competencia)} criado`,
      descricao: `Valor R$ ${valor.toFixed(2)} — venc. ${venc.toISOString().slice(0, 10)}`,
    });

    resultados.push({ contrato_id: c.id, ok: true });
  }

  return new Response(
    JSON.stringify({ processados: resultados.length, resultados }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function nextVencimento(dia: number, hoje: Date): Date {
  const venc = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (venc < hoje) venc.setMonth(venc.getMonth() + 1);
  return venc;
}

function formatCompetencia(d: Date): string {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${meses[d.getMonth()]}/${d.getFullYear()}`;
}
