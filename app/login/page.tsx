import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg p-4 text-fg">
      {/* brilho dourado sutil atrás do wordmark — atmosfera, não ruído */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-1 text-center font-display text-4xl uppercase tracking-tight">
          BLACK <span className="text-accent">BELT</span> <span className="text-muted">360</span>
        </h1>
        <p className="mb-8 text-center text-sm text-muted">
          Acesso por convite. Informe seu e-mail para receber o link de entrada.
        </p>
        {erro === "auth" && (
          <p className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
            O link de entrada expirou ou já foi usado. Peça um novo abaixo.
          </p>
        )}
        <div className="rounded-lg border border-line bg-surface p-5 shadow-xl shadow-black/30">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
