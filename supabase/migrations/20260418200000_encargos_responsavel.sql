-- Responsável pelo IPTU e pelo Condomínio (locatário ou locador)
alter table contratos
  add column if not exists iptu_responsavel text not null default 'locatario'
    check (iptu_responsavel in ('locatario','locador')),
  add column if not exists condominio_responsavel text not null default 'locatario'
    check (condominio_responsavel in ('locatario','locador'));
