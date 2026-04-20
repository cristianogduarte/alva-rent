-- Portal do proprietário — PWA read-only em /proprietario
-- Adiciona user_id ao proprietário e cria policies de leitura.

alter table proprietarios
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_proprietarios_user on proprietarios (user_id);

comment on column proprietarios.user_id is
  'FK para auth.users — permite login do dono no portal /proprietario.';

-- Helper: retorna o id do proprietário logado (ou null se não é dono)
create or replace function proprietario_id_atual() returns uuid
language sql stable security definer set search_path = public as $$
  select id from proprietarios where user_id = auth.uid() limit 1;
$$;

-- Leitura do próprio registro
drop policy if exists "dono_le_seu_proprietario" on proprietarios;
create policy "dono_le_seu_proprietario" on proprietarios
  for select using (user_id = auth.uid());

-- Imóveis do dono
drop policy if exists "dono_le_seus_imoveis" on imoveis;
create policy "dono_le_seus_imoveis" on imoveis
  for select using (proprietario_id = proprietario_id_atual());

-- Contratos em imóveis do dono
drop policy if exists "dono_le_seus_contratos" on contratos;
create policy "dono_le_seus_contratos" on contratos
  for select using (
    imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
  );

-- Boletos em contratos do dono
drop policy if exists "dono_le_seus_boletos" on boletos;
create policy "dono_le_seus_boletos" on boletos
  for select using (
    contrato_id in (
      select c.id from contratos c
      join imoveis i on i.id = c.imovel_id
      where i.proprietario_id = proprietario_id_atual()
    )
  );

-- Estadas em imóveis do dono
drop policy if exists "dono_le_suas_estadas" on estadas;
create policy "dono_le_suas_estadas" on estadas
  for select using (
    imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
  );

-- Hóspedes das estadas do dono
drop policy if exists "dono_le_seus_hospedes" on hospedes;
create policy "dono_le_seus_hospedes" on hospedes
  for select using (
    id in (
      select hospede_id from estadas
      where imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
    )
  );

-- Pagamentos das estadas do dono
drop policy if exists "dono_le_seus_estada_pgtos" on estada_pagamentos;
create policy "dono_le_seus_estada_pgtos" on estada_pagamentos
  for select using (
    estada_id in (
      select id from estadas
      where imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
    )
  );

-- Repasses do dono
drop policy if exists "dono_le_seus_repasses" on repasses;
create policy "dono_le_seus_repasses" on repasses
  for select using (proprietario_id = proprietario_id_atual());

-- Hospedagem (ficha operacional dos seus imóveis)
drop policy if exists "dono_le_sua_hospedagem" on imovel_hospedagem;
create policy "dono_le_sua_hospedagem" on imovel_hospedagem
  for select using (
    imovel_id in (select id from imoveis where proprietario_id = proprietario_id_atual())
  );
