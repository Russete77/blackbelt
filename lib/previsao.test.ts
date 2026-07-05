import { describe, it, expect } from "vitest";
import { taxaCrescimentoMensal, projetar, mediaPorFaixa, type PontoMensal } from "./previsao";
import type { MetricaDetalhada } from "@/types/analytics";

function ponto(chave: string, valor: number): PontoMensal {
  const [ano, mes] = chave.split("-").map(Number);
  return { chave, rotulo: `${String(mes).padStart(2, "0")}/${String(ano).slice(2)}`, valor };
}

function m(overrides: Partial<MetricaDetalhada>): MetricaDetalhada {
  return {
    id: overrides.id ?? "m1",
    artistaId: "artista-1",
    plataforma: "spotify",
    data: "2026-01-15",
    streams: 1000,
    receita: 10,
    ...overrides,
  };
}

describe("taxaCrescimentoMensal", () => {
  it("série vazia: 0", () => {
    expect(taxaCrescimentoMensal([])).toBe(0);
  });

  it("um único ponto: sem base pra taxa, 0", () => {
    expect(taxaCrescimentoMensal([ponto("2026-01", 1000)])).toBe(0);
  });

  it("crescimento constante de 10% ao mês: taxa ~0.1", () => {
    const serie = [ponto("2026-01", 1000), ponto("2026-02", 1100), ponto("2026-03", 1210)];
    expect(taxaCrescimentoMensal(serie)).toBeCloseTo(0.1, 5);
  });

  it("média de taxas variáveis entre meses", () => {
    // +100% (100->200) e -50% (200->100): média = 0.25
    const serie = [ponto("2026-01", 100), ponto("2026-02", 200), ponto("2026-03", 100)];
    expect(taxaCrescimentoMensal(serie)).toBeCloseTo(0.25, 5);
  });

  it("ignora pares em que o mês anterior é 0 (evita divisão por zero)", () => {
    const serie = [ponto("2026-01", 0), ponto("2026-02", 500), ponto("2026-03", 1000)];
    // só o par (500 -> 1000) é válido: taxa = 1.0
    expect(taxaCrescimentoMensal(serie)).toBeCloseTo(1, 5);
  });

  it("todos os meses anteriores 0: sem par válido, retorna 0", () => {
    const serie = [ponto("2026-01", 0), ponto("2026-02", 0)];
    expect(taxaCrescimentoMensal(serie)).toBe(0);
  });

  it("clampa queda abrupta (mês zera) em -95%, nunca menos que isso", () => {
    const serie = [ponto("2026-01", 1000), ponto("2026-02", 0)];
    expect(taxaCrescimentoMensal(serie)).toBe(-0.95);
  });

  it("clampa alta abrupta em +300% ao mês", () => {
    const serie = [ponto("2026-01", 1), ponto("2026-02", 10_000)];
    expect(taxaCrescimentoMensal(serie)).toBe(3);
  });
});

describe("projetar", () => {
  it("série vazia: []", () => {
    expect(projetar([], 3)).toEqual([]);
  });

  it("meses <= 0: []", () => {
    const serie = [ponto("2026-01", 100), ponto("2026-02", 200)];
    expect(projetar(serie, 0)).toEqual([]);
    expect(projetar(serie, -1)).toEqual([]);
  });

  it("um único ponto histórico: taxa 0, projeção achata no último valor", () => {
    const serie = [ponto("2026-01", 1000)];
    const futuro = projetar(serie, 2);
    expect(futuro).toEqual([
      { chave: "2026-02", rotulo: "fev/26", valor: 1000, projetado: true },
      { chave: "2026-03", rotulo: "mar/26", valor: 1000, projetado: true },
    ]);
  });

  it("aplica a taxa de forma composta (juros compostos), não linear", () => {
    // 1000 -> 1100 (+10%); projeção composta: 1210, 1331
    const serie = [ponto("2026-01", 1000), ponto("2026-02", 1100)];
    const futuro = projetar(serie, 2);
    expect(futuro.map((p) => p.valor)).toEqual([1210, 1331]);
    expect(futuro.every((p) => p.projetado)).toBe(true);
  });

  it("atravessa a virada de ano corretamente (chave e rótulo)", () => {
    const serie = [ponto("2025-11", 100), ponto("2025-12", 100)];
    const futuro = projetar(serie, 2);
    expect(futuro.map((p) => p.chave)).toEqual(["2026-01", "2026-02"]);
    expect(futuro.map((p) => p.rotulo)).toEqual(["jan/26", "fev/26"]);
  });

  it("nunca projeta valor negativo mesmo com taxa fortemente negativa", () => {
    const serie = [ponto("2026-01", 1000), ponto("2026-02", 0)];
    const futuro = projetar(serie, 3);
    expect(futuro.every((p) => p.valor >= 0)).toBe(true);
  });
});

describe("mediaPorFaixa", () => {
  it("sem métricas: tudo zerado", () => {
    expect(mediaPorFaixa([])).toEqual({ streamsMedios: 0, receitaMedia: 0, faixasConsideradas: 0 });
  });

  it("ignora métricas sem faixaId", () => {
    const r = mediaPorFaixa([m({ faixaId: undefined, streams: 999_999, receita: 999 })]);
    expect(r).toEqual({ streamsMedios: 0, receitaMedia: 0, faixasConsideradas: 0 });
  });

  it("soma por faixa e tira média simples entre as faixas", () => {
    const r = mediaPorFaixa([
      m({ faixaId: "f1", streams: 1000, receita: 10 }),
      m({ faixaId: "f1", streams: 500, receita: 5 }),
      m({ faixaId: "f2", streams: 3000, receita: 30 }),
    ]);
    // f1 = 1500/15, f2 = 3000/30 -> média = (1500+3000)/2, (15+30)/2
    expect(r).toEqual({ streamsMedios: 2250, receitaMedia: 22.5, faixasConsideradas: 2 });
  });

  it("trata streams/receita ausentes como 0 dentro da faixa", () => {
    const r = mediaPorFaixa([
      m({ faixaId: "f1", streams: undefined, receita: 10 }),
      m({ faixaId: "f2", streams: 2000, receita: undefined }),
    ]);
    expect(r).toEqual({ streamsMedios: 1000, receitaMedia: 5, faixasConsideradas: 2 });
  });
});
