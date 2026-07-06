import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SinoNotificacoes } from "./SinoNotificacoes";
import type { Notificacao } from "@/types/notificacoes";

vi.mock("@/app/(app)/notificacoes/actions", () => ({
  marcarLida: vi.fn(async () => {}),
  marcarTodasLidas: vi.fn(async () => {}),
}));

const notificacoes: Notificacao[] = [
  {
    id: "1", titulo: "Nova demanda", mensagem: "Clipe: Nova Era",
    link: "/artista/bielzin/demandas", lida: false, criadoEm: new Date().toISOString(),
  },
  {
    id: "2", titulo: "Bem-vindo", mensagem: "Sua conta foi criada.",
    lida: true, criadoEm: new Date().toISOString(),
  },
];

describe("SinoNotificacoes", () => {
  it("mostra o badge com a contagem de não lidas", () => {
    render(<SinoNotificacoes notificacoesIniciais={notificacoes} naoLidasIniciais={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("sem não lidas, não mostra o badge", () => {
    render(<SinoNotificacoes notificacoesIniciais={notificacoes} naoLidasIniciais={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("abre o dropdown ao clicar no sino e lista as notificações", () => {
    render(<SinoNotificacoes notificacoesIniciais={notificacoes} naoLidasIniciais={1} />);
    fireEvent.click(screen.getByLabelText(/Notificações/));
    expect(screen.getByText("Nova demanda")).toBeInTheDocument();
    expect(screen.getByText("Bem-vindo")).toBeInTheDocument();
  });

  it("some o badge depois de marcar todas como lidas", () => {
    render(<SinoNotificacoes notificacoesIniciais={notificacoes} naoLidasIniciais={1} />);
    fireEvent.click(screen.getByLabelText(/Notificações/));
    fireEvent.click(screen.getByText("Marcar todas como lidas"));
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("estado vazio quando não há notificações", () => {
    render(<SinoNotificacoes notificacoesIniciais={[]} naoLidasIniciais={0} />);
    fireEvent.click(screen.getByLabelText(/Notificações/));
    expect(screen.getByText("Nenhuma notificação por aqui ainda.")).toBeInTheDocument();
  });
});
