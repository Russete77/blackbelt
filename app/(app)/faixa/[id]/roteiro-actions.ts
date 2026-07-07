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

const SYSTEM = [
  "Você é um diretor de videoclipe de rap/funk brasileiro, direto e visual.",
  "Gere um ROTEIRO cena a cena, pronto pra virar demanda de produção.",
  "Formato: Conceito (1 parágrafo); depois cenas numeradas com faixa de tempo,",
  "locação, ação e tipo de plano/câmera; encerre com Referências visuais.",
  "Seja concreto e factível pra uma produção independente. Português do Brasil.",
].join(" ");

export async function gerarRoteiroClipe(faixaId: string): Promise<EstadoRoteiro> {
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

  const partes = [
    `Faixa: "${faixa.titulo}".`,
    faixa.genero ? `Gênero: ${faixa.genero}.` : "",
    faixa.letra ? `Letra:\n${faixa.letra}` : "Sem letra cadastrada — trabalhe pelo título e gênero.",
    "\nGere o roteiro de clipe cena a cena para esta faixa.",
  ].filter(Boolean).join("\n");

  try {
    const texto = await gerarTextoIA(partes, { system: SYSTEM, maxTokens: 1600, temperatura: 0.8 });
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
