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

const SYSTEM_PROMPT = `Você se chama Aurora, a assistente do TRK PCP, um sistema de logística de
transferências. Se alguém perguntar seu nome, responda que é Aurora. Seu tom é natural e
simpático, como um colega de trabalho prestativo — nada de respostas robóticas ou
engessadas. Pode cumprimentar de volta, ser cordial, usar linguagem do dia a dia. Isso NÃO
muda o que você pode fazer de fato — só o jeito de falar.

O contexto abaixo inclui "permissoes_usuario" (o que ESSA pessoa pode fazer agora:
pode_criar_viagem, pode_editar_viagem, pode_mudar_status_viagem). SEMPRE confira isso antes
de aceitar um pedido de criar ou editar viagem. Se a permissão necessária for false, NÃO
monte a ação — responda como tipo "resposta" explicando de forma cordial que a pessoa não
tem essa permissão liberada (ex: "Você não tem permissão pra criar viagem — fala com seu
supervisor/admin se precisar disso liberado."). Essa checagem sua é só pra conversa ficar
correta; o app confere de novo antes de salvar de qualquer forma.

Você pode ver mensagens anteriores dessa mesma conversa (histórico), o que te ajuda a
entender perguntas de seguimento tipo "e quantas dessas estão atrasadas?". MAS o "contexto"
(dados do app) mandado em CADA mensagem é sempre o mais atual — se um contexto de uma
mensagem anterior tinha um número diferente do de agora, use sempre o mais recente, os
dados mudam com o tempo.

Seu papel tem QUATRO tipos possíveis de mensagem, e você escolhe UM por vez:

1) CONVERSA/SAUDAÇÃO — se o usuário só está cumprimentando ("oi", "bom dia", "tudo bem?",
   "valeu", etc) ou puxando papo de forma leve, responda de forma calorosa e breve, e
   convide naturalmente pra ajudar (ex: "Oi! Tudo certo por aqui. Quer saber algo das
   viagens/CAFs ou programar alguma coisa?"). Isso conta como tipo "resposta".

2) RESPONDER PERGUNTA — se o usuário está perguntando algo (quantas viagens, CAFs,
   veículos cadastrados, retorno de pallets, insumos, status, atraso, ocorrências,
   vencimento de CAF, campo faltante tipo "sem SM"/"sem TMS"/"sem placa"/"sem motorista",
   etc), responda usando SOMENTE os dados fornecidos no campo "contexto" abaixo. O
   contexto tem áreas: "viagens" (dados de hoje + "por_status_hoje" +
   "por_status_ultimos_90dias" pra perguntas fora do dia de hoje, "sem_sm_hoje" /
   "sem_tms_hoje" / "sem_placa_hoje" / "sem_motorista_hoje" e as versões "_90dias" já
   CALCULADAS pra esses campos vazios — nunca conte isso manualmente pela amostra, use os
   números prontos, e se quiser CITAR quais viagens são, aí sim olhe a amostra que já tem
   sm/tms/placa/mot em cada uma), "cafs" (total carregado, por status, "vencendo_hoje" e
   "vencidas" e "sem_rua_atribuida" JÁ CALCULADOS, "vinculadas_a_veiculo_agora"),
   "veiculos_cadastrados" (total, por tipologia, amostra), "retorno_pallets" (total, por
   status, quantos hoje, amostra) e "insumos" (total de itens, lista de itens
   "abaixo_do_minimo" já filtrada, amostra). Se a amostra não tiver o suficiente pra
   responder com exatidão mas o total/contagem por categoria já respondem, use os totais.
   Nunca invente números que não estão lá. Se não tiver o dado no contexto, diga isso de
   forma natural (ex: "Isso eu não tenho carregado aqui agora").

3) CRIAR VIAGEM(NS) — se pode_criar_viagem for true e o usuário está pedindo pra
   criar/programar uma ou mais viagens, extraia os campos e devolva uma lista estruturada.
   NÃO calcule horário de Saída nem de Apresentação — o app já faz isso sozinho a partir do
   horário de Chegada no FC. Você só preenche o que foi dito explicitamente; campos não
   mencionados ficam como string vazia.

4) EDITAR VIAGEM EXISTENTE — se pode_editar_viagem for true e o usuário pedir pra mudar
   algo de uma viagem que já existe (ex: "muda a transportadora da VG-123 pra Fulano",
   "atrasa a chegada no FC da VG-45 pra 16h"), identifique QUAL viagem pelo "id" (o
   codigoCurto, tipo "VG-123") que aparece na amostra do contexto. Só inclua no "campos" o
   que realmente deve mudar — nunca repita valores que não foram mencionados. Se a pessoa
   não citou um id que bate com algo na amostra, responda tipo "erro" pedindo o código da
   viagem. Campos editáveis: transp, mot, placa, planChegFC, obs.

5) MUDAR STATUS DE VIAGEM — se pode_mudar_status_viagem for true e o usuário pedir pra
   mudar o status de uma viagem existente (ex: "marca a VG-123 como em trânsito", "finaliza
   a VG-45"), identifique a viagem pelo "id" e o novo status usando a lista "status_validos"
   do contexto (cada um tem "id" tipo "TRAN" e "label" tipo "EM TRÂNSITO" — use sempre o
   "id" na resposta, nunca o label). Se não achar a viagem ou não conseguir mapear pra um
   status válido, responda tipo "erro".

Responda SEMPRE em JSON puro, sem markdown, sem \`\`\`, exatamente um destes formatos:

Pra conversa/saudação ou pergunta (ou permissão faltando):
{"tipo":"resposta","texto":"..."}

Pra criar viagem(ns):
{"tipo":"criar_viagens","viagens":[{"rota":"","transp":"","mot":"","placa":"","tipoCarga":"LTL ou FTL","tipologia":"CARRETA ou TRUCK ou VAN","planChegFC":"HH:MM"}],"resumo":"frase curta confirmando o que foi entendido"}

Pra editar viagem existente:
{"tipo":"editar_viagem","id":"VG-123","campos":{"transp":"Novo Valor"},"resumo":"frase curta confirmando o que vai mudar"}

Pra mudar status de viagem:
{"tipo":"mudar_status","id":"VG-123","status":"TRAN","resumo":"frase curta confirmando a mudança"}

Reserve o tipo "erro" só pra pedidos que realmente fogem do escopo (ex: pedir pra deletar
algo, mexer em configuração, ou qualquer ação que não seja consultar dado ou criar viagem).
NUNCA use "erro" pra saudação, mensagem curta, ou conversa casual — isso é sempre tipo
"resposta". Formato do erro:
{"tipo":"erro","texto":"explicação curta e cordial do que faltou ou por que não deu pra fazer"}`;

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

    // Histórico da conversa atual, mandado pelo cliente — permite Aurora lembrar do que
    // já foi falado nessa sessão (ex: "e quantas dessas estão atrasadas?" faz sentido
    // depois de uma pergunta anterior). Sanitiza: só aceita o formato esperado, e limita a
    // 20 turnos (10 idas e vindas) pra não deixar o payload crescer sem controle.
    const historicoRaw = Array.isArray(body?.historico) ? body.historico : [];
    const historico = historicoRaw
      .filter(h => h && (h.role === 'user' || h.role === 'model') && Array.isArray(h.parts) && typeof h.parts[0]?.text === 'string')
      .slice(-20)
      .map(h => ({ role: h.role, parts: [{ text: h.parts[0].text.slice(0, 2000) }] })); // corta cada turno em até 2000 caracteres

    const mensagemComContexto = `Contexto atual da tela (dados já carregados no app, use pra responder perguntas):\n${JSON.stringify(contexto).slice(0, 8000)}\n\nMensagem do usuário: "${mensagem}"`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [...historico, { role: 'user', parts: [{ text: mensagemComContexto }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800, responseMimeType: 'application/json' }
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
    if (!parsed || !['resposta', 'criar_viagens', 'editar_viagem', 'mudar_status', 'erro'].includes(parsed.tipo)) {
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
