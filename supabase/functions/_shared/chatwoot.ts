// ============================================================
// Chatwoot API client (Deno) — porta de auditor-chatwoot/services/chatwoot.js
// Usa env vars: CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_KEY
// ============================================================

const BASE = () =>
  `${Deno.env.get('CHATWOOT_URL')}/api/v1/accounts/${Deno.env.get('CHATWOOT_ACCOUNT_ID')}`;

const HEADERS = () => ({
  api_access_token: Deno.env.get('CHATWOOT_API_KEY') || '',
  'Content-Type': 'application/json',
});

async function request(path, opts = {}) {
  const res = await fetch(`${BASE()}${path}`, { ...opts, headers: HEADERS() });
  if (!res.ok) {
    const err = new Error(`Chatwoot ${res.status} ${res.statusText}`);
    err.status = res.status;
    try {
      const body = await res.json();
      err.data = body;
    } catch {
      /* ignore */
    }
    throw err;
  }
  return res.json();
}

export async function listAgents() {
  try {
    const data = await request('/agents');
    return data.payload || data;
  } catch {
    try {
      const data = await request('/account_users');
      const users = data.payload || [];
      return users.filter((u) => u.role === 'agent');
    } catch {
      return [];
    }
  }
}

export async function listInboxes() {
  try {
    const data = await request('/inboxes');
    return data.payload || data;
  } catch {
    return [];
  }
}

async function listConversations(status = 'open') {
  const data = await request(`/conversations?status=${status}&per_page=100`);
  const inner = data.data || data.payload || data;
  if (Array.isArray(inner)) return inner;
  if (inner && Array.isArray(inner.payload)) return inner.payload;
  return [];
}

export async function listConversationsByStatuses(statuses = ['open']) {
  const results = await Promise.all(statuses.map((s) => listConversations(s)));
  const seen = new Set();
  return results.flat().filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export async function listConversationsByTeamId(teamId, status = 'open') {
  try {
    const data = await request(`/conversations?status=${status}&team_id=${teamId}&per_page=100`);
    const inner = data.data || data.payload || data;
    if (Array.isArray(inner)) return inner;
    if (inner && Array.isArray(inner.payload)) return inner.payload;
    return [];
  } catch {
    return [];
  }
}

export async function listConversationsByTeamIds(teamIds, statuses = ['open', 'pending']) {
  const results = await Promise.all(
    teamIds.flatMap((tid) => statuses.map((s) => listConversationsByTeamId(tid, s)))
  );
  const seen = new Set();
  return results.flat().filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export async function getMessages(conversationId) {
  const data = await request(`/conversations/${conversationId}/messages`);
  return data.payload || [];
}

export async function sendMessage(conversationId, content) {
  const data = await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, message_type: 'outgoing' }),
  });
  return data;
}

export async function getContact(contactId) {
  const data = await request(`/contacts/${contactId}`);
  return data.payload;
}

export async function searchContacts(q) {
  const data = await request(`/contacts/search?q=${encodeURIComponent(q)}&per_page=100`);
  return data.payload || [];
}

export async function getContactConversations(contactId) {
  const data = await request(`/contacts/${contactId}/conversations`);
  return data.payload || [];
}

export async function listTeams() {
  try {
    const data = await request('/teams');
    const teams = data.payload || data || [];
    return Array.isArray(teams) ? teams : [];
  } catch {
    return [];
  }
}

export async function getTeamMembers(teamId) {
  try {
    const data = await request(`/teams/${teamId}/team_members`);
    let list = data.payload || data || [];
    if (!Array.isArray(list) && data.data && Array.isArray(data.data)) list = data.data;
    return Array.isArray(list) ? list : [];
  } catch {
    try {
      const data = await request(`/teams/${teamId}`);
      const team = data.payload || data;
      if (team) {
        const members = team.members || team.team_members || [];
        return Array.isArray(members) ? members : [];
      }
      return [];
    } catch {
      return [];
    }
  }
}
