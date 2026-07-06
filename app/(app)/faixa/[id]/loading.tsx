// Espelha FaixaClient/FootprintView (voltar + capa/título + player + lista)
// em vez de deixar o loading.tsx único do grupo (app) apagar a tela inteira.
export default function FaixaLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse p-4 md:p-6" aria-busy="true" aria-label="Carregando faixa">
      <div className="mb-4 h-4 w-20 rounded bg-surface2" />
      <div className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-lg bg-surface2" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-6 w-48 rounded bg-surface2" />
          <div className="h-4 w-32 rounded bg-surface2" />
        </div>
      </div>
      <div className="mb-6 h-28 rounded-lg bg-surface2" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-surface2" />
        ))}
      </div>
    </div>
  );
}
