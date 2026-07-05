"use client";
// Form de criar/editar documento, dentro do Modal reutilizável (ver
// components/ui/Modal.tsx) — um único componente para as duas ações: sem
// `documento`, cria; com `documento`, edita pré-preenchido. Mesmo padrão de
// render-prop `trigger` de LancamentoFormModal/ClipeFormModal.
//
// Upload do arquivo: sem bucket próprio para documentos ainda (ver PRD),
// reusa o bucket privado `covers` sob `documentos/{artistaId}/{uuid}.{ext}`
// — envio direto do browser (client com sessão do usuário, RLS aplica,
// mesmo padrão de components/capa/CapaUploader.tsx), fora do ciclo de vida
// do <form>: assim que o arquivo é escolhido, já sobe e guarda o caminho em
// estado; o submit da Server Action só grava metadados (título/tipo/
// arquivo_path/observação). Sem arquivo, o documento fica só com a
// observação (link/nota) — nunca bloqueia o cadastro.
import { useActionState, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { criarDocumento, atualizarDocumento, type EstadoAcao } from "@/app/(app)/artista/[slug]/documentos/actions";
import { labelTipoDocumento } from "@/lib/labels";
import type { Documento, TipoDocumento } from "@/types/documentos";

const TIPOS: TipoDocumento[] = ["contrato", "split", "outro"];
const TAMANHO_MAX_MB = 20;

const ESTADO_INICIAL: EstadoAcao = { status: "idle" };

export function DocumentoFormModal({
  artistaId, documento, arquivoUrlAssinada, trigger,
}: {
  artistaId: string;
  // Presente = modo edição.
  documento?: Documento;
  arquivoUrlAssinada?: string | null;
  trigger: (abrir: () => void) => React.ReactNode;
}) {
  const caminho = usePathname();
  const editando = Boolean(documento);
  const [aberto, setAberto] = useState(false);
  const [arquivoPath, setArquivoPath] = useState(documento?.arquivoPath ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoAcao, formData: FormData) => {
      const resultado = await (editando ? atualizarDocumento : criarDocumento)(prev, formData);
      if (resultado.status === "ok") setAberto(false);
      return resultado;
    },
    ESTADO_INICIAL,
  );

  async function enviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErroUpload(`Arquivo de ${Math.round(file.size / 1024 / 1024)} MB — o limite é ${TAMANHO_MAX_MB} MB.`);
      return;
    }
    setEnviando(true);
    setErroUpload(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `documentos/${artistaId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
      if (error) throw new Error(`Falha no upload do arquivo: ${error.message}`);

      setArquivoPath(path);
    } catch (err) {
      setErroUpload(err instanceof Error ? err.message : "Erro inesperado no envio.");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      {trigger(() => setAberto(true))}
      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={editando ? "Editar documento" : "Novo documento"}
      >
        <form action={formAction} className="flex flex-col gap-3">
          {documento && <input type="hidden" name="id" value={documento.id} />}
          <input type="hidden" name="artistaId" value={artistaId} />
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="arquivoPath" value={arquivoPath} />

          <Field label="Título">
            <Input
              name="titulo"
              required
              defaultValue={documento?.titulo ?? ""}
              placeholder="Ex.: Contrato de distribuição"
            />
          </Field>

          <Field label="Tipo">
            <Select name="tipo" defaultValue={documento?.tipo ?? "outro"}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{labelTipoDocumento(t)}</option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
            Arquivo
            <div className="flex flex-wrap items-center gap-2">
              {arquivoPath && (
                arquivoUrlAssinada ? (
                  <a
                    href={arquivoUrlAssinada}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-accent hover:brightness-110"
                  >
                    Arquivo atual
                  </a>
                ) : (
                  <span className="text-xs text-muted">Arquivo enviado.</span>
                )
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={enviando}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:border-accent/50 hover:text-accent disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                {enviando ? "Enviando..." : arquivoPath ? "Trocar arquivo" : "Enviar arquivo"}
              </button>
              <input
                ref={inputRef}
                type="file"
                onChange={enviarArquivo}
                className="hidden"
                aria-label="Enviar arquivo do documento"
              />
            </div>
            {erroUpload && <p className="text-xs text-danger">{erroUpload}</p>}
            <p className="text-xs text-muted">Sem arquivo? Deixe em branco e use a observação para um link ou nota.</p>
          </div>

          <Field label="Observação">
            <Textarea
              name="observacao"
              rows={3}
              defaultValue={documento?.observacao ?? ""}
              placeholder="Notas, link externo, contexto..."
            />
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="sm" disabled={pendente || enviando} className="self-start">
              {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Criar documento"}
            </Button>
            {estado.status === "error" && <p className="text-xs text-danger">{estado.message}</p>}
          </div>
        </form>
      </Modal>
    </>
  );
}
