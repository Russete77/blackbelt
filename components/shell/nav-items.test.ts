import { describe, it, expect } from "vitest";
import { navItems } from "./nav-items";

describe("navItems", () => {
  it("tem os 7 módulos", () => {
    expect(navItems.map((n) => n.label)).toEqual([
      "Home", "Artistas", "Estúdio", "Analytics", "Previsão", "Shows", "Registro",
    ]);
  });
  it("Home, Artistas e Estúdio estão disponíveis nesta fatia", () => {
    const disponiveis = navItems.filter((n) => n.disponivel).map((n) => n.label);
    expect(disponiveis).toEqual(["Home", "Artistas", "Estúdio"]);
  });
});
