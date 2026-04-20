'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { enviarPixRepasse } from '@/lib/inter/pix';

type Result = { ok: true; e2e: string; modo: 'real' | 'stub' } | { ok: false; error: string };

/**
 * Paga todos os repasses PENDENTES de um proprietário dentro de um mês.
 * Gera um único PIX com a soma dos líquidos e marca cada repasse como pago.
 */
export async function pagarRepasseProprietario(
  proprietarioId: string,
  mes: string // YYYY-MM
): Promise<Result> {
  const supabase = createClient();

  const [y, m] = mes.split('-').map(Number);
  const iniMes = `${mes}-01`;
  const fimMes = new Date(y, m, 1).toISOString().slice(0, 10);

  // Busca proprietário + chave PIX
  const { data: prop } = await supabase
    .from('proprietarios')
    .select('id, nome, cpf_cnpj, chave_pix, email')
    .eq('id', proprietarioId)
    .maybeSingle();
  if (!prop) return { ok: false, error: 'Proprietário não encontrado' };

  // Busca repasses pendentes do mês (baseado em created_at)
  const { data: repasses } = await supabase
    .from('repasses')
    .select('id, valor_liquido')
    .eq('proprietario_id', proprietarioId)
    .eq('status', 'pendente')
    .gte('created_at', iniMes)
    .lt('created_at', fimMes);

  if (!repasses || repasses.length === 0) {
    return { ok: false, error: 'Nenhum repasse pendente neste período' };
  }

  const total = repasses.reduce((s, r) => s + Number(r.valor_liquido), 0);

  const idempotencyKey = `rep_${proprietarioId}_${mes}`;
  const pix = await enviarPixRepasse({
    valor: total,
    descricao: `Repasse ALVA Rent ${mes} — ${prop.nome}`.slice(0, 140),
    destino: {
      favorecido_nome: prop.nome,
      favorecido_documento: (prop.cpf_cnpj ?? '').replace(/\D/g, ''),
      chave_pix: prop.chave_pix ?? prop.email ?? null,
    },
    idempotency_key: idempotencyKey,
  });

  if (!pix.ok) return { ok: false, error: pix.error };

  // Marca todos os repasses como pagos
  const hoje = new Date().toISOString().slice(0, 10);
  const { error: ue } = await supabase
    .from('repasses')
    .update({
      status: 'pago',
      data_repasse: hoje,
      forma_repasse: 'pix_inter',
      observacoes: `PIX e2e=${pix.end_to_end_id}${pix.modo === 'stub' ? ' (stub — credenciais Inter não destravadas)' : ''}`,
    })
    .in('id', repasses.map((r) => r.id));

  if (ue) return { ok: false, error: ue.message };

  revalidatePath('/admin/repasses/fechamento');
  revalidatePath(`/admin/proprietarios/${proprietarioId}`);
  return { ok: true, e2e: pix.end_to_end_id, modo: pix.modo };
}
