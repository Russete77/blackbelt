// Espelha previsao/page.tsx (cabeçalho + filtro + gráficos de tendência +
// StatTiles de expectativa) em vez de deixar o loading.tsx único do grupo
// (app) apagar a tela.
export default function PrevisaoLoading() {
  return (
    <div className="animate-pulse p-4 md:p-6" aria-busy="true" aria-label="Carregando previsão">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-64 rounded-md bg-surface2" />
          <div className="h-4 w-80 max-w-full rounded bg-surface2" />
        </div>
      </div>

      <div className="mb-6 h-9 w-48 rounded-md bg-surface2" />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-lg bg-surface2" />
          <div className="h-64 rounded-lg bg-surface2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-surface2" />
          ))}
        </div>
      </div>
    </div>
  );
}
