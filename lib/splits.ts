// Validação PURA de splits por faixa (faixa_artistas) — participantes + %.
// Extraída de app/(app)/splits/actions.ts para ser testável sem Supabase:
// recebe os dados crus (como chegam do JSON do FormData) e valida cada regra
// de dinheiro (UUID válido, sem artista duplicado, % de cada um entre 0 e
// 100), devolvendo a lista já normalizada + a soma dos percentuais. A action
// só chama estas funções e mantém as MESMAS mensagens de erro.

// Formato estrito de UUID — artistaId chega de JSON.parse (FormData) e é
// interpolado no filtro `.not("artista_id", "in", "(...)")` da action; sem
// essa validação, vírgula/parênteses no valor quebrariam o filtro do Postgrest.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Item cru como vem do JSON do FormData (nada garantido sobre os tipos).
export interface ParticipanteEntrada {
  artistaId?: unknown;
  papel?: unknown;
  percentual?: unknown;
}

// Participante já validado e normalizado — pronto pro upsert em faixa_artistas.
export interface ParticipanteSplit {
  artista_id: string;
  papel: string | null;
  percentual: number;
}

export type ResultadoValidacaoSplits =
  | { ok: true; participantes: ParticipanteSplit[]; somaPercentual: number }
  | { ok: false; erro: string };

// Soma dos percentuais arredondada a 2 casas (evita ruído de ponto flutuante,
// ex.: 33.33 + 33.33 + 33.34). Usada tanto na validação quanto no aviso.
export function somaPercentuais(participantes: { percentual: number }[]): number {
  return Math.round(participantes.reduce((s, p) => s + p.percentual, 0) * 100) / 100;
}

// Valida a lista crua de participantes de uma faixa. Regras (na ordem em que a
// action original as aplicava, para preservar exatamente a mensagem retornada):
//  1. artistaId presente          -> "Selecione um artista para cada participante."
//  2. artistaId em formato UUID    -> "Artista inválido."
//  3. sem artista duplicado        -> "Um artista não pode aparecer duas vezes na mesma faixa."
//  4. percentual finito em [0,100] -> "O percentual de cada participante deve estar entre 0 e 100."
// `papel` é preservado como veio (string vazia -> null). NÃO rejeita soma > 100:
// como na action original, uma soma que não fecha 100% é só um AVISO (ver
// avisoSomaSplits), não um erro — o usuário pode salvar mesmo assim.
export function validarSplits(bruto: unknown): ResultadoValidacaoSplits {
  if (!Array.isArray(bruto)) {
    return { ok: false, erro: "Lista de participantes inválida." };
  }

  const participantes: ParticipanteSplit[] = [];
  const idsVistos = new Set<string>();
  for (const item of bruto as ParticipanteEntrada[]) {
    const artistaId = String(item?.artistaId ?? "").trim();
    if (!artistaId) {
      return { ok: false, erro: "Selecione um artista para cada participante." };
    }
    if (!UUID_REGEX.test(artistaId)) {
      return { ok: false, erro: "Artista inválido." };
    }
    if (idsVistos.has(artistaId)) {
      return { ok: false, erro: "Um artista não pode aparecer duas vezes na mesma faixa." };
    }
    idsVistos.add(artistaId);

    const percentual = Number(item?.percentual);
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      return { ok: false, erro: "O percentual de cada participante deve estar entre 0 e 100." };
    }

    const papelBruto = String(item?.papel ?? "").trim();
    participantes.push({ artista_id: artistaId, papel: papelBruto || null, percentual });
  }

  return { ok: true, participantes, somaPercentual: somaPercentuais(participantes) };
}

// Sufixo de aviso quando a soma dos % não fecha 100% (tolerância de 0.01 para
// não implicar com arredondamento). Vazio quando não há participantes ou a
// soma bate 100% — idêntico ao que a action montava inline.
export function avisoSomaSplits(quantidade: number, somaPercentual: number): string {
  return quantidade > 0 && Math.abs(somaPercentual - 100) > 0.01
    ? ` — soma de ${somaPercentual}% (não fecha 100%)`
    : "";
}
