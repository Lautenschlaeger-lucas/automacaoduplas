# Deploy — Auditor Chatwoot (módulo do Painel)

O Auditor agora é parte do mesmo sistema do Painel: usa o **banco Supabase do Painel**,
o mesmo login (JWT) e **Edge Functions** no lugar do antigo servidor Express (`auditor-chatwoot` foi removido).

Siga esta ordem para colocar em produção sem quebrar o Painel existente.

---

## 1. Banco de dados (Supabase)

1. Crie (ou valide) o projeto do Painel no Supabase.
2. Abra **SQL Editor** e execute o conteúdo de:

   `supabase/auditor_schema.sql`

   Isso cria (se ainda não existirem) as tabelas do auditor:
   `contacts`, `conversations`, `messages`, `analysis_log`, `priority_alerts`, `poller_config`,
   junto com Realtime (publication), RLS autenticado e as extensões `pg_cron`/`pg_net`.

> Nota: o bloco de `SELECT cron.schedule(...)` vem **comentado** no arquivo,
> pois precisa do seu Project Ref e da service role key. Veja o item 4.

---

## 2. Segredos (secrets)

Defina no projeto Supabase (Dashboard → Settings → API Keys / Secrets, ou CLI):

| Variável | Descrição |
|---|---|
| `CHATWOOT_URL` | Ex.: `https://seu-chatwoot.com` (sem barra final) |
| `CHATWOOT_ACCOUNT_ID` | ID da conta no Chatwoot |
| `CHATWOOT_API_KEY` | Access token da conta (API Dev) |
| `DEEPSEEK_API_KEY` | Chave da API DeepSeek |
| `CHATWOOT_WEBHOOK_SECRET` | **Op. (webhook)** — devolvido pelo setup_webhook |

Via CLI:

```bash
supabase link --project-ref <SEU-PROJECT-REF>
supabase secrets set CHATWOOT_URL=https://seu-chatwoot.com \
  CHATWOOT_ACCOUNT_ID=1 \
  CHATWOOT_API_KEY=SEU_TOKEN \
  DEEPSEEK_API_KEY=SUA_CHAVE
```

---

## 3. Fazer deploy das Edge Functions

Pelo Dashboard basta ir em **Edge Functions → Deploy** e publicar cada função
(deixe `verify_jwt` como no `config.toml`).

Via CLI (recomendado):

```bash
npx supabase functions deploy chatwoot_proxy
npx supabase functions deploy analyze
npx supabase functions deploy poller_fetch
npx supabase functions deploy setup_webhook
# webhook roda sem JWT (recebe POST do Chatwoot):
npx supabase functions deploy chatwoot_webhook --no-verify-jwt
```

> O `config.toml` já documenta o `verify_jwt` pretendido p/ cada função.
> Para o `chatwoot_webhook`, o deploy sem JWT é intencional (a segurança é por HMAC).

---

## 4. Ativar o poller (varredura ativa — Opção B)

O poller é o que alimenta o banco com conversas/mensagens e gera os alertas
do **número prioritário** (`25057342582941`).

Depois de deployar as functions e definir os secrets, edite o bloco
**comentado** no fim de `supabase/auditor_schema.sql` substituindo:

- `<SEU-PROJECT-REF>` → o "Project Ref" (subdomínio `xxx.supabase.co`)
- `<SUA-SERVICE-ROLE-KEY>` → Service Role key (Dashboard → Settings → API Keys)

E execute novamente esse trecho no SQL Editor para agendar a cada 1 minuto:

```sql
SELECT cron.schedule(
  'auditor-poller',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<SEU-PROJECT-REF>.supabase.co/functions/v1/poller_fetch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SUA-SERVICE-ROLE-KEY>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('filters', jsonb_build_object('teamIds', '{}'))
  )
  $$
);
```

Conferir agendamento/logs:

```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 5. (Opcional) Ativar webhook em tempo real — Opção A

Com acesso para criar webhooks no Chatwoot, use `setup_webhook`
(autenticada) que cria o webhook apontando para `chatwoot_webhook`
e retorna o `secret`. Defina `CHATWOOT_WEBHOOK_SECRET` com esse valor
e redeploy de `chatwoot_webhook --no-verify-jwt`.

> Se o Chatwoot não devolver o secret (bug conhecido), pode setar
> `FORCE_NO_SIGNATURE=true` na variável `chatwoot_webhook` — veja o comentário no código.

---

## 6. Frontend (Painel)

Chame `npm run build` e publica o `dist/` no host do Painel (o mesmo de sempre).

O módulo aparece no menu lateral como **Auditor**, com as abas:
- **Auditoria** — busca de cliente → tema → análise via DeepSeek (download DOC/PDF).
- **Monitoramento** — times/agentes, monitorar/parar, detalhes, responder e imprensa IA, alertas prioritários.
- **Configuração** — definir times da varredura.

---

## Verificação rápida

1. Logado no Painel, acesse **/auditor**.
2. Na aba **Auditoria**, busque uma cliente — volte o card.
3. Confirme que o banco recebe conversas do `poller_fetch` (vá para as tabelas).
4. Se ativou webhook, confirme eventos em `chatwoot_webhook` (vê os logs no Dashboard).

---

Desenvolvido e implementado por: **EES — Enderson E. Souza**.