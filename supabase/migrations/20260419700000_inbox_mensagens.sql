-- M1 Inbox unificada — mensagens por estada
-- Captura conversas vindas de WhatsApp (Z-API), email, Airbnb, Booking ou manual.

create table if not exists estada_mensagens (
  id uuid primary key default gen_random_uuid(),
  estada_id uuid not null references estadas(id) on delete cascade,
  origem text not null check (origem in ('hospede', 'ia', 'admin')),
  canal text not null check (canal in ('whatsapp', 'email', 'airbnb', 'booking', 'sms', 'manual')),
  texto text not null,
  status text not null default 'recebida'
    check (status in ('recebida', 'rascunho', 'enviada', 'arquivada')),
  autor text, -- nome/identificador quando origem=admin (qual operador)
  metadata jsonb not null default '{}'::jsonb,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_msg_estada on estada_mensagens (estada_id, created_at desc);
create index if not exists idx_msg_status on estada_mensagens (status);
create index if not exists idx_msg_nao_lida on estada_mensagens (estada_id) where lida = false and origem = 'hospede';

-- RLS
alter table estada_mensagens enable row level security;

drop policy if exists "admin_all_msg" on estada_mensagens;
create policy "admin_all_msg" on estada_mensagens
  for all using (is_admin()) with check (is_admin());

-- Dono enxerga mensagens das suas estadas (read-only)
drop policy if exists "dono_le_msg" on estada_mensagens;
create policy "dono_le_msg" on estada_mensagens
  for select using (
    estada_id in (
      select id from estadas
      where imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
    )
  );

comment on table estada_mensagens is
  'Conversas da inbox unificada. Origem=hospede/ia/admin · Canal=whatsapp/email/airbnb/booking/sms/manual.';
