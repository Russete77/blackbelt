import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EstudioKanban, agruparPorEstagio, ORDEM_ESTAGIOS } from "./EstudioKanban";
import type { FaixaEstudioComArtista } from "@/lib/db";
import type { Faixa } from "@/types/domain";

function faixa(overrides: Partial<Faixa>): Faixa {
  return {
    id: "f1", projetoId: "p1", titulo: "Faixa", estagio: "ideia", origem: "estudio",
    ...overrides,
  };
}

describe("agruparPorEstagio", () => {
  it("cria as 6 colunas na ordem do pipeline, mesmo sem faixas", () => {
    const grupos = agruparPorEstagio([]);
    expect(Object.keys(grupos)).toEqual(ORDEM_ESTAGIOS);
    expect(grupos.ideia).toEqual([]);
    expect(grupos.lancado).toEqual([]);
  });

  it("agrupa cada faixa na coluna do seu estagio", () => {
    const itens: FaixaEstudioComArtista[] = [
      { faixa: faixa({ id: "a", estagio: "gravacao" }), artistaNome: "Artista A" },
      { faixa: faixa({ id: "b", estagio: "lancado" }), artistaNome: "Artista B" },
      { faixa: faixa({ id: "c", estagio: "gravacao" }), artistaNome: "Artista C" },
    ];
    const grupos = agruparPorEstagio(itens);
    expect(grupos.gravacao.map((i) => i.faixa.id)).toEqual(["a", "c"]);
    expect(grupos.lancado.map((i) => i.faixa.id)).toEqual(["b"]);
    expect(grupos.ideia).toEqual([]);
  });
});

describe("EstudioKanban", () => {
  it("renderiza as 6 colunas com o rótulo e a contagem do estágio", () => {
    render(<EstudioKanban faixas={[]} />);
    expect(screen.getByText("Ideia")).toBeInTheDocument();
    expect(screen.getByText("Gravação")).toBeInTheDocument();
    expect(screen.getByText("Mixagem")).toBeInTheDocument();
    expect(screen.getByText("Masterização")).toBeInTheDocument();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(screen.getByText("Lançado")).toBeInTheDocument();
    // 6 colunas vazias -> 6 contadores "0"
    expect(screen.getAllByText("0")).toHaveLength(6);
  });

  it("mostra o card da faixa com título e nome do artista na coluna certa", () => {
    const faixas: FaixaEstudioComArtista[] = [
      { faixa: faixa({ id: "x", titulo: "Minha Música", estagio: "mixagem" }), artistaNome: "MC Exemplo" },
    ];
    render(<EstudioKanban faixas={faixas} />);
    expect(screen.getByText("Minha Música")).toBeInTheDocument();
    expect(screen.getByText("MC Exemplo")).toBeInTheDocument();
    const link = screen.getByText("Minha Música").closest("a");
    expect(link).toHaveAttribute("href", "/faixa/x");
  });
});
