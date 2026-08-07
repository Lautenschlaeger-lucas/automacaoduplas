-- ============================================================
-- AUDITOR CHATWOOT - SCHEMA UNIFICADO NO PAINEL
-- Rodar TODO este bloco uma unica vez no SQL Editor do Supabase
-- (projeto do PAINEL). Cria as tabelas do auditor on referencedos
-- RLS autenticado + Realtime + pg_cron para o poller + seed.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== CONTACTS ====================
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  chatwoot_id BIGINT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  chatwoot_id BIGINT UNIQUE NOT NULL,
  contact_id BIGINT,
  contact_name TEXT,
  status TEXT DEFAULT 'open',
  assignee_name TEXT,
  assignee_id BIGINT,
  inbox_name TEXT,
  inbox_id BIGINT,
  team_id BIGINT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  chatwoot_id BIGINT UNIQUE NOT NULL,
  conversation_chatwoot_id BIGINT NOT NULL,
  content TEXT,
  sender_type TEXT,
  sender_name TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_chatwoot_id);

-- ==================== ANALYSIS LOG ====================
CREATE TABLE IF NOT EXISTS analysis_log (
  id BIGSERIAL PRIMARY KEY,
  conversation_chatwoot_id BIGINT,
  contact_id BIGINT,
  contact_name TEXT,
  theme TEXT NOT NULL,
  result TEXT,
  auto BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PRIORITY ALERTS ====================
CREATE TABLE IF NOT EXISTS priority_alerts (
  id BIGSERIAL PRIMARY KEY,
  conversation_chatwoot_id BIGINT NOT NULL,
  chatwoot_id BIGINT,
  contact_name TEXT,
  inbox_name TEXT,
  message_content TEXT,
  mentioned_number TEXT NOT NULL,
  team_id BIGINT,
  assignee_id BIGINT,
  assignee_name TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_priority_alerts_unread ON priority_alerts(read, created_at DESC);

-- ==================== POLLER CONFIG ====================
CREATE TABLE IF NOT EXISTS poller_config (
  id BIGINT PRIMARY KEY,
  team_ids BIGINT[] DEFAULT '{}',
  inbox_ids BIGINT[] DEFAULT '{}',
  agent_ids BIGINT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO poller_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ==================== REALTIME ====================
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('conversations','messages','priority_alerts')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t.tablename
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t.tablename);
    END IF;
  END LOOP;
END $$;

-- ==================== ROW LEVEL SECURITY (somente autenticado) ====================
ALTER TABLE contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE poller_config  ENABLE ROW LEVEL SECURITY;

-- Contatos: leitura autenticada
DROP POLICY IF EXISTS "auditor_contacts_select" ON contacts;
CREATE POLICY "auditor_contacts_select" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Conversas: leitura autenticada (para Realtime e listas)
DROP POLICY IF EXISTS "auditor_conversations_select" ON conversations;
CREATE POLICY "auditor_conversations_select" ON conversations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Mensagens: leitura autenticada (para Realtime e exibicao)
DROP POLICY IF EXISTS "auditor_messages_select" ON messages;
CREATE POLICY "auditor_messages_select" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Log de analise: leitura autenticada
DROP POLICY IF EXISTS "auditor_analysis_select" ON analysis_log;
CREATE POLICY "auditor_analysis_select" ON analysis_log
  FOR SELECT USING (auth.role() = 'authenticated');
-- Escrita (insert) autenticada para registrar analises feitas no Painel
DROP POLICY IF EXISTS "auditor_analysis_insert" ON analysis_log;
CREATE POLICY "auditor_analysis_insert" ON analysis_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Alertas: leitura autenticada (para Realtime/polling do painel)
DROP POLICY IF EXISTS "auditor_alerts_select" ON priority_alerts;
CREATE POLICY "auditor_alerts_select" ON priority_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Poller config: leitura autenticada; gravacao apenas admin (definida abaixo)
DROP POLICY IF EXISTS "auditor_poller_select" ON poller_config;
CREATE POLICY "auditor_poller_select" ON poller_config
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auditor_poller_update" ON poller_config;
CREATE POLICY "auditor_poller_update" ON poller_config
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auditor_poller_insert" ON poller_config;
CREATE POLICY "auditor_poller_insert" ON poller_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- Gravação das tabelas do auditor acontece APENAS via Edge
-- Functions com service role (bypass RLS). Nenhuma policy de
-- INSERT/UPDATE/DELETE é criada aqui -> client bloqueado.
-- ============================================================

-- ==================== pg_cron / pg_net (extensoes nativas, gratis) ====================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- AGENDAMENTO DO POLLER (ingestao ativa, Opcao B)
-- Preencha abaixo e execute APOS ter deployado a Edge Function
-- poller_fetch e definido os secrets.
--   SUBSTITUA <SEU-PROJECT-REF> pelo ref do projeto (ex.: abcdefghij)
--   SUBSTITUA <SUA-SERVICE-ROLE-KEY> pela service role key do projeto
--   (Service Role secret — Dashboard > Settings > API Keys)
-- ============================================================
-- SELECT cron.schedule(
--   'auditor-poller',
--   '* * * * *',  -- a cada 1 minuto
--   $$
--   SELECT net.http_post(
--     url := 'https://<SEU-PROJECT-REF>.supabase.co/functions/v1/poller_fetch',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <SUA-SERVICE-ROLE-KEY>',
--       'Content-Type', 'application/json'
--     ),
--     body := jsonb_build_object('filters', jsonb_build_object('teamIds', '{}'))
--   )
--   $$
-- );

-- Conferir se agendou:
-- SELECT * FROM cron.job;
-- Logs de execucao:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;