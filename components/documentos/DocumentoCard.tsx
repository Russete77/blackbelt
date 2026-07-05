"use client";
// Card de um documento: título/tipo/data, link para o arquivo (quando há
// upload, via URL assinada resolvida no servidor) e observação. Ações:
// editar em modal, apagar para admin.
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarDataPura } from "@/lib/datas";
import { labelTipoDocumento } from "@/lib/labels";
import { DocumentoFormModal } from "./DocumentoFormModal";
import { ExcluirDocumentoButton } from "./ExcluirDocumentoButton";
import type { Documento } from "@/types/documentos";

export function DocumentoCard({
  documento, artistaId, arquivoUrlAssinada, podeExcluir, caminho,
}: {
  documento: Documento;
  artistaId: string;
  arquivoUrlAssinada: string | null;
  podeExcluir: boolean;
  caminho: string;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface2 text-muted">
              <FileText className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-fg">{documento.titulo}</h3>
              <p className="text-xs text-muted">{formatarDataPura(documento.criadoEm)}</p>
            </div>
          </div>
          <Badge tone="neutral" className="shrink-0">{labelTipoDocumento(documento.tipo)}</Badge>
        </div>

        {documento.observacao && <p className="text-sm text-muted">{documento.observacao}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs">
          {arquivoUrlAssinada ? (
            <a
              href={arquivoUrlAssinada}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent transition-colors duration-200 hover:brightness-110"
            >
              Abrir arquivo
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <span className="text-muted">Sem arquivo anexado.</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <DocumentoFormModal
              artistaId={artistaId}
              documento={documento}
              arquivoUrlAssinada={arquivoUrlAssinada}
              trigger={(abrir) => (
                <button
                  type="button"
                  onClick={abrir}
                  className="text-xs font-medium text-accent transition-colors duration-200 hover:brightness-110"
                >
                  Editar
                </button>
              )}
            />
            {podeExcluir && <ExcluirDocumentoButton id={documento.id} caminho={caminho} />}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
