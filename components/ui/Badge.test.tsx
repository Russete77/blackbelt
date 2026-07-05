import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("mostra o texto e aplica o tom", () => {
    render(<Badge tone="alta">Alta</Badge>);
    const el = screen.getByText("Alta");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-danger");
  });
});
