-- ============================================================
-- PAINEL DE IMPLANTACAO - SCHEMA SUPABASE
-- Rode este arquivo inteiro no SQL Editor do seu projeto.
-- Modelo unificado: o TICKET carrega as infos do cliente.
-- ATENCAO: a ordem importa (tabelas antes das funcoes).
-- ============================================================

-- ---------- TABELA: PROFILES (estende auth.users) ----------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  role text not null default 'tecnica' check (role in ('admin','tecnica','treinamento')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TABELA: TICKETS (carrega as infos do cliente) ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  -- infos do cliente (1 ticket por cliente na criacao, varios permitidos)
  codigo_cliente text not null,
  nome_cliente text not null default '',
  cidade text default '',
  uf text default '',
  contato text default '',
  telefone text default '',
  versao_sistema text default '',
  -- dados do ticket
  titulo text not null,
  descricao text default '',
  area text not null default 'tecnica' check (area in ('tecnica','treinamento')),
  status text not null default 'aberto' check (status in ('aberto','em_andamento','pendencia','concluido')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  responsavel_id uuid references public.profiles on delete set null,
  criado_por uuid references public.profiles on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create index if not exists tickets_codigo_idx on public.tickets (codigo_cliente);

-- ticket pai (ticket geral do cliente): tabelas antigas precisam da coluna
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tickets' and column_name = 'parent_id'
  ) then
    alter table public.tickets add column parent_id uuid;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tickets_parent_fk') then
    alter table public.tickets
      add constraint tickets_parent_fk foreign key (parent_id)
      references public.tickets(id) on delete cascade;
  end if;
end
$$;

create index if not exists tickets_parent_idx on public.tickets (parent_id);

-- ---------- TABELA: PROCESSOS (checklist dos processos ja feitos do ticket pai) ----------
create table if not exists public.processos (
  id uuid primary key default gen_random_uuid(),
  ticket_pai_id uuid not null references public.tickets(id) on delete cascade,
  titulo text not null,
  feito boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists processos_ticket_idx on public.processos (ticket_pai_id);

-- ---------- FUNCAO: verifica se user logado eh admin ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- cria perfil automaticamente quando novo usuario se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- backfill: cria perfis de contas ja existentes (se o gatilho nao existia antes)
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1))
from auth.users u
on conflict (id) do nothing;

-- backfill: tickets antigos viram filhos do ticket mais antigo do mesmo cliente
-- (o mais antigo de cada codigo_cliente passa a ser o ticket pai / geral)
with pais as (
  select distinct on (codigo_cliente) id, codigo_cliente
  from public.tickets
  where parent_id is null
  order by codigo_cliente, criado_em asc
)
update public.tickets t
set parent_id = p.id
from pais p
where t.codigo_cliente = p.codigo_cliente
  and t.id <> p.id
  and t.parent_id is null;

-- 1 ticket pai por cliente (sem parent_id = ticket geral) — criado apos o backfill
create unique index if not exists tickets_pai_unico on public.tickets (codigo_cliente) where parent_id is null;

-- mantem atualizado_em e calcula concluido_em automaticamente
create or replace function public.set_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    new.concluido_em = now();
  end if;
  if new.status is distinct from 'concluido' then
    new.concluido_em = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_tickets_updated_at on public.tickets;
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_tickets_updated_at();

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.processos enable row level security;

-- profiles
drop policy if exists "perfis: leitura autenticados" on public.profiles;
drop policy if exists "perfis: editar proprio" on public.profiles;
drop policy if exists "perfis: admin atualiza" on public.profiles;
drop policy if exists "perfis: admin deleta" on public.profiles;
create policy "perfis: leitura autenticados" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "perfis: editar proprio" on public.profiles
  for update using (auth.uid() = id);
create policy "perfis: admin atualiza" on public.profiles
  for update using (public.is_admin());
create policy "perfis: admin deleta" on public.profiles
  for delete using (public.is_admin());

-- tickets
drop policy if exists "tickets: leitura autenticados" on public.tickets;
drop policy if exists "tickets: criacao autenticados" on public.tickets;
drop policy if exists "tickets: edicao autenticados" on public.tickets;
drop policy if exists "tickets: admin deleta" on public.tickets;
drop policy if exists "tickets: delete autenticados" on public.tickets;
create policy "tickets: leitura autenticados" on public.tickets
  for select using (auth.role() = 'authenticated');
create policy "tickets: criacao autenticados" on public.tickets
  for insert with check (auth.role() = 'authenticated');
create policy "tickets: edicao autenticados" on public.tickets
  for update using (auth.role() = 'authenticated');
create policy "tickets: delete autenticados" on public.tickets
  for delete using (auth.role() = 'authenticated');

