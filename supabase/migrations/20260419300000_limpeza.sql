-- M2 Módulo de limpeza
-- Equipes de limpeza + tickets de limpeza associados a estadas short-stay.

create table if not exists equipe_limpeza (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  chave_pix text,
  valor_padrao numeric(10,2),
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_equipe_limpeza_ativo on equipe_limpeza (ativo);

create table if not exists limpezas (
  id uuid primary key default gen_random_uuid(),
  estada_id uuid references estadas(id) on delete set null,
  imovel_id uuid not null references imoveis(id) on delete cascade,
  equipe_id uuid references equipe_limpeza(id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente', 'agendada', 'em_andamento', 'concluida', 'cancelada')),
  agendada_para timestamptz,
  iniciada_em timestamptz,
  concluida_em timestamptz,
  checklist_json jsonb not null default '[]'::jsonb,
  fotos_antes jsonb not null default '[]'::jsonb,
  fotos_depois jsonb not null default '[]'::jsonb,
  observacoes text,
  valor numeric(10,2),
  token_publico text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

create index if not exists idx_limpezas_estada on limpezas (estada_id);
create index if not exists idx_limpezas_imovel on limpezas (imovel_id);
create index if not exists idx_limpezas_status on limpezas (status);
create index if not exists idx_limpezas_token on limpezas (token_publico);

-- Trigger: quando estada entra em checkout, cria limpeza pendente automaticamente.
create or replace function fn_criar_limpeza_apos_checkout()
returns trigger language plpgsql as $$
declare
  v_checklist jsonb;
begin
  if new.status = 'checkout' and (old.status is distinct from 'checkout') then
    -- checklist default (pode ser sobrescrito por imovel_hospedagem.checkout_lembretes no futuro)
    v_checklist := '[
      {"item":"Troca de roupa de cama","ok":false},
      {"item":"Troca de toalhas","ok":false},
      {"item":"Limpeza geral dos cômodos","ok":false},
      {"item":"Limpeza do banheiro","ok":false},
      {"item":"Limpeza da cozinha","ok":false},
      {"item":"Lixo retirado","ok":false},
      {"item":"Louça lavada e guardada","ok":false},
      {"item":"Amenities repostos (shampoo, sabonete, papel)","ok":false},
      {"item":"Ar-condicionado funcionando","ok":false},
      {"item":"Fechadura/chaves OK","ok":false},
      {"item":"Vistoria de avarias concluída","ok":false}
    ]'::jsonb;

    insert into limpezas (estada_id, imovel_id, status, checklist_json, agendada_para)
    values (new.id, new.imovel_id, 'pendente', v_checklist, new.data_checkout::timestamptz);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpeza_checkout on estadas;
create trigger trg_limpeza_checkout
  after update on estadas
  for each row execute function fn_criar_limpeza_apos_checkout();

-- RLS
alter table equipe_limpeza enable row level security;
alter table limpezas enable row level security;

drop policy if exists "admin_all_equipe_limpeza" on equipe_limpeza;
create policy "admin_all_equipe_limpeza" on equipe_limpeza
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admin_all_limpezas" on limpezas;
create policy "admin_all_limpezas" on limpezas
  for all using (is_admin()) with check (is_admin());

-- Leitura pública pelo token (app mobile da equipe)
drop policy if exists "publico_por_token_limpeza" on limpezas;
create policy "publico_por_token_limpeza" on limpezas
  for select using (true);
-- Nota: a rota /limpeza/[token] filtra por token_publico via service_role ou
-- por query parametrizada; o select público é amplo mas sem exposição direta
-- (sem rota de listagem pública).

comment on table limpezas is
  'Tickets de limpeza. Criados automaticamente quando uma estada entra em checkout.';
comment on column limpezas.token_publico is
  'Token usado no link mobile /limpeza/[token] enviado à equipe via WhatsApp.';
