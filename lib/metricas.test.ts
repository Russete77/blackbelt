import { describe, it, expect } from "vitest";
import {
  totaisMetricas, porPlataforma, porArtista, porFaixa, porMes, porArtistaEPlataforma,
  receitaPor1kStreams, formatarReceita, formatarStreams, formatarValorPorTipo, corCategoria,
} from "./metricas";
import type { MetricaDetalhada } from "@/types/analytics";

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

describe("totaisMetricas", () => {
  it("soma streams e receita, tratando ausentes como 0", () => {
    const total = totaisMetricas([
      m({ streams: 1000, receita: 10 }),
      m({ streams: undefined, receita: 5 }),
      m({ streams: 500, receita: undefined }),
    ]);
    expect(total).toEqual({ streams: 1500, receita: 15 });
  });
  it("lista vazia dá totais zerados", () => {
    expect(totaisMetricas([])).toEqual({ streams: 0, receita: 0 });
  });
});

describe("porPlataforma", () => {
  it("agrupa e soma por plataforma, ordenado por receita desc", () => {
    const linhas = porPlataforma([
      m({ plataforma: "spotify", streams: 1000, receita: 10 }),
      m({ plataforma: "youtube", streams: 5000, receita: 30 }),
      m({ plataforma: "spotify", streams: 500, receita: 5 }),
    ]);
    expect(linhas).toEqual([
      { chave: "youtube", rotulo: "youtube", streams: 5000, receita: 30 },
      { chave: "spotify", rotulo: "spotify", streams: 1500, receita: 15 },
    ]);
  });
});

describe("porArtista", () => {
  it("agrupa por artistaId e usa artistaNome como rótulo", () => {
    const linhas = porArtista([
      m({ artistaId: "a1", artistaNome: "Bielzin", receita: 20, streams: 100 }),
      m({ artistaId: "a2", artistaNome: "Vitin", receita: 50, streams: 200 }),
      m({ artistaId: "a1", artistaNome: "Bielzin", receita: 5, streams: 50 }),
    ]);
    expect(linhas).toEqual([
      { chave: "a2", rotulo: "Vitin", streams: 200, receita: 50 },
      { chave: "a1", rotulo: "Bielzin", streams: 150, receita: 25 },
    ]);
  });
});

describe("porFaixa", () => {
  it("ignora métricas sem faixaId e calcula receita por 1k streams", () => {
    const linhas = porFaixa([
      m({ faixaId: "f1", faixaTitulo: "Corre", streams: 2000, receita: 20 }),
      m({ faixaId: undefined, streams: 999, receita: 99 }),
    ]);
    expect(linhas).toEqual([
      { chave: "f1", rotulo: "Corre", streams: 2000, receita: 20, receitaPor1kStreams: 10 },
    ]);
  });

  it("faixa sem streams importados dá receitaPor1kStreams null", () => {
    const linhas = porFaixa([m({ faixaId: "f1", faixaTitulo: "Corre", streams: undefined, receita: 20 })]);
    expect(linhas[0].receitaPor1kStreams).toBeNull();
  });
});

describe("porArtistaEPlataforma", () => {
  it("uma linha por artista com uma chave dinâmica por plataforma, ordenada por total desc", () => {
    const linhas = porArtistaEPlataforma([
      m({ artistaId: "a1", artistaNome: "Bielzin", plataforma: "spotify", streams: 100 }),
      m({ artistaId: "a1", artistaNome: "Bielzin", plataforma: "youtube", streams: 50 }),
      m({ artistaId: "a2", artistaNome: "Vitin", plataforma: "spotify", streams: 900 }),
    ]);
    expect(linhas).toEqual([
      { chave: "a2", rotulo: "Vitin", spotify: 900 },
      { chave: "a1", rotulo: "Bielzin", spotify: 100, youtube: 50 },
    ]);
  });
});

describe("porMes", () => {
  it("agrupa por YYYY-MM e ordena cronologicamente", () => {
    const linhas = porMes([
      m({ data: "2026-03-10", receita: 30 }),
      m({ data: "2026-01-05", receita: 10 }),
      m({ data: "2026-01-20", receita: 5 }),
    ]);
    expect(linhas.map((l) => l.chave)).toEqual(["2026-01", "2026-03"]);
    expect(linhas[0].receita).toBe(15);
  });
});

describe("receitaPor1kStreams", () => {
  it("calcula proporcionalmente", () => {
    expect(receitaPor1kStreams(100, 10000)).toBe(10);
  });
  it("retorna null quando streams é 0 ou ausente", () => {
    expect(receitaPor1kStreams(100, 0)).toBeNull();
  });
});

describe("formatarValorPorTipo", () => {
  it('formato "streams" delega para formatarStreams', () => {
    expect(formatarValorPorTipo("streams", 123456)).toBe(formatarStreams(123456));
  });
  it('formato "receita" delega para formatarReceita', () => {
    expect(formatarValorPorTipo("receita", 1234.5)).toBe(formatarReceita(1234.5));
  });
});

describe("formatarReceita / formatarStreams", () => {
  it("formata receita em BRL", () => {
    expect(formatarReceita(1234.5)).toMatch(/R\$\s*1\.234,50/);
  });
  it("formata streams com separador de milhar pt-BR", () => {
    expect(formatarStreams(123456)).toBe("123.456");
  });
});

describe("corCategoria", () => {
  it("atribui cores estáveis pela ordem de entrada", () => {
    const ordem = ["spotify", "youtube", "deezer"];
    expect(corCategoria("spotify", ordem)).toBe(corCategoria("spotify", ordem));
    expect(corCategoria("spotify", ordem)).not.toBe(corCategoria("youtube", ordem));
  });
  it("chave desconhecida cai no último slot em vez de quebrar", () => {
    expect(typeof corCategoria("desconhecida", ["spotify"])).toBe("string");
  });
});
