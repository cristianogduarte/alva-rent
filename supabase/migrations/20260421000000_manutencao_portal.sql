-- Portal do inquilino pode abrir chamados de manutenção + anexar fotos.

-- ─── RLS: inquilino lê/escreve manutenções do SEU contrato ───
drop policy if exists "inquilino_le_manut" on manutencoes;
create policy "inquilino_le_manut" on manutencoes
  for select using (
    imovel_id in (
      select imovel_id from contratos where inquilino_id = current_inquilino_id()
    )
  );

drop policy if exists "inquilino_cria_manut" on manutencoes;
create policy "inquilino_cria_manut" on manutencoes
  for insert with check (
    origem = 'hospede'
    and imovel_id in (
      select imovel_id from contratos where inquilino_id = current_inquilino_id()
    )
  );

-- ─── Bucket público de fotos de manutenção ───
insert into storage.buckets (id, name, public, file_size_limit)
values ('manutencao', 'manutencao', true, 10485760) -- 10MB, público (URL compartilhável com fornecedor)
on conflict (id) do nothing;

drop policy if exists "manut_admin_all" on storage.objects;
create policy "manut_admin_all" on storage.objects
  for all using (bucket_id = 'manutencao' and is_admin())
  with check (bucket_id = 'manutencao' and is_admin());

-- Inquilinos podem fazer upload no bucket
drop policy if exists "manut_inq_upload" on storage.objects;
create policy "manut_inq_upload" on storage.objects
  for insert with check (
    bucket_id = 'manutencao' and auth.uid() is not null
  );

-- Leitura pública (bucket público, mas explicitamos)
drop policy if exists "manut_public_read" on storage.objects;
create policy "manut_public_read" on storage.objects
  for select using (bucket_id = 'manutencao');

comment on policy "inquilino_le_manut" on manutencoes is
  'Inquilino vê chamados do imóvel onde tem contrato.';
comment on policy "inquilino_cria_manut" on manutencoes is
  'Inquilino pode abrir chamado (origem=hospede) no próprio imóvel.';
