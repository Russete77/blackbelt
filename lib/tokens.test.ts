import { describe, it, expect } from "vitest";
import { tokens } from "./tokens";

describe("tokens", () => {
  it("define o acento dourado como fonte única", () => {
    expect(tokens.colors.accent).toBe("#F5C518");
  });
  it("tem fundo escuro (dark premium)", () => {
    expect(tokens.colors.bg).toBe("#0A0A0B");
  });
  it("expõe superfícies e texto", () => {
    expect(tokens.colors.surface).toBeTruthy();
    expect(tokens.colors.fg).toBeTruthy();
    expect(tokens.colors.muted).toBeTruthy();
  });
});
