"use client";
// "＋ Subir música": fluxo em UM passo só (nome + arraste o áudio + projeto
// opcional) que substitui "criar projeto → nova faixa → abrir faixa → subir
// versão". Ao enviar:
//   1) iniciarFaixa (Server Action) resolve/cria o projeto e cria a faixa;
//   2) o áudio sobe do BROWSER para o bucket `audio` (RLS da sessão do
//      usuário — nunca service-role), no mesmo caminho usado por UploadVersao;
//   3) a primeira versão é registrada;
//   4) navega para /faixa/[id], já tocável.
import { useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UploadCloud, Music2, X, FileAudio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { validarArquivoAudio, lerDuracao } from "@/lib/audio";
import { labelTipoProjeto } from "@/lib/labels";
import { iniciarFaixa, type EstadoAcaoComId } from "@/app/(app)/actions";
import type { Projeto, TipoProjeto } from "@/types/domain";

const ESTADO_INICIAL: EstadoAcaoComId = { status: "idle" };
const TIPOS_PROJETO: TipoProjeto[] = ["single", "ep", "album", "feat"];

type ModoProjeto = "auto" | "existente" | "novo";
type Etapa = "idle" | "faixa" | "audio" | "versao";

const TEXTO_ETAPA: Record<Exclude<Etapa, "idle">, string> = {
  faixa: "Criando faixa…",
  audio: "Enviando áudio…",
  versao: "Registrando versão…",
};

export function SubirMusica({
  artistaId, artistaNome, projetos,
}: { artistaId: string; artistaNome: string; projetos: Projeto[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [modoProjeto, setModoProjeto] = useState<ModoProjeto>("auto");
  const [projetoId, setProjetoId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoProjeto>("single");
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [erro, setErro] = useState<string | null>(null);

  const enviando = etapa !== "idle";
  const nomeProjetoPadrao = `Faixas avulsas de ${artistaNome}`;

  function fechar() {
    if (enviando) return;
    setAberto(false);
    setTitulo("");
    setArquivo(null);
    setModoProjeto("auto");
    setProjetoId("");
    setNovoNome("");
    setNovoTipo("single");
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function escolherArquivo(file: File | null | undefined) {
    if (!file) return;
    const validacao = validarArquivoAudio(file);
    if ("erro" in validacao) {
      setErro(validacao.erro);
      return;
    }
    setErro(null);
    setArquivo(file);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro("Informe o nome da música.");
      return;
    }
    if (!arquivo) {
      setErro("Arraste ou escolha o arquivo de áudio.");
      return;
    }
    setErro(null);

    try {
      // 1) resolve/cria o projeto e cria a faixa (Server Action).
      setEtapa("faixa");
      const formData = new FormData();
      formData.set("titulo", titulo.trim());
      formData.set("artistaId", artistaId);
      formData.set("caminho", caminho);
      if (modoProjeto === "existente") {
        formData.set("projetoId", projetoId);
      } else if (modoProjeto === "novo") {
        formData.set("novoProjetoNome", novoNome.trim());
        formData.set("novoProjetoTipo", novoTipo);
      }

      const resultado = await iniciarFaixa(ESTADO_INICIAL, formData);
      if (resultado.status !== "ok" || !resultado.faixaId) {
        throw new Error(resultado.message ?? "Não foi possível criar a faixa.");
      }
      const faixaId = resultado.faixaId;

      // 2) upload do áudio direto do browser (sessão do usuário — RLS aplica).
      setEtapa("audio");
      const validacao = validarArquivoAudio(arquivo);
      if ("erro" in validacao) throw new Error(validacao.erro);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const path = `${faixaId}/${crypto.randomUUID()}.${validacao.ext}`;
      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(path, arquivo, { contentType: arquivo.type || "audio/mpeg" });
      if (uploadError) throw new Error(`Falha no upload do áudio: ${uploadError.message}`);

      // 3) registra a primeira versão da faixa.
      setEtapa("versao");
      const duracao = await lerDuracao(arquivo);
      const { error: insertError } = await supabase.from("versoes").insert({
        faixa_id: faixaId,
        tipo: "mix",
        rotulo: "V1",
        arquivo_path: path,
        duracao_segundos: duracao,
        enviado_por: user.id,
      });
      if (insertError) throw new Error("Áudio enviado, mas falhou o registro da versão.");

      // 4) abre a faixa já tocável.
      router.push(`/faixa/${faixaId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado no envio.");
      setEtapa("idle");
    }
  }

  if (!aberto) {
    return (
      <Button size="sm" onClick={() => setAberto(true)}>
        <UploadCloud className="h-4 w-4" aria-hidden />
        Subir música
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={fechar}
    >
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-fade-in-up rounded-lg border border-line bg-surface p-5 shadow-lg shadow-black/40"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Music2 className="h-4 w-4 text-accent" aria-hidden />
            Subir música
          </h3>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            disabled={enviando}
            className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <Field label="Nome da música">
            <Input
              autoFocus
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Madrugada"
              disabled={enviando}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Arquivo de áudio</p>
            <label
              onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastando(false);
                escolherArquivo(e.dataTransfer.files?.[0]);
              }}
              className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors duration-200 ${
                arrastando ? "border-accent bg-accent/5" : "border-line bg-surface2 hover:border-accent/40"
              } ${enviando ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="sr-only"
                disabled={enviando}
                onChange={(e) => escolherArquivo(e.target.files?.[0])}
              />
              {arquivo ? (
                <>
                  <FileAudio className="h-5 w-5 text-accent" aria-hidden />
                  <span className="max-w-full truncate text-sm font-medium text-fg">{arquivo.name}</span>
                  <span className="text-xs text-muted">{(arquivo.size / 1024 / 1024).toFixed(1)} MB — clique para trocar</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-5 w-5 text-muted" aria-hidden />
                  <span className="text-sm font-medium text-fg">Arraste o áudio aqui ou clique para escolher</span>
                  <span className="text-xs text-muted">MP3, WAV, FLAC, M4A, AAC, OGG, OPUS — até 200 MB</span>
                </>
              )}
            </label>
          </div>

          <Field label="Projeto (opcional)">
            <Select
              value={modoProjeto === "auto" ? "" : modoProjeto === "novo" ? "novo" : projetoId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") { setModoProjeto("auto"); setProjetoId(""); }
                else if (v === "novo") { setModoProjeto("novo"); setProjetoId(""); }
                else { setModoProjeto("existente"); setProjetoId(v); }
              }}
              disabled={enviando}
            >
              <option value="">{projetos.length > 0 ? `Sem projeto (${nomeProjetoPadrao})` : nomeProjetoPadrao}</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
              <option value="novo">Novo projeto…</option>
            </Select>
          </Field>

          {modoProjeto === "novo" && (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-surface2 p-3 animate-fade-in-up">
              <Field label="Nome do novo projeto">
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder={nomeProjetoPadrao}
                  disabled={enviando}
                />
              </Field>
              <Field label="Tipo">
                <Select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as TipoProjeto)} disabled={enviando}>
                  {TIPOS_PROJETO.map((t) => (
                    <option key={t} value={t}>{labelTipoProjeto(t)}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          <Button type="submit" disabled={enviando}>
            {enviando ? TEXTO_ETAPA[etapa as Exclude<Etapa, "idle">] : "Enviar e criar faixa"}
          </Button>
          {erro && <p className="text-xs text-danger">{erro}</p>}
        </div>
      </form>
    </div>
  );
}
