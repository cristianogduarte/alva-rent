-- ============================================================
-- ALVA Rent — seeds de desenvolvimento
-- Carteira MERCK em Cabo Frio/RJ (valores realistas 2026)
-- ============================================================
--
-- Rodar local:  supabase db reset        (aplica migration + este seed)
-- Rodar remoto: psql $DATABASE_URL -f supabase/seed.sql
--
-- UUIDs fixos pra facilitar referências cruzadas em testes.

-- Limpa seeds anteriores (idempotente)
delete from historico       where contrato_id in (select id from contratos where codigo like 'CTR-SEED-%');
delete from boletos         where contrato_id in (select id from contratos where codigo like 'CTR-SEED-%');
delete from contratos       where codigo like 'CTR-SEED-%';
delete from inquilinos      where cpf in ('11111111111','22222222222','33333333333');
delete from imoveis         where codigo like 'IMV-SEED-%';
delete from proprietarios   where cpf_cnpj = '00000000000191';

-- ───────────── Proprietário (Grupo MERCK) ─────────────
insert into proprietarios (id, nome, cpf_cnpj, email, telefone, comissao_pct) values
  ('aaaaaaaa-0000-0000-0000-00000000a001',
   'Grupo MERCK Empreendimentos', '00000000000191',
   'financeiro@merck.com.br', '(22) 2645-0000', 0);

-- ───────────── Imóveis (Cabo Frio/RJ) ─────────────
insert into imoveis (id, codigo, tipo, endereco, numero, complemento, bairro, cidade, uf, cep,
                     area_m2, iptu_anual, cond_mensal, proprietario_id, status, observacoes) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'IMV-SEED-001', 'casa',
   'Rua das Acácias', '45', null, 'Peró', 'Cabo Frio', 'RJ', '28923-120',
   180.00, 1680.00, 0,
   'aaaaaaaa-0000-0000-0000-00000000a001',
   'alugado', 'Casa 3 quartos, 2 vagas, quintal. Reformada em 2024.'),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   'IMV-SEED-002', 'apartamento',
   'Avenida Assunção', '1240', 'Apto 302', 'Passagem', 'Cabo Frio', 'RJ', '28905-340',
   85.00, 980.00, 480.00,
   'aaaaaaaa-0000-0000-0000-00000000a001',
   'alugado', '2 quartos, vista parcial lagoa, portaria 24h.'),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   'IMV-SEED-003', 'sala',
   'Rua Teixeira e Souza', '88', 'Sala 501', 'Centro', 'Cabo Frio', 'RJ', '28905-020',
   42.00, 620.00, 350.00,
   'aaaaaaaa-0000-0000-0000-00000000a001',
   'alugado', 'Sala comercial de esquina, ar condicionado, copa.');

-- ───────────── Inquilinos ─────────────
insert into inquilinos (id, cpf, nome, rg, email, telefone, whatsapp, profissao, renda, seguro_fianca) values
  ('cccccccc-0000-0000-0000-000000000001',
   '11111111111', 'Mariana Torres Oliveira', '12.345.678-9',
   'mariana.torres@email.com', '(22) 99811-0201', '(22) 99811-0201',
   'Professora', 6800.00, true),

  ('cccccccc-0000-0000-0000-000000000002',
   '22222222222', 'Ricardo Mendes Azevedo', '23.456.789-0',
   'ricardo.mendes@email.com', '(22) 99722-3344', '(22) 99722-3344',
   'Analista de Sistemas', 8500.00, false),

  ('cccccccc-0000-0000-0000-000000000003',
   '33333333333', 'Juliana Peixoto Arquitetura ME', null,
   'juliana@jparquitetura.com.br', '(22) 99655-7788', '(22) 99655-7788',
   'Arquiteta', 12000.00, false);

-- ───────────── Contratos ativos ─────────────
insert into contratos (id, codigo, imovel_id, inquilino_id,
                       valor_aluguel, valor_condominio, valor_iptu_mensal, outras_taxas,
                       dia_vencimento, indice_reajuste, data_inicio, data_fim,
                       canal_envio, status, observacoes) values
  ('dddddddd-0000-0000-0000-000000000001',
   'CTR-SEED-001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001',
   2800.00, 0, 140.00, 0,
   10, 'IGPM',
   '2025-06-01', '2027-05-31',
   '{whatsapp,email}', 'ativo',
   'Seguro fiança Porto. Reajuste anual em junho.'),

  ('dddddddd-0000-0000-0000-000000000002',
   'CTR-SEED-002',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'cccccccc-0000-0000-0000-000000000002',
   2200.00, 480.00, 82.00, 0,
   5, 'IPCA',
   '2025-09-01', '2027-08-31',
   '{whatsapp}', 'ativo',
   'Fiador: pai do inquilino.'),

  ('dddddddd-0000-0000-0000-000000000003',
   'CTR-SEED-003',
   'bbbbbbbb-0000-0000-0000-000000000003',
   'cccccccc-0000-0000-0000-000000000003',
   1500.00, 350.00, 52.00, 0,
   15, 'IGPM',
   '2026-01-15', '2028-01-14',
   '{email}', 'ativo',
   'Contrato PJ — Juliana Peixoto Arquitetura ME.');

-- ───────────── Histórico inicial ─────────────
insert into historico (contrato_id, tipo, titulo, descricao, ocorrido_em) values
  ('dddddddd-0000-0000-0000-000000000001', 'observacao', 'Contrato assinado', 'Assinatura digital via D4Sign.', '2025-06-01 10:00'),
  ('dddddddd-0000-0000-0000-000000000002', 'observacao', 'Contrato assinado', 'Assinatura presencial.', '2025-09-01 14:30'),
  ('dddddddd-0000-0000-0000-000000000003', 'observacao', 'Contrato assinado', 'Primeiro contrato PJ da carteira.', '2026-01-15 09:15');
