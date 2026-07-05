import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="min-h-screen grid place-items-center bg-bg text-fg p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">
          BLACK <span className="text-accent">BELT</span> 360
        </h1>
        <p className="text-muted text-sm text-center mb-8">
          Acesso por convite. Informe seu e-mail para receber o link de entrada.
        </p>
        {erro === "auth" && (
          <p className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
            O link de entrada expirou ou já foi usado. Peça um novo abaixo.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
