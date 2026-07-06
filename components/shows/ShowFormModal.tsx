"use client";
// Formulário de criar/editar show dentro do Modal reutilizável (ver
// components/ui/Modal.tsx) — mesmo padrão de
// components/{lancamentos,clipes,documentos}/*FormModal.tsx. O ShowForm em
// si (dados + rider técnico + rider de camarim) não muda: só passa a viver
// dentro de um diálogo em vez de uma rota própria (/shows/novo,
// /shows/[id]/editar). Modal mais largo que o padrão (md:max-w-2xl) porque o
// ShowForm tem duas listas editáveis de rider — o conteúdo rola dentro do
// painel, nunca a página.
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ShowForm } from "@/components/shows/ShowForm";
import type { Artista } from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";

export function ShowFormModal({
  artistas, artistaIdInicial, show, trigger,
}: {
  artistas: Artista[];
  // Pré-seleção vinda da aba do artista ("Novo show" já vinculado).
  artistaIdInicial?: string;
  // Presente = modo edição.
  show?: ShowDetalhado;
  trigger: (abrir: () => void) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const editando = Boolean(show);

  return (
    <>
      {trigger(() => setAberto(true))}
      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={editando ? "Editar show" : "Novo show"}
        className="md:max-w-2xl"
      >
        <ShowForm artistas={artistas} artistaIdInicial={artistaIdInicial} show={show} />
      </Modal>
    </>
  );
}