-- processos
drop policy if exists "processos: leitura autenticados" on public.processos;
drop policy if exists "processos: criacao autenticados" on public.processos;
drop policy if exists "processos: edicao autenticados" on public.processos;
drop policy if exists "processos: admin deleta" on public.processos;
drop policy if exists "processos: delete autenticados" on public.processos;
create policy "processos: leitura autenticados" on public.processos
  for select using (auth.role() = 'authenticated');
create policy "processos: criacao autenticados" on public.processos
  for insert with check (auth.role() = 'authenticated');
create policy "processos: edicao autenticados" on public.processos
  for update using (auth.role() = 'authenticated');
create policy "processos: delete autenticados" on public.processos
  for delete using (auth.role() = 'authenticated');

-- ---------- REALTIME (adiciona so se ainda nao estiver) ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tickets'
  ) then
    alter publication supabase_realtime add table public.tickets;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'processos'
  ) then
    alter publication supabase_realtime add table public.processos;
  end if;
end
$$;

-- ---------- DADOS DE EXEMPLO (so entra se a tabela estiver vazia) ----------
do $$
begin
  if exists (select 1 from public.tickets) then
    return;
  end if;
  insert into public.tickets
  (codigo_cliente, nome_cliente, cidade, uf, contato, telefone, versao_sistema,
   titulo, descricao, area, status, prioridade, criado_em)
values
  ('324', 'Navegacao Silva Ltda',   'Sao Paulo',      'SP', 'Maria Silva',    '(11) 9999-0000', '10.4',
   'Instalar servidor', 'Instalacao e configuracao do servidor principal', 'tecnica', 'em_andamento', 'alta', now() - interval '6 days'),
  ('324', 'Navegacao Silva Ltda',   'Sao Paulo',      'SP', 'Maria Silva',    '(11) 9999-0000', '10.4',
   'Criar banco de dados', 'Criar schema inicial e usuario do sistema', 'tecnica', 'pendencia', 'alta', now() - interval '5 days'),
  ('324', 'Navegacao Silva Ltda',   'Sao Paulo',      'SP', 'Maria Silva',    '(11) 9999-0000', '10.4',
   'Treinamento basico de operacao', 'Treinar equipe no modulo de vendas', 'treinamento', 'aberto', 'media', now() - interval '4 days'),
  ('324', 'Navegacao Silva Ltda',   'Sao Paulo',      'SP', 'Maria Silva',    '(11) 9999-0000', '10.4',
   'Homologacao com fiscal', 'Validar emissao fiscal com o contador', 'tecnica', 'aberto', 'media', now() - interval '3 days'),
  ('299', 'Rede Varejo Sul',        'Porto Alegre',   'RS', 'Carlos Pereira', '(51) 8888-1111', '10.3',
   'Migracao de dados', 'Importar cadastros e estoque do sistema antigo', 'tecnica', 'em_andamento', 'alta', now() - interval '7 days'),
  ('299', 'Rede Varejo Sul',        'Porto Alegre',   'RS', 'Carlos Pereira', '(51) 8888-1111', '10.3',
   'Treinamento gerencial', 'Treinar gerentes nos relatorios', 'treinamento', 'aberto', 'baixa', now() - interval '6 days'),
  ('301', 'Clinica Vida Plena',     'Rio de Janeiro', 'RJ', 'Ana Souza',      '(21) 7777-2222', '10.2',
   'Instalar impressora fiscal', 'Configurar SAT e teste real de emissao', 'tecnica', 'pendencia', 'alta', now() - interval '4 days'),
  ('301', 'Clinica Vida Plena',     'Rio de Janeiro', 'RJ', 'Ana Souza',      '(21) 7777-2222', '10.2',
   'Treinamento caixa', 'Treinar operadores de caixa no PDV', 'treinamento', 'aberto', 'media', now() - interval '2 days'),
  ('287', 'Supermercado Bom Preco', 'Belo Horizonte', 'MG', 'Jose Lima',      '(31) 6666-3333', '10.1',
   'Encerramento do projeto', 'Entrega final e assinatura do termo', 'tecnica', 'concluido', 'baixa', now() - interval '14 days'),
  ('287', 'Supermercado Bom Preco', 'Belo Horizonte', 'MG', 'Jose Lima',      '(31) 6666-3333', '10.1',
   'Treinamento completo', 'Toda equipe treinada nos 3 modulos', 'treinamento', 'concluido', 'baixa', now() - interval '12 days'),
   ('330', 'Transportadora Rota X',  'Curitiba',       'PR', 'Paulo Costa',    '(41) 5555-4444', '10.4',
    'Pausar licencas', 'Suspender licencas durante pausa', 'tecnica', 'concluido', 'media', now() - interval '10 days');
end
$$;

-- forca o PostgREST a recarregar o schema (evita o erro 404 PGRST205)
notify pgrst, 'reload schema';