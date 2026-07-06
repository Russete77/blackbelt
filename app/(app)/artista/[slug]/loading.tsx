// Skeleton só do conteúdo da aba (o cabeçalho/avatar/ResumoArtista/
// ArtistaTabs vivem no layout.tsx, fora deste Suspense) — sem isto, o
// loading.tsx único do grupo (app) apagaria cabeçalho e abas ao trocar de aba.
export default function ArtistaAbaLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="h-6 w-40 rounded-md bg-surface2" />
        <div className="h-9 w-32 rounded-md bg-surface2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-lg bg-surface2" />
        ))}
      </div>
    </div>
  );
}
