"use server";
// Gerador de roteiro de clipe por IA (dor nº1 do selo). Monta o prompt com o
// contexto real da faixa (título, gênero, letra) e chama o adaptador agnóstico
// de provedor (lib/ai.ts) — que cai num rascunho de exemplo se não houver chave.
// Sessão do usuário (RLS aplica na leitura da faixa).
import { createClient } from "@/lib/supabase/server";
import { gerarTextoIA, provedorIA, IASemChaveError } from "@/lib/ai";

export interface EstadoRoteiro {
  status: "idle" | "ok" | "error";
  message?: string;
  roteiro?: string;
}

// System prompt profissional: pede um TREATMENT de clipe no padrão de mercado,
// com estrutura fixa (logline → conceito → referências → cena a cena com
// enquadramento/câmera → produção → VFX → viabilidade). É isto que separa um
// "textinho" de um roteiro que a produtora consegue executar.
const SYSTEM = [
  "Você é um DIRETOR e roteirista de videoclipe profissional, especialista em rap e funk brasileiros.",
  "Entregue um TRATAMENTO (treatment) de clipe pronto pra produção, no padrão de mercado, em português do Brasil.",
  "Use EXATAMENTE esta estrutura, com cada título em negrito (markdown **):",
  "**Logline** — uma frase que resume a ideia visual do clipe.",
  "**Conceito** — 1–2 parágrafos com a visão, a metáfora central e como ela conversa com a letra.",
  "**Tom & Referências visuais** — estética, paleta de cor e referências (diretores, clipes, filmes).",
  "**Roteiro cena a cena** — para CADA cena: faixa de tempo, locação, ação, enquadramento/plano, movimento de câmera, figurino/arte e transição para a próxima.",
  "**Produção** — locações, elenco/figuração, props e figurino necessários.",
  "**VFX & pós** — cor, efeitos e ritmo de edição casado com a batida.",
  "**Viabilidade** — o que dá pra fazer com orçamento independente e o que exige mais recurso.",
  "Seja concreto, cinematográfico e factível. Quando houver 'Direção do artista', trate como BRIEFING obrigatório e construa em cima dela.",
].join("\n");

export async function gerarRoteiroClipe(faixaId: string, instrucoes?: string): Promise<EstadoRoteiro> {
  if (!faixaId) return { status: "error", message: "Faixa inválida." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Entre novamente." };

  const { data: faixa, error } = await supabase
    .from("faixas")
    .select("titulo, genero, letra")
    .eq("id", faixaId)
    .maybeSingle();
  if (error || !faixa) return { status: "error", message: "Faixa não encontrada." };

  const direcao = (instrucoes ?? "").trim();
  const partes = [
    `Faixa: "${faixa.titulo}".`,
    faixa.genero ? `Gênero: ${faixa.genero}.` : "",
    faixa.letra ? `Letra:\n${faixa.letra}` : "Sem letra cadastrada — trabalhe pelo título e gênero.",
    direcao ? `\nDireção do artista (briefing obrigatório):\n${direcao}` : "",
    "\nEscreva o tratamento completo do clipe para esta faixa, seguindo a estrutura pedida.",
  ].filter(Boolean).join("\n");

  try {
    // Teto alto: um treatment completo (10+ cenas + produção/VFX/viabilidade)
    // passa de 5k tokens — com pouco, cortava no meio (faltava VFX/viabilidade).
    const texto = await gerarTextoIA(partes, { system: SYSTEM, maxTokens: 8000, temperatura: 0.8 });
    if (!texto.trim()) return { status: "error", message: "A IA não retornou conteúdo. Tente novamente." };
    return { status: "ok", roteiro: texto };
  } catch (e) {
    if (e instanceof IASemChaveError) {
      return { status: "error", message: "IA não configurada. Adicione ANTHROPIC_API_KEY, OPENAI_API_KEY ou AI_GATEWAY_API_KEY no .env.local." };
    }
    return { status: "error", message: `A IA falhou: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}

// Exposto pra UI decidir o rótulo do botão (mock vs real) sem chamar a IA.
export async function iaEstaConfigurada(): Promise<boolean> {
  return provedorIA() !== null;
}
