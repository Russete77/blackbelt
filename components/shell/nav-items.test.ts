import { describe, it, expect } from "vitest";
import { navItems } from "./nav-items";

describe("navItems", () => {
  it("tem os 6 módulos", () => {
    expect(navItems.map((n) => n.label)).toEqual([
      "Home", "Estúdio", "Analytics", "Previsão", "Shows", "Registro",
    ]);
  });
  it("apenas Home e Estúdio estão disponíveis nesta fatia", () => {
    const disponiveis = navItems.filter((n) => n.disponivel).map((n) => n.label);
    expect(disponiveis).toEqual(["Home", "Estúdio"]);
  });
});
