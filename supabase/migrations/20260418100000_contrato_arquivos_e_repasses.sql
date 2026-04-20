-- ============================================================
-- ALVA Rent — anexos de contrato + taxa de administração + repasses
-- ============================================================

-- 1) Taxa de administração por contrato (default 10%)
alter table contratos
  add column if not exists taxa_administracao_pct numeric(5,2) not null default 10.00
    check (taxa_administracao_pct >= 0 and taxa_administracao_pct <= 100);

-- 2) Anexos de contrato (contrato assinado, aditivos, vistoria, etc)
create table if not exists contrato_arquivos (
  id             uuid primary key default gen_random_uuid(),
  contrato_id    uuid not null references contratos(id) on delete cascade,
  categoria      text not null default 'contrato'
                 check (categoria in ('contrato','aditivo','vistoria','comprovante','rg_cpf','outro')),
  nome           text not null,
  storage_path   text not null,
  mime           text,
  tamanho        bigint,
  uploaded_by    uuid references auth.users(id) on delete set null,
  uploaded_at    timestamptz not null default now()
);
create index if not exists idx_contrato_arquivos_contrato
  on contrato_arquivos(contrato_id, uploaded_at desc);

alter table contrato_arquivos enable row level security;

-- Admin: tudo; inquilino: só os do próprio contrato
drop policy if exists contrato_arquivos_admin_all on contrato_arquivos;
create policy contrato_arquivos_admin_all on contrato_arquivos
  for all to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists contrato_arquivos_inquilino_read on contrato_arquivos;
create policy contrato_arquivos_inquilino_read on contrato_arquivos
  for select to authenticated
  using (
    exists (
      select 1 from contratos c
      where c.id = contrato_arquivos.contrato_id
        and c.inquilino_id = current_inquilino_id()
    )
  );

-- 3) Repasses ao proprietário
create table if not exists repasses (
  id                      uuid primary key default gen_random_uuid(),
  boleto_id               uuid not null references boletos(id) on delete cascade,
  proprietario_id         uuid not null references proprietarios(id),
  valor_bruto             numeric(12,2) not null,
  taxa_administracao_pct  numeric(5,2)  not null,
  valor_taxa              numeric(12,2) not null,
  valor_liquido           numeric(12,2) not null,
  status                  text not null default 'pendente'
                          check (status in ('pendente','pago','cancelado')),
  data_repasse            date,
  forma_repasse           text,
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (boleto_id)
);
create index if not exists idx_repasses_status
  on repasses(status, created_at desc);
create index if not exists idx_repasses_proprietario
  on repasses(proprietario_id, created_at desc);
create trigger trg_repasses_updated before update on repasses
  for each row execute function set_updated_at();

alter table repasses enable row level security;
drop policy if exists repasses_admin_all on repasses;
create policy repasses_admin_all on repasses
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- 4) Storage bucket 'contratos' (privado) + policies
insert into storage.buckets (id, name, public)
  values ('contratos','contratos', false)
  on conflict (id) do nothing;

-- Admin sobe/lista/apaga; inquilino lê somente os anexos do próprio contrato
drop policy if exists "contratos admin rw" on storage.objects;
create policy "contratos admin rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'contratos' and is_admin())
  with check (bucket_id = 'contratos' and is_admin());

drop policy if exists "contratos inquilino read" on storage.objects;
create policy "contratos inquilino read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contratos'
    and exists (
      select 1 from contrato_arquivos ca
      join contratos c on c.id = ca.contrato_id
      where ca.storage_path = storage.objects.name
        and c.inquilino_id = current_inquilino_id()
    )
  );
