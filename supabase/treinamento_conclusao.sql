-- ============================================================
-- CONCLUSAO DO TREINAMENTO + COMUNICADOS
-- Rode este arquivo inteiro no SQL Editor do seu projeto.
-- - Registra a hora em que a fase de treinamento do cliente terminou
--   (treinamento_concluido_em), para contabilizar o tempo da etapa.
-- - Cria a tabela de comunicados enviados ao analista de treinamento.
-- ============================================================

-- ---------- COLUNA: treinamento_concluido_em (fim da fase de treinamento) ----------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tickets' and column_name = 'treinamento_concluido_em'
  ) then
    alter table public.tickets add column treinamento_concluido_em timestamptz;
  end if;
end
$$;

-- ---------- TABELA: COMUNICADOS (aviso enviado ao analista) ----------
create table if not exists public.comunicados (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  codigo_cliente text not null default '',
  remetente_id uuid references public.profiles on delete set null,
  destinatario_id uuid not null references public.profiles on delete cascade,
  mensagem text not null default '',
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);

create index if not exists comunicados_destinatario_idx on public.comunicados (destinatario_id);
create index if not exists comunicados_ticket_idx on public.comunicados (ticket_id);

-- ---------- TRIGGER: grava treinamento_concluido_em automaticamente ----------
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
  if new.status = 'concluido' and new.area = 'treinamento'
     and old.status is distinct from 'concluido' then
    new.treinamento_concluido_em = now();
  end if;
  if new.status is distinct from 'concluido' then
    new.treinamento_concluido_em = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_tickets_updated_at on public.tickets;
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_tickets_updated_at();

-- backfill: tickets ja concluidos na fase de treinamento
update public.tickets
set treinamento_concluido_em = coalesce(concluido_em, atualizado_em)
where area = 'treinamento' and status = 'concluido' and treinamento_concluido_em is null;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.comunicados enable row level security;

drop policy if exists "comunicados: leitura autenticados" on public.comunicados;
drop policy if exists "comunicados: criacao autenticados" on public.comunicados;
drop policy if exists "comunicados: edicao autenticados" on public.comunicados;
drop policy if exists "comunicados: delete autenticados" on public.comunicados;
create policy "comunicados: leitura autenticados" on public.comunicados
  for select using (auth.role() = 'authenticated');
create policy "comunicados: criacao autenticados" on public.comunicados
  for insert with check (auth.role() = 'authenticated');
create policy "comunicados: edicao autenticados" on public.comunicados
  for update using (auth.role() = 'authenticated');
create policy "comunicados: delete autenticados" on public.comunicados
  for delete using (auth.role() = 'authenticated');

-- ---------- REALTIME ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comunicados'
  ) then
    alter publication supabase_realtime add table public.comunicados;
  end if;
end
$$;

-- forca o PostgREST a recarregar o schema (evita o erro 404 PGRST205)
notify pgrst, 'reload schema';