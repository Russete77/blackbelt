import { describe, it, expect } from "vitest";
import { formatarTempoRelativo } from "./tempo";

describe("formatarTempoRelativo", () => {
  const agora = new Date("2026-07-05T12:00:00Z");

  it("segundos recentes viram 'agora mesmo'", () => {
    expect(formatarTempoRelativo(new Date("2026-07-05T11:59:58Z").toISOString(), agora)).toBe("agora mesmo");
  });
  it("minutos", () => {
    expect(formatarTempoRelativo(new Date("2026-07-05T11:55:00Z").toISOString(), agora)).toBe("há 5 minutos");
  });
  it("horas", () => {
    expect(formatarTempoRelativo(new Date("2026-07-05T09:00:00Z").toISOString(), agora)).toBe("há 3 horas");
  });
  it("um dia atrás vira 'ontem'", () => {
    expect(formatarTempoRelativo(new Date("2026-07-04T12:00:00Z").toISOString(), agora)).toBe("ontem");
  });
  it("vários dias", () => {
    expect(formatarTempoRelativo(new Date("2026-07-02T12:00:00Z").toISOString(), agora)).toBe("há 3 dias");
  });
  it("data inválida devolve a string original", () => {
    expect(formatarTempoRelativo("não-é-data", agora)).toBe("não-é-data");
  });
  it("mais de 30 dias cai pra data absoluta", () => {
    const antiga = new Date("2026-05-01T12:00:00Z");
    expect(formatarTempoRelativo(antiga.toISOString(), agora)).toBe(antiga.toLocaleDateString("pt-BR"));
  });
});
