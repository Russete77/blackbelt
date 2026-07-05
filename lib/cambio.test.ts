import { describe, it, expect, afterEach, vi } from "vitest";
import { cotacaoDolar, formatarDolar, formatarValorDual, horaAtualizacao } from "./cambio";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cotacaoDolar", () => {
  it("parseia bid/create_date da resposta da AwesomeAPI", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        USDBRL: { bid: "5.165", create_date: "2026-07-03 18:08:17" },
      }),
    }));

    const cotacao = await cotacaoDolar();

    expect(cotacao).toEqual({ brl: 5.165, atualizadoEm: "2026-07-03 18:08:17" });
  });

  it("resposta HTTP com erro: cai no fallback marcado indisponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const cotacao = await cotacaoDolar();

    expect(cotacao.indisponivel).toBe(true);
    expect(cotacao.brl).toBeGreaterThan(0);
  });

  it("fetch rejeitado (rede fora): cai no fallback sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const cotacao = await cotacaoDolar();

    expect(cotacao.indisponivel).toBe(true);
  });

  it("bid ausente/inválido na resposta: cai no fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ USDBRL: { bid: "não-é-numero" } }),
    }));

    const cotacao = await cotacaoDolar();

    expect(cotacao.indisponivel).toBe(true);
  });
});

describe("formatarDolar", () => {
  it("formata em US$ com separador de milhar en-US", () => {
    expect(formatarDolar(1234.5)).toBe("US$ 1,234.50");
  });
});

describe("formatarValorDual", () => {
  it("valor em USD mostra US$ primeiro, R$ convertido depois", () => {
    expect(formatarValorDual(100, "USD", 5)).toMatch(/^US\$\s*100\.00 · R\$\s*500,00$/);
  });
  it("valor em BRL mostra R$ primeiro, US$ convertido depois", () => {
    expect(formatarValorDual(500, "BRL", 5)).toMatch(/^R\$\s*500,00 · US\$\s*100\.00$/);
  });
});

describe("horaAtualizacao", () => {
  it("extrai HH:MM do create_date da AwesomeAPI", () => {
    expect(horaAtualizacao("2026-07-03 18:08:17")).toBe("18:08");
  });
  it("string sem hora reconhecível: devolve como veio", () => {
    expect(horaAtualizacao("desconhecido")).toBe("desconhecido");
  });
});
