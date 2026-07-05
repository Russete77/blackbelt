// Utilitários puros do módulo Shows — status, datas e riders (JSON).
// Sem imports server-only: usado em Server Components, Server Actions e
// componentes client (formulários de rider).
//
// Datas: o produto é pt-BR e a agenda vive em America/Sao_Paulo. O Brasil
// não tem horário de verão desde 2019, então o offset fixo -03:00 é seguro
// e evita depender do fuso do servidor (Vercel roda em UTC).
import type { RiderCamarim, RiderInput, RiderTecnico, ShowDetalhado, StatusShow } from "@/types/shows";

// ------------------------------------------------------------------
// Status
// ------------------------------------------------------------------

export const STATUS_SHOW: StatusShow[] = ["negociando", "confirmado", "realizado", "cancelado"];

export const labelStatusShow = (s: StatusShow): string =>
  ({ negociando: "Negociando", confirmado: "Confirmado",
     realizado: "Realizado", cancelado: "Cancelado" }[s]);

// Tone do <Badge> por status (tons existentes do design system).
export const toneStatusShow = (s: StatusShow): "media" | "accent" | "aprovado" | "alta" =>
  ({ negociando: "media", confirmado: "accent",
     realizado: "aprovado", cancelado: "alta" } as const)[s];

// Coluna `status` é text livre no banco — normaliza para o enum da app.
export function normalizarStatusShow(bruto: string | null | undefined): StatusShow {
  return (STATUS_SHOW as readonly string[]).includes(bruto ?? "")
    ? (bruto as StatusShow)
    : "negociando";
}

// ------------------------------------------------------------------
// Datas (America/Sao_Paulo) e cachê (BRL)
// ------------------------------------------------------------------

const TZ = "America/Sao_Paulo";
const OFFSET_BR = "-03:00";

// "sáb., 10 de out. de 2026, 21:00"
export function formatarDataShow(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, weekday: "short", day: "2-digit",
    month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

// Partes para o bloco de data dos cards: { dia: "10", mes: "out", hora: "21:00", diaSemana: "sáb" }.
export function partesDataShow(iso: string): { dia: string; mes: string; hora: string; diaSemana: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    dia: de("day"),
    mes: de("month").replace(".", ""),
    hora: `${de("hour")}:${de("minute")}`,
    diaSemana: de("weekday").replace(".", ""),
  };
}

