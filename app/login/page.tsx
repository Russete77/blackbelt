import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-bg text-fg p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">
          BLACK <span className="text-accent">BELT</span> 360
        </h1>
        <p className="text-muted text-sm text-center mb-8">
          Acesso por convite. Informe seu e-mail para receber o link de entrada.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
