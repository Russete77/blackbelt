import { describe, it, expect } from "vitest";
import {
  projetos, faixas, versoes, comentarios,
  getFaixasDoProjeto, getVersoesDaFaixa, getComentariosDaVersao,
} from "./data";

describe("dados mock", () => {
  it("tem ao menos um projeto com faixas", () => {
    expect(projetos.length).toBeGreaterThan(0);
    expect(getFaixasDoProjeto(projetos[0].id).length).toBeGreaterThan(0);
  });
  it("cada faixa tem ao menos uma versão", () => {
    for (const f of faixas) {
      expect(getVersoesDaFaixa(f.id).length).toBeGreaterThan(0);
    }
  });
  it("comentários têm timestamp em segundos e categoria", () => {
    const c = comentarios[0];
    expect(typeof c.timestampSegundos).toBe("number");
    expect(["beat", "mix", "master", "letra", "geral"]).toContain(c.categoria);
  });
  it("helper de comentários filtra por versão", () => {
    const v = versoes[0];
    getComentariosDaVersao(v.id).forEach((c) => expect(c.versaoId).toBe(v.id));
  });
});
