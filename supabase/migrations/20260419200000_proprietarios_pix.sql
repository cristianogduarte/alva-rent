-- Adiciona chave PIX e banco do proprietário para repasses short/long.
alter table proprietarios
  add column if not exists chave_pix text,
  add column if not exists banco text,
  add column if not exists agencia text,
  add column if not exists conta text;

comment on column proprietarios.chave_pix is
  'Chave PIX usada no fechamento mensal. Se null, cai para email.';
