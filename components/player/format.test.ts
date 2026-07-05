import { describe, it, expect } from "vitest";
import { formatTempo } from "./format";

describe("formatTempo", () => {
  it("formata segundos como m:ss", () => {
    expect(formatTempo(0)).toBe("0:00");
    expect(formatTempo(38)).toBe("0:38");
    expect(formatTempo(72)).toBe("1:12");
    expect(formatTempo(605)).toBe("10:05");
  });
});
