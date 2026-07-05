import { describe, it, expect } from "vitest";
import { navItems, isNavAtivo, navItensMobile } from "./nav-items";

describe("navItems", () => {
  it("tem os 7 módulos", () => {
    expect(navItems.map((n) => n.label)).toEqual([
      "Home", "Artistas", "Estúdio", "Analytics", "Previsão", "Shows", "Registro",
    ]);
  });
  it("Home, Artistas, Estúdio, Analytics, Previsão, Shows e Registro estão disponíveis nesta fatia", () => {
    const disponiveis = navItems.filter((n) => n.disponivel).map((n) => n.label);
    expect(disponiveis).toEqual(["Home", "Artistas", "Estúdio", "Analytics", "Previsão", "Shows", "Registro"]);
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
  it("5 slots, disponíveis primeiro", () => {
    const itens = navItensMobile();
    expect(itens).toHaveLength(5);
    // Com Analytics e Previsão habilitados, os 5 primeiros módulos
    // disponíveis já preenchem os 5 slots inteiros — nenhum "Em breve" sobra
    // na barra mobile, e Shows/Registro (6º/7º) ficam de fora dela.
    expect(itens.every((i) => i.disponivel)).toBe(true);
    expect(itens.map((i) => i.label)).toEqual(["Home", "Artistas", "Estúdio", "Analytics", "Previsão"]);
  });
});
