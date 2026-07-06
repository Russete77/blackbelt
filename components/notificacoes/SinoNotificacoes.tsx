"use client";
// Sino de notificações do shell: contagem de não lidas + dropdown/inbox com
// as recentes. Recebe os dados iniciais já resolvidos no servidor (ver
// AppShell) e gerencia lida/não-lida localmente (otimista), disparando as
// Server Actions em segundo plano — sem depender de um refresh de página
// para o usuário ver o efeito na hora.
import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatarTempoRelativo } from "@/lib/tempo";
import { marcarLida, marcarTodasLidas } from "@/app/(app)/notificacoes/actions";
import type { Notificacao } from "@/types/notificacoes";

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export function SinoNotificacoes({
  notificacoesIniciais, naoLidasIniciais,
}: { notificacoesIniciais: Notificacao[]; naoLidasIniciais: number }) {
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState(notificacoesIniciais);
  const [naoLidas, setNaoLidas] = useState(naoLidasIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  // Fecha com Esc, prende o foco (Tab) dentro do painel enquanto aberto e
  // devolve o foco pro sino ao fechar — mesmo comportamento do Modal.tsx.
  useEffect(() => {
    if (!aberto) return;

    const primeiro = painelRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
    primeiro?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAberto(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focaveis = painelRef.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL);
      if (!focaveis || focaveis.length === 0) return;
      const primeiroEl = focaveis[0];
      const ultimoEl = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroEl) {
        e.preventDefault();
        ultimoEl.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoEl) {
        e.preventDefault();
        primeiroEl.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      botaoRef.current?.focus();
    };
  }, [aberto]);

  function aoAbrirNotificacao(id: string, lida: boolean) {
    if (lida) return;
    const notificacoesAnteriores = notificacoes;
    const naoLidasAnteriores = naoLidas;
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    setNaoLidas((atual) => Math.max(0, atual - 1));
    startTransition(() => {
      marcarLida(id)
        .then(() => setErro(null))
        .catch(() => {
          setNotificacoes(notificacoesAnteriores);
          setNaoLidas(naoLidasAnteriores);
          setErro("Não foi possível marcar como lida. Tente de novo.");
        });
    });
  }

  function aoMarcarTodas() {
    if (naoLidas === 0) return;
    const notificacoesAnteriores = notificacoes;
    const naoLidasAnteriores = naoLidas;
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
    setNaoLidas(0);
    startTransition(() => {
      marcarTodasLidas()
        .then(() => setErro(null))
        .catch(() => {
          setNotificacoes(notificacoesAnteriores);
          setNaoLidas(naoLidasAnteriores);
          setErro("Não foi possível marcar todas como lidas. Tente de novo.");
        });
    });
  }

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Notificações"}
        aria-expanded={aberto}
        className="relative grid h-9 w-9 place-items-center rounded-md text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {naoLidas > 0 && (
          <span
            aria-hidden
            className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-fg"
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          {/* Camada de captura para fechar ao clicar fora — sem lib de modal. */}
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setAberto(false)} />
          <div
            ref={painelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={tituloId}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-fade-in-up rounded-lg border border-line bg-surface shadow-xl shadow-black/30"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 id={tituloId} className="text-sm font-semibold">Notificações</h3>
              {naoLidas > 0 && (
                <button
                  type="button"
                  onClick={aoMarcarTodas}
                  className="flex items-center gap-1 text-xs font-medium text-accent transition-colors duration-200 hover:brightness-110"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {erro && (
              <p role="alert" className="border-b border-line bg-danger/10 px-4 py-2 text-xs text-danger">
                {erro}
              </p>
            )}

            <div className="max-h-96 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Nenhuma notificação por aqui ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {notificacoes.map((n) => (
                    <li key={n.id}>
                      <ItemNotificacao notificacao={n} onAbrir={() => { setAberto(false); aoAbrirNotificacao(n.id, n.lida); }} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ItemNotificacao({ notificacao, onAbrir }: { notificacao: Notificacao; onAbrir: () => void }) {
  const conteudo = (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-4 py-3 text-sm transition-colors duration-200 hover:bg-surface2/60",
        !notificacao.lida && "bg-accent/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("font-medium", notificacao.lida ? "text-muted" : "text-fg")}>{notificacao.titulo}</p>
        {!notificacao.lida && <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
      </div>
      <p className="text-xs text-muted">{notificacao.mensagem}</p>
      <p className="text-[11px] text-muted">{formatarTempoRelativo(notificacao.criadoEm)}</p>
    </div>
  );

  if (notificacao.link) {
    return (
      <Link href={notificacao.link} onClick={onAbrir} className="block">
        {conteudo}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onAbrir} className="block w-full text-left">
      {conteudo}
    </button>
  );
}
