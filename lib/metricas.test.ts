import { describe, it, expect } from "vitest";
import {
  totaisMetricas, porPlataforma, porArtista, porFaixa, porMes, porArtistaEPlataforma,
  receitaPor1kStreams, formatarReceita, formatarStreams, formatarValorPorTipo, corCategoria,
  receitaComEstimativa, recebimentoArtista, converterReceitaParaBRL, porFaixaEPlataforma,
  agregarMetricasPorFaixaEmBRL,
} from "./metricas";
import type { LinhaMetricaCrua } from "./metricas";
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

describe("converterReceitaParaBRL", () => {
  it("converte receita em USD pra BRL pela taxa e marca moeda BRL", () => {
    const [linha] = converterReceitaParaBRL([m({ receita: 100, moeda: "USD" })], 5);
    expect(linha.receita).toBe(500);
    expect(linha.moeda).toBe("BRL");
  });
  it("receita já em BRL (ou sem moeda informada) não é alterada", () => {
    const [semMoeda] = converterReceitaParaBRL([m({ receita: 10 })], 5);
    expect(semMoeda.receita).toBe(10);
    expect(semMoeda.moeda).toBe("BRL");

    const [comBRL] = converterReceitaParaBRL([m({ receita: 10, moeda: "BRL" })], 5);
    expect(comBRL.receita).toBe(10);
  });
  it("receita ausente em USD: continua ausente, não vira 0", () => {
    const [linha] = converterReceitaParaBRL([m({ receita: undefined, moeda: "USD" })], 5);
    expect(linha.receita).toBeUndefined();
  });
});

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
    const linhas = porFaixa(
      [{ id: "f1", titulo: "Corre" }],
      [
        m({ faixaId: "f1", faixaTitulo: "Corre", streams: 2000, receita: 20 }),
        m({ faixaId: undefined, streams: 999, receita: 99 }),
      ],
    );
    expect(linhas).toEqual([
      { chave: "f1", rotulo: "Corre", streams: 2000, receita: 20, receitaPor1kStreams: 10 },
    ]);
  });

  it("faixa sem streams importados dá receitaPor1kStreams null", () => {
    const linhas = porFaixa(
      [{ id: "f1", titulo: "Corre" }],
      [m({ faixaId: "f1", faixaTitulo: "Corre", streams: undefined, receita: 20 })],
    );
    expect(linhas[0].receitaPor1kStreams).toBeNull();
  });

  it("inclui faixas do catálogo sem nenhuma métrica, com streams/receita null", () => {
    const linhas = porFaixa(
      [{ id: "f1", titulo: "Corre" }, { id: "f2", titulo: "Zumbido" }],
      [m({ faixaId: "f1", faixaTitulo: "Corre", streams: 2000, receita: 20 })],
    );
    expect(linhas).toEqual([
      { chave: "f1", rotulo: "Corre", streams: 2000, receita: 20, receitaPor1kStreams: 10 },
      { chave: "f2", rotulo: "Zumbido", streams: null, receita: null, receitaPor1kStreams: null },
    ]);
  });

  it("ordena: com número primeiro (streams desc), depois sem número em ordem alfabética", () => {
    const linhas = porFaixa(
      [
        { id: "f1", titulo: "Zebra" },
        { id: "f2", titulo: "Abacaxi" },
        { id: "f3", titulo: "Corre" },
        { id: "f4", titulo: "Trem" },
      ],
      [
        m({ faixaId: "f3", faixaTitulo: "Corre", streams: 500, receita: 5 }),
        m({ faixaId: "f4", faixaTitulo: "Trem", streams: 2000, receita: 20 }),
      ],
    );
    expect(linhas.map((l) => l.rotulo)).toEqual(["Trem", "Corre", "Abacaxi", "Zebra"]);
  });

  it("faixa presente só na métrica (sem entrar em `faixas`) ainda aparece, usando faixaTitulo", () => {
    const linhas = porFaixa(
      [],
      [m({ faixaId: "f9", faixaTitulo: "Órfã", streams: 100, receita: 1 })],
    );
    expect(linhas).toEqual([
      { chave: "f9", rotulo: "Órfã", streams: 100, receita: 1, receitaPor1kStreams: 10 },
    ]);
  });
});

describe("porFaixaEPlataforma", () => {
  it("agrupa streams/receita por faixa, depois por plataforma", () => {
    const mapa = porFaixaEPlataforma([
      m({ faixaId: "f1", plataforma: "youtube", streams: 1000, receita: 0 }),
      m({ faixaId: "f1", plataforma: "spotify", streams: 500, receita: 8 }),
      m({ faixaId: "f1", plataforma: "youtube", streams: 200, receita: 0 }),
      m({ faixaId: "f2", plataforma: "deezer", streams: 300, receita: 3 }),
    ]);
    expect(mapa.get("f1")).toEqual({
      streams: { youtube: 1200, spotify: 500 },
      receita: { youtube: 0, spotify: 8 },
    });
    expect(mapa.get("f2")).toEqual({ streams: { deezer: 300 }, receita: { deezer: 3 } });
  });

  it("ignora métricas sem faixaId", () => {
    const mapa = porFaixaEPlataforma([m({ faixaId: undefined, plataforma: "youtube", streams: 100 })]);
    expect(mapa.size).toBe(0);
  });

  it("streams/receita ausentes contam como 0", () => {
    const mapa = porFaixaEPlataforma([m({ faixaId: "f1", plataforma: "youtube", streams: undefined, receita: undefined })]);
    expect(mapa.get("f1")).toEqual({ streams: { youtube: 0 }, receita: { youtube: 0 } });
  });
});

