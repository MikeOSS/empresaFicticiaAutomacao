const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const groqApiKey = defineSecret("GROQ_API_KEY");
// 8B = mais requisições/dia no free tier; estável para JSON estruturado
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const ALLOWED_ALERT_IDS = new Set([
  "INC-2026-089",
  "INC-2026-068",
  "INC-2026-064",
  "INC-2026-061",
  "INC-2026-056",
  "INC-2026-053",
  "INC-2026-051",
  "INC-2026-031",
  "INC-2026-011"
]);

// ── REGRAS DETERMINÍSTICAS (prioridade sobre o LLM) ───────────────────────────

function countVisitsWithoutFailure(historico) {
  return historico.filter((h) => h.tecnico_despachado && !h.falha_encontrada).length;
}

function hasRealFailureInHistory(historico) {
  return historico.some((h) => h.falha_encontrada);
}

function isReadingOutOfLimits(alert) {
  const { leitura_atual, limite_maximo, limite_minimo } = alert;
  if (limite_maximo != null && leitura_atual > limite_maximo) return true;
  if (limite_minimo != null && leitura_atual < limite_minimo) return true;
  if (alert.sensor === "valvula_atuador" && alert.historico.length > 0) return true;
  return false;
}

/** Retorna { is_real, reason } ou null se o caso for ambíguo (deixa o LLM sugerir texto). */
function getDeterministicClassification(alert) {
  const hist = alert.historico;

  if (hist.length === 0) {
    return { is_real: true, reason: "primeira_ocorrencia" };
  }

  if (hasRealFailureInHistory(hist)) {
    return { is_real: true, reason: "falha_real_anterior" };
  }

  const visitsNoFailure = countVisitsWithoutFailure(hist);
  if (visitsNoFailure >= 2 && isReadingOutOfLimits(alert)) {
    return { is_real: false, reason: "recorrencia_sem_falha" };
  }

  return null;
}

const ESTIMATED_DISPATCH_COST = {
  "INC-2026-089": 3200,
  "INC-2026-068": 8500,
  "INC-2026-064": 0,
  "INC-2026-061": 0,
  "INC-2026-056": 1980,
  "INC-2026-053": 200,
  "INC-2026-051": 2200,
  "INC-2026-031": 2400,
  "INC-2026-011": 1850
};

function estimateEconomia(alert) {
  return ESTIMATED_DISPATCH_COST[alert.id] ?? 2000;
}

function normalizeIsReal(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "sim") return true;
    if (s === "false" || s === "nao" || s === "não") return false;
  }
  return null;
}

function finalizeResponse(parsed, alert) {
  const rule = getDeterministicClassification(alert);
  let isReal = normalizeIsReal(parsed.is_real);

  if (rule) {
    isReal = rule.is_real;
    parsed.classificacao_regra = rule.reason;
  } else if (isReal === null) {
    isReal = true;
  }

  parsed.is_real = isReal;
  parsed.economia_gerada = isReal ? 0 : (Number(parsed.economia_gerada) || estimateEconomia(alert));
  parsed.confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || (rule ? 92 : 75)));

  return parsed;
}

