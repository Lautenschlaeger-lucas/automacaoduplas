// ============================================================
// POLLER_FETCH — varre o Chatwoot e sincroniza conversas/mensagens
// no Supabase, escaneando o numero magico -> priority_alerts.
// Porta de auditor-chatwoot/services/poller.js
//
// Chamado por: pg_cron -> pg_net.http_post (com service role no
// Authorization) OU manualmente. verify_jwt = true.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { listConversationsByStatuses, listConversationsByTeamIds, getMessages } from '../_shared/chatwoot.ts';
import { handleCors, json } from '../_shared/cors.ts';

const MAGIC_NUMBER = '25057342582941';

function normalizeDigits(text) {
  return String(text || '').replace(/[^\d]/g, '');
}

function mentionsMagicNumber(content) {
  return normalizeDigits(content).includes(MAGIC_NUMBER);
}

function extractAssignee(conv) {
  return conv.assignee || conv['respons\u00E1vel'] || conv.meta?.assignee || conv.assigned_agent || null;
}

function extractTeamId(conv) {
  return conv.team_id || conv.meta?.team?.id || null;
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  { auth: { persistSession: false } }
);

async function loadFilters() {
  const { data } = await supabaseAdmin
    .from('poller_config').select('*').eq('id', 1).maybeSingle();
  if (!data) return { teamIds: [], inboxIds: [], agentIds: [] };
  return {
    teamIds: Array.isArray(data.team_ids) ? data.team_ids : [],
    inboxIds: Array.isArray(data.inbox_ids) ? data.inbox_ids : [],
    agentIds: Array.isArray(data.agent_ids) ? data.agent_ids : [],
  };
}

async function fetchFilteredConversations(filters) {
  let all;
  if (filters.teamIds.length > 0) {
    all = await listConversationsByTeamIds(filters.teamIds, ['open', 'pending']);
  } else {
    all = await listConversationsByStatuses(['open', 'pending']);
  }
  return all.filter((c) => {
    const a = extractAssignee(c);
    const assigneeId = a?.id;
    if (filters.agentIds.length > 0) {
      if (!assigneeId || !filters.agentIds.map(Number).includes(Number(assigneeId))) return false;
    }
    if (filters.inboxIds.length > 0) {
      if (!c.inbox_id || !filters.inboxIds.map(Number).includes(Number(c.inbox_id))) return false;
    }
    return true;
  });
}

async function upsertConversation(conv) {
  const a = extractAssignee(conv);
  const data = {
    chatwoot_id: conv.id,
    contact_id: conv.meta?.sender?.id || conv.contact_id || null,
    contact_name: conv.meta?.sender?.name || conv.contact_name || 'Desconhecido',
    status: conv.status || 'open',
    assignee_name: a?.name || 'Não atribuído',
    assignee_id: a?.id || null,
    inbox_name: conv.inbox?.name || '—',
    inbox_id: conv.inbox_id || null,
    team_id: extractTeamId(conv),
    last_activity_at: conv.last_activity_at ? new Date(conv.last_activity_at * 1000).toISOString() : new Date().toISOString(),
    created_at: conv.created_at ? new Date(conv.created_at * 1000).toISOString() : new Date().toISOString(),
  };
  const { data: existing } = await supabaseAdmin.from('conversations').select('id').eq('chatwoot_id', conv.id).maybeSingle();
  if (existing) {
    await supabaseAdmin.from('conversations').update({ ...data, updated_at: new Date().toISOString() }).eq('chatwoot_id', conv.id);
  } else {
    await supabaseAdmin.from('conversations').insert(data);
  }
}

async function upsertMessage(msg, convId, conv) {
  const rawType = String(msg.sender?.type || msg.sender_type || '').toLowerCase();
  const isAgent = rawType === 'user' || rawType === 'agent' || msg.message_type == 1 || msg.message_type == 2 || msg.message_type == 7;
  const senderType = isAgent ? 'User' : 'Contact';
  const senderName = msg.sender?.name || msg.sender_name || (isAgent ? 'Atendente' : 'Cliente');
  const base = {
    chatwoot_id: msg.id,
    conversation_chatwoot_id: convId,
    content: msg.content,
    sender_type: senderType,
    sender_name: senderName,
    created_at: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('messages').upsert(base, { onConflict: 'chatwoot_id', ignoreDuplicates: true });
  if (error) console.warn(`[Poller] msg ${msg.id}:`, error.message);

  if (msg.content && mentionsMagicNumber(msg.content)) {
    const assignee = extractAssignee(conv);
    const { data: existingAlert } = await supabaseAdmin.from('priority_alerts').select('id').eq('chatwoot_id', msg.id).maybeSingle();
    if (!existingAlert) {
      await supabaseAdmin.from('priority_alerts').insert({
        chatwoot_id: msg.id,
        conversation_chatwoot_id: convId,
        contact_name: conv.meta?.sender?.name || conv.contact_name || 'Desconhecido',
        inbox_name: conv.inbox?.name || '—',
        message_content: String(msg.content).substring(0, 300),
        mentioned_number: MAGIC_NUMBER,
        team_id: extractTeamId(conv),
        assignee_id: assignee?.id ?? null,
        assignee_name: assignee?.name ?? null,
      });
    }
  }
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const filters = await loadFilters();
    const conversations = await fetchFilteredConversations(filters);
    const started = Date.now();

    for (const conv of conversations) {
      await upsertConversation(conv);
      const messages = await getMessages(conv.id);
      for (const msg of messages) {
        await upsertMessage(msg, conv.id, conv);
      }
    }

    return json({
      ok: true,
      elapsed_ms: Date.now() - started,
      conversations: conversations.length,
      filters,
    });
  } catch (e) {
    console.error('[Poller]', e.message);
    return json({ ok: false, error: e.message }, 500);
  }
});