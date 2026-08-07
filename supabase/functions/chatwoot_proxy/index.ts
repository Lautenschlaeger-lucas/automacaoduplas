// ============================================================
// CHATWOOT_PROXY — acoes sob demanda autenticadas (verify_jwt=true)
// Porta de auditor-chatwoot/server.js (rotas /api de busca/consulta)
// Usado pelo Painel via supabase.functions.invoke('chatwoot_proxy')
// ============================================================

import {
  listAgents, listInboxes, listTeams, getTeamMembers,
  getContact, searchContacts, getContactConversations,
  getMessages, sendMessage,
} from '../_shared/chatwoot.ts';
import { handleCors, json } from '../_shared/cors.ts';

function normalizeDigits(t) { return String(t || '').replace(/[^\d]/g, ''); }

function buildContactRaw(c) {
  return {
    id: c.id, name: c.name, email: c.email, phone: c.phone_number,
    company: c.additional_attributes?.company_name || c.custom_attributes?.company_name || '',
  };
}

async function buscarCliente(searchTerm) {
  const term = String(searchTerm || '').trim();
  if (!term) return { found: false, message: 'Informe um termo para busca.' };

  if (/^\d+$/.test(term)) {
    const c = await getContact(term);
    if (!c) return { found: false, message: 'Cliente não encontrado no Chatwoot.' };
    return { found: true, contact: buildContactRaw(c) };
  }

  const termLower = term.toLowerCase();
  const isEmail = termLower.includes('@');
  const isPhone = /^[\d\s\-\()\+]+$/.test(term);

  if (isEmail) {
    const local = termLower.split('@')[0];
    const results = await safeSearch(local);
    const match = results.find((c) => c.email && c.email.toLowerCase().trim() === termLower);
    return match
      ? { found: true, contact: buildContactRaw(match) }
      : { found: false, message: 'Nenhum cliente cadastrado com este e-mail.' };
  }

  if (isPhone) {
    const results = await safeSearch(term);
    const digits = normalizeDigits(term);
    const match = results.find((c) => {
      const pd = normalizeDigits(c.phone_number);
      return pd.includes(digits) || digits.includes(pd);
    });
    return match
      ? { found: true, contact: buildContactRaw(match) }
      : { found: false, message: 'Nenhum cliente encontrado com esse termo.' };
  }

  const results = await safeSearch(term);
  const match = results[0];
  return match
    ? { found: true, contact: buildContactRaw(match) }
    : { found: false, message: 'Nenhum cliente encontrado com esse termo.' };
}

async function safeSearch(q) {
  try { return await searchContacts(q); } catch { return []; }
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case 'buscar-cliente':
        return json(await buscarCliente(body.searchTerm));
      case 'conversas-contato': {
        const convs = await getContactConversations(body.contactId);
        return json({ conversations: convs || [] });
      }
      case 'mensagens': {
        const messages = await getMessagesSafe(body.conversationId);
        return json({ messages: messages || [] });
      }
      case 'enviar': {
        if (!body.content || !String(body.content).trim()) return json({ error: true, message: 'Digite a mensagem.' }, 400);
        const created = await sendMessage(body.conversationId, String(body.content).trim());
        return json({ success: true, message: created.payload || created });
      }
      case 'agents': return json(await listAgents());
      case 'inboxes': return json(await listInboxes());
      case 'teams': return json(await listTeams());
      case 'team-members': return json(await getTeamMembers(body.teamId));
      default: return json({ error: true, message: 'Acao desconhecida.' }, 400);
    }
  } catch (e) {
    console.error('[proxy]', e.message);
    return json({ error: true, message: e.message || 'Erro no proxy.' }, 500);
  }
});

async function getMessagesSafe(convId) {
  try { return await getMessages(convId); } catch { return []; }
}