-- Etapa 11 — Manutenção
-- Tickets de manutenção por imóvel + cadastro de fornecedores.
-- Não há integração automática com Construmad na v1: quando precisar, o admin
-- simplesmente pega o telefone do fornecedor/obras e resolve fora do sistema.

create table if not exists fornecedores_manutencao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especialidade text,                     -- elétrica, hidráulica, ar-cond, geral, etc.
  telefone text,
  email text,
  pix text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_forn_manut_ativo on fornecedores_manutencao (ativo) where ativo = true;

alter table fornecedores_manutencao enable row level security;
drop policy if exists "admin_all_forn_manut" on fornecedores_manutencao;
create policy "admin_all_forn_manut" on fornecedores_manutencao
  for all using (is_admin()) with check (is_admin());

create table if not exists manutencoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  estada_id uuid references estadas(id) on delete set null,
  fornecedor_id uuid references fornecedores_manutencao(id) on delete set null,
  tipo text not null check (tipo in ('preventiva','corretiva','vistoria','reparo')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa','media','alta','urgente')),
  status text not null default 'aberta'
    check (status in ('aberta','agendada','em_andamento','resolvida','cancelada')),
  titulo text not null,
  descricao text,
  origem text not null default 'admin'
    check (origem in ('admin','hospede','vistoria','preventiva')),
  custo numeric(10,2),
  fotos jsonb not null default '[]'::jsonb,  -- array de URLs no Storage
  aberta_em timestamptz not null default now(),
  agendada_para timestamptz,
  resolvida_em timestamptz,
  observacoes_resolucao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manut_imovel on manutencoes (imovel_id, created_at desc);
create index if not exists idx_manut_status on manutencoes (status);
create index if not exists idx_manut_prioridade on manutencoes (prioridade) where status in ('aberta','agendada','em_andamento');

-- trigger simples pra manter updated_at
create or replace function fn_manutencoes_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'resolvida' and old.status <> 'resolvida' and new.resolvida_em is null then
    new.resolvida_em = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_manut_updated on manutencoes;
create trigger trg_manut_updated before update on manutencoes
  for each row execute function fn_manutencoes_updated_at();

alter table manutencoes enable row level security;

drop policy if exists "admin_all_manut" on manutencoes;
create policy "admin_all_manut" on manutencoes
  for all using (is_admin()) with check (is_admin());

-- Dono vê manutenções das suas unidades (read-only)
drop policy if exists "dono_le_manut" on manutencoes;
create policy "dono_le_manut" on manutencoes
  for select using (
    imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
  );

comment on table fornecedores_manutencao is
  'Cadastro de fornecedores externos (eletricista, encanador, etc). Nada conectado a Construmad.';
comment on table manutencoes is
  'Tickets de manutenção preventiva/corretiva/vistoria/reparo por imóvel.';
