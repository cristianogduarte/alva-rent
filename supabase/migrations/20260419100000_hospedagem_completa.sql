-- Etapa 2 — Ficha de Hospedagem completa + cartão do hóspede
-- Expande imovel_hospedagem com campos estruturados e adiciona storage.

-- ============================================================
-- 1. Expande imovel_hospedagem
-- ============================================================
alter table imovel_hospedagem
  -- Acesso & chegada
  add column if not exists endereco_completo text,
  add column if not exists ponto_referencia text,
  add column if not exists maps_url text,
  add column if not exists vagas_garagem int default 0,
  add column if not exists vaga_numero text,
  add column if not exists portaria_info text,
  add column if not exists sindico_nome text,
  add column if not exists sindico_telefone text,
  add column if not exists tipo_acesso text default 'chave'
    check (tipo_acesso in ('chave', 'fechadura_digital', 'tag', 'app', 'porteiro', 'outro')),
  add column if not exists video_checkin_url text,
  add column if not exists video_checkout_url text,
  add column if not exists video_tour_url text,

  -- Regras da casa
  add column if not exists aceita_pets boolean default false,
  add column if not exists permite_fumar boolean default false,
  add column if not exists permite_festa boolean default false,
  add column if not exists permite_criancas boolean default true,
  add column if not exists horario_silencio_inicio time default '22:00',
  add column if not exists horario_silencio_fim time default '08:00',

  -- Estrutura (quartos/banheiros)
  add column if not exists qtd_quartos int,
  add column if not exists qtd_banheiros int,
  add column if not exists qtd_camas_casal int default 0,
  add column if not exists qtd_camas_solteiro int default 0,
  add column if not exists qtd_sofa_cama int default 0,

  -- Amenities padrão ALVA (consumíveis obrigatórios)
  add column if not exists amenities_padrao jsonb default '{
    "sabonete": 0,
    "shampoo": 0,
    "condicionador": 0,
    "papel_higienico_rolos": 0,
    "detergente": 0,
    "sabao_em_po": 0
  }'::jsonb,

  -- Enxoval (hoteleiro)
  add column if not exists enxoval jsonb default '{
    "toalha_banho": 0,
    "toalha_rosto": 0,
    "toalha_piscina": 0,
    "jogo_cama_casal": 0,
    "jogo_cama_solteiro": 0,
    "travesseiros": 0,
    "edredom": 0,
    "cobertor": 0
  }'::jsonb,

  -- Cozinha (qtd de utensílios)
  add column if not exists cozinha jsonb default '{
    "pratos": 0,
    "talheres_jogos": 0,
    "copos": 0,
    "tacas": 0,
    "canecas": 0,
    "panelas": 0
  }'::jsonb,

  -- Equipamentos (livre — sim/não + observação)
  add column if not exists equipamentos jsonb default '[]'::jsonb,

  -- Vídeos extras (lista dinâmica)
  add column if not exists videos_extras jsonb default '[]'::jsonb,

  -- Arredores
  add column if not exists arredores jsonb default '[]'::jsonb,

  -- Checkout checklist (que o hóspede vê no cartão)
  add column if not exists checkout_lembretes jsonb default
    '["Deixe a louça lavada na pia","Leve o lixo ao hall","Desligue ar-condicionado e luzes","Deixe as chaves em cima da mesa"]'::jsonb,

  -- Info do número único de WhatsApp (herdado das configurações gerais)
  add column if not exists notas_operacionais text;

-- ============================================================
-- 2. Storage bucket 'hospedagem' (fotos técnicas, procurações)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('hospedagem', 'hospedagem', false, 52428800) -- 50MB
on conflict (id) do nothing;

-- Policies: admin tudo, público nada
drop policy if exists "hospedagem_admin_all" on storage.objects;
create policy "hospedagem_admin_all" on storage.objects
  for all using (bucket_id = 'hospedagem' and is_admin())
  with check (bucket_id = 'hospedagem' and is_admin());
