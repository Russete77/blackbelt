// Parser de CSV determinístico para a Importação de planilha (Analytics).
// Puro e isomórfico (sem `fetch`/DOM/Node) — roda tanto no client (preview de
// upload) quanto no server (Server Action, ao reprocessar o texto enviado).
//
// Escopo deliberado: sem IA/LLM aqui. Se um dia quisermos um parser
// assistido por IA para planilhas muito irregulares, o ponto de entrada é
// `detectarMapeamentoInicial` — ver TODO logo abaixo dela.

export type CampoCSV = "plataforma" | "data" | "streams" | "receita" | "artista" | "faixa";

export const CAMPOS_CSV: CampoCSV[] = ["plataforma", "data", "streams", "receita", "artista", "faixa"];

export const CAMPOS_OBRIGATORIOS: CampoCSV[] = ["plataforma", "data"];

export interface ResultadoParseCSV {
  headers: string[];
  linhas: string[][];
}

// Conta ocorrências de `,` e `;` fora de aspas na primeira linha não vazia
// para decidir o delimitador — planilhas pt-BR (Excel) costumam exportar
// com `;` quando a receita tem vírgula decimal.
export function detectarDelimitador(linhaCabecalho: string): "," | ";" {
  let virgulas = 0;
  let ponteVirgulas = 0;
  let dentroDeAspas = false;
  for (const ch of linhaCabecalho) {
    if (ch === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas && ch === ",") virgulas++;
    else if (!dentroDeAspas && ch === ";") ponteVirgulas++;
  }
  return ponteVirgulas > virgulas ? ";" : ",";
}

// Split de uma linha CSV respeitando campos entre aspas (com `""` como aspas
// literal escapada) — suficiente para exports comuns de Spotify for
// Artists/DistroKid/planilhas manuais, sem depender de lib externa.
function dividirLinha(linha: string, delimitador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (dentroDeAspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') { atual += '"'; i++; }
        else dentroDeAspas = false;
      } else {
        atual += ch;
      }
    } else if (ch === '"') {
      dentroDeAspas = true;
    } else if (ch === delimitador) {
      campos.push(atual);
      atual = "";
    } else {
      atual += ch;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

// Parseia o texto bruto do CSV em cabeçalho + linhas de dados. Linhas vazias
// são ignoradas; a primeira linha não vazia é sempre o cabeçalho.
export function parseCSV(texto: string): ResultadoParseCSV {
  const linhasBrutas = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (linhasBrutas.length === 0) return { headers: [], linhas: [] };

  const delimitador = detectarDelimitador(linhasBrutas[0]);
  const headers = dividirLinha(linhasBrutas[0], delimitador);
  const linhas = linhasBrutas.slice(1).map((l) => dividirLinha(l, delimitador));
  return { headers, linhas };
}

// Número em formato pt-BR ("1.234,56") ou en-US ("1234.56") ou puro
// ("1234"). Aceita prefixo "R$"/espaços. Retorna null se não der pra converter.
export function parseNumeroPtBR(valorBruto: string): number | null {
  const limpo = valorBruto.replace(/r\$/i, "").trim();
  if (limpo === "") return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado = limpo;
  if (temVirgula && temPonto) {
    // Ambos presentes: o último separador é o decimal (1.234,56 ou 1,234.56).
    const ultimaVirgula = limpo.lastIndexOf(",");
    const ultimoPonto = limpo.lastIndexOf(".");
    if (ultimaVirgula > ultimoPonto) {
      normalizado = limpo.replace(/\./g, "").replace(",", ".");
    } else {
      normalizado = limpo.replace(/,/g, "");
    }
  } else if (temVirgula) {
    // Só vírgula: em geral é decimal pt-BR ("1234,56"). Exceção: padrão de
    // milhar en-US puro — grupos de exatamente 3 dígitos ("1,234" ou
    // "1,234,567"), comum em exports de agregadoras internacionais; ler
    // como decimal errava a magnitude em 1000x (ou virava null).
    const semEspacos = limpo.replace(/\s/g, "");
    if (/^\d{1,3}(,\d{3})+$/.test(semEspacos)) {
      normalizado = semEspacos.replace(/,/g, "");
    } else {
      normalizado = limpo.replace(",", ".");
    }
  }
  // Só ponto (ou nenhum separador): já está no formato aceito pelo Number().

  const numero = Number(normalizado.replace(/\s/g, ""));
  return Number.isFinite(numero) ? numero : null;
}

// Datas aceitas: ISO (2026-07-04), pt-BR (04/07/2026) e variante com hífen
// (04-07-2026). Retorna "YYYY-MM-DD" ou null se inválida.
export function parseDataCSV(valorBruto: string): string | null {
  const valor = valorBruto.trim();
  if (valor === "") return null;

  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, ano, mes, dia] = iso;
    return dataValida(Number(ano), Number(mes), Number(dia)) ? `${ano}-${mes}-${dia}` : null;
  }

  const brasileira = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brasileira) {
    const [, dia, mes, ano] = brasileira;
    const diaP = dia.padStart(2, "0");
    const mesP = mes.padStart(2, "0");
    return dataValida(Number(ano), Number(mesP), Number(diaP)) ? `${ano}-${mesP}-${diaP}` : null;
  }

  return null;
}

function dataValida(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

// Remove acentos/case para comparação forgiving de cabeçalhos e, também,
// de nomes de artista/faixa ao resolver as colunas mapeadas contra o banco
// (ver app/(app)/analytics/actions.ts).
export function normalizarTexto(t: string): string {
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const PALAVRAS_CHAVE: Record<CampoCSV, string[]> = {
  plataforma: ["plataforma", "platform", "canal", "source", "servico", "loja"],
  data: ["data", "date", "dia", "mes", "periodo", "competencia"],
  streams: ["streams", "stream", "plays", "views", "reproducoes", "execucoes", "escutas"],
  receita: ["receita", "revenue", "royalt", "valor", "ganhos", "rendimento", "pagamento"],
  artista: ["artista", "artist"],
  faixa: ["faixa", "track", "musica", "song", "titulo", "title", "obra"],
};

// Heurística determinística (sem LLM) de mapeamento cabeçalho -> campo:
// casa por palavra-chave contida no header normalizado, na ordem de
// CAMPOS_CSV (primeiro campo ainda não ocupado que bater vence a coluna).
//
// TODO(IA-assistida): planilhas muito irregulares (cabeçalhos abreviados,
// idiomas variados, colunas fora de ordem sem nenhuma palavra-chave batendo)
// poderiam ganhar um passo opcional de sugestão via LLM aqui — mantendo
// SEMPRE a confirmação humana da tela de mapeamento como está hoje.
export function detectarMapeamentoInicial(headers: string[]): Partial<Record<CampoCSV, number>> {
  const mapeamento: Partial<Record<CampoCSV, number>> = {};
  const normalizados = headers.map(normalizarTexto);
  const ocupadas = new Set<number>();

  for (const campo of CAMPOS_CSV) {
    const palavras = PALAVRAS_CHAVE[campo];
    const indice = normalizados.findIndex(
      (h, i) => !ocupadas.has(i) && palavras.some((p) => h.includes(p)),
    );
    if (indice !== -1) {
      mapeamento[campo] = indice;
      ocupadas.add(indice);
    }
  }

  return mapeamento;
}
