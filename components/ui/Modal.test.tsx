import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("não renderiza nada quando fechado", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Título">
        <p>Conteúdo</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renderiza como dialog acessível quando aberto", () => {
    render(
      <Modal open onClose={() => {}} title="Novo lançamento">
        <p>Conteúdo</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Novo lançamento")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("fecha ao pressionar Esc", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar no backdrop", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Modal>,
    );
    // O backdrop é o primeiro elemento aria-hidden dentro do overlay.
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("não fecha ao clicar dentro do painel", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Título">
        <p>Conteúdo do painel</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText("Conteúdo do painel"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("botão fechar chama onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Título">
        <p>Conteúdo</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
