"use client";
// Dialog acessível reutilizável — base do padrão "criar/editar em modal"
// usado por Lançamentos, Clipes e Documentos (ver PRD: trocar formulário de
// página inteira por modal). Portal pro <body>, fecha com Esc ou clique no
// backdrop, prende o foco dentro do painel enquanto aberto e devolve o foco
// pro elemento que abriu o modal ao fechar. `prefers-reduced-motion` já é
// tratado globalmente em app/globals.css (zera duration de toda animação),
// então as classes animate-* abaixo não precisam do prefixo motion-safe:.
// Em telas pequenas o painel vira bottom-sheet (sheet-up); em md+ é um
// dialog centralizado (fade-in-up).
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open, onClose, title, children, className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const painelRef = useRef<HTMLDivElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!open) return;

    focoAnteriorRef.current = document.activeElement as HTMLElement | null;
    const primeiro = painelRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
    primeiro?.focus();

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
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
      document.body.style.overflow = overflowAnterior;
      focoAnteriorRef.current?.focus();
    };
  }, [open, onClose]);

  // `open` só vira true a partir de um clique no cliente (todo consumidor
  // parte de useState(false)) — nunca durante o SSR, então não há
  // necessidade de um estado extra de "montado" só pra guardar o acesso a
  // `document` abaixo. O guard de tipo é só defensivo.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden border border-line bg-surface shadow-lg shadow-black/40",
          "animate-sheet-up rounded-t-2xl md:max-w-lg md:animate-fade-in-up md:rounded-2xl",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <h2 id={tituloId} className="font-display text-base uppercase tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
