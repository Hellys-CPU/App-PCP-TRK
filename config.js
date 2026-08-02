// Cloudflare Pages Function — rota: /api/config
// GET  -> devolve qual projeto Supabase está ativo ("A" ou "B")
// POST -> troca o projeto ativo (exige senha)
//
// Requer um binding de KV chamado CONFIG_KV, configurado em:
// Painel Cloudflare > Pages > (projeto) > Settings > Functions > KV namespace bindings
// Variable name: CONFIG_KV  |  KV namespace: trk_config

const SENHA_TROCA = 'Hellys8020';
const CHAVE_KV = 'activeProject';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestGet({ env }) {
  try {
    const valor = await env.CONFIG_KV.get(CHAVE_KV);
    // Se a chave ainda não existir no KV, assume "A" como padrão seguro
    return jsonResponse({ projeto: valor === 'B' ? 'B' : 'A' });
  } catch (e) {
    // Nunca deixa o boot do app travado por causa dessa rota — sempre cai pro projeto A
    return jsonResponse({ projeto: 'A', aviso: 'erro ao ler KV, usando padrão' });
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ erro: 'corpo inválido' }, 400);
  }

  const { senha, projeto } = body || {};

  if (senha !== SENHA_TROCA) {
    return jsonResponse({ erro: 'senha incorreta' }, 401);
  }
  if (projeto !== 'A' && projeto !== 'B') {
    return jsonResponse({ erro: 'projeto deve ser "A" ou "B"' }, 400);
  }

  try {
    await env.CONFIG_KV.put(CHAVE_KV, projeto);
    return jsonResponse({ ok: true, projeto });
  } catch (e) {
    return jsonResponse({ erro: 'falha ao gravar no KV' }, 500);
  }
}
