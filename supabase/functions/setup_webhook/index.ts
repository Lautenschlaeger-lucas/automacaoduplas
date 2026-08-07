// ============================================================
// SETUP_WEBHOOK — cria o webhook no Chatwoot via API e guarda o
// secret retornado. OPCIONAL (Opcao A / hibrido) — use quando quiser
// ativar tempo real. verify_jwt=true (apenas usuarios logados).
//
// Chamar: supabase.functions.invoke('setup_webhook', { body: {} })
// Depois: definir CHATWOOT_WEBHOOK_SECRET com o secret retornado
// (ou o valor mostrado) e redeployar chatwoot_webhook.
// ============================================================

import { handleCors, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''; // injetado automaticamente no deploy
const FUNCTION_NAME = 'chatwoot_webhook';

async function createWebhook(url, secret) {
  const accountId = Deno.env.get('CHATWOOT_ACCOUNT_ID');
  const apiKey = Deno.env.get('CHATWOOT_API_KEY');
  const base = `${Deno.env.get('CHATWOOT_URL')}/api/v1/accounts/${accountId}`;

  const body = {
    url,
    webhook_url: url,
    subscriptions: ['message_created', 'conversation_created', 'conversation_updated'],
    ...(secret ? { secret } : {}),
  };

  const res = await fetch(`${base}/webhooks`, {
    method: 'POST',
    headers: { api_access_token: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const url = Deno.env.get('SUPABASE_FUNCTIONS_BASE') || SUPABASE_URL;
    const webhookUrl = `${url}/functions/v1/${FUNCTION_NAME}`;
    const result = await createWebhook(webhookUrl, Deno.env.get('CHATWOOT_WEBHOOK_SECRET'));
    if (!result.ok) {
      return json({ ok: false, detail: result.data }, result.status || 500);
    }
    return json({
      ok: true,
      webhook_url: webhookUrl,
      webhook: result.data,
      note: 'Se a resposta incluir um "secret", configure CHATWOOT_WEBHOOK_SECRET com ele e redeploy. Seo secret nao aparecer (bug Chatwoot), use FORCE_NO_SIGNATURE=true no deploy.',
    });
  } catch (e) {
    console.error('[setup_webhook]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
});