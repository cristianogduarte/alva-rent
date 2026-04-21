'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  imovel_id: z.string().uuid(),
  titulo: z.string().trim().min(3).max(120),
  descricao: z.string().trim().min(5).max(2000),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
});

export async function abrirChamadoManutencao(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/manutencao');

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect('/portal/manutencao?erro=Dados+inválidos');
  }

  // Confirma que o imóvel bate com o contrato do inquilino (segurança)
  const { data: inq } = await supabase
    .from('inquilinos')
    .select('id, nome')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!inq) redirect('/portal');

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id')
    .eq('inquilino_id', inq.id)
    .eq('imovel_id', parsed.data.imovel_id)
    .limit(1)
    .maybeSingle();
  if (!contrato) {
    redirect('/portal/manutencao?erro=Imóvel+não+corresponde+ao+seu+contrato');
  }

  // Cria via admin client — tabela manutencoes não tem policy pra inquilino
  const admin = createAdminClient();
  const { error } = await admin.from('manutencoes').insert({
    imovel_id: parsed.data.imovel_id,
    titulo: parsed.data.titulo,
    descricao: `${parsed.data.descricao}\n\n— Aberto via Portal por ${inq.nome}`,
    prioridade: parsed.data.prioridade,
    tipo: 'corretiva',
    origem: 'hospede',
    status: 'aberta',
  });

  if (error) {
    redirect(`/portal/manutencao?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/portal/manutencao');
  revalidatePath('/admin/manutencao');
  redirect('/portal/manutencao?ok=1');
}
