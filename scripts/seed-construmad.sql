-- ============================================================
-- Limpeza dos seeds fictícios + cadastro real CONSTRUMAD
-- ============================================================

-- 1) Apaga seeds antigos (CASCADE cuida de historico/reguas/etc)
delete from contratos where codigo like 'CTR-SEED-%';
delete from imoveis   where codigo like 'IMV-SEED-%';
delete from inquilinos where cpf in ('11111111111','22222222222','33333333333');
delete from proprietarios where nome = 'Grupo MERCK Empreendimentos';

-- 2) Proprietário CONSTRUMAD
insert into proprietarios (id, nome, cpf_cnpj, telefone, comissao_pct, observacoes)
values (
  'c057c057-0000-0000-0000-000000000001'::uuid,
  'CONSTRUMAD CONSTRUÇÃO TECNOLOGIA E ARTE LTDA',
  '04148089000269',
  null,
  10.00,
  'Administrada por ALVA Rent · Taxa 10% · Repasse 90%'
)
on conflict (cpf_cnpj) do update set
  nome = excluded.nome,
  comissao_pct = excluded.comissao_pct,
  observacoes = excluded.observacoes
returning id;

-- 3) Imóveis (4 kitnets — Rua Panamá lote 26 Qd H, Jd Nautillus II, Cabo Frio/RJ)
-- 101, 103, 106, 107
insert into imoveis (codigo, tipo, endereco, numero, complemento, bairro, cidade, uf, cep, proprietario_id, status, observacoes)
values
  ('JN-101', 'apartamento', 'Rua Panamá, lote 26, Quadra H', 'apto 101', 'em frente à Igreja de Santo Expedito', 'Jardim Nautillus II', 'Cabo Frio', 'RJ', '28909-200',
   'c057c057-0000-0000-0000-000000000001'::uuid, 'alugado', 'Kitnet'),
  ('JN-103', 'apartamento', 'Rua Panamá, lote 26, Quadra H', 'apto 103', 'em frente à Igreja de Santo Expedito', 'Jardim Nautillus II', 'Cabo Frio', 'RJ', '28909-200',
   'c057c057-0000-0000-0000-000000000001'::uuid, 'vago',    'Kitnet'),
  ('JN-106', 'apartamento', 'Rua Panamá, lote 26, Quadra H', 'apto 106', 'em frente à Igreja de Santo Expedito', 'Jardim Nautillus II', 'Cabo Frio', 'RJ', '28909-200',
   'c057c057-0000-0000-0000-000000000001'::uuid, 'alugado', 'Kitnet'),
  ('JN-107', 'apartamento', 'Rua Panamá, lote 26, Quadra H', 'apto 107', 'em frente à Igreja de Santo Expedito', 'Jardim Nautillus II', 'Cabo Frio', 'RJ', '28909-200',
   'c057c057-0000-0000-0000-000000000001'::uuid, 'alugado', 'Kitnet')
on conflict (codigo) do update set
  status = excluded.status,
  proprietario_id = excluded.proprietario_id,
  observacoes = excluded.observacoes;

-- 4) Inquilinos
insert into inquilinos (cpf, nome, rg, email, whatsapp, telefone, profissao)
values
  ('08154537524', 'Cailane da Silva Sousa',  '356746628', 'kailannesouza@gmail.com', '22998920444', '22998920444', 'Autônoma'),
  ('93540965491', 'Carlos de Souza Pereira', '126415694', null,                      null,          null,          'Gesseiro (MEI)'),
  ('12851890786', 'Douglas Gonçalves Freire','265944389', 'douglasgfreire@outlook.com','22999807646','22999807646','Auxiliar Financeiro')
on conflict (cpf) do update set
  nome = excluded.nome,
  rg = excluded.rg,
  email = excluded.email,
  whatsapp = excluded.whatsapp,
  telefone = excluded.telefone,
  profissao = excluded.profissao;

-- Douglas tem fiador
update inquilinos
  set fiador_nome = 'Wellington Nogueira Schuchmann',
      fiador_cpf  = '01618604600'
  where cpf = '12851890786';

-- 5) Contratos
with
  i101 as (select id from imoveis where codigo = 'JN-101'),
  i106 as (select id from imoveis where codigo = 'JN-106'),
  i107 as (select id from imoveis where codigo = 'JN-107'),
  q1 as (select id from inquilinos where cpf = '08154537524'),
  q2 as (select id from inquilinos where cpf = '93540965491'),
  q3 as (select id from inquilinos where cpf = '12851890786')
insert into contratos (
  codigo, imovel_id, inquilino_id, valor_aluguel, dia_vencimento,
  indice_reajuste, data_inicio, data_fim, status, taxa_administracao_pct, observacoes
)
values
  ('CTR-JN-101', (select id from i101), (select id from q1), 1100.00, 5, 'IGPM', '2026-03-09', '2027-03-09', 'ativo', 10.00, 'Contrato AYG (aguardando arquivo atualizado). Caução 2x.'),
  ('CTR-JN-106', (select id from i106), (select id from q2),  700.00, 5, 'IGPM', '2025-11-01', '2026-11-01', 'ativo', 10.00, 'Caução 1x R$700.'),
  ('CTR-JN-107', (select id from i107), (select id from q3),  750.00, 5, 'IGPM', '2025-11-17', '2026-11-17', 'ativo', 10.00, 'Caução 1x R$750. Possui fiador.')
on conflict (codigo) do update set
  valor_aluguel = excluded.valor_aluguel,
  data_inicio = excluded.data_inicio,
  data_fim = excluded.data_fim,
  status = excluded.status,
  observacoes = excluded.observacoes;
