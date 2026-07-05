import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListaClipes } from "./ListaClipes";
import type { Clipe } from "@/types/clipes";

vi.mock("@/app/(app)/artista/[slug]/clipes/actions", () => ({
  criarClipe: vi.fn(async () => ({ status: "ok" })),
  atualizarClipe: vi.fn(async () => ({ status: "ok" })),
  excluirClipe: vi.fn(async () => ({ status: "ok" })),
}));

const clipes: Clipe[] = [
  {
    id: "1", artistaId: "a1", titulo: "Clipe — Nova Era", status: "gravacao",
    diretor: "Fulano", videoUrl: "dQw4w9WgXcQ",
    demandas: ["Aprovar roteiro"], cueSheet: [{ trecho: "00:00-00:15", duracao: "15s", titular: "Fulano" }],
    criadoEm: new Date().toISOString(),
  },
];

describe("ListaClipes", () => {
  it("mostra o estado vazio quando não há clipes", () => {
    render(<ListaClipes clipes={[]} artistaId="a1" faixas={[]} podeExcluir={false} caminho="/artista/x/clipes" />);
    expect(screen.getByText("Nenhum clipe cadastrado ainda.")).toBeInTheDocument();
  });

  it("mostra título, status, diretor e embed do vídeo", () => {
    render(<ListaClipes clipes={clipes} artistaId="a1" faixas={[]} podeExcluir={false} caminho="/artista/x/clipes" />);
    expect(screen.getByText("Clipe — Nova Era")).toBeInTheDocument();
    expect(screen.getByText("Gravação")).toBeInTheDocument();
    expect(screen.getByText(/Fulano/)).toBeInTheDocument();
    expect(screen.getByTitle("Player do clipe — Clipe — Nova Era")).toBeInTheDocument();
  });

  it("sem permissão de excluir, não mostra o botão apagar", () => {
    render(<ListaClipes clipes={clipes} artistaId="a1" faixas={[]} podeExcluir={false} caminho="/artista/x/clipes" />);
    expect(screen.queryByLabelText("Apagar clipe")).not.toBeInTheDocument();
  });

  it("com permissão de excluir, mostra o botão apagar", () => {
    render(<ListaClipes clipes={clipes} artistaId="a1" faixas={[]} podeExcluir={true} caminho="/artista/x/clipes" />);
    expect(screen.getByLabelText("Apagar clipe")).toBeInTheDocument();
  });
});
