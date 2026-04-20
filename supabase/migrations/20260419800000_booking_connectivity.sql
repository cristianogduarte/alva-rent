-- Etapa 10 — Booking Connectivity (scaffold)
-- Estrutura pronta para integração oficial com a Booking.com Connectivity API.
-- Na v1 os dados ficam gravados mas a chamada real ao endpoint fica stubada.
-- Quando o contrato Connectivity for aprovado, basta trocar lib/booking/client.ts
-- de stub para chamadas reais — schema já suporta.

-- Credenciais globais (uma por provedor — v1 só Booking)
create table if not exists booking_credentials (
  id uuid primary key default gen_random_uuid(),
  hotel_id text not null,                 -- hotel_id Booking (conta da ALVA)
  username text,                          -- basic auth user (XML API legacy)
  password_secret_ref text,               -- nome da env/secret, NUNCA a senha em claro
  base_url text not null default 'https://supply-xml.booking.com',
  ativo boolean not null default false,
  ultimo_teste_em timestamptz,
  ultimo_status text,                     -- ok / erro / pendente
  created_at timestamptz not null default now()
);

alter table booking_credentials enable row level security;
drop policy if exists "admin_all_bkg_cred" on booking_credentials;
create policy "admin_all_bkg_cred" on booking_credentials
  for all using (is_admin()) with check (is_admin());

-- Mapeamento room_id Booking <-> imóvel ALVA
create table if not exists booking_room_mapping (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  room_id text not null,
  rate_plan_id text,
  sincronizar_calendario boolean not null default true,
  sincronizar_preco boolean not null default false,   -- v2
  ultima_sync_em timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  unique (room_id)
);

create index if not exists idx_bkg_map_imovel on booking_room_mapping (imovel_id);

alter table booking_room_mapping enable row level security;
drop policy if exists "admin_all_bkg_map" on booking_room_mapping;
create policy "admin_all_bkg_map" on booking_room_mapping
  for all using (is_admin()) with check (is_admin());

-- Log de operações de sync (auditoria + troubleshooting)
create table if not exists booking_sync_log (
  id uuid primary key default gen_random_uuid(),
  operacao text not null check (operacao in ('pull_reservas','push_disponibilidade','push_tarifa','test_conn')),
  imovel_id uuid references imoveis(id) on delete set null,
  status text not null check (status in ('ok','erro','stub')),
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bkg_log_created on booking_sync_log (created_at desc);

alter table booking_sync_log enable row level security;
drop policy if exists "admin_all_bkg_log" on booking_sync_log;
create policy "admin_all_bkg_log" on booking_sync_log
  for all using (is_admin()) with check (is_admin());

comment on table booking_credentials is
  'Credenciais Booking Connectivity. v1: stub — senha via env var referenciada em password_secret_ref.';
comment on table booking_room_mapping is
  'De-para room_id Booking para imoveis.id. Um imóvel pode ter 1 room_id por conta.';
comment on table booking_sync_log is
  'Histórico de syncs Booking (pull/push). Útil pra debug quando a API real entrar.';
