-- Token público por estada — usado no link mágico /estadia/[token]
-- enviado ao hóspede por email/WhatsApp após confirmação.

alter table estadas
  add column if not exists token_publico text unique default replace(gen_random_uuid()::text, '-', '');

-- Gera token pras estadas antigas que não tinham
update estadas
set token_publico = replace(gen_random_uuid()::text, '-', '')
where token_publico is null;

create index if not exists idx_estadas_token on estadas (token_publico);

comment on column estadas.token_publico is
  'Token compartilhável via link mágico /estadia/[token] para o hóspede ver instruções de check-in.';
