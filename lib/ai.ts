// Adaptador de IA de TEXTO, agnóstico de provedor. Lê a chave do ambiente
// (ANTHROPIC_API_KEY | OPENAI_API_KEY | AI_GATEWAY_API_KEY) e chama o provedor
// correspondente via fetch (sem SDK, sem dependência nova). SEM chave, cai num
// MOCK determinístico — a feature funciona/demonstra sem custo, e é só plugar a
// chave depois, sem trocar código. É server-only: só importe de Server Actions;
// a chave NUNCA vai pro bundle do cliente.
//
// Modelo é configurável por AI_MODEL; cada provedor tem um default sensato.

export interface OpcoesIA {
  system?: string;
  maxTokens?: number;
  // 0..1 — quão "criativo". Roteiro pede um pouco de criatividade.
  temperatura?: number;
}

type Provedor = "anthropic" | "openai" | "gateway";

// Qual provedor está configurado (ordem de preferência). null = sem chave (mock).
export function provedorIA(): Provedor | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.AI_GATEWAY_API_KEY) return "gateway";
  return null;
}

const MODELO_PADRAO: Record<Provedor, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o-mini",
  // Gateway usa o formato "provedor/modelo".
  gateway: "anthropic/claude-sonnet-4",
};

export interface ResultadoIA {
  texto: string;
  // true quando veio do mock (sem chave) — a UI avisa que é rascunho de exemplo.
  mock: boolean;
}

export async function gerarTextoIA(prompt: string, opts: OpcoesIA = {}): Promise<ResultadoIA> {
  const provedor = provedorIA();
  if (!provedor) return { texto: mockTexto(prompt, opts), mock: true };

  const modelo = process.env.AI_MODEL || MODELO_PADRAO[provedor];
  const maxTokens = opts.maxTokens ?? 1500;
  const temperatura = opts.temperatura ?? 0.7;

  try {
    if (provedor === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelo, max_tokens: maxTokens, temperature: temperatura,
          system: opts.system, messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}`);
      const d = await r.json();
      return { texto: d?.content?.[0]?.text ?? "", mock: false };
    }

    // OpenAI e Gateway compartilham o formato chat/completions.
    const base = provedor === "openai"
      ? "https://api.openai.com/v1"
      : "https://ai-gateway.vercel.sh/v1";
    const chave = provedor === "openai"
      ? process.env.OPENAI_API_KEY!
      : process.env.AI_GATEWAY_API_KEY!;
    const mensagens = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: prompt },
    ];
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({ model: modelo, max_tokens: maxTokens, temperature: temperatura, messages: mensagens }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`${provedor} ${r.status}`);
    const d = await r.json();
    return { texto: d?.choices?.[0]?.message?.content ?? "", mock: false };
  } catch (e) {
    // Falha de rede/quota/modelo: não quebra a tela — cai no mock com aviso.
    console.error("[ai] provedor falhou, usando mock:", e);
    return { texto: mockTexto(prompt, opts), mock: true };
  }
}

// Mock determinístico: sem chave, ainda entrega um rascunho estruturado e útil
// (não é "lorem ipsum") pra validar o fluxo e a UI. O prompt real já traz o
// contexto da faixa; aqui devolvemos um esqueleto de roteiro cena a cena.
function mockTexto(prompt: string, opts: OpcoesIA): string {
  void opts;
  const contexto = prompt.slice(0, 400).replace(/\s+/g, " ").trim();
  return [
    "**[RASCUNHO DE EXEMPLO — sem chave de IA configurada]**",
    "",
    "**Conceito.** Narrativa urbana em tom cru, cortes secos no ritmo da batida.",
    "",
    "**Cena 1 — Abertura (0:00–0:15).** Plano aberto da quebrada ao amanhecer; o artista entra em contraluz. Câmera na mão, movimento nervoso.",
    "**Cena 2 — Verso 1 (0:15–0:45).** Close no rosto, letra em primeira pessoa; cortes rápidos com b-roll da rotina que a letra descreve.",
    "**Cena 3 — Refrão (0:45–1:05).** Grupo reunido, energia coletiva, câmera girando 360°. Cor mais saturada, dourado da BLACK BELT.",
    "**Cena 4 — Verso 2 (1:05–1:35).** Locação noturna, luz de poste; contraste com a abertura. Slow-motion em um gesto-chave.",
    "**Cena 5 — Fechamento (1:35–fim).** Volta ao plano de abertura, agora com o grupo; fade no dourado.",
    "",
    "**Referências visuais.** Contraluz, câmera na mão, dourado/preto do selo, quebrada real.",
    "",
    `_(gerado a partir do contexto: “${contexto}…”)_`,
  ].join("\n");
}
