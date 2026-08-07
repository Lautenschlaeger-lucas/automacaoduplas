// ============================================================
// CHATWOOT_WEBHOOK — receptor de eventos do Chatwoot (OPCIONAL,
// ative quando tiver acesso para criar o webhook). verify_jwt=false.
// Seguranca feita por validacao de assinatura (HMAC-SHA256).
//
// Como ativar (Opcao A / hibrido):
//   1. Rodar setup_webhook (cria o webhook via API + guarda secret)
//   2. Colocar CHATWOOT_WEBHOOK_SECRET nos secrets do projeto
//   3. Deploy desta function com --no-verify-jwt
//
// Assinatura: sha256=HMAC(secret, "{X-Chatwoot-Timestamp}.{raw_body}")
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCors, json } from '../_shared/cors.ts';

const MAGIC_NUMBER = '25057342582941';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  { auth: { persistSession: false } }
);

async function verifySignature(req, rawBody) {
  const secret = Deno.env.get('CHATWOOT_WEBHOOK_SECRET');
  const signature = req.headers.get('x-chatwoot-signature') || '';
  const timestamp = req.headers.get('x-chatwoot-timestamp') || '';
  if (!secret || !signature || !timestamp) {
    // Se nao houver secret config euaceita (deploy de teste / bug da versao);
    // se houver secret e faltarem headers, aceita so durante o bug conhecido
    // do Chatwoot (#13809) — deixamos configurável via env FORCE_NO_SIGNATURE.
    if (Deno.env.get('FORCE_NO_SIGNATURE') === 'true') return { ok: true, reason: 'forced' };
    return { ok: false, reason: 'missing headers' };
  }
  const keyData = new TextEncoder().encode(secret);
  const msg = new TextEncoder().encode(`${timestamp}.${rawBody}`);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msg);
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const expected = `sha256=${hex}`;
  if (expected.length !== signature.length) return { ok: false, reason: 'length' };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    if (expected.charCodeAt(i) !== signature.charCodeAt(i)) diff++;
  }
  return { ok: diff === 0, reason: diff === 0 ? 'ok' : 'mismatch' };
}

function senderIsAgent(evt) {
  const st = String(evt.sender?.type || evt.sender_type || '').toLowerCase();
  if (st === 'user' || st === 'agent') return true;
  return [1, 2, 3, 4, 5, 6, 7].includes(Number(evt.message_type));
}

async function ensureConversation(conv) {
  if (!conv?.id) return;
  const { data: existing } = await supabaseAdmin.from('conversations').select('id').eq('chatwoot_id', conv.id).maybeSingle();
  const data = {
    chatwoot_id: conv.id,
    contact_id: conv.contact?.id || conv.contact_id || conv.meta?.sender?.id || null,
    contact_name: conv.contact?.name || conv.contact_name || conv.meta?.sender?.name || 'Desconhecido',
    status: conv.status || 'open',
    assignee_name: conv.assignee?.name || conv.assigned_agent?.name || 'Não atribuído',
    assignee_id: conv.assignee?.id || conv.assigned_agent?.id || null,
    inbox_name: conv.inbox?.name || conv.inbox_name || conv.meta?.inbox?.name || '—',
    inbox_id: conv.inbox_id || conv.meta?.inbox?.id || null,
    team_id: conv.team_id || conv.meta?.team?.id || null,
    last_activity_at: conv.last_activity_at ? new Date(conv.last_activity_at * 1000).toISOString() : new Date().toISOString(),
  };
  if (existing) {
    await supabaseAdmin.from('conversations').update({ ...data, updated_at: new Date().toISOString() }).eq('chatwoot_id', conv.id);
  } else {
    await supabaseAdmin.from('conversations').insert(data);
  }
}

async function upsertMessageFromEvent(evt, conv, conversation) {
  const convId = conversation?.id || evt.conversation_id;
  if (!evt?.id || !evt.content || !convId) return;
  const isAgent = senderIsAgent(evt);
  const msgData = {
    chatwoot_id: evt.id,
    conversation_chatwoot_id: convId,
    content: evt.content,
    sender_type: isAgent ? 'User' : 'Contact',
    sender_name: evt.sender?.name || evt.sender_name || (isAgent ? 'Atendente' : 'Cliente'),
    message_type: typeof evt.message_type !== 'undefined' ? String(evt.message_type) : null,
    created_at: evt.created_at ? new Date(evt.created_at * 1000).toISOString() : new Date().toISOString(),
  };
  await supabaseAdmin.from('messages').upsert(msgData, { onConflict: 'chatwoot_id', ignoreDuplicates: true });

  if (String(evt.content || '').replace(/[^\d]/g, '').includes(MAGIC_NUMBER)) {
    const { data: existing } = await supabaseAdmin.from('priority_alerts').select('id').eq('chatwoot_id', evt.id).maybeSingle();
    if (!existing) {
      await supabaseAdmin.from('priority_alerts').insert({
        chatwoot_id: evt.id,
        conversation_chatwoot_id: convId,
        contact_name: conversation?.contact?.name || conversation?.contact_name || conversation?.meta?.sender?.name || 'Desconhecido',
        inbox_name: conversation?.inbox?.name || conversation?.inbox_name || conversation?.meta?.inbox?.name || '—',
        message_content: String(evt.content).substring(0, 300),
        mentioned_number: MAGIC_NUMBER,
        team_id: conversation?.team_id || conversation?.meta?.team?.id || null,
        assignee_id: conversation?.assignee?.id || conversation?.assigned_agent?.id || null,
        assignee_name: conversation?.assignee?.name || conversation?.assigned_agent?.name || null,
      });
    }
  }
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

  const rawBody = await req.text();
  const sig = await verifySignature(req, rawBody);
  if (!sig.ok) {
    return json({ ok: false, error: 'invalid signature', reason: sig.reason }, 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const evt = payload.event;

    if (evt === 'message_created' || evt === 'message_updated') {
      const conversation = payload.conversation || payload;
      await ensureConversation(conversation);
      await upsertMessageFromEvent(payload, null, conversation);
    } else if (evt === 'conversation_created' || evt === 'conversation_updated' || evt === 'conversation_status_changed') {
      const conv = payload.conversation || payload;
      await ensureConversation(conv);
    } else {
      // evento nao tratado: apenas responde ok
    }

    return json({ ok: true });
  } catch (e) {
    console.error('[webhook]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
});