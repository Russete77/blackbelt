import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListaDemandas } from "./ListaDemandas";
import type { Demanda } from "@/types/demandas";

vi.mock("@/app/(app)/demandas/actions", () => ({
  mudarStatusDemanda: vi.fn(async () => ({ status: "ok" })),
  atualizarDemanda: vi.fn(async () => ({ status: "ok" })),
  excluirDemanda: vi.fn(async () => ({ status: "ok" })),
}));

const demandas: Demanda[] = [
  { id: "1", artistaId: "a1", titulo: "Clipe: Nova Era", status: "aberta", criadoEm: new Date().toISOString() },
  { id: "2", artistaId: "a1", titulo: "Enviar letra revisada", status: "em_andamento", criadoEm: new Date().toISOString() },
  { id: "3", artistaId: "a1", titulo: "Aprovar arte da capa", status: "concluida", criadoEm: new Date().toISOString() },
];

describe("ListaDemandas", () => {
  it("mostra o estado vazio quando não há demandas", () => {
    render(<ListaDemandas demandas={[]} podeExcluir={false} caminho="/artista/x/demandas" />);
    expect(screen.getByText("Nenhuma demanda cadastrada ainda.")).toBeInTheDocument();
  });

  it("agrupa por status, na ordem aberta -> em andamento -> concluída", () => {
    render(<ListaDemandas demandas={demandas} podeExcluir={false} caminho="/artista/x/demandas" />);
    const titulosDeSecao = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulosDeSecao[0]).toContain("Aberta");
    expect(titulosDeSecao[1]).toContain("Em andamento");
    expect(titulosDeSecao[2]).toContain("Concluída");
  });

  it("mostra cada demanda dentro do seu grupo", () => {
    render(<ListaDemandas demandas={demandas} podeExcluir={false} caminho="/artista/x/demandas" />);
    expect(screen.getByText("Clipe: Nova Era")).toBeInTheDocument();
    expect(screen.getByText("Enviar letra revisada")).toBeInTheDocument();
    expect(screen.getByText("Aprovar arte da capa")).toBeInTheDocument();
  });

  it("sem permissão de excluir, não mostra o botão apagar", () => {
    render(<ListaDemandas demandas={demandas} podeExcluir={false} caminho="/artista/x/demandas" />);
    expect(screen.queryByLabelText("Apagar demanda")).not.toBeInTheDocument();
  });

  it("com permissão de excluir, mostra o botão apagar por card", () => {
    render(<ListaDemandas demandas={demandas} podeExcluir={true} caminho="/artista/x/demandas" />);
    expect(screen.getAllByLabelText("Apagar demanda")).toHaveLength(demandas.length);
  });
});
