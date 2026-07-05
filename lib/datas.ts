// Datas date-only (colunas `date` do Postgres, ex.: metricas.data).
// `new Date("2026-07-04")` é interpretado como meia-noite UTC — em UTC-3
// renderiza 03/07/2026. Ancoramos no horário local para exibir o dia certo.
export function formatarDataPura(isoDate: string): string {
  // Já tem hora (timestamptz)? O parse padrão é correto.
  const d = isoDate.includes("T") ? new Date(isoDate) : new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("pt-BR");
}
