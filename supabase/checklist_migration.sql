-- ============================================================
-- CHECKLIST ESTRUTURADO DE IMPLANTACAO
-- Rode este arquivo inteiro no SQL Editor do seu projeto ANTES
-- do deploy do front. Idempotente: pode rodar mais de uma vez.
-- Nenhum dado existente e removido ou alterado de tipo.
-- ============================================================

-- ---------- PROCESSOS: colunas do checklist estruturado ----------
alter table public.processos add column if not exists status text not null default 'pendente'
  check (status in ('feito','pendente','parcial','bloqueado','nao_aplicavel'));
alter table public.processos add column if not exists tipo text not null default 'custom'
  check (tipo in ('padrao','custom'));
alter table public.processos add column if not exists categoria text
  check (categoria in ('tecnica','treinamento'));
alter table public.processos add column if not exists chave text;
alter table public.processos add column if not exists ordem int not null default 0;
alter table public.processos add column if not exists bloqueado_por text;
alter table public.processos add column if not exists tipo_bloqueio text
  check (tipo_bloqueio in ('interno','cliente','terceiro'));
alter table public.processos add column if not exists motivo text;
alter table public.processos add column if not exists atualizado_em timestamptz not null default now();

-- backfill: itens ja marcados como feitos viram status 'feito'
update public.processos set status = 'feito'
where feito and status = 'pendente';

-- backfill: itens pre-existentes (sem chave) sao customizados
update public.processos set tipo = 'custom' where chave is null;

-- indice que garante 1 item padrao por chave por ticket pai (usado no seed)
create unique index if not exists processos_chave_pai_idx
  on public.processos (ticket_pai_id, chave) where chave is not null;

-- ---------- TRIGGER: atualizado_em + sync do campo 'feito' (compat) ----------
create or replace function public.set_processos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  new.feito = (new.status = 'feito');
  return new;
end;
$$;

drop trigger if exists set_processos_updated_at on public.processos;
create trigger set_processos_updated_at
  before insert or update on public.processos
  for each row execute procedure public.set_processos_updated_at();

-- ---------- SEED: itens padrao para todos os tickets gerais (1 por cliente) ----------
insert into public.processos (ticket_pai_id, titulo, tipo, categoria, chave, ordem, status)
select t.id, v.titulo, 'padrao', v.categoria, v.chave, v.ordem, 'pendente'
from public.tickets t
cross join (
  values
    -- TAREFAS DO ANALISTA TECNICO (20)
    ('Analisar Validação do Negócio', 'tecnica', 'validacao_negocio', 1),
    ('Criar pasta no Drive para reuniões gravadas e incluir o link no ticket', 'tecnica', 'pasta_drive_reunioes', 2),
    ('Ativar apps contratados', 'tecnica', 'ativar_apps', 3),
    ('Integração do ERP ou Faturador', 'tecnica', 'integracao_erp', 4),
    ('Integração dos marketplaces e Lojas Virtuais', 'tecnica', 'integracao_marketplaces', 5),
    ('Configurações fiscais', 'tecnica', 'config_fiscais', 6),
    ('Configurações de estoque', 'tecnica', 'config_estoque', 7),
    ('Integração Logística', 'tecnica', 'integracao_logistica', 8),
    ('Garantir que todos os anúncios vieram para a tela de importação', 'tecnica', 'anuncios_tela_importacao', 9),
    ('Configuração da Impressora para realização do teste de expedição', 'tecnica', 'config_impressora_teste', 10),
    ('Teste de expedição', 'tecnica', 'teste_expedicao', 11),
    ('Abertura de todos os @tickets e N2 pertinentes para integrações (MKT, ERP e Integração logística)', 'tecnica', 'abertura_tickets_n2', 12),
    ('Acompanhamento no grupo de demandas técnicas, customizações, dúvidas e possíveis testes de integração', 'tecnica', 'acompanhamento_demandas', 13),
    ('Reportar customizações', 'tecnica', 'reportar_customizacoes', 14),
    ('Acompanhar os @tickets e retorná-los aos clientes', 'tecnica', 'acompanhar_tickets', 15),
    ('Documentações técnicas e reporte de novos fluxos', 'tecnica', 'documentacoes_tecnicas', 16),
    ('Pausar filas de estoque (se necessário após kick off)', 'tecnica', 'pausar_filas_estoque', 17),
    ('Ativar Feature Flags (pedidos em processando, sankhya, descontos, etc.)', 'tecnica', 'ativar_feature_flags', 18),
    ('Conferir comunicação de estoque', 'tecnica', 'conferir_comunicacao_estoque', 19),
    ('Validação de pedidos concluída', 'tecnica', 'validacao_pedidos', 20),
    -- TAREFAS DO ANALISTA DE TREINAMENTO (18)
    ('Acompanhar importação de anúncios em tela ou conferir o upload da planilha de importação', 'treinamento', 'acompanhar_importacao_anuncios', 1),
    ('Treinamento de Importação dos anúncios', 'treinamento', 'treinamento_importacao_anuncios', 2),
    ('Cadastro de produtos simples, compostos e com variações', 'treinamento', 'cadastro_produtos', 3),
    ('Mapeamento de categorias e atributos', 'treinamento', 'mapeamento_categorias', 4),
    ('Publicação de anúncio simples, kits e com variações', 'treinamento', 'publicacao_anuncios', 5),
    ('Gestão de anúncios já publicados', 'treinamento', 'gestao_anuncios', 6),
    ('Treinamento de todo o módulo expedição e pedidos', 'treinamento', 'treinamento_expedicao_pedidos', 7),
    ('Dashboard e status dos pedidos', 'treinamento', 'dashboard_status_pedidos', 8),
    ('Precificação Automática', 'treinamento', 'precificacao_automatica', 9),
    ('Módulo Mercado Livre', 'treinamento', 'modulo_mercado_livre', 10),
    ('Relatórios', 'treinamento', 'relatorios', 11),
    ('Módulo Compras', 'treinamento', 'modulo_compras', 12),
    ('Módulo Financeiro', 'treinamento', 'modulo_financeiro', 13),
    ('SAC ML', 'treinamento', 'sac_ml', 14),
    ('Apresentar todos os aplicativos', 'treinamento', 'apresentar_aplicativos', 15),
    ('Acompanhar o cliente na criação do portal do cliente para acompanhar os tickets em aberto', 'treinamento', 'portal_cliente', 16),
    ('Ativar filas de estoque', 'treinamento', 'ativar_filas_estoque', 17),
    ('Retirar flags de processamento de pedidos', 'treinamento', 'retirar_flags_processamento', 18)
) as v(titulo, categoria, chave, ordem)
where t.parent_id is null
  and not exists (
    select 1 from public.processos p
    where p.ticket_pai_id = t.id and p.chave = v.chave
  );

-- ---------- APP_CONFIG: configuracoes do painel ----------
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value)
values ('limite_dias_parado', '5')
on conflict (key) do nothing;

alter table public.app_config enable row level security;

drop policy if exists "config: leitura autenticados" on public.app_config;
drop policy if exists "config: admin altera" on public.app_config;
create policy "config: leitura autenticados" on public.app_config
  for select using (auth.role() = 'authenticated');
create policy "config: admin altera" on public.app_config
  for update using (public.is_admin()) with check (public.is_admin());
create policy "config: admin insere" on public.app_config
  for insert with check (public.is_admin());

-- forca o PostgREST a recarregar o schema
notify pgrst, 'reload schema';