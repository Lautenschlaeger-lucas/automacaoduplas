// ============================================================
// ANALYZE — analise do historico + minuta de resposta via DeepSeek
// Porta de auditor-chatwoot/services/analyzer.js (com withRetry p/ 429)
// Env: DEEPSEEK_API_KEY. verify_jwt = true.
// ============================================================

import { handleCors, json } from '../_shared/cors.ts';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.status === 429 || String(error.message).includes('429');
      if (!isRateLimit || attempt === maxAttempts) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

function extractReply(body) {
  const first = body?.choices?.[0]?.message?.content;
  return typeof first === 'string' ? first : '';
}

async function chatCompletion(prompt, temperature) {
  return await withRetry(() =>
    fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('DEEPSEEK_API_KEY') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature,
      }),
    }).then(async (r) => {
      const body = await r.json();
      if (!r.ok) {
        const err = new Error(body?.error?.message || `${r.status} ${r.statusText}`);
        err.response = { status: r.status, data: body };
        throw err;
      }
      return body;
    })
  );
}

function buildPrompt(transcript, theme) {
  return `
Você é um auditor de qualidade. Leia o histórico de conversas abaixo.
Sua tarefa é encontrar todas as vezes em que o atendente orientou o cliente sobre o tema: "${theme}".

IMPORTANTE: Não se limite à palavra exata. Use seu entendimento semântico para identificar variações, sinônimos, frases e contextos relacionados ao tema.

Exemplo: se o tema for "estoque", considere também: "estoques", "sem estoque", "saldo insuficiente", "pedido sem estoque", "item sem estoque", "falta de produto", "reposição de mercadoria".

Seja abrangente — qualquer orientação do atendente que tenha relação com o tema deve ser contabilizada.

Responda EXATAMENTE neste formato:

Tema Analisado: [Tema]
Total de Orientações: [X] vezes

Ocorrências:

━━━ Conversa #[ID da conversa] ━━━
📅 Data:     [Data e Hora]
👤 Agente:   [Nome do Agente]
🔗 Conversa: [Link completo da conversa]
📝 Resumo:   [Resumo em 1 linha da orientação dada]

(repita o bloco acima para cada ocorrência, separando com uma linha em branco)

IMPORTANTE: Ordene as ocorrências da mais antiga para a mais recente por Data.

Se não houver menções ao tema, informe apenas: "Nenhuma orientação encontrada sobre o tema."

Para identificar o ID, agente e link, veja o cabeçalho "--- Conversa ID: X | Agente: NOME | Link: URL ---" acima das mensagens de cada conversa.

Histórico:
${transcript}
`;
}

function buildDraftPrompt(transcript) {
  return `
Você é um atendente de uma central de atendimento. Leia o histórico da conversa abaixo.

Escreva uma resposta para a última mensagem do cliente, no tom profissional, claro e objetivo.
Siga as orientações já dadas pelos atendentes anteriores no histórico, se houver.
NÃO invente informações que não estejam no histórico. Se a informação for necessária mas não existir no histórico, diga que vai verificar e retornar.
Responda APENAS com a mensagem final, sem aspas, sem saudação de abertura ("Olá, tudo bem?"), sem se apresentar como IA e sem explicações.

Histórico:
${transcript}
`;
}

function buildTranscript(conversations, chatwootUrl, accountId) {
  let transcript = '';
  for (const conv of conversations) {
    const agente = conv.assignee?.name || conv.assigned_agent?.name || conv.assignee_name || 'Não atribuído';
    const convLink = `${chatwootUrl}/app/accounts/${accountId}/conversations/${conv.id}`;
    transcript += `\n--- Conversa ID: ${conv.id} | Agente: ${agente} | Link: ${convLink} ---\n`;
    const msgs = conv.messages || [];
    for (const msg of msgs) {
      if (msg.content) {
        const date = msg.created_at ? new Date(msg.created_at).toLocaleString('pt-BR') : '—';
        const isAgent = senderIsAgent(msg, agente);
        const sender = isAgent ? `Atendente (${agente})` : 'Cliente';
        transcript += `[${date}] ${sender}: ${msg.content}\n`;
      }
    }
  }
  return transcript;
}

function senderIsAgent(msg, agente) {
  const st = String(msg.sender_type || msg.sender?.type || '').toLowerCase();
  if (st === 'user' || st === 'agent') return true;
  return [1, 2, 3, 4, 5, 6, 7].includes(Number(msg.message_type));
}

function buildSingleTranscript(messages) {
  let transcript = '';
  for (const msg of Array.isArray(messages) ? messages : []) {
    if (!msg || !msg.content) continue;
    const isAgent = senderIsAgent(msg, null);
    const date = msg.created_at ? new Date(msg.created_at).toLocaleString('pt-BR') : '—';
    const sender = isAgent ? 'Atendente' : 'Cliente (Desconhecido)';
    transcript += `[${date}] ${sender}: ${msg.content}\n`;
  }
  return transcript;
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'analisar';

    if (action === 'analisar') {
      const { contacts, theme, chatwootUrl, accountId } = body;
      if (!contacts?.length || !theme) return json({ error: true, message: 'Contacts e tema são obrigatórios.' }, 400);
      const transcript = buildTranscript(contacts, chatwootUrl || '', accountId || '');
      const content = await chatCompletion(buildPrompt(transcript, theme), 0.1);
      const text = extractReply(content);
      return json({ result: text });
    }

    if (action === 'minuta') {
      const { contacts, chatwootUrl, accountId } = body;
      const messages = (contacts?.[0]?.messages) || (body.messages) || [];
      const transcript = Array.isArray(messages) && messages.length > 0
        ? (contacts ? buildTranscript(contacts, chatwootUrl || '', accountId || '') : buildSingleTranscript(messages))
        : buildSingleTranscript(messages);
      const content = await chatCompletion(buildDraftPrompt(transcript), 0.7);
      const clean = extractReply(content)
        .replace(/^["'\s]+/, '').replace(/["'\s]+$/, '').trim();
      return json({ success: true, draft: clean });
    }

    return json({ error: true, message: 'Acao desconhecida.' }, 400);
  } catch (e) {
    console.error('[analyze]', e.message);
    const status = e?.response?.status || 500;
    const msg = status === 429 ? 'Limite de requisições excedido. Tente novamente em instantes.'
      : status === 402 ? 'Saldo insuficiente no DeepSeek.'
      : (status === 401 || status === 403) ? 'Falha de autenticação na API DeepSeek.'
      : 'Erro inesperado na análise. Tente novamente.';
    return json({ error: true, message, retryable: true }, status);
  }
});