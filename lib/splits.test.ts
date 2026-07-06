import { describe, it, expect } from "vitest";
import { validarSplits, somaPercentuais, avisoSomaSplits } from "./splits";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";

describe("validarSplits", () => {
  it("caso válido: normaliza participantes, papel e soma dos %", () => {
    const r = validarSplits([
      { artistaId: UUID_A, papel: "principal", percentual: 60 },
      { artistaId: UUID_B, papel: "feat", percentual: 40 },
    ]);
    expect(r).toEqual({
      ok: true,
      somaPercentual: 100,
      participantes: [
        { artista_id: UUID_A, papel: "principal", percentual: 60 },
        { artista_id: UUID_B, papel: "feat", percentual: 40 },
      ],
    });
  });

  it("lista vazia é válida (zera a faixa), soma 0", () => {
    expect(validarSplits([])).toEqual({ ok: true, participantes: [], somaPercentual: 0 });
  });

  it("não-array vira erro de lista inválida", () => {
    expect(validarSplits("nada")).toEqual({ ok: false, erro: "Lista de participantes inválida." });
    expect(validarSplits(null)).toEqual({ ok: false, erro: "Lista de participantes inválida." });
  });

  it("artista ausente pede seleção de artista", () => {
    expect(validarSplits([{ artistaId: "", percentual: 50 }])).toEqual({
      ok: false,
      erro: "Selecione um artista para cada participante.",
    });
  });

  it("artistaId fora do formato UUID é rejeitado", () => {
    expect(validarSplits([{ artistaId: "abc,def)", percentual: 50 }])).toEqual({
      ok: false,
      erro: "Artista inválido.",
    });
  });

  it("percentual negativo é rejeitado", () => {
    expect(validarSplits([{ artistaId: UUID_A, percentual: -1 }])).toEqual({
      ok: false,
      erro: "O percentual de cada participante deve estar entre 0 e 100.",
    });
  });

  it("percentual acima de 100 é rejeitado", () => {
    expect(validarSplits([{ artistaId: UUID_A, percentual: 101 }])).toEqual({
      ok: false,
      erro: "O percentual de cada participante deve estar entre 0 e 100.",
    });
  });

  it("percentual não numérico é rejeitado", () => {
    expect(validarSplits([{ artistaId: UUID_A, percentual: "abc" }])).toEqual({
      ok: false,
      erro: "O percentual de cada participante deve estar entre 0 e 100.",
    });
  });

  it("artista duplicado na mesma faixa é rejeitado", () => {
    expect(validarSplits([
      { artistaId: UUID_A, percentual: 50 },
      { artistaId: UUID_A, percentual: 50 },
    ])).toEqual({
      ok: false,
      erro: "Um artista não pode aparecer duas vezes na mesma faixa.",
    });
  });

  it("soma dos % acima de 100 NÃO é erro — é só aviso (comportamento preservado)", () => {
    const r = validarSplits([
      { artistaId: UUID_A, percentual: 70 },
      { artistaId: UUID_B, percentual: 60 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.somaPercentual).toBe(130);
  });

  it("preserva o papel de cada participante (split em massa) e converte vazio em null", () => {
    const r = validarSplits([
      { artistaId: UUID_A, papel: "produtor", percentual: 33.33 },
      { artistaId: UUID_B, papel: "  ", percentual: 33.33 },
      { artistaId: UUID_C, percentual: 33.34 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.participantes.map((p) => p.papel)).toEqual(["produtor", null, null]);
      expect(r.somaPercentual).toBe(100);
    }
  });
});

describe("somaPercentuais", () => {
  it("arredonda a 2 casas para evitar ruído de ponto flutuante", () => {
    expect(somaPercentuais([{ percentual: 33.33 }, { percentual: 33.33 }, { percentual: 33.34 }])).toBe(100);
  });
});

describe("avisoSomaSplits", () => {
  it("sem aviso quando a soma fecha 100%", () => {
    expect(avisoSomaSplits(2, 100)).toBe("");
  });
  it("sem aviso quando não há participantes", () => {
    expect(avisoSomaSplits(0, 0)).toBe("");
  });
  it("avisa quando a soma não fecha 100%", () => {
    expect(avisoSomaSplits(2, 130)).toBe(" — soma de 130% (não fecha 100%)");
  });
});
