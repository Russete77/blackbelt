// Espelha analytics/page.tsx (cabeçalho + filtros + StatTiles + gráficos +
// tabela) em vez de deixar o loading.tsx único do grupo (app) apagar a tela.
export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse p-4 md:p-6" aria-busy="true" aria-label="Carregando analytics">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-md bg-surface2" />
          <div className="h-4 w-64 rounded bg-surface2" />
        </div>
        <div className="h-9 w-36 rounded-md bg-surface2" />
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="h-9 w-48 rounded-md bg-surface2" />
        <div className="h-9 w-40 rounded-md bg-surface2" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface2" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-lg bg-surface2" />
          <div className="h-64 rounded-lg bg-surface2" />
        </div>
        <div className="h-48 rounded-lg bg-surface2" />
      </div>
    </div>
  );
}
