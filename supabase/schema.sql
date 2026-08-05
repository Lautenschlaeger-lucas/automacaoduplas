-- ============================================================
-- PAINEL DE IMPLANTACAO - SCHEMA SUPABASE
-- Rode este arquivo inteiro no SQL Editor do seu projeto.
-- ============================================================

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

-- ---------- TABELA: PROFILES (estende auth.users) ----------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  role text not null default 'tecnica' check (role in ('admin','tecnica','treinamento')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- ---------- TABELA: CLIENTES ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nome text not null,
  status text not null default 'ativo' check (status in ('ativo','concluido','pausado')),
  contato text default '',
  telefone text default '',
  cidade text default '',
  uf text default '',
  versao_sistema text default '',
  observacoes text default '',
  criado_em timestamptz not null default now()
);

-- ---------- TABELA: TICKETS ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clients on delete cascade not null,
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
alter table public.clients enable row level security;
alter table public.tickets enable row level security;

-- profiles
create policy "perfis: leitura autenticados" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "perfis: editar proprio" on public.profiles
  for update using (auth.uid() = id);
create policy "perfis: admin atualiza" on public.profiles
  for update using (public.is_admin());
create policy "perfis: admin deleta" on public.profiles
  for delete using (public.is_admin());

-- clients
create policy "clientes: leitura autenticados" on public.clients
  for select using (auth.role() = 'authenticated');
create policy "clientes: criacao autenticados" on public.clients
  for insert with check (auth.role() = 'authenticated');
create policy "clientes: edicao autenticados" on public.clients
  for update using (auth.role() = 'authenticated');
create policy "clientes: admin deleta" on public.clients
  for delete using (public.is_admin());

-- tickets
create policy "tickets: leitura autenticados" on public.tickets
  for select using (auth.role() = 'authenticated');
create policy "tickets: criacao autenticados" on public.tickets
  for insert with check (auth.role() = 'authenticated');
create policy "tickets: edicao autenticados" on public.tickets
  for update using (auth.role() = 'authenticated');
create policy "tickets: admin deleta" on public.tickets
  for delete using (public.is_admin());

-- ---------- REALTIME ----------
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.clients;

-- ---------- DADOS DE EXEMPLO ----------
insert into public.clients (codigo, nome, status, contato, telefone, cidade, uf, versao_sistema, observacoes) values
  ('324', 'Navegacao Silva Ltda',   'ativo',     'Maria Silva',    '(11) 9999-0000', 'Sao Paulo',     'SP', '10.4', 'Cliente piloto da nova versao'),
  ('299', 'Rede Varejo Sul',        'ativo',     'Carlos Pereira', '(51) 8888-1111', 'Porto Alegre',  'RS', '10.3', 'Migracao quase concluida'),
  ('301', 'Clinica Vida Plena',     'ativo',     'Ana Souza',      '(21) 7777-2222', 'Rio de Janeiro','RJ', '10.2', 'Aguardando homologacao'),
  ('287', 'Supermercado Bom Preco', 'concluido', 'Jose Lima',      '(31) 6666-3333', 'Belo Horizonte','MG', '10.1', 'Projeto encerrado com sucesso'),
  ('330', 'Transportadora Rota X',  'pausado',   'Paulo Costa',    '(41) 5555-4444', 'Curitiba',      'PR', '10.4', 'Suspenso pelo cliente por 30 dias')
on conflict (codigo) do nothing;

insert into public.tickets (cliente_id, titulo, descricao, area, status, prioridade, criado_em)
select
  (select id from public.clients where codigo = v.codigo),
  v.titulo, v.descricao, v.area, v.status, v.prioridade, v.criado_em
from (values
  ('324','Instalar servidor','Instalacao e configuracao do servidor principal','tecnica','em_andamento','alta', now() - interval '6 days'),
  ('324','Criar banco de dados','Criar schema inicial e usuario do sistema','tecnica','pendencia','alta', now() - interval '5 days'),
  ('324','Treinamento basico operacao','Treinar equipe no modulo de vendas','treinamento','aberto','media', now() - interval '4 days'),
  ('324','Homologacao com fiscal','Validar emissao fiscal com o contador','tecnica','aberto','media', now() - interval '3 days'),
  ('299','Migracao de dados','Importar cadastros e estoque do sistema antigo','tecnica','em_andamento','alta', now() - interval '7 days'),
  ('299','Treinamento gerencial','Treinar gerentes nos relatorios','treinamento','aberto','baixa', now() - interval '6 days'),
  ('301','Instalar impressora fiscal','Configurar SAT e teste real de emissao','tecnica','pendencia','alta', now() - interval '4 days'),
  ('301','Treinamento caixa','Treinar operadores de caixa no PDV','treinamento','aberto','media', now() - interval '2 days'),
  ('330','Pausar licencas','Suspender licencas durante pausa','tecnica','concluido','media', now() - interval '10 days')
) v(codigo, titulo, descricao, area, status, prioridade, criado_em)
where exists (select 1 from public.clients where codigo = v.codigo);