"use client";
// "Subir versão": upload de áudio do computador para o bucket privado `audio`
// via client do BROWSER (sessão do usuário — RLS aplica) + insert em `versoes`.
// A página da faixa resolve a signed URL a partir de arquivo_path no servidor.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { labelTipoVersao } from "@/lib/labels";
import { lerDuracao, validarArquivoAudio } from "@/lib/audio";
import type { TipoVersao } from "@/types/domain";

const TIPOS: TipoVersao[] = ["beat", "vocal", "mix", "master"];

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
    const validacao = validarArquivoAudio(file);
    if ("erro" in validacao) {
      setErro(validacao.erro);
      return;
    }
    setEnviando(true);
    setErro(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const path = `${faixaId}/${crypto.randomUUID()}.${validacao.ext}`;

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
    <form onSubmit={enviar} className="w-full max-w-md animate-fade-in-up rounded-lg border border-line bg-surface p-4 shadow-lg shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subir versão</h3>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Arquivo de áudio">
          <Input ref={inputRef} type="file" accept="audio/*" required />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoVersao)}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{labelTipoVersao(t)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Rótulo">
          <Input
            value={rotulo}
            onChange={(e) => setRotulo(e.target.value)}
            placeholder="Ex.: Mix v2"
          />
        </Field>
        <Button type="submit" size="sm" disabled={enviando}>
          {enviando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Enviando...
            </>
          ) : (
            "Enviar versão"
          )}
        </Button>
        {erro && (
          <p className="text-xs text-danger" role="alert" aria-live="polite">
            {erro}
          </p>
        )}
      </div>
    </form>
  );
}
