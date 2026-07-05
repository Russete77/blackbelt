import { describe, it, expect } from "vitest";
import {
  estimarReceitaPorFaixa, taxasDosParams,
  TAXA_PADRAO_YOUTUBE, TAXA_PADRAO_SPOTIFY, TAXA_PADRAO_DEEZER, TAXAS_PADRAO,
} from "./estimativa";

describe("TAXAS_PADRAO", () => {
  it("expõe os valores médios de mercado documentados", () => {
    expect(TAXA_PADRAO_YOUTUBE).toBe(1.5);
    expect(TAXA_PADRAO_SPOTIFY).toBe(0.017);
    expect(TAXA_PADRAO_DEEZER).toBe(0.01);
    expect(TAXAS_PADRAO).toEqual({ youtube: 1.5, spotify: 0.017, deezer: 0.01 });
  });
});

describe("estimarReceitaPorFaixa", () => {
  it("sem streams nem receita em nenhuma plataforma: total null, não estimada", () => {
    expect(estimarReceitaPorFaixa({}, {})).toEqual({ total: null, estimada: false, porPlataforma: [] });
  });

  it("YouTube com views e sem receita real: estima streams/1000 × taxa", () => {
    const r = estimarReceitaPorFaixa({ youtube: 484_000 }, {}, TAXAS_PADRAO);
    expect(r.total).toBeCloseTo(726, 5);
    expect(r.estimada).toBe(true);
    expect(r.porPlataforma).toEqual([{ plataforma: "youtube", valor: 726, real: false }]);
  });

  it("Spotify/Deezer com streams: estima streams × taxa por stream (não por 1.000)", () => {
    const r = estimarReceitaPorFaixa(
      { spotify: 10_000, deezer: 5_000 },
      {},
      TAXAS_PADRAO,
    );
    expect(r.total).toBeCloseTo(10_000 * 0.017 + 5_000 * 0.01, 5);
    expect(r.estimada).toBe(true);
    expect(r.porPlataforma.map((l) => l.plataforma).sort()).toEqual(["deezer", "spotify"]);
    expect(r.porPlataforma.every((l) => !l.real)).toBe(true);
  });

  it("receita real de uma plataforma vence a estimativa SÓ pra essa plataforma", () => {
    const r = estimarReceitaPorFaixa(
      { youtube: 100_000, spotify: 10_000 },
      { spotify: 999 }, // receita real importada só do Spotify
      TAXAS_PADRAO,
    );
    const youtube = r.porPlataforma.find((l) => l.plataforma === "youtube");
    const spotify = r.porPlataforma.find((l) => l.plataforma === "spotify");
    expect(youtube).toEqual({ plataforma: "youtube", valor: (100_000 / 1000) * TAXA_PADRAO_YOUTUBE, real: false });
    expect(spotify).toEqual({ plataforma: "spotify", valor: 999, real: true });
    expect(r.estimada).toBe(true); // ainda tem YouTube estimado
    expect(r.total).toBeCloseTo(150 + 999, 5);
  });

  it("todas as plataformas com receita real: total real, estimada=false", () => {
    const r = estimarReceitaPorFaixa(
      { youtube: 100_000 },
      { youtube: 50 },
      TAXAS_PADRAO,
    );
    expect(r).toEqual({ total: 50, estimada: false, porPlataforma: [{ plataforma: "youtube", valor: 50, real: true }] });
  });

  it("plataforma sem taxa conhecida (nem padrão nem custom) e sem receita real: não entra na soma", () => {
    const r = estimarReceitaPorFaixa({ tiktok: 50_000 }, {});
    expect(r).toEqual({ total: null, estimada: false, porPlataforma: [] });
  });

  it("plataforma com receita real mas <= 0 (0 ou negativa) não é tratada como real", () => {
    const r = estimarReceitaPorFaixa({ youtube: 10_000 }, { youtube: 0 });
    expect(r.porPlataforma).toEqual([{ plataforma: "youtube", valor: (10_000 / 1000) * TAXA_PADRAO_YOUTUBE, real: false }]);
  });

  it("taxas customizadas sobrescrevem o padrão", () => {
    const r = estimarReceitaPorFaixa({ spotify: 1000 }, {}, { youtube: 1, spotify: 1, deezer: 1 });
    expect(r.total).toBe(1000);
  });

  it("streams 0 ou ausente numa plataforma sem receita real: não entra na soma", () => {
    const r = estimarReceitaPorFaixa({ spotify: 0 }, {});
    expect(r).toEqual({ total: null, estimada: false, porPlataforma: [] });
  });

  it("ordena porPlataforma por valor desc", () => {
    const r = estimarReceitaPorFaixa({ youtube: 1000, spotify: 100_000 }, {});
    expect(r.porPlataforma.map((l) => l.plataforma)).toEqual(["spotify", "youtube"]);
  });
});

describe("taxasDosParams", () => {
  it("sem nenhum param: usa os padrões de mercado", () => {
    expect(taxasDosParams({})).toEqual(TAXAS_PADRAO);
  });

  it("usa ryt/rsp/rdz quando informados (aceita vírgula decimal)", () => {
    expect(taxasDosParams({ ryt: "2", rsp: "0,02", rdz: "0,015" })).toEqual({
      youtube: 2, spotify: 0.02, deezer: 0.015,
    });
  });

  it("retrocompatibilidade: ?rpm= vira youtube quando ryt não foi informado", () => {
    expect(taxasDosParams({ rpm: "3" }).youtube).toBe(3);
  });

  it("ryt tem prioridade sobre rpm quando ambos presentes", () => {
    expect(taxasDosParams({ ryt: "5", rpm: "3" }).youtube).toBe(5);
  });

  it("valor inválido ou <= 0 cai pro padrão", () => {
    expect(taxasDosParams({ ryt: "abc", rsp: "-1", rdz: "0" })).toEqual(TAXAS_PADRAO);
  });
});
