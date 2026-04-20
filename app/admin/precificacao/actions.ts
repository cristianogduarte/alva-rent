'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  calcularPreco,
  calcularOcupacaoProjetada,
  gerarDatas,
  type Evento,
} from '@/lib/pricing/calculator';

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

/** Recalcula e grava tarifas sugeridas dos próximos 90 dias para um imóvel. */
export async function recalcularTarifas(imovelId: string, dias = 90): Promise<Result<{ gravadas: number }>> {
  const supabase = createClient();

  const { data: imovel } = await supabase
    .from('imoveis')
    .select('id, codigo, cidade, uf, diaria_base, diaria_minima, diaria_maxima')
    .eq('id', imovelId)
    .maybeSingle();
  if (!imovel) return { ok: false, error: 'Imóvel não encontrado' };
  if (!imovel.diaria_base) return { ok: false, error: 'Cadastre uma diária-base no imóvel antes de gerar preços' };

  // Eventos da cidade
  const { data: eventos } = await supabase
    .from('eventos_cidade')
    .select('data_inicio, data_fim, multiplicador, nome')
    .eq('cidade', imovel.cidade ?? '');

  // Ocupação projetada (14d)
  const { data: estadas } = await supabase
    .from('estadas')
    .select('data_checkin, data_checkout')
    .eq('imovel_id', imovelId)
    .in('status', ['confirmada', 'checkin'])
    .gte('data_checkout', new Date().toISOString().slice(0, 10));
  const ocupacao = calcularOcupacaoProjetada(estadas ?? []);

  // Tarifas já gravadas com override (preservar)
  const datas = gerarDatas(dias);
  const { data: existentes } = await supabase
    .from('tarifas_dinamicas')
    .select('data, override_manual, diaria_final')
    .eq('imovel_id', imovelId)
    .in('data', datas);
  const overridesPorData = new Map<string, number>();
  for (const e of existentes ?? []) {
    if (e.override_manual) overridesPorData.set(e.data, Number(e.diaria_final));
  }

  const rows = datas.map((d) => {
    const calc = calcularPreco(imovel, d, (eventos ?? []) as Evento[], ocupacao);
    const override = overridesPorData.get(d);
    return {
      imovel_id: imovelId,
      data: d,
      diaria_calculada: calc.diaria_calculada,
      diaria_final: override ?? calc.diaria_final,
      diaria_minima: imovel.diaria_minima,
      diaria_maxima: imovel.diaria_maxima,
      regra_aplicada: { ...calc.regra, ocupacao_projetada: ocupacao } as any,
      override_manual: override !== undefined,
    };
  });

  const { error } = await supabase.from('tarifas_dinamicas').upsert(rows, { onConflict: 'imovel_id,data' });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/precificacao');
  return { ok: true, data: { gravadas: rows.length } };
}

export async function definirOverride(
  imovelId: string,
  data: string,
  valor: number | null,
): Promise<Result> {
  const supabase = createClient();
  if (valor === null) {
    // Remove override: reaplica cálculo nessa data
    const { data: existente } = await supabase
      .from('tarifas_dinamicas')
      .select('diaria_calculada')
      .eq('imovel_id', imovelId)
      .eq('data', data)
      .maybeSingle();
    if (!existente) return { ok: false, error: 'Tarifa inexistente' };
    const { error } = await supabase
      .from('tarifas_dinamicas')
      .update({ diaria_final: existente.diaria_calculada, override_manual: false })
      .eq('imovel_id', imovelId)
      .eq('data', data);
    if (error) return { ok: false, error: error.message };
  } else {
    if (valor <= 0) return { ok: false, error: 'Valor inválido' };
    const { error } = await supabase
      .from('tarifas_dinamicas')
      .update({ diaria_final: valor, override_manual: true })
      .eq('imovel_id', imovelId)
      .eq('data', data);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/precificacao');
  return { ok: true };
}

export async function criarEvento(form: {
  cidade: string;
  uf: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  multiplicador: number;
}): Promise<Result> {
  if (!form.cidade.trim() || !form.nome.trim()) return { ok: false, error: 'Cidade e nome obrigatórios' };
  if (form.data_fim < form.data_inicio) return { ok: false, error: 'Data fim < data início' };
  if (form.multiplicador <= 0) return { ok: false, error: 'Multiplicador inválido' };
  const supabase = createClient();
  const { error } = await supabase.from('eventos_cidade').insert({
    cidade: form.cidade.trim(),
    uf: form.uf.trim() || 'MG',
    nome: form.nome.trim(),
    data_inicio: form.data_inicio,
    data_fim: form.data_fim,
    multiplicador: form.multiplicador,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/precificacao');
  return { ok: true };
}

export async function excluirEvento(id: string): Promise<Result> {
  const supabase = createClient();
  const { error } = await supabase.from('eventos_cidade').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/precificacao');
  return { ok: true };
}
