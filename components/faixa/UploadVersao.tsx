"use client";
// "Subir versão": upload de áudio do computador para o bucket privado `audio`
// via client do BROWSER (sessão do usuário — RLS aplica) + insert em `versoes`.
// A página da faixa resolve a signed URL a partir de arquivo_path no servidor.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { labelTipoVersao } from "@/lib/labels";
import type { TipoVersao } from "@/types/domain";

const TIPOS: TipoVersao[] = ["beat", "vocal", "mix", "master"];

// accept="audio/*" é só dica de UI — validamos de verdade antes de subir.
const EXTENSOES_AUDIO = ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus"];
const TAMANHO_MAX_MB = 200; // WAV de mix passa fácil de 100 MB

// Lê a duração do arquivo no próprio browser via <audio> (metadata).
// Se o formato não for decodificável (ou nenhum evento disparar), segue
// com null após o timeout — o botão não pode ficar preso em "Enviando...".
function lerDuracao(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let resolvido = false;
    const finalizar = (valor: number | null) => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(valor);
    };
    const timeout = setTimeout(() => finalizar(null), 10_000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finalizar(Number.isFinite(audio.duration) ? Math.round(audio.duration * 100) / 100 : null);
    audio.onerror = () => finalizar(null);
    audio.src = url;
  });
}

export function UploadVersao({ faixaId }: { faixaId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoVersao>("mix");
  const [rotulo, setRotulo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setErro("Escolha um arquivo de áudio.");
      return;
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!EXTENSOES_AUDIO.includes(ext)) {
      setErro(`Formato não suportado (.${ext || "?"}). Use: ${EXTENSOES_AUDIO.join(", ")}.`);
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Arquivo de ${Math.round(file.size / 1024 / 1024)} MB — o limite é ${TAMANHO_MAX_MB} MB.`);
      return;
    }
    setEnviando(true);
    setErro(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const path = `${faixaId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(path, file, { contentType: file.type || "audio/mpeg" });
      // Mantém a causa real (limite do bucket, tipo, rede) — sem ela nem o
      // usuário nem o suporte sabem o que corrigir.
      if (uploadError) throw new Error(`Falha no upload do áudio: ${uploadError.message}`);

      const duracao = await lerDuracao(file);
      const { error: insertError } = await supabase.from("versoes").insert({
        faixa_id: faixaId,
        tipo,
        rotulo: rotulo.trim() || `${labelTipoVersao(tipo)} ${new Date().toLocaleDateString("pt-BR")}`,
        arquivo_path: path,
        duracao_segundos: duracao,
        enviado_por: user.id,
      });
      if (insertError) throw new Error("Áudio enviado, mas falhou o registro da versão.");

      setAberto(false);
      setRotulo("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado no envio.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Upload className="h-4 w-4" aria-hidden />
        Subir versão
      </Button>
    );
  }

  return (
    <form onSubmit={enviar} className="w-full max-w-md rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subir versão</h3>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="text-muted hover:text-fg transition"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Arquivo de áudio
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            required
            className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1 file:text-xs file:font-medium file:text-accent-fg"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoVersao)}
            className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>{labelTipoVersao(t)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Rótulo
          <input
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            placeholder="Ex.: Mix v2"
            className="rounded-md border border-line bg-surface2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
        <Button type="submit" size="sm" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar versão"}
        </Button>
        {erro && <p className="text-xs text-danger">{erro}</p>}
      </div>
    </form>
  );
}
