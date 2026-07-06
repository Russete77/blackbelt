import { describe, it, expect } from "vitest";
import { navItems, isNavAtivo, navItensMobile } from "./nav-items";

describe("navItems", () => {
  it("tem os 7 módulos", () => {
    expect(navItems.map((n) => n.label)).toEqual([
      "Home", "Artistas", "Estúdio", "Números do selo", "Previsão", "Shows", "Registro",
    ]);
  });
  it("Home, Artistas, Estúdio, Números do selo, Previsão, Shows e Registro estão disponíveis nesta fatia", () => {
    const disponiveis = navItems.filter((n) => n.disponivel).map((n) => n.label);
    expect(disponiveis).toEqual(["Home", "Artistas", "Estúdio", "Números do selo", "Previsão", "Shows", "Registro"]);
  });
});

describe("isNavAtivo", () => {
  it("Home só na raiz", () => {
    expect(isNavAtivo("/", "/")).toBe(true);
    expect(isNavAtivo("/", "/estudio")).toBe(false);
  });
  it("rotas internas acendem o módulo dono", () => {
    expect(isNavAtivo("/artistas", "/artista/bielzin")).toBe(true);
    expect(isNavAtivo("/artistas", "/artista/bielzin/shows")).toBe(true);
    expect(isNavAtivo("/estudio", "/faixa/abc-123")).toBe(true);
  });
  it("prefixo não vaza entre módulos", () => {
    expect(isNavAtivo("/shows", "/artista/bielzin/shows")).toBe(false);
    expect(isNavAtivo("/artistas", "/estudio")).toBe(false);
  });
});

describe("navItensMobile", () => {
  it("mostra os 7 módulos, disponíveis primeiro", () => {
    const itens = navItensMobile();
    expect(itens).toHaveLength(7);
    // Todos os 7 módulos aparecem na barra mobile (com rolagem horizontal),
    // nenhum fica escondido — Shows e Registro (6º/7º) não são mais cortados.
    expect(itens.every((i) => i.disponivel)).toBe(true);
    expect(itens.map((i) => i.label)).toEqual([
      "Home", "Artistas", "Estúdio", "Números do selo", "Previsão", "Shows", "Registro",
    ]);
  });
});
