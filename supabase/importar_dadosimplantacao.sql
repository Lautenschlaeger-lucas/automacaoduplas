-- ============================================================
-- IMPORTACAO: dados da planilha (dadosimplantacao.sql) -> painel
-- Gerado por scripts/gerar_importacao.js. NAO edite a mao.
-- Requisito: rodar checklist_migration.sql antes (funcao seed_checklist_itens).
-- --
-- Todos os tickets tem 24 clientes; status da planilha aplicado nos itens padrao.
-- --
-- MAPEAMENTO itens antigos -> chaves novas:
--   importacao_produtos -> tecnica/anuncios_tela_importacao
--   cadastro_produto -> treinamento/cadastro_produtos
--   categoria_atributos -> treinamento/mapeamento_categorias
--   variacao -> treinamento/cadastro_produtos
--   publicacao -> treinamento/publicacao_anuncios
--   estoque -> tecnica/config_estoque
--   loja_virtual -> tecnica/integracao_marketplaces
--   logistica -> tecnica/integracao_logistica
--   gestao -> treinamento/gestao_anuncios
--   metrica -> treinamento/dashboard_status_pedidos
--   precificacao -> treinamento/precificacao_automatica
--   treinamento_importacao_anuncios -> treinamento/treinamento_importacao_anuncios
--   importacao_anuncios -> treinamento/acompanhar_importacao_anuncios
--   virada -> item customizado
--   acompanhamento -> item customizado
--   status nao_mapeado -> nao_aplicavel (nao conta no progresso).
-- ============================================================

-- 1) Tickets gerais por cliente (cria se nao existir; trigger semeia o checklist)
insert into public.tickets (codigo_cliente, nome_cliente, titulo, area, status)
select v.codigo, v.nome, v.nome, 'tecnica', 'aberto'
from (values
  ('3357', 'CAMINHONETE & CIA'),
  ('3351', 'A2 HOSPITALAR'),
  ('3345', 'BCM REFRIGERAÇÃO'),
  ('3337', 'ALWAYS FIT'),
  ('2754', 'LUITEX FERRAMENTAS'),
  ('3332', 'G.R.A COMÉRCIO'),
  ('3331', 'KADRI'),
  ('3330', 'INSTITUTO ALFA E BETO'),
  ('3325', 'SUPERNOVA'),
  ('3306', 'PRINCIPE DA PAZ'),
  ('3305', 'VIA STAR'),
  ('3304', 'GOLD SERVICE'),
  ('3300', 'REAL EQUIPAMENTOS'),
  ('3299', 'CASA DO PAPEL'),
  ('3290', 'LAR PLÁSTICOS'),
  ('3286', 'MA HOSPITALAR'),
  ('3278', 'LEGBOX'),
  ('3267', 'V G AUTO PEÇAS'),
  ('3239', 'EPI COMERCIO'),
  ('3236', 'ORANGE POWERSPORTS'),
  ('3222', 'BUQ CARE'),
  ('3217', 'MYPET'),
  ('3205', 'TECIDOS MIRAMONTES'),
  ('3186', 'THERMO KLIMA')
) as v(codigo, nome)
on conflict (codigo_cliente) where parent_id is null
do update set nome_cliente = excluded.nome_cliente;