// Chave de agrupamento mensal da agenda: "2026-10".
export function chaveMesShow(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" })
    .formatToParts(d);
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${de("year")}-${de("month")}`;
}

// "2026-10" -> "Outubro de 2026" (cabeçalho de mês da agenda).
export function labelMesShow(chave: string): string {
  const [ano, mes] = chave.split("-").map(Number);
  if (!ano || !mes) return chave;
  const nome = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "long" })
    .format(new Date(Date.UTC(ano, mes - 1, 15)));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

// ISO (timestamptz) -> valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm"),
// na parede de relógio de São Paulo.
export function isoParaInputLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  // hour12:false pode devolver "24" para meia-noite em alguns runtimes.
  const hora = de("hour") === "24" ? "00" : de("hour");
  return `${de("year")}-${de("month")}-${de("day")}T${hora}:${de("minute")}`;
}

// Valor de <input type="datetime-local"> -> ISO UTC, interpretando como
// horário de São Paulo. Null se o formato for inválido.
export function inputLocalParaIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00${OFFSET_BR}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Cachê em BRL — exibido sempre em font-mono nas telas.
export function formatarCache(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

// ------------------------------------------------------------------
// Agenda — partição próximos / sem data / anteriores + grupos por mês
// ------------------------------------------------------------------

export interface AgendaParticionada {
  proximos: ShowDetalhado[];   // ordem cronológica
  semData: ShowDetalhado[];
  anteriores: ShowDetalhado[]; // mais recente primeiro
}

// `shows` deve chegar ordenado por data ascendente (como em lib/db.ts).
// `agora` é injetável para testes; o default roda fora do render de
// componentes (regra react-hooks/purity).
export function particionarAgenda(
  shows: ShowDetalhado[],
  agora: number = Date.now(),
): AgendaParticionada {
  return {
    proximos: shows.filter((s) => s.data && Date.parse(s.data) >= agora),
    semData: shows.filter((s) => !s.data),
    anteriores: shows.filter((s) => s.data && Date.parse(s.data) < agora).reverse(),
  };
}

// Agrupa shows (já em ordem cronológica) por mês local, preservando a ordem.
export function agruparPorMes(shows: ShowDetalhado[]): { chave: string; shows: ShowDetalhado[] }[] {
  const meses: { chave: string; shows: ShowDetalhado[] }[] = [];
  for (const show of shows) {
    if (!show.data) continue;
    const chave = chaveMesShow(show.data);
    const ultimo = meses[meses.length - 1];
    if (ultimo && ultimo.chave === chave) ultimo.shows.push(show);
    else meses.push({ chave, shows: [show] });
  }
  return meses;
}

// ------------------------------------------------------------------
// Riders — normalização do JSON (jsonb é livre; nunca confiar no shape)
// ------------------------------------------------------------------

export function riderTecnicoVazio(): RiderTecnico {
  return { pa: "", monitores: "", backline: [], inputs: [], observacoes: "" };
}

export function riderCamarimVazio(): RiderCamarim {
  return { pessoas: null, alimentacao: [], bebidas: [], itens: [], observacoes: "" };
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function listaDeTextos(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function listaDeInputs(v: unknown): RiderInput[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return { canal: texto(o.canal), fonte: texto(o.fonte), microfone: texto(o.microfone) };
    })
    .filter((i) => i.canal.trim() !== "" || i.fonte.trim() !== "" || i.microfone.trim() !== "");
}

export function parseRiderTecnico(bruto: unknown): RiderTecnico {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return riderTecnicoVazio();
  const o = bruto as Record<string, unknown>;
  return {
    pa: texto(o.pa),
    monitores: texto(o.monitores),
    backline: listaDeTextos(o.backline),
    inputs: listaDeInputs(o.inputs),
    observacoes: texto(o.observacoes),
  };
}

export function parseRiderCamarim(bruto: unknown): RiderCamarim {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return riderCamarimVazio();
  const o = bruto as Record<string, unknown>;
  const pessoas = Number(o.pessoas);
  return {
    pessoas: Number.isFinite(pessoas) && pessoas > 0 ? Math.floor(pessoas) : null,
    alimentacao: listaDeTextos(o.alimentacao),
    bebidas: listaDeTextos(o.bebidas),
    itens: listaDeTextos(o.itens),
    observacoes: texto(o.observacoes),
  };
}

// Versões a partir de string JSON (hidden inputs do formulário → Server Action).
// JSON inválido degrada para rider vazio — nunca derruba a ação.
export function riderTecnicoDeJson(json: string): RiderTecnico {
  try { return parseRiderTecnico(JSON.parse(json)); } catch { return riderTecnicoVazio(); }
}

export function riderCamarimDeJson(json: string): RiderCamarim {
  try { return parseRiderCamarim(JSON.parse(json)); } catch { return riderCamarimVazio(); }
}

export function riderTecnicoTemConteudo(r: RiderTecnico | null): boolean {
  if (!r) return false;
  return Boolean(r.pa.trim() || r.monitores.trim() || r.observacoes.trim())
    || r.backline.length > 0 || r.inputs.length > 0;
}

export function riderCamarimTemConteudo(r: RiderCamarim | null): boolean {
  if (!r) return false;
  return Boolean(r.observacoes.trim()) || r.pessoas != null
    || r.alimentacao.length > 0 || r.bebidas.length > 0 || r.itens.length > 0;
}
