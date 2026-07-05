import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListaLancamentos } from "./ListaLancamentos";
import type { Lancamento } from "@/types/lancamentos";

vi.mock("@/app/(app)/artista/[slug]/lancamentos/actions", () => ({
  criarLancamento: vi.fn(async () => ({ status: "ok" })),
  atualizarLancamento: vi.fn(async () => ({ status: "ok" })),
  excluirLancamento: vi.fn(async () => ({ status: "ok" })),
}));

const lancamentos: Lancamento[] = [
  {
    id: "1", artistaId: "a1", titulo: "Nova Era", tipo: "single",
    dataLancamento: "2026-08-01", plataformas: ["spotify", "youtube"],
    isrc: "BR-ABC-26-00001", status: "agendado",
    checklist: [{ tarefa: "Enviar áudio", feito: true }, { tarefa: "Divulgar", feito: false }],
    criadoEm: new Date().toISOString(),
  },
];

describe("ListaLancamentos", () => {
  it("mostra o estado vazio quando não há lançamentos", () => {
    render(
      <ListaLancamentos
        lancamentos={[]}
        artistaId="a1"
        faixas={[]}
        capasAssinadas={{}}
        podeExcluir={false}
        caminho="/artista/x/lancamentos"
      />,
    );
    expect(screen.getByText("Nenhum lançamento cadastrado ainda.")).toBeInTheDocument();
  });

  it("mostra título, tipo, status e plataformas de cada lançamento", () => {
    render(
      <ListaLancamentos
        lancamentos={lancamentos}
        artistaId="a1"
        faixas={[]}
        capasAssinadas={{}}
        podeExcluir={false}
        caminho="/artista/x/lancamentos"
      />,
    );
    expect(screen.getByText("Nova Era")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("Checklist: 1/2")).toBeInTheDocument();
  });

  it("sem permissão de excluir, não mostra o botão apagar", () => {
    render(
      <ListaLancamentos
        lancamentos={lancamentos}
        artistaId="a1"
        faixas={[]}
        capasAssinadas={{}}
        podeExcluir={false}
        caminho="/artista/x/lancamentos"
      />,
    );
    expect(screen.queryByLabelText("Apagar lançamento")).not.toBeInTheDocument();
  });

  it("com permissão de excluir, mostra o botão apagar", () => {
    render(
      <ListaLancamentos
        lancamentos={lancamentos}
        artistaId="a1"
        faixas={[]}
        capasAssinadas={{}}
        podeExcluir={true}
        caminho="/artista/x/lancamentos"
      />,
    );
    expect(screen.getByLabelText("Apagar lançamento")).toBeInTheDocument();
  });
});
