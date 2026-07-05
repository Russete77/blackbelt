import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentoCard } from "./DocumentoCard";
import type { Documento } from "@/types/documentos";

export function ListaDocumentos({
  documentos, artistaId, arquivosAssinados, podeExcluir, caminho,
}: {
  documentos: Documento[];
  artistaId: string;
  arquivosAssinados: Record<string, string | null>;
  podeExcluir: boolean;
  caminho: string;
}) {
  if (documentos.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum documento cadastrado ainda."
        hint="Contratos, splits e outros arquivos do artista aparecerão aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documentos.map((d) => (
        <DocumentoCard
          key={d.id}
          documento={d}
          artistaId={artistaId}
          arquivoUrlAssinada={arquivosAssinados[d.id] ?? null}
          podeExcluir={podeExcluir}
          caminho={caminho}
        />
      ))}
    </div>
  );
}
