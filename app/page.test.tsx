import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renderiza o nome do selo", () => {
    render(<Home />);
    // "BLACK BELT" fica dividido entre um text node e um <span> (destaque de cor),
    // então usamos um matcher de função que olha o textContent completo do heading.
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "H1" && /BLACK BELT/i.test(element.textContent ?? ""),
      ),
    ).toBeInTheDocument();
  });
});