describe("agregarMetricasPorFaixaEmBRL", () => {
  function row(overrides: Partial<LinhaMetricaCrua>): LinhaMetricaCrua {
    return {
      faixa_id: "f1",
      plataforma: "spotify",
      streams: 1000,
      receita: 10,
      ...overrides,
    };
  }

  it("mistura linhas BRL e USD: converte só o USD pela taxa antes de somar", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([
      row({ plataforma: "spotify", streams: 1000, receita: 10, moeda: "BRL" }),
      row({ plataforma: "youtube", streams: 500, receita: 4, moeda: "USD" }),
    ], 5);
    const agr = mapa.get("f1");
    // 10 BRL + (4 USD × 5) = 10 + 20 = 30
    expect(agr?.receita).toBe(30);
    expect(agr?.streams).toBe(1500);
    expect(agr?.temMetrica).toBe(true);
  });

  it("moeda ausente é tratada como BRL (não converte)", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([row({ receita: 10, moeda: null })], 5);
    expect(mapa.get("f1")?.receita).toBe(10);
  });

  it("agrega por plataforma dentro da faixa, já em BRL", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([
      row({ plataforma: "spotify", streams: 1000, receita: 10, moeda: "BRL" }),
      row({ plataforma: "spotify", streams: 200, receita: 2, moeda: "BRL" }),
      row({ plataforma: "youtube", streams: 500, receita: 4, moeda: "USD" }),
    ], 5);
    const agr = mapa.get("f1");
    expect(agr?.streamsPorPlataforma).toEqual({ spotify: 1200, youtube: 500 });
    expect(agr?.receitaPorPlataforma).toEqual({ spotify: 12, youtube: 20 });
  });

  it("separa faixas distintas e converte USD por faixa", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([
      row({ faixa_id: "f1", receita: 10, moeda: "BRL" }),
      row({ faixa_id: "f2", receita: 3, moeda: "USD" }),
    ], 4);
    expect(mapa.get("f1")?.receita).toBe(10);
    expect(mapa.get("f2")?.receita).toBe(12);
  });

  it("aceita valores como string (Postgrest) e trata streams/receita ausentes como 0", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([
      row({ plataforma: "youtube", streams: "300", receita: null, moeda: "USD" }),
    ], 5);
    const agr = mapa.get("f1");
    expect(agr?.streams).toBe(300);
    expect(agr?.receita).toBe(0);
  });

  it("ignora linhas sem faixa_id", () => {
    const mapa = agregarMetricasPorFaixaEmBRL([row({ faixa_id: null, receita: 99 })], 5);
    expect(mapa.size).toBe(0);
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

describe("receitaComEstimativa", () => {
  it("receita real (> 0) sempre vence a estimativa", () => {
    expect(receitaComEstimativa(50, 10000, 5)).toEqual({ valor: 50, estimada: false });
  });
  it("sem receita real mas com streams e rpm: estima streams/1000 × rpm", () => {
    expect(receitaComEstimativa(0, 10000, 2)).toEqual({ valor: 20, estimada: true });
    expect(receitaComEstimativa(null, 484_000_000, 1.5)).toEqual({ valor: 726_000, estimada: true });
  });
  it("sem rpm informado: devolve a receita original (não estima)", () => {
    expect(receitaComEstimativa(0, 10000, null)).toEqual({ valor: 0, estimada: false });
  });
  it("sem streams: não estima mesmo com rpm", () => {
    expect(receitaComEstimativa(null, null, 2)).toEqual({ valor: null, estimada: false });
    expect(receitaComEstimativa(null, 0, 2)).toEqual({ valor: null, estimada: false });
  });
  it("rpm <= 0 é tratado como ausente", () => {
    expect(receitaComEstimativa(0, 10000, 0)).toEqual({ valor: 0, estimada: false });
  });
});

describe("recebimentoArtista", () => {
  it("aplica o percentual sobre a receita da faixa", () => {
    expect(recebimentoArtista(1000, 25)).toBe(250);
  });
  it("100% recebe a receita inteira", () => {
    expect(recebimentoArtista(500, 100)).toBe(500);
  });
  it("receita null (nenhuma métrica ainda) dá null, não 0", () => {
    expect(recebimentoArtista(null, 50)).toBeNull();
  });
  it("0% recebe 0 mesmo com receita real", () => {
    expect(recebimentoArtista(1000, 0)).toBe(0);
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
