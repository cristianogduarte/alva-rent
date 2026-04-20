-- Limpezas antecipadas: criar assim que a estada é confirmada,
-- não esperar entrar em 'checkout'. Assim o admin vê a limpeza agendada
-- no dashboard antes do hóspede sair.

-- Nova função: cria limpeza pendente uma única vez por estada
-- quando a estada entra em status que garante que vai acontecer
-- (confirmada, checkin, checkout).
create or replace function fn_criar_limpeza_apos_checkout()
returns trigger language plpgsql as $$
declare
  v_checklist jsonb;
  v_existe int;
  v_checkout_time time;
  v_agendada timestamptz;
begin
  -- Só gera para estadas que vão efetivamente acontecer
  if new.status not in ('confirmada', 'checkin', 'checkout') then
    return new;
  end if;

  -- Idempotente: só cria se ainda não existe limpeza pra essa estada
  select count(*) into v_existe from limpezas where estada_id = new.id;
  if v_existe > 0 then
    return new;
  end if;

  -- checkout_time do imóvel (default 11:00)
  select coalesce(checkout_time, time '11:00:00') into v_checkout_time
  from imoveis where id = new.imovel_id;

  v_agendada := (new.data_checkout::text || ' ' || v_checkout_time::text)::timestamptz;

  v_checklist := '[
    {"item":"Troca de roupa de cama","ok":false},
    {"item":"Troca de toalhas","ok":false},
    {"item":"Limpeza geral dos cômodos","ok":false},
    {"item":"Limpeza do banheiro","ok":false},
    {"item":"Limpeza da cozinha","ok":false},
    {"item":"Lixo retirado","ok":false},
    {"item":"Louça lavada e guardada","ok":false},
    {"item":"Amenities repostos (shampoo, sabonete, papel)","ok":false},
    {"item":"Ar-condicionado funcionando","ok":false},
    {"item":"Fechadura/chaves OK","ok":false},
    {"item":"Vistoria de avarias concluída","ok":false}
  ]'::jsonb;

  insert into limpezas (estada_id, imovel_id, status, checklist_json, agendada_para)
  values (new.id, new.imovel_id, 'pendente', v_checklist, v_agendada);

  return new;
end;
$$;

-- Trigger agora roda em INSERT também (não só UPDATE), pra pegar
-- estadas já criadas direto em 'confirmada'
drop trigger if exists trg_limpeza_checkout on estadas;
create trigger trg_limpeza_checkout
  after insert or update on estadas
  for each row execute function fn_criar_limpeza_apos_checkout();

-- Backfill: estadas existentes confirmadas/ativas que ainda não têm limpeza
insert into limpezas (estada_id, imovel_id, status, checklist_json, agendada_para)
select
  e.id,
  e.imovel_id,
  'pendente',
  '[
    {"item":"Troca de roupa de cama","ok":false},
    {"item":"Troca de toalhas","ok":false},
    {"item":"Limpeza geral dos cômodos","ok":false},
    {"item":"Limpeza do banheiro","ok":false},
    {"item":"Limpeza da cozinha","ok":false},
    {"item":"Lixo retirado","ok":false},
    {"item":"Louça lavada e guardada","ok":false},
    {"item":"Amenities repostos (shampoo, sabonete, papel)","ok":false},
    {"item":"Ar-condicionado funcionando","ok":false},
    {"item":"Fechadura/chaves OK","ok":false},
    {"item":"Vistoria de avarias concluída","ok":false}
  ]'::jsonb,
  (e.data_checkout::text || ' ' || coalesce(i.checkout_time, time '11:00:00')::text)::timestamptz
from estadas e
join imoveis i on i.id = e.imovel_id
where e.status in ('confirmada', 'checkin', 'checkout')
  and not exists (select 1 from limpezas l where l.estada_id = e.id);

comment on function fn_criar_limpeza_apos_checkout() is
  'Cria limpeza pendente (idempotente) assim que estada é confirmada. Agendamento = data_checkout + checkout_time do imóvel.';
