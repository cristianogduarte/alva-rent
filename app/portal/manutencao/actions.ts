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

const MAX_FOTOS = 5;
const MAX_FOTO_BYTES = 10 * 1024 * 1024; // 10MB

export async function abrirChamadoManutencao(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/portal/manutencao');

  const campos = {
    imovel_id: formData.get('imovel_id'),
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao'),
    prioridade: formData.get('prioridade'),
  };
  const parsed = schema.safeParse(campos);
  if (!parsed.success) {
    redirect('/portal/manutencao?erro=Dados+inválidos');
  }

  // Segurança: confirma vínculo inquilino × imóvel
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

  const admin = createAdminClient();

  // Upload fotos (se houver)
  const fotosUrls: string[] = [];
  const fotoFiles = formData.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);

  for (const file of fotoFiles.slice(0, MAX_FOTOS)) {
    if (file.size > MAX_FOTO_BYTES) {
      redirect(`/portal/manutencao?erro=Foto+${encodeURIComponent(file.name)}+maior+que+10MB`);
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${parsed.data.imovel_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from('manutencao')
      .upload(path, bytes, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
    if (upErr) {
      redirect(`/portal/manutencao?erro=Erro+ao+enviar+foto:+${encodeURIComponent(upErr.message)}`);
    }
    const { data: pub } = admin.storage.from('manutencao').getPublicUrl(path);
    if (pub?.publicUrl) fotosUrls.push(pub.publicUrl);
  }

  const { error } = await admin.from('manutencoes').insert({
    imovel_id: parsed.data.imovel_id,
    titulo: parsed.data.titulo,
    descricao: `${parsed.data.descricao}\n\n— Aberto via Portal por ${inq.nome}`,
    prioridade: parsed.data.prioridade,
    tipo: 'corretiva',
    origem: 'hospede',
    status: 'aberta',
    fotos: fotosUrls,
  });

  if (error) {
    redirect(`/portal/manutencao?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/portal/manutencao');
  revalidatePath('/admin/manutencao');
  redirect('/portal/manutencao?ok=1');
}