-- 2) Status da planilha aplicados nos itens padrao (idempotente)
update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'feito'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('2754', 'feito'),
  ('3332', 'feito'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3236', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'anuncios_tela_importacao' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('3332', 'feito'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'feito'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'cadastro_produtos' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('3332', 'pendente'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'mapeamento_categorias' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('3332', 'pendente'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'feito'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'publicacao_anuncios' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'bloqueado'),
  ('3351', 'bloqueado'),
  ('3345', 'feito'),
  ('2754', 'feito'),
  ('3332', 'bloqueado'),
  ('3331', 'bloqueado'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'bloqueado'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'bloqueado'),
  ('3267', 'bloqueado'),
  ('3236', 'parcial'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'config_estoque' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('3332', 'feito'),
  ('3331', 'pendente'),
  ('3330', 'feito'),
  ('3325', 'pendente'),
  ('3306', 'pendente'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'pendente'),
  ('3236', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'integracao_marketplaces' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'nao_aplicavel'),
  ('3351', 'pendente'),
  ('3345', 'nao_aplicavel'),
  ('3332', 'nao_aplicavel'),
  ('3331', 'pendente'),
  ('3330', 'pendente'),
  ('3325', 'pendente'),
  ('3306', 'pendente'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'pendente'),
  ('3299', 'nao_aplicavel'),
  ('3278', 'feito'),
  ('3267', 'pendente'),
  ('3236', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'integracao_logistica' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'feito'),
  ('3332', 'pendente'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'feito'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'gestao_anuncios' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'pendente'),
  ('3332', 'pendente'),
  ('3331', 'feito'),
  ('3330', 'pendente'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3299', 'pendente'),
  ('3278', 'pendente'),
  ('3267', 'feito'),
  ('3239', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'dashboard_status_pedidos' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'pendente'),
  ('3351', 'pendente'),
  ('3345', 'feito'),
  ('3337', 'pendente'),
  ('3332', 'pendente'),
  ('3331', 'pendente'),
  ('3330', 'pendente'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'pendente'),
  ('3278', 'pendente'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'pendente'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'precificacao_automatica' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'feito'),
  ('3351', 'nao_aplicavel'),
  ('3345', 'nao_aplicavel'),
  ('3332', 'feito'),
  ('3331', 'feito'),
  ('3330', 'feito'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3236', 'feito'),
  ('3205', 'feito')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'treinamento_importacao_anuncios' and p.tipo = 'padrao'
  and p.status <> v.status;

update public.processos p
set status = v.status
from (values
  ('3357', 'pendente'),
  ('3351', 'pendente'),
  ('3345', 'nao_aplicavel'),
  ('3337', 'pendente'),
  ('3332', 'pendente'),
  ('3331', 'feito'),
  ('3330', 'pendente'),
  ('3325', 'feito'),
  ('3306', 'feito'),
  ('3305', 'pendente'),
  ('3304', 'feito'),
  ('3300', 'feito'),
  ('3299', 'feito'),
  ('3278', 'feito'),
  ('3267', 'feito'),
  ('3239', 'feito'),
  ('3236', 'parcial'),
  ('3205', 'pendente')
) as v(codigo, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.chave = 'acompanhar_importacao_anuncios' and p.tipo = 'padrao'
  and p.status <> v.status;

-- 3) Motivo de bloqueio (observacao da planilha) nos itens bloqueados
update public.processos p
set motivo = v.motivo
from (values
  ('3357', 'Segundo a Giovanna só quer seguir com teste de pedido quando buscarmos o preco de venda no SANKHYA'),
  ('3351', 'Problemas de estoque'),
  ('2754', 'Migração de painel'),
  ('3331', 'Integração de expedição (parceiro logistico)'),
  ('3330', 'Vai usar WMS'),
  ('3325', 'Treinamentos'),
  ('3306', 'Faturamento automatico no Sankhya'),
  ('3305', 'Sem atulizações'),
  ('3304', 'Pendente variação /Alinhamento com o Lucas'),
  ('3300', 'Taxa porto'),
  ('3290', 'Sem infomações'),
  ('3278', 'Estão perdido com a expedição'),
  ('3267', 'Pendente treinamento Geral'),
  ('3236', 'Ativação de contas'),
  ('3222', 'Cliente cancelou Snkhya')
) as v(codigo, motivo)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
where p.ticket_pai_id = t.id and p.tipo = 'padrao' and p.status = 'bloqueado' and p.motivo is distinct from v.motivo;

-- 3b) Motivo sem item bloqueado -> registrado na descricao do ticket geral
update public.tickets t
set descricao = case
  when t.descricao like '%Bloqueio (planilha)%' then 'Bloqueio (planilha): ' || v.motivo
  when t.descricao is null or t.descricao = '' then 'Bloqueio (planilha): ' || v.motivo
  else t.descricao || E'\nBloqueio (planilha): ' || v.motivo end
from (values
  ('3357', 'Segundo a Giovanna só quer seguir com teste de pedido quando buscarmos o preco de venda no SANKHYA'),
  ('3351', 'Problemas de estoque'),
  ('2754', 'Migração de painel'),
  ('3331', 'Integração de expedição (parceiro logistico)'),
  ('3330', 'Vai usar WMS'),
  ('3325', 'Treinamentos'),
  ('3306', 'Faturamento automatico no Sankhya'),
  ('3305', 'Sem atulizações'),
  ('3304', 'Pendente variação /Alinhamento com o Lucas'),
  ('3300', 'Taxa porto'),
  ('3290', 'Sem infomações'),
  ('3278', 'Estão perdido com a expedição'),
  ('3267', 'Pendente treinamento Geral'),
  ('3236', 'Ativação de contas'),
  ('3222', 'Cliente cancelou Snkhya')
) as v(codigo, motivo)
where t.codigo_cliente = v.codigo and t.parent_id is null
  and not exists (select 1 from public.processos pp where pp.ticket_pai_id = t.id and pp.status = 'bloqueado');

-- 4) Itens da planilha sem correspondencia na lista nova -> itens customizados
insert into public.processos (ticket_pai_id, titulo, tipo, chave, status, ordem)
select t.id, v.titulo, 'custom', v.chave, v.status, 100
from (values
  ('3357', 'Virada', 'legado_virada', 'pendente'),
  ('3357', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3351', 'Virada', 'legado_virada', 'pendente'),
  ('3351', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3345', 'Virada', 'legado_virada', 'pendente'),
  ('3345', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3337', 'Virada', 'legado_virada', 'pendente'),
  ('3337', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3332', 'Virada', 'legado_virada', 'pendente'),
  ('3332', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3331', 'Virada', 'legado_virada', 'parcial'),
  ('3331', 'Acompanhamento', 'legado_acompanhamento', 'parcial'),
  ('3330', 'Virada', 'legado_virada', 'pendente'),
  ('3330', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3325', 'Virada', 'legado_virada', 'feito'),
  ('3325', 'Acompanhamento', 'legado_acompanhamento', 'feito'),
  ('3306', 'Virada', 'legado_virada', 'parcial'),
  ('3306', 'Acompanhamento', 'legado_acompanhamento', 'parcial'),
  ('3305', 'Virada', 'legado_virada', 'pendente'),
  ('3305', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3304', 'Virada', 'legado_virada', 'feito'),
  ('3304', 'Acompanhamento', 'legado_acompanhamento', 'feito'),
  ('3300', 'Virada', 'legado_virada', 'pendente'),
  ('3300', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3299', 'Virada', 'legado_virada', 'pendente'),
  ('3299', 'Acompanhamento', 'legado_acompanhamento', 'pendente'),
  ('3278', 'Virada', 'legado_virada', 'feito'),
  ('3278', 'Acompanhamento', 'legado_acompanhamento', 'feito'),
  ('3267', 'Virada', 'legado_virada', 'feito'),
  ('3267', 'Acompanhamento', 'legado_acompanhamento', 'feito'),
  ('3239', 'Virada', 'legado_virada', 'feito'),
  ('3239', 'Acompanhamento', 'legado_acompanhamento', 'feito'),
  ('3236', 'Virada', 'legado_virada', 'parcial'),
  ('3236', 'Acompanhamento', 'legado_acompanhamento', 'feito')
) as v(codigo, titulo, chave, status)
join public.tickets t on t.codigo_cliente = v.codigo and t.parent_id is null
on conflict (ticket_pai_id, chave) where chave is not null
do update set status = excluded.status, titulo = excluded.titulo;

-- 5) Conferencia: progresso por cliente apos a importacao
select t.codigo_cliente, t.nome_cliente,
       count(*) filter (where p.status = 'feito') as feitos,
       count(*) filter (where p.status = 'bloqueado') as bloqueados,
       count(*) as total
from public.tickets t
join public.processos p on p.ticket_pai_id = t.id
where t.parent_id is null and t.codigo_cliente in ('3357','3351','3345','3337','2754','3332','3331','3330','3325','3306','3305','3304','3300','3299','3290','3286','3278','3267','3239','3236','3222','3217','3205','3186')
group by 1, 2 order by 1;