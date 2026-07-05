import { describe, it, expect } from "vitest";
import { labelEstagio, labelTipoProjeto } from "./labels";

describe("labels", () => {
  it("traduz estágio do pipeline", () => {
    expect(labelEstagio("masterizacao")).toBe("Masterização");
    expect(labelEstagio("lancado")).toBe("Lançado");
  });
  it("traduz tipo de projeto", () => {
    expect(labelTipoProjeto("ep")).toBe("EP");
    expect(labelTipoProjeto("album")).toBe("Álbum");
  });
});
