import { describe, it, expect } from "vitest";
import { labelEstagio, labelTipoProjeto, labelPlataforma } from "./labels";

describe("labels", () => {
  it("traduz estágio do pipeline", () => {
    expect(labelEstagio("masterizacao")).toBe("Masterização");
    expect(labelEstagio("lancado")).toBe("Lançado");
  });
  it("traduz tipo de projeto", () => {
    expect(labelTipoProjeto("ep")).toBe("EP");
    expect(labelTipoProjeto("album")).toBe("Álbum");
  });
  it("traduz plataformas conhecidas", () => {
    expect(labelPlataforma("youtube")).toBe("YouTube");
    expect(labelPlataforma("spotify")).toBe("Spotify");
    expect(labelPlataforma("deezer")).toBe("Deezer");
  });
  it("capitaliza plataforma desconhecida como fallback", () => {
    expect(labelPlataforma("tidal")).toBe("Tidal");
  });
});
