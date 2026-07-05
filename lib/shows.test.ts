import { describe, it, expect } from "vitest";
import {
  labelStatusShow, normalizarStatusShow, toneStatusShow,
  formatarDataShow, partesDataShow, chaveMesShow, labelMesShow,
  isoParaInputLocal, inputLocalParaIso, formatarCache,
  particionarAgenda, agruparPorMes,
  parseRiderTecnico, parseRiderCamarim, riderTecnicoDeJson, riderCamarimDeJson,
  riderTecnicoVazio, riderTecnicoTemConteudo, riderCamarimTemConteudo,
} from "./shows";

describe("status do show", () => {
  it("traduz os status", () => {
    expect(labelStatusShow("negociando")).toBe("Negociando");
    expect(labelStatusShow("realizado")).toBe("Realizado");
  });
  it("normaliza texto livre do banco para o enum", () => {
    expect(normalizarStatusShow("confirmado")).toBe("confirmado");
    expect(normalizarStatusShow("qualquer coisa")).toBe("negociando");
    expect(normalizarStatusShow(null)).toBe("negociando");
  });
  it("mapeia status para tones do Badge", () => {
    expect(toneStatusShow("confirmado")).toBe("accent");
    expect(toneStatusShow("cancelado")).toBe("alta");
  });
});

describe("datas em America/Sao_Paulo", () => {
  // 2026-10-10T21:00 em São Paulo = 2026-10-11T00:00Z (Brasil sem DST desde 2019).
  const iso = "2026-10-11T00:00:00.000Z";

  it("formata data completa em pt-BR no fuso de São Paulo", () => {
    const s = formatarDataShow(iso);
    expect(s).toContain("10");
    expect(s).toContain("out");
    expect(s).toContain("21:00");
  });
  it("extrai partes para o bloco de data do card", () => {
    expect(partesDataShow(iso)).toEqual({ dia: "10", mes: "out", hora: "21:00", diaSemana: "sáb" });
    expect(partesDataShow("data-invalida")).toBeNull();
  });
  it("agrupa por mês local, não UTC", () => {
    expect(chaveMesShow(iso)).toBe("2026-10");
    expect(labelMesShow("2026-10")).toBe("Outubro de 2026");
  });
  it("converte ISO <-> input datetime-local (ida e volta)", () => {
    expect(isoParaInputLocal(iso)).toBe("2026-10-10T21:00");
    expect(inputLocalParaIso("2026-10-10T21:00")).toBe(iso);
    expect(inputLocalParaIso("bagunça")).toBeNull();
  });
});

describe("cachê", () => {
  it("formata em BRL", () => {
    // Intl usa espaço não separável (NBSP) entre "R$" e o valor — \s cobre os dois.
    expect(formatarCache(15000)).toMatch(/^R\$\s15\.000,00$/);
  });
});

describe("agenda", () => {
  const mk = (id: string, data?: string) => ({
    id, artistaId: "a1", data, status: "confirmado" as const,
    riderTecnico: null, riderCamarim: null,
  });
  const agora = Date.parse("2026-07-05T12:00:00Z");
  const shows = [
    mk("passado", "2026-06-01T00:00:00Z"),
    mk("hoje", "2026-07-05T23:00:00Z"),
    mk("proximo-mes", "2026-08-10T00:00:00Z"),
    mk("sem-data"),
  ];

  it("particiona em próximos / sem data / anteriores (recente primeiro)", () => {
    const { proximos, semData, anteriores } = particionarAgenda(shows, agora);
    expect(proximos.map((s) => s.id)).toEqual(["hoje", "proximo-mes"]);
    expect(semData.map((s) => s.id)).toEqual(["sem-data"]);
    expect(anteriores.map((s) => s.id)).toEqual(["passado"]);
  });
  it("agrupa por mês preservando a ordem cronológica", () => {
    const meses = agruparPorMes(particionarAgenda(shows, agora).proximos);
    expect(meses.map((m) => m.chave)).toEqual(["2026-07", "2026-08"]);
    expect(meses[0].shows.map((s) => s.id)).toEqual(["hoje"]);
  });
});

describe("riders (jsonb nunca é confiável)", () => {
  it("normaliza rider técnico válido e descarta lixo", () => {
    const r = parseRiderTecnico({
      pa: "Line array 4 vias",
      backline: ["Bateria completa", 42, ""],
      inputs: [{ canal: "1", fonte: "Kick", microfone: "Beta 52" }, { canal: "", fonte: "", microfone: "" }],
    });
    expect(r.pa).toBe("Line array 4 vias");
    expect(r.monitores).toBe("");
    expect(r.backline).toEqual(["Bateria completa"]);
    expect(r.inputs).toEqual([{ canal: "1", fonte: "Kick", microfone: "Beta 52" }]);
  });
  it("degrada para vazio com shapes inesperados", () => {
    expect(parseRiderTecnico(null)).toEqual(riderTecnicoVazio());
    expect(parseRiderTecnico("string")).toEqual(riderTecnicoVazio());
    expect(parseRiderTecnico([1, 2])).toEqual(riderTecnicoVazio());
  });
  it("normaliza rider de camarim (pessoas inteiro positivo ou null)", () => {
    expect(parseRiderCamarim({ pessoas: 6.9, bebidas: ["Água sem gás"] }).pessoas).toBe(6);
    expect(parseRiderCamarim({ pessoas: -2 }).pessoas).toBeNull();
    expect(parseRiderCamarim({ pessoas: "abc" }).pessoas).toBeNull();
  });
  it("JSON inválido do formulário vira rider vazio, sem quebrar a ação", () => {
    expect(riderTecnicoDeJson("{{{")).toEqual(riderTecnicoVazio());
    expect(riderCamarimDeJson("").alimentacao).toEqual([]);
  });
  it("detecta rider com conteúdo", () => {
    expect(riderTecnicoTemConteudo(riderTecnicoVazio())).toBe(false);
    expect(riderTecnicoTemConteudo(parseRiderTecnico({ pa: "P.A. 10kW" }))).toBe(true);
    expect(riderCamarimTemConteudo(parseRiderCamarim({ pessoas: 4 }))).toBe(true);
  });
});
