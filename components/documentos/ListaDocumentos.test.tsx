import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListaDocumentos } from "./ListaDocumentos";
import type { Documento } from "@/types/documentos";

vi.mock("@/app/(app)/artista/[slug]/documentos/actions", () => ({
  criarDocumento: vi.fn(async () => ({ status: "ok" })),
  atualizarDocumento: vi.fn(async () => ({ status: "ok" })),
  excluirDocumento: vi.fn(async () => ({ status: "ok" })),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    storage: { from: vi.fn() },
  })),
}));

const documentos: Documento[] = [
  {
    id: "1", artistaId: "a1", titulo: "Contrato de distribuição", tipo: "contrato",
    arquivoPath: "documentos/a1/x.pdf", observacao: "Assinado em 2026.",
    criadoEm: new Date().toISOString(),
  },
];

describe("ListaDocumentos", () => {
  it("mostra o estado vazio quando não há documentos", () => {
    render(<ListaDocumentos documentos={[]} artistaId="a1" arquivosAssinados={{}} podeExcluir={false} caminho="/artista/x/documentos" />);
    expect(screen.getByText("Nenhum documento cadastrado ainda.")).toBeInTheDocument();
  });

  it("mostra título, tipo e observação de cada documento", () => {
    render(
      <ListaDocumentos
        documentos={documentos}
        artistaId="a1"
        arquivosAssinados={{ "1": "https://exemplo.test/assinado" }}
        podeExcluir={false}
        caminho="/artista/x/documentos"
      />,
    );
    expect(screen.getByText("Contrato de distribuição")).toBeInTheDocument();
    expect(screen.getByText("Contrato")).toBeInTheDocument();
    expect(screen.getByText("Assinado em 2026.")).toBeInTheDocument();
    expect(screen.getByText("Abrir arquivo")).toBeInTheDocument();
  });

  it("sem arquivo, mostra aviso em vez de link", () => {
    const semArquivo: Documento[] = [{ ...documentos[0], arquivoPath: undefined }];
    render(<ListaDocumentos documentos={semArquivo} artistaId="a1" arquivosAssinados={{}} podeExcluir={false} caminho="/artista/x/documentos" />);
    expect(screen.getByText("Sem arquivo anexado.")).toBeInTheDocument();
  });

  it("sem permissão de excluir, não mostra o botão apagar", () => {
    render(<ListaDocumentos documentos={documentos} artistaId="a1" arquivosAssinados={{}} podeExcluir={false} caminho="/artista/x/documentos" />);
    expect(screen.queryByLabelText("Apagar documento")).not.toBeInTheDocument();
  });

  it("com permissão de excluir, mostra o botão apagar", () => {
    render(<ListaDocumentos documentos={documentos} artistaId="a1" arquivosAssinados={{}} podeExcluir={true} caminho="/artista/x/documentos" />);
    expect(screen.getByLabelText("Apagar documento")).toBeInTheDocument();
  });
});
