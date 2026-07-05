// Tipos do módulo Documentos — contratos/splits/outros arquivos do artista
// (tabela própria `documentos`). Sem bucket dedicado ainda: o upload reusa o
// bucket privado `covers` (ver components/documentos/DocumentoFormModal.tsx);
// quando não há upload, fica só a observação/link em texto. Mantido fora de
// types/domain.ts para não conflitar com trabalho paralelo (mesmo motivo de
// types/demandas.ts).

export type TipoDocumento = "contrato" | "split" | "outro";

export interface Documento {
  id: string;
  artistaId: string;
  titulo: string;
  tipo: TipoDocumento;
  arquivoPath?: string;
  observacao?: string;
  criadoEm: string;
}
