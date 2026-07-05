// Utilitários puros do módulo Registro & Direitos — normalização do JSON
// livre (jsonb) de obra/fonograma/videograma e checagem de "completo".
// Sem imports server-only: usado em Server Components, Server Actions e
// componentes client (formulários).
import type {
  Autor, CueSheetItem, DadosFonograma, DadosObra, DadosVideograma,
  Pessoa, ProdutorFonografico, TipoGravacao,
} from "@/types/registro";

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ------------------------------------------------------------------
// Obra (composição)
// ------------------------------------------------------------------

export function obraVazia(): DadosObra {
  return { tituloExato: "", autores: [], letra: "", partitura: "" };
}

function autor(o: unknown): Autor {
  const r = (o ?? {}) as Record<string, unknown>;
  return {
    nome: texto(r.nome),
    cpf: texto(r.cpf),
    nascimento: texto(r.nascimento),
    endereco: texto(r.endereco),
    rg: texto(r.rg),
  };
}

function listaAutores(v: unknown): Autor[] {
  if (!Array.isArray(v)) return [];
  return v.map(autor);
}

export function parseObra(bruto: unknown): DadosObra {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return obraVazia();
  const o = bruto as Record<string, unknown>;
  return {
    tituloExato: texto(o.tituloExato),
    autores: listaAutores(o.autores),
    letra: texto(o.letra),
    partitura: texto(o.partitura),
  };
}

export function obraDeJson(json: string): DadosObra {
  try { return parseObra(JSON.parse(json)); } catch { return obraVazia(); }
}

// "Minimamente preenchido": título + ao menos 1 autor com nome.
export function obraCompleta(d: DadosObra | null | undefined): boolean {
  if (!d) return false;
  return Boolean(d.tituloExato.trim()) && d.autores.some((a) => a.nome.trim() !== "");
}

// ------------------------------------------------------------------
// Fonograma (gravação)
// ------------------------------------------------------------------

export function fonogramaVazia(): DadosFonograma {
  return {
    titulo: "", interpretes: [], musicos: [],
    produtorFonografico: { nome: "", cpfCnpj: "" },
    data: "", local: "", tipo: "estudio",
  };
}

function pessoa(o: unknown): Pessoa {
  const r = (o ?? {}) as Record<string, unknown>;
  return { nome: texto(r.nome), cpf: texto(r.cpf) };
}

function listaPessoas(v: unknown): Pessoa[] {
  if (!Array.isArray(v)) return [];
  return v.map(pessoa);
}

function produtorFonografico(o: unknown): ProdutorFonografico {
  const r = (o ?? {}) as Record<string, unknown>;
  return { nome: texto(r.nome), cpfCnpj: texto(r.cpfCnpj) };
}

const TIPOS_GRAVACAO: TipoGravacao[] = ["estudio", "ao_vivo"];

export function normalizarTipoGravacao(v: unknown): TipoGravacao {
  return (TIPOS_GRAVACAO as readonly string[]).includes(v as string)
    ? (v as TipoGravacao)
    : "estudio";
}

export function parseFonograma(bruto: unknown): DadosFonograma {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return fonogramaVazia();
  const o = bruto as Record<string, unknown>;
  return {
    titulo: texto(o.titulo),
    interpretes: listaPessoas(o.interpretes),
    musicos: listaPessoas(o.musicos),
    produtorFonografico: produtorFonografico(o.produtorFonografico),
    data: texto(o.data),
    local: texto(o.local),
    tipo: normalizarTipoGravacao(o.tipo),
  };
}

export function fonogramaDeJson(json: string): DadosFonograma {
  try { return parseFonograma(JSON.parse(json)); } catch { return fonogramaVazia(); }
}

// "Minimamente preenchido": ISRC + título + ao menos 1 intérprete com nome.
export function fonogramaCompleta(
  d: DadosFonograma | null | undefined,
  isrc: string | null | undefined,
): boolean {
  if (!d) return false;
  return Boolean(isrc?.trim()) && Boolean(d.titulo.trim())
    && d.interpretes.some((p) => p.nome.trim() !== "");
}

// ------------------------------------------------------------------
// Videograma (clipe)
// ------------------------------------------------------------------

export function videogramaVazia(): DadosVideograma {
  return { autorObra: "", produtorFonografico: "", diretor: "", produtorVideo: "", cueSheet: [] };
}

function cueSheetItem(o: unknown): CueSheetItem {
  const r = (o ?? {}) as Record<string, unknown>;
  return { trecho: texto(r.trecho), duracao: texto(r.duracao), titular: texto(r.titular) };
}

function listaCueSheet(v: unknown): CueSheetItem[] {
  if (!Array.isArray(v)) return [];
  return v.map(cueSheetItem);
}

export function parseVideograma(bruto: unknown): DadosVideograma {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return videogramaVazia();
  const o = bruto as Record<string, unknown>;
  return {
    autorObra: texto(o.autorObra),
    produtorFonografico: texto(o.produtorFonografico),
    diretor: texto(o.diretor),
    produtorVideo: texto(o.produtorVideo),
    cueSheet: listaCueSheet(o.cueSheet),
  };
}

export function videogramaDeJson(json: string): DadosVideograma {
  try { return parseVideograma(JSON.parse(json)); } catch { return videogramaVazia(); }
}

// "Minimamente preenchido": diretor + ao menos 1 trecho de cue sheet.
export function videogramaCompleta(d: DadosVideograma | null | undefined): boolean {
  if (!d) return false;
  return Boolean(d.diretor.trim()) && d.cueSheet.some((c) => c.trecho.trim() !== "");
}
