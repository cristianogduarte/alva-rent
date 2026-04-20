-- Etapa 1 — Fundação do módulo Short Stay
-- Campos novos em imoveis + tabelas base (hospedes, estadas, estada_pagamentos, imovel_hospedagem, ota_payouts, ical_feeds)
-- Tabelas são criadas vazias; CRUDs vêm nas próximas etapas.

-- ============================================================
-- 1. IMÓVEIS: modalidade + campos de short stay
-- ============================================================
alter table imoveis
  add column if not exists modalidade text not null default 'long_stay'
    check (modalidade in ('long_stay', 'short_stay')),
  add column if not exists diaria_base numeric(10,2),
  add column if not exists capacidade_hospedes int,
  add column if not exists checkin_time time default '15:00',
  add column if not exists checkout_time time default '11:00';

create index if not exists idx_imoveis_modalidade on imoveis (modalidade);

-- ============================================================
-- 2. IMOVEL_HOSPEDAGEM — ficha operacional (1:1 com imoveis quando short)
-- ============================================================
create table if not exists imovel_hospedagem (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null unique references imoveis(id) on delete cascade,
  wifi_ssid text,
  wifi_senha text,
  codigo_fechadura text,
  instrucoes_acesso text,
  regras_casa text,
  observacoes_limpeza text,
  manual_url text,
  contatos_emergencia jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3. HOSPEDES — mais leve que inquilinos (pode ser gringo)
-- ============================================================
create table if not exists hospedes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  email text,
  telefone text,
  pais text default 'BR',
  origem text default 'direto' check (origem in ('airbnb', 'booking', 'direto', 'outro')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hospedes_email on hospedes (email);

-- ============================================================
-- 4. ESTADAS — equivalente de contratos para short stay
-- ============================================================
create table if not exists estadas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  imovel_id uuid not null references imoveis(id) on delete restrict,
  hospede_id uuid references hospedes(id) on delete set null,

  data_checkin date not null,
  data_checkout date not null,
  noites int generated always as (data_checkout - data_checkin) stored,
  numero_hospedes int default 1,

  valor_diaria numeric(10,2) not null default 0,
  valor_total numeric(10,2) not null default 0,
  taxa_limpeza numeric(10,2) default 0,
  taxa_plataforma numeric(10,2) default 0,

  canal text not null default 'direto' check (canal in ('airbnb', 'booking', 'direto', 'outro')),
  canal_reserva_id text,

  status text not null default 'pre_reservada'
    check (status in ('pre_reservada', 'confirmada', 'checkin', 'checkout', 'cancelada')),

  taxa_administracao_pct numeric(5,2) not null default 10.00,

  observacoes text,
  acesso_token text unique default replace(gen_random_uuid()::text, '-', ''),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint estadas_datas_ok check (data_checkout > data_checkin)
);

create index if not exists idx_estadas_imovel on estadas (imovel_id);
create index if not exists idx_estadas_checkin on estadas (data_checkin);
create index if not exists idx_estadas_canal_ref on estadas (canal, canal_reserva_id);
create index if not exists idx_estadas_status on estadas (status);

-- ============================================================
-- 5. ESTADA_PAGAMENTOS — 1:N por estada
-- ============================================================
create table if not exists estada_pagamentos (
  id uuid primary key default gen_random_uuid(),
  estada_id uuid not null references estadas(id) on delete cascade,
  tipo text not null default 'saldo'
    check (tipo in ('sinal', 'saldo', 'caucao', 'limpeza', 'total')),
  valor numeric(10,2) not null,
  data_vencimento date,
  data_pagamento date,
  forma text check (forma in ('pix', 'boleto', 'airbnb_payout', 'booking_payout', 'cartao_externo', 'outro')),
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'cancelado', 'reembolsado')),
  inter_cobranca_id text,
  payout_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_estada_pgto_estada on estada_pagamentos (estada_id);
create index if not exists idx_estada_pgto_status on estada_pagamentos (status);

-- ============================================================
-- 6. OTA_PAYOUTS — extratos importados do Airbnb/Booking
-- ============================================================
create table if not exists ota_payouts (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('airbnb', 'booking', 'outro')),
  data_payout date not null,
  valor_bruto numeric(10,2) not null,
  valor_liquido numeric(10,2) not null,
  taxa_plataforma numeric(10,2) default 0,
  referencia_externa text,
  estada_pagamento_id uuid references estada_pagamentos(id) on delete set null,
  arquivo_origem text,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ota_payouts_canal_ref on ota_payouts (canal, referencia_externa);
create index if not exists idx_ota_payouts_conciliado on ota_payouts (estada_pagamento_id);

-- ============================================================
-- 7. ICAL_FEEDS — URLs de sincronização por imóvel × canal
-- ============================================================
create table if not exists ical_feeds (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  canal text not null check (canal in ('airbnb', 'booking', 'outro')),
  url_import text,
  url_export_token text unique default replace(gen_random_uuid()::text, '-', ''),
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (imovel_id, canal)
);

create index if not exists idx_ical_feeds_imovel on ical_feeds (imovel_id);

-- ============================================================
-- 8. REPASSES — adiciona FK para estada_pagamento (exclusive-or com boleto_id)
-- ============================================================
alter table repasses
  add column if not exists estada_pagamento_id uuid references estada_pagamentos(id) on delete set null;

-- Se sua tabela repasses tinha boleto_id NOT NULL, tornar nullable para permitir short stay:
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'repasses' and column_name = 'boleto_id' and is_nullable = 'NO'
  ) then
    alter table repasses alter column boleto_id drop not null;
  end if;
end$$;

-- Garante exclusive-or: ou boleto_id ou estada_pagamento_id, nunca ambos vazios
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'repasses_fonte_xor'
  ) then
    alter table repasses add constraint repasses_fonte_xor
      check (
        (boleto_id is not null and estada_pagamento_id is null) or
        (boleto_id is null and estada_pagamento_id is not null)
      );
  end if;
end$$;

-- ============================================================
-- 9. RLS — apenas admin por enquanto (hóspede via token público nas etapas 7-8)
-- ============================================================
alter table imovel_hospedagem enable row level security;
alter table hospedes enable row level security;
alter table estadas enable row level security;
alter table estada_pagamentos enable row level security;
alter table ota_payouts enable row level security;
alter table ical_feeds enable row level security;

do $$
declare t text;
begin
  foreach t in array array['imovel_hospedagem','hospedes','estadas','estada_pagamentos','ota_payouts','ical_feeds']
  loop
    execute format(
      'drop policy if exists "%1$s_admin_all" on %1$s;
       create policy "%1$s_admin_all" on %1$s
         for all using (is_admin()) with check (is_admin());',
      t
    );
  end loop;
end$$;

-- ============================================================
-- 10. TRIGGERS de updated_at
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['imovel_hospedagem','hospedes','estadas','estada_pagamentos','ical_feeds']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();',
      t
    );
  end loop;
end$$;