function buildDeterministicOnlyResponse(alert, rule) {
  const isReal = rule.is_real;
  if (rule.reason === "primeira_ocorrencia") {
    return {
      is_real: true,
      classificacao_regra: rule.reason,
      verdict: "ALERTA REAL — Primeira ocorrência, despachar técnico",
      reasoning: `Leitura ${alert.leitura_atual} ${alert.unidade} fora do limite (${alert.limite_maximo ?? "N/A"} ${alert.unidade}). Sem histórico de visitas nesta máquina — não há padrão de falso alarme.`,
      actions: [
        "Despachar técnico para inspeção in loco",
        "Registrar baseline pós-visita no supervisório",
        "Monitorar sensor nas próximas 24h"
      ],
      economia_gerada: 0,
      confidence: 95
    };
  }
  if (rule.reason === "falha_real_anterior") {
    return {
      is_real: true,
      classificacao_regra: rule.reason,
      verdict: "ALERTA REAL — Histórico de falha confirmada",
      reasoning: "O histórico registra falha real anterior neste equipamento. Nova leitura anormal exige despacho com cautela.",
      actions: [
        "Despachar técnico prioritário",
        "Revisar intervenção anterior e hotfix",
        "Escalar para supervisão de planta"
      ],
      economia_gerada: 0,
      confidence: 93
    };
  }
  return {
    is_real: false,
    classificacao_regra: rule.reason,
    verdict: "FALSO POSITIVO — Despacho bloqueado",
    reasoning: `${countVisitsWithoutFailure(alert.historico)} visita(s) técnica(s) recente(s) sem falha confirmada. Padrão recorrente de alarme sem defeito.`,
    actions: [
      "Bloquear despacho automático",
      "Agendar calibração/inspeção do sensor em janela programada",
      "Notificar cliente sobre padrão recorrente"
    ],
    economia_gerada: estimateEconomia(alert),
    confidence: 94
  };
}

// ── PROMPT ────────────────────────────────────────────────────────────────────

function buildPrompt(alert) {
  const limMax = alert.limite_maximo !== null && alert.limite_maximo !== undefined
    ? `${alert.limite_maximo} ${alert.unidade}`
    : "N/A";
  const limMin = alert.limite_minimo !== null && alert.limite_minimo !== undefined
    ? `${alert.limite_minimo} ${alert.unidade}`
    : "N/A";

  const historicoLines = alert.historico.length > 0
    ? alert.historico.map(h => {
        const obs = h.observacao ? ` | obs: ${h.observacao}` : "";
        return `- ${h.data}: leitura ${h.leitura} ${alert.unidade} | técnico despachado: ${h.tecnico_despachado ? "sim" : "não"} | falha encontrada: ${h.falha_encontrada ? "sim" : "não"}${obs}`;
      }).join("\n")
    : "(sem histórico — primeira ocorrência)";

  return `Você é um agente de análise de alertas industriais da AltaCLP.

Decida is_real APENAS com base nos dados abaixo. Não assuma que todo alerta é falso positivo.

Ordem de decisão (obrigatória):
1. Histórico vazio (primeira ocorrência) → is_real: true (despachar técnico)
2. Alguma entrada do histórico com falha_encontrada: sim → is_real: true
3. Duas ou mais visitas com técnico despachado e falha_encontrada: não, e leitura fora do limite → is_real: false
4. Caso intermediário (ex.: só 1 visita sem falha) → analise os números; na dúvida is_real: true (segurança operacional)

Alerta:
- ID: ${alert.id}
- Máquina: ${alert.maquina}
- Cliente: ${alert.cliente}
- Sensor: ${alert.sensor}
- Leitura atual: ${alert.leitura_atual} ${alert.unidade}
- Limite máximo: ${limMax}
- Limite mínimo: ${limMin}
- Data/hora: ${alert.timestamp}

Histórico:
${historicoLines}

Primeiro defina is_real (boolean true/false, nunca string). Depois preencha verdict, reasoning e actions coerentes.

economia_gerada: use 0 se is_real for true; se false, estime custo evitado de um despacho (ex. 1500–8500 conforme gravidade).

Responda APENAS JSON válido:
{
  "is_real": true ou false,
  "verdict": "frase curta",
  "reasoning": "2-3 frases com números do alerta",
  "actions": ["ação 1", "ação 2", "ação 3"],
  "economia_gerada": número,
  "confidence": 0 a 100
}`;
}

// ── VALIDATION ────────────────────────────────────────────────────────────────

