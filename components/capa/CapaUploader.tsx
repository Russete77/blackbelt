"use client";
// Uploader reutilizável de capa/foto (artista, projeto, faixa).
// Sobe a imagem ao bucket privado `covers` em {tipo}/{id}.{ext} (upsert)
// via client do BROWSER (sessão do usuário — RLS aplica), atualiza a coluna
// da linha (foto_url para artista; capa_url para projeto/faixa) e dá refresh.
// A exibição resolve o caminho com getSignedCoverUrl no servidor.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TipoCapa = "artista" | "projeto" | "faixa";

const EXTENSOES_IMAGEM = ["jpg", "jpeg", "png", "webp"];
const TAMANHO_MAX_MB = 10;

const ALVOS: Record<TipoCapa, { tabela: string; coluna: string }> = {
  artista: { tabela: "artistas", coluna: "foto_url" },
  projeto: { tabela: "projetos", coluna: "capa_url" },
  faixa: { tabela: "faixas", coluna: "capa_url" },
};

export function CapaUploader({
  tipo, id, rotulo = "Capa", className,
}: { tipo: TipoCapa; id: string; rotulo?: string; className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // accept="image/*" é só dica de UI — validamos de verdade antes de subir.
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!EXTENSOES_IMAGEM.includes(ext)) {
      setErro(`Formato não suportado (.${ext || "?"}). Use: ${EXTENSOES_IMAGEM.join(", ")}.`);
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Imagem de ${Math.round(file.size / 1024 / 1024)} MB — o limite é ${TAMANHO_MAX_MB} MB.`);
      return;
    }
    setEnviando(true);
    setErro(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const path = `${tipo}/${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (uploadError) throw new Error(`Falha no upload da imagem: ${uploadError.message}`);

      const alvo = ALVOS[tipo];
      const { error: updateError } = await supabase
        .from(alvo.tabela)
        .update({ [alvo.coluna]: path })
        .eq("id", id);
      if (updateError) throw new Error("Imagem enviada, mas falhou a atualização do registro.");

      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado no envio.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-accent hover:border-accent transition disabled:opacity-50"
      >
        <ImagePlus className="h-3.5 w-3.5" aria-hidden />
        {enviando ? "Enviando..." : rotulo}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={enviar}
        className="hidden"
        aria-label={`Enviar ${rotulo.toLowerCase()}`}
      />
      {erro && <span className="ml-2 text-xs text-danger">{erro}</span>}
    </span>
  );
}
