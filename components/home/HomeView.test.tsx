import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HomeView } from "./HomeView";

describe("HomeView", () => {
  it("renderiza o nome do selo", () => {
    render(<HomeView artistas={[]} projetosSelo={[]} />);
    // "BLACK BELT" fica dividido entre um text node e um <span> (destaque de cor),
    // então usamos um matcher de função que olha o textContent completo do heading.
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "H1" && /BLACK BELT/i.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há artistas nem projetos do selo", () => {
    render(<HomeView artistas={[]} projetosSelo={[]} />);
    expect(screen.getByText("Nenhum artista cadastrado ainda.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum projeto do selo no momento.")).toBeInTheDocument();
  });
});
