'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hospedagemSchema } from './schema';

type Amenities = Record<string, number>;

function parseAmenities(formData: FormData, prefix: string): Amenities {
  const out: Amenities = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(`${prefix}:`)) {
      const k = key.slice(prefix.length + 1);
      const n = Number(value);
      out[k] = Number.isFinite(n) && n >= 0 ? n : 0;
    }
  }
  return out;
}

function parseVideosExtras(formData: FormData) {
  const titulos = formData.getAll('video_titulo').map(String);
  const urls = formData.getAll('video_url').map(String);
  const out: { titulo: string; url: string }[] = [];
  for (let i = 0; i < titulos.length; i++) {
    const t = titulos[i]?.trim();
    const u = urls[i]?.trim();
    if (t && u) out.push({ titulo: t, url: u });
  }
  return out;
}

function parseArredores(formData: FormData) {
  const tipos = formData.getAll('arredor_tipo').map(String);
  const nomes = formData.getAll('arredor_nome').map(String);
  const distancias = formData.getAll('arredor_distancia').map(String);
  const out: { tipo: string; nome: string; distancia: string }[] = [];
  for (let i = 0; i < tipos.length; i++) {
    const t = tipos[i]?.trim();
    const n = nomes[i]?.trim();
    const d = distancias[i]?.trim() ?? '';
    if (t && n) out.push({ tipo: t, nome: n, distancia: d });
  }
  return out;
}

function parseCheckoutLembretes(formData: FormData) {
  return formData.getAll('checkout_lembrete').map(String).map((s) => s.trim()).filter(Boolean);
}

export async function salvarHospedagem(imovelId: string, _prev: any, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = hospedagemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Dados inválidos', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const amenities_padrao = parseAmenities(formData, 'amenity');
  const enxoval = parseAmenities(formData, 'enxoval');
  const cozinha = parseAmenities(formData, 'cozinha');
  const videos_extras = parseVideosExtras(formData);
  const arredores = parseArredores(formData);
  const checkout_lembretes = parseCheckoutLembretes(formData);

  const supabase = createClient();

  const payload = {
    ...parsed.data,
    imovel_id: imovelId,
    amenities_padrao,
    enxoval,
    cozinha,
    videos_extras,
    arredores,
    checkout_lembretes,
  };

  // upsert manual por imovel_id (unique)
  const { data: existing } = await supabase
    .from('imovel_hospedagem')
    .select('id')
    .eq('imovel_id', imovelId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from('imovel_hospedagem').update(payload).eq('id', existing.id)
    : await supabase.from('imovel_hospedagem').insert(payload);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/hospedagem/${imovelId}`);
  redirect(`/admin/hospedagem/${imovelId}`);
}
