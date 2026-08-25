// ══════════════════════════════════════════════════════════════════
// Cloudflare Pages Function — /api/assistente
// Faz a ponte entre o app e a API do Google Gemini, sem nunca expor a
// chave de API pro navegador (ela fica só aqui, como variável de
// ambiente do lado do servidor).
//
// Escopo intencionalmente limitado (decisão de segurança, não técnica):
// o assistente SÓ pode (1) responder perguntas usando o "contexto" que
// o app já mandou (dados que já estavam na tela do usuário — nunca
// busca nada novo no banco) e (2) sugerir a criação de viagens, sempre
// devolvendo uma prévia estruturada pro app confirmar/salvar — a IA
// NUNCA grava nada no banco diretamente.
// ══════════════════════════════════════════════════════════════════

const MODELO = 'gemini-flash-lite-latest'; // apelido — sempre aponta pro Flash-Lite atual, sobrevive a aposentadoria de versão

const SYSTEM_PROMPT = `Você é o assistente do TRK PCP, um sistema de logística de transferências.
Seu papel tem DUAS funções possíveis, e você deve escolher UMA delas por mensagem:

1) RESPONDER PERGUNTA — se o usuário está perguntando algo (quantas viagens, status,
   atraso, etc), responda usando SOMENTE os dados fornecidos no campo "contexto" abaixo.
   Nunca invente números que não estão lá. Se não tiver o dado no contexto, diga que não
   tem essa informação carregada na tela agora.

2) CRIAR VIAGEM(NS) — se o usuário está pedindo pra criar/programar uma ou mais viagens,
   extraia os campos e devolva uma lista estruturada. NÃO calcule horário de Saída nem de
   Apresentação — o app já faz isso sozinho a partir do horário de Chegada no FC. Você só
   preenche o que foi dito explicitamente; campos não mencionados ficam como string vazia.

Responda SEMPRE em JSON puro, sem markdown, sem \`\`\`, exatamente um destes dois formatos:

Pra pergunta:
{"tipo":"resposta","texto":"..."}

Pra criar viagem(ns):
{"tipo":"criar_viagens","viagens":[{"rota":"","transp":"","mot":"","placa":"","tipoCarga":"LTL ou FTL","tipologia":"CARRETA ou TRUCK ou VAN","planChegFC":"HH:MM"}],"resumo":"frase curta confirmando o que foi entendido"}

Se a mensagem não se encaixar em nenhum dos dois casos (ambígua, fora do escopo, pedindo
algo que não seja consulta ou criação de viagem), responda:
{"tipo":"erro","texto":"explicação curta do que faltou ou por que não deu pra entender"}`;

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return nova_resposta({ tipo: 'erro', texto: 'Assistente não configurado (chave ausente no servidor).' }, 500);
    }

    const body = await context.request.json().catch(() => null);
    const mensagem = (body?.mensagem || '').trim();
    const contexto = body?.contexto || {};
    if (!mensagem) {
      return nova_resposta({ tipo: 'erro', texto: 'Mensagem vazia.' }, 400);
    }
    if (mensagem.length > 500) {
      return nova_resposta({ tipo: 'erro', texto: 'Mensagem muito longa (máximo 500 caracteres).' }, 400);
    }

    const promptFinal = `${SYSTEM_PROMPT}\n\nContexto atual da tela (dados já carregados no app, use pra responder perguntas):\n${JSON.stringify(contexto).slice(0, 8000)}\n\nMensagem do usuário: "${mensagem}"`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptFinal }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800, responseMimeType: 'application/json' }
        })
      }
    );

    if (!r.ok) {
      const errTxt = await r.text().catch(() => '');
      // 429 = estourou o limite de requisições por minuto do plano gratuito
      if (r.status === 429) {
        return nova_resposta({ tipo: 'erro', texto: 'Assistente ocupado agora (muita gente usando ao mesmo tempo) — tenta de novo em alguns segundos.' }, 200);
      }
      console.error('Gemini erro:', r.status, errTxt);
      return nova_resposta({ tipo: 'erro', texto: 'Assistente indisponível no momento.' }, 200);
    }

    const data = await r.json();
    const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(textoResposta);
    } catch (e) {
      return nova_resposta({ tipo: 'erro', texto: 'Não entendi direito — pode reformular?' }, 200);
    }
    if (!parsed || !['resposta', 'criar_viagens', 'erro'].includes(parsed.tipo)) {
      return nova_resposta({ tipo: 'erro', texto: 'Não entendi direito — pode reformular?' }, 200);
    }
    return nova_resposta(parsed, 200);

  } catch (e) {
    console.error('assistente.js erro geral:', e.message);
    return nova_resposta({ tipo: 'erro', texto: 'Erro interno do assistente.' }, 500);
  }
}

function nova_resposta(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
