import { describe, it, expect } from "vitest";
import { formatarDataPura } from "./datas";

describe("formatarDataPura", () => {
  it("date-only não desloca um dia em fusos negativos", () => {
    expect(formatarDataPura("2026-07-04")).toBe("04/07/2026");
  });
  it("timestamps completos seguem o parse padrão", () => {
    expect(formatarDataPura("2026-07-04T15:30:00-03:00")).toBe("04/07/2026");
  });
  it("entrada inválida volta como veio", () => {
    expect(formatarDataPura("sem-data")).toBe("sem-data");
  });
});
