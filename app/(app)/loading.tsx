// Feedback imediato enquanto as queries do Supabase resolvem — sem isto a
// navegação bloqueia em silêncio na cadeia de dados.
export default function AppLoading() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" aria-busy="true" aria-label="Carregando">
      <div className="animate-pulse">
        <div className="mb-6 h-7 w-48 rounded-md bg-surface2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
