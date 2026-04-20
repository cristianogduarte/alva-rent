-- M7 CRM / Marketing Short Stay
-- Enriquece hospedes com campos de segmentação + trigger que atualiza
-- métricas a cada estada criada/atualizada.

alter table hospedes
  add column if not exists aceita_marketing boolean not null default false,
  add column if not exists origem_primeira_estada text,
  add column if not exists qtd_estadas int not null default 0,
  add column if not exists receita_total_gerada numeric(12,2) not null default 0,
  add column if not exists ultima_estada_em date,
  add column if not exists primeira_estada_em date,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists segmento text,
  add column if not exists anonimizado_em timestamptz,
  add column if not exists cidade text,
  add column if not exists observacoes_marketing text;

create index if not exists idx_hospedes_aceita_marketing on hospedes (aceita_marketing);
create index if not exists idx_hospedes_segmento on hospedes (segmento);
create index if not exists idx_hospedes_ultima_estada on hospedes (ultima_estada_em);

comment on column hospedes.segmento is
  'Segmento automático: vip / recorrente / inativo / novo / churn. Recalculado via trigger.';

-- Função que calcula segmento com base em qtd_estadas + ultima_estada_em
create or replace function fn_calcular_segmento(
  p_qtd int,
  p_ultima date,
  p_receita numeric
) returns text language plpgsql immutable as $$
declare
  v_meses_desde int;
begin
  if p_qtd = 0 then return 'novo'; end if;
  v_meses_desde := case
    when p_ultima is null then 999
    else extract(year from age(current_date, p_ultima)) * 12 +
         extract(month from age(current_date, p_ultima))
  end;

  if p_qtd >= 3 and p_receita >= 10000 then return 'vip'; end if;
  if p_qtd >= 2 and v_meses_desde <= 12 then return 'recorrente'; end if;
  if v_meses_desde >= 18 then return 'churn'; end if;
  if v_meses_desde >= 6 then return 'inativo'; end if;
  return 'ativo';
end;
$$;

-- Recalcula métricas de um hóspede (chamada após insert/update em estadas)
create or replace function fn_recalcular_hospede_metricas(p_hospede_id uuid)
returns void language plpgsql as $$
declare
  v_qtd int;
  v_receita numeric;
  v_ultima date;
  v_primeira date;
  v_origem text;
  v_seg text;
begin
  if p_hospede_id is null then return; end if;

  select count(*), coalesce(sum(valor_total), 0), max(data_checkin), min(data_checkin)
    into v_qtd, v_receita, v_ultima, v_primeira
  from estadas
  where hospede_id = p_hospede_id
    and status <> 'cancelada';

  select canal into v_origem
  from estadas
  where hospede_id = p_hospede_id and status <> 'cancelada'
  order by data_checkin asc
  limit 1;

  v_seg := fn_calcular_segmento(v_qtd, v_ultima, v_receita);

  update hospedes set
    qtd_estadas = v_qtd,
    receita_total_gerada = v_receita,
    ultima_estada_em = v_ultima,
    primeira_estada_em = v_primeira,
    origem_primeira_estada = coalesce(origem_primeira_estada, v_origem),
    segmento = v_seg
  where id = p_hospede_id;
end;
$$;

-- Trigger em estadas
create or replace function fn_trg_estadas_metricas() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform fn_recalcular_hospede_metricas(new.hospede_id);
    if tg_op = 'UPDATE' and old.hospede_id is distinct from new.hospede_id then
      perform fn_recalcular_hospede_metricas(old.hospede_id);
    end if;
  elsif tg_op = 'DELETE' then
    perform fn_recalcular_hospede_metricas(old.hospede_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_estadas_metricas on estadas;
create trigger trg_estadas_metricas
  after insert or update or delete on estadas
  for each row execute function fn_trg_estadas_metricas();
