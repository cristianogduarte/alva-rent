-- ============================================================
-- ALVA Rent — schema inicial
-- ============================================================

-- Helper: trigger pra atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- proprietarios (caso o imóvel não seja do MERCK direto)
-- ============================================================
create table proprietarios (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  cpf_cnpj        text unique,
  email           text,
  telefone        text,
  comissao_pct    numeric(5,2) default 0,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_proprietarios_updated before update on proprietarios
  for each row execute function set_updated_at();

-- ============================================================
-- imoveis
-- ============================================================
create table imoveis (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique not null,
  tipo            text not null check (tipo in ('apartamento','casa','sala','loja','outro')),
  endereco        text not null,
  numero          text,
  complemento     text,
  bairro          text,
  cidade          text not null,
  uf              char(2) not null,
  cep             text,
  area_m2         numeric(10,2),
  iptu_anual      numeric(12,2),
  cond_mensal     numeric(12,2),
  proprietario_id uuid references proprietarios(id),
  status          text not null default 'vago' check (status in ('vago','alugado','manutencao','vendido')),
  observacoes     text,
  fotos           jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_imoveis_status on imoveis(status);
create index idx_imoveis_cidade on imoveis(cidade, uf);
create trigger trg_imoveis_updated before update on imoveis
  for each row execute function set_updated_at();

-- ============================================================
-- inquilinos
-- ============================================================
create table inquilinos (
  id              uuid primary key default gen_random_uuid(),
  cpf             text unique not null,
  nome            text not null,
  rg              text,
  email           text,
  telefone        text,
  whatsapp        text,
  data_nascimento date,
  profissao       text,
  renda           numeric(12,2),
  fiador_nome     text,
  fiador_cpf      text,
  seguro_fianca   boolean not null default false,
  user_id         uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_inquilinos_cpf on inquilinos(cpf);
create index idx_inquilinos_user on inquilinos(user_id);
create trigger trg_inquilinos_updated before update on inquilinos
  for each row execute function set_updated_at();

-- ============================================================
-- contratos
-- ============================================================
create table contratos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text unique not null,
  imovel_id           uuid not null references imoveis(id),
  inquilino_id        uuid not null references inquilinos(id),
  valor_aluguel       numeric(12,2) not null check (valor_aluguel > 0),
  valor_condominio    numeric(12,2) not null default 0,
  valor_iptu_mensal   numeric(12,2) not null default 0,
  outras_taxas        numeric(12,2) not null default 0,
  dia_vencimento      int not null check (dia_vencimento between 1 and 28),
  indice_reajuste     text not null default 'IGPM' check (indice_reajuste in ('IGPM','IPCA','INPC','fixo')),
  multa_atraso_pct    numeric(5,2) not null default 2.0,
  juros_dia_pct       numeric(7,4) not null default 0.0333,
  data_inicio         date not null,
  data_fim            date not null,
  contrato_pdf_url    text,
  canal_envio         text[] not null default '{whatsapp,email}',
  status              text not null default 'ativo' check (status in ('ativo','encerrado','rescindido','suspenso')),
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index idx_contratos_status on contratos(status, data_fim);
create index idx_contratos_imovel on contratos(imovel_id);
create index idx_contratos_inquilino on contratos(inquilino_id);
create trigger trg_contratos_updated before update on contratos
  for each row execute function set_updated_at();

-- ============================================================
-- boletos
-- ============================================================
create table boletos (
  id                  uuid primary key default gen_random_uuid(),
  contrato_id         uuid not null references contratos(id) on delete cascade,
  competencia         date not null,
  valor_total         numeric(12,2) not null check (valor_total > 0),
  data_vencimento     date not null,
  inter_codigo_solic  text unique,
  inter_nosso_numero  text,
  inter_seu_numero    text,
  linha_digitavel     text,
  pix_copia_cola      text,
  pix_qrcode_base64   text,
  pdf_url             text,
  status              text not null default 'criado' check (status in
                        ('criado','enviado','visualizado','pago','vencido','cancelado','expirado')),
  data_envio          timestamptz,
  data_pagamento      timestamptz,
  valor_pago          numeric(12,2),
  forma_pagamento     text check (forma_pagamento in ('BOLETO','PIX')),
  webhook_payload     jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Idempotência: 1 boleto por mês por contrato
create unique index uniq_boleto_contrato_compet on boletos(contrato_id, competencia);
create index idx_boletos_status_venc on boletos(status, data_vencimento);
create trigger trg_boletos_updated before update on boletos
  for each row execute function set_updated_at();

-- ============================================================
-- historico (timeline do contrato)
-- ============================================================
create table historico (
  id            uuid primary key default gen_random_uuid(),
  contrato_id   uuid not null references contratos(id) on delete cascade,
  tipo          text not null check (tipo in
                  ('boleto_emitido','boleto_enviado','boleto_visualizado','boleto_pago','boleto_atrasado',
                   'mensagem','ligacao','manutencao','vistoria','reajuste','renovacao','observacao')),
  titulo        text not null,
  descricao     text,
  metadata      jsonb,
  autor_id      uuid references auth.users(id),
  ocorrido_em   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index idx_historico_contrato on historico(contrato_id, ocorrido_em desc);

-- ============================================================
-- pendencias (chamados / manutenções)
-- ============================================================
create table pendencias (
  id              uuid primary key default gen_random_uuid(),
  contrato_id     uuid not null references contratos(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  prioridade      text not null default 'media' check (prioridade in ('baixa','media','alta','urgente')),
  status          text not null default 'aberta' check (status in ('aberta','andamento','resolvida','cancelada')),
  responsavel_id  uuid references auth.users(id),
  prazo           date,
  fotos           jsonb not null default '[]'::jsonb,
  aberto_por      text not null default 'admin' check (aberto_por in ('admin','inquilino')),
  custo           numeric(12,2),
  created_at      timestamptz not null default now(),
  resolvido_em    timestamptz
);
create index idx_pendencias_status on pendencias(status, prazo);
create index idx_pendencias_contrato on pendencias(contrato_id);

-- ============================================================
-- reguas_cobranca (templates de mensagem por canal)
-- ============================================================
create table reguas_cobranca (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  dias_offset   int not null,           -- negativo = antes do venc.; positivo = depois
  canal         text not null check (canal in ('whatsapp','email','push')),
  assunto       text,                   -- email
  mensagem      text not null,          -- pode usar tags {nome}, {valor}, {venc}
  ativa         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Régua padrão
insert into reguas_cobranca (nome, dias_offset, canal, assunto, mensagem) values
  ('Lembrete 3d antes', -3, 'whatsapp', null,
   'Olá {nome}! Lembrando que seu boleto de {competencia} vence em 3 dias ({venc}). Valor: R$ {valor}. Qualquer coisa, é só chamar.'),
  ('Aviso no dia', 0, 'email', 'Boleto vence hoje',
   'Olá {nome}, seu boleto de aluguel vence hoje. Valor: R$ {valor}. Acesse o portal para 2ª via.'),
  ('Cobrança 3d depois', 3, 'whatsapp', null,
   'Olá {nome}, identificamos que o boleto vencido em {venc} ainda não foi pago. Posso ajudar?'),
  ('Cobrança formal 7d', 7, 'email', 'Aluguel em atraso',
   'Prezado(a) {nome}, o aluguel referente a {competencia} encontra-se em atraso. Por favor regularize.');

-- ============================================================
-- audit_log (LGPD + auditoria de mutações sensíveis)
-- ============================================================
create table audit_log (
  id            bigserial primary key,
  tabela        text not null,
  registro_id   uuid not null,
  acao          text not null check (acao in ('insert','update','delete')),
  diff          jsonb,
  autor_id      uuid references auth.users(id),
  ip            inet,
  created_at    timestamptz not null default now()
);
create index idx_audit_tabela_reg on audit_log(tabela, registro_id);
create index idx_audit_autor on audit_log(autor_id, created_at desc);

-- ============================================================
-- usuarios_admin (perfil estendido dos admins MERCK)
-- ============================================================
create table usuarios_admin (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  cargo       text,
  permissoes  text[] not null default '{visualizar,editar}',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('boletos', 'boletos', false),
  ('contratos', 'contratos', false),
  ('imoveis', 'imoveis', true),       -- fotos públicas dos imóveis
  ('vistorias', 'vistorias', false),
  ('chamados', 'chamados', false)
on conflict (id) do nothing;

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table imoveis        enable row level security;
alter table inquilinos     enable row level security;
alter table contratos      enable row level security;
alter table boletos        enable row level security;
alter table historico      enable row level security;
alter table pendencias     enable row level security;
alter table proprietarios  enable row level security;
alter table reguas_cobranca enable row level security;
alter table usuarios_admin enable row level security;

-- helper: o usuário é admin?
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from usuarios_admin
    where user_id = auth.uid() and ativo = true
  );
$$;

-- helper: pegar inquilino_id do usuário logado
create or replace function current_inquilino_id() returns uuid
language sql security definer stable as $$
  select id from inquilinos where user_id = auth.uid() limit 1;
$$;

-- ─── Admin: full access em tudo ───
create policy "admin_all_imoveis" on imoveis
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_inquilinos" on inquilinos
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_contratos" on contratos
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_boletos" on boletos
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_historico" on historico
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_pendencias" on pendencias
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_proprietarios" on proprietarios
  for all using (is_admin()) with check (is_admin());
create policy "admin_all_reguas" on reguas_cobranca
  for all using (is_admin()) with check (is_admin());
create policy "admin_self_usuarios" on usuarios_admin
  for select using (is_admin());

-- ─── Inquilino: apenas seus dados ───
create policy "inquilino_own_data" on inquilinos
  for select using (user_id = auth.uid());

create policy "inquilino_own_contratos" on contratos
  for select using (inquilino_id = current_inquilino_id());

create policy "inquilino_own_boletos" on boletos
  for select using (
    contrato_id in (select id from contratos where inquilino_id = current_inquilino_id())
  );

create policy "inquilino_own_historico" on historico
  for select using (
    contrato_id in (select id from contratos where inquilino_id = current_inquilino_id())
  );

create policy "inquilino_own_pendencias" on pendencias
  for select using (
    contrato_id in (select id from contratos where inquilino_id = current_inquilino_id())
  );

create policy "inquilino_create_pendencia" on pendencias
  for insert with check (
    contrato_id in (select id from contratos where inquilino_id = current_inquilino_id())
    and aberto_por = 'inquilino'
  );

-- ============================================================
-- Seeds mínimos
-- ============================================================
-- (opcional: rodar separado em supabase/seed.sql)
