// Adaptador de IA de TEXTO, agnóstico de provedor. Lê a chave do ambiente
// (ANTHROPIC_API_KEY | OPENAI_API_KEY | AI_GATEWAY_API_KEY) e chama o provedor
// via fetch (sem SDK, sem dependência nova). SEM chave, NÃO inventa nada: lança
// erro pra quem chama tratar (a UI avisa pra configurar a chave). É server-only:
// só importe de Server Actions; a chave NUNCA vai pro bundle do cliente.
//
// Modelo é configurável por AI_MODEL; cada provedor tem um default sensato.

export interface OpcoesIA {
  system?: string;
  maxTokens?: number;
  // 0..1 — quão "criativo". Roteiro pede um pouco de criatividade.
  temperatura?: number;
}

type Provedor = "anthropic" | "openai" | "gateway";

// Erro lançado quando não há chave configurada — a Server Action distingue
// isso de uma falha de rede/quota pra mostrar a mensagem certa.
export class IASemChaveError extends Error {
  constructor() {
    super("Nenhuma chave de IA configurada.");
    this.name = "IASemChaveError";
  }
}

// Qual provedor está configurado (ordem de preferência). null = sem chave.
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

export async function gerarTextoIA(prompt: string, opts: OpcoesIA = {}): Promise<string> {
  const provedor = provedorIA();
  if (!provedor) throw new IASemChaveError();

  const modelo = process.env.AI_MODEL || MODELO_PADRAO[provedor];
  const maxTokens = opts.maxTokens ?? 1500;
  const temperatura = opts.temperatura ?? 0.7;

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
    if (!r.ok) throw new Error(`Anthropic respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    return d?.content?.[0]?.text ?? "";
  }

  // OpenAI e Gateway compartilham o formato chat/completions.
  const base = provedor === "openai" ? "https://api.openai.com/v1" : "https://ai-gateway.vercel.sh/v1";
  const chave = provedor === "openai" ? process.env.OPENAI_API_KEY! : process.env.AI_GATEWAY_API_KEY!;
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
  if (!r.ok) throw new Error(`${provedor} respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d?.choices?.[0]?.message?.content ?? "";
}
