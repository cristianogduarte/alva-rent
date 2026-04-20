-- Etapa 12 — Precificação dinâmica

-- Limites opcionais por imóvel (piso e teto de diária)
alter table imoveis
  add column if not exists diaria_minima numeric(10,2),
  add column if not exists diaria_maxima numeric(10,2);

-- Algoritmo v1 simples e transparente: preço sugerido por data × imóvel.
-- Admin vê 90 dias, ajusta manualmente quando quiser e exporta (v1)
-- ou integra com PriceLabs/Booking Connectivity (v2).

-- Eventos locais que influenciam preço (Cabo Frio, Belo Horizonte, etc.)
create table if not exists eventos_cidade (
  id uuid primary key default gen_random_uuid(),
  cidade text not null,
  uf text not null default 'MG',
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  multiplicador numeric(4,2) not null default 1.30 check (multiplicador > 0),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_cidade_data on eventos_cidade (cidade, data_inicio, data_fim);

alter table eventos_cidade enable row level security;
drop policy if exists "admin_all_eventos" on eventos_cidade;
create policy "admin_all_eventos" on eventos_cidade
  for all using (is_admin()) with check (is_admin());

-- Tarifas calculadas por imóvel × data
-- Podem ser sobrescritas manualmente pelo admin (override_manual = true).
create table if not exists tarifas_dinamicas (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  data date not null,
  diaria_calculada numeric(10,2) not null,
  diaria_minima numeric(10,2),
  diaria_maxima numeric(10,2),
  diaria_final numeric(10,2) not null,        -- o que vale (pode ser override)
  regra_aplicada jsonb not null default '{}'::jsonb,
  override_manual boolean not null default false,
  observacoes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (imovel_id, data)
);

create index if not exists idx_tarifas_imovel_data on tarifas_dinamicas (imovel_id, data);
create index if not exists idx_tarifas_data on tarifas_dinamicas (data);

create or replace function fn_tarifas_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_tarifas_updated on tarifas_dinamicas;
create trigger trg_tarifas_updated before update on tarifas_dinamicas
  for each row execute function fn_tarifas_updated_at();

alter table tarifas_dinamicas enable row level security;
drop policy if exists "admin_all_tarifas" on tarifas_dinamicas;
create policy "admin_all_tarifas" on tarifas_dinamicas
  for all using (is_admin()) with check (is_admin());

-- Dono vê as tarifas das suas unidades (read-only)
drop policy if exists "dono_le_tarifas" on tarifas_dinamicas;
create policy "dono_le_tarifas" on tarifas_dinamicas
  for select using (
    imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
  );

comment on table eventos_cidade is
  'Feriados regionais e eventos (Réveillon, Carnaval, Expo, shows) que alteram demanda.';
comment on table tarifas_dinamicas is
  'Diária sugerida por algoritmo v1 com override manual opcional. Fonte de verdade pra Airbnb/Booking.';