function validateAlert(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id || "");
  if (!ALLOWED_ALERT_IDS.has(id)) return null;

  const required = ["id", "maquina", "cliente", "sensor", "leitura_atual", "unidade", "timestamp", "historico"];
  for (const key of required) {
    if (raw[key] === undefined || raw[key] === null) return null;
  }

  if (typeof raw.leitura_atual !== "number") return null;
  if (!Array.isArray(raw.historico)) return null;

  return {
    id,
    maquina: String(raw.maquina).slice(0, 80),
    cliente: String(raw.cliente).slice(0, 120),
    sensor: String(raw.sensor).slice(0, 100),
    leitura_atual: raw.leitura_atual,
    unidade: String(raw.unidade || "").slice(0, 20),
    limite_maximo: raw.limite_maximo ?? null,
    limite_minimo: raw.limite_minimo ?? null,
    timestamp: String(raw.timestamp).slice(0, 25),
    historico: raw.historico.slice(0, 20).map(h => ({
      data: String(h.data || "").slice(0, 15),
      leitura: h.leitura,
      tecnico_despachado: Boolean(h.tecnico_despachado),
      falha_encontrada: Boolean(h.falha_encontrada),
      ...(h.observacao ? { observacao: String(h.observacao).slice(0, 200) } : {})
    }))
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function parseModelJson(text) {
  try {
    return JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Não foi possível interpretar o JSON do modelo.");
    return JSON.parse(match[0]);
  }
}

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function isRetryableLlmError(status, message) {
  if (status === 429 || status === 503) return true;
  return /rate limit|try again|unavailable|overloaded|high demand|resource exhausted/i.test(message || "");
}

async function callGroq(apiKey, prompt) {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }

    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Agente industrial AltaCLP. Responda só JSON válido. is_real deve ser boolean true ou false (nunca string). Siga a ordem de decisão do usuário."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    const groqData = await groqRes.json().catch(() => ({}));

    if (groqRes.ok) return groqData;

    const msg =
      groqData?.error?.message ||
      groqData?.message ||
      `Erro Groq HTTP ${groqRes.status}`;
    const retryable = isRetryableLlmError(groqRes.status, msg);

    if (!retryable || attempt === maxAttempts - 1) {
      const err = new Error(msg);
      err.status = groqRes.status;
      throw err;
    }

    console.warn(`Groq retry ${attempt + 1}/${maxAttempts - 1}:`, msg);
  }
}

// ── CLOUD FUNCTION ────────────────────────────────────────────────────────────

exports.analyzeAlert = onRequest(
  {
    invoker: "public",
    cors: true,
    secrets: [groqApiKey],
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (req, res) => {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Método não permitido. Use POST." });
      return;
    }

    const alert = validateAlert(req.body?.alert);
    if (!alert) {
      res.status(400).json({ error: "Alerta inválido ou não autorizado." });
      return;
    }

    try {
      const apiKey = groqApiKey.value().trim();
      if (!apiKey || apiKey.length < 20) {
        res.status(500).json({
          error:
            "GROQ_API_KEY inválida ou vazia. Rode: firebase functions:secrets:set GROQ_API_KEY"
        });
        return;
      }

      const rule = getDeterministicClassification(alert);
      let parsed;

      if (rule) {
        parsed = buildDeterministicOnlyResponse(alert, rule);
      } else {
        const groqData = await callGroq(apiKey, buildPrompt(alert));

        const text = groqData?.choices?.[0]?.message?.content;
        if (!text) {
          res.status(502).json({ error: "Resposta vazia do Groq." });
          return;
        }

        parsed = finalizeResponse(parseModelJson(text), alert);
      }

      const firestoreStatus = parsed.is_real === true ? "real" : "falso";
      await db.collection("alertas").doc(alert.id).update({
        status: firestoreStatus,
        resultado: {
          verdict: parsed.verdict ?? "",
          reasoning: parsed.reasoning ?? "",
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          economia_gerada: Number(parsed.economia_gerada) || 0,
          confidence: Number(parsed.confidence) || 0,
          analisado_em: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      res.status(200).json(parsed);
    } catch (err) {
      console.error("analyzeAlert error:", err);
      const msg = err.message || "Erro interno ao processar o alerta.";
      const hint = /invalid api key|unauthorized|authentication/i.test(msg)
        ? " Crie uma chave em https://console.groq.com/keys e rode: firebase functions:secrets:set GROQ_API_KEY"
        : "";
      res.status(err.status && err.status < 500 ? 502 : 500).json({ error: msg + hint });
    }
  }
);
