// Tempo relativo em pt-BR (ex.: "agora mesmo", "há 5 minutos", "ontem") para
// timestamps recentes — usado no inbox de notificações. Além de ~30 dias cai
// para a data absoluta (ver formatarDataPura em lib/datas.ts para datas puras).
const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const UNIDADES: { limiteSegundos: number; divisor: number; unidade: Intl.RelativeTimeFormatUnit }[] = [
  { limiteSegundos: 60, divisor: 1, unidade: "second" },
  { limiteSegundos: 3600, divisor: 60, unidade: "minute" },
  { limiteSegundos: 86400, divisor: 3600, unidade: "hour" },
  { limiteSegundos: 86400 * 30, divisor: 86400, unidade: "day" },
];

// `agora` é injetável para testes determinísticos; em produção usa o relógio real.
export function formatarTempoRelativo(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;

  const diffSegundos = (agora.getTime() - data.getTime()) / 1000;
  if (diffSegundos < 5) return "agora mesmo";

  for (const { limiteSegundos, divisor, unidade } of UNIDADES) {
    if (diffSegundos < limiteSegundos) {
      const valor = Math.round(diffSegundos / divisor);
      return rtf.format(-valor, unidade);
    }
  }
  return data.toLocaleDateString("pt-BR");
}
