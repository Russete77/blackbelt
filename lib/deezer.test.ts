import { describe, it, expect, afterEach, vi } from "vitest";
import { buscarArtistasDeezer, catalogoDeezer } from "./deezer";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buscarArtistasDeezer", () => {
  it("nome vazio: retorna [] sem chamar fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const resultado = await buscarArtistasDeezer("   ");

    expect(resultado).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mapeia candidatos da resposta da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 118981132, name: "Bielzin", nb_fan: 151074, picture_medium: "https://x/250.jpg" },
        ],
      }),
    }));

    const resultado = await buscarArtistasDeezer("Bielzin");

    expect(resultado).toEqual([
      { id: "118981132", nome: "Bielzin", fas: 151074, fotoUrl: "https://x/250.jpg" },
    ]);
  });

  it("resposta com erro da Deezer: retorna []", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { type: "DataException", message: "no data" } }),
    }));

    await expect(buscarArtistasDeezer("nada")).resolves.toEqual([]);
  });

  it("resposta não-ok: retorna [] sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(buscarArtistasDeezer("Bielzin")).resolves.toEqual([]);
  });

  it("erro de rede: retorna [] sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(buscarArtistasDeezer("Bielzin")).resolves.toEqual([]);
  });
});

describe("catalogoDeezer", () => {
  it("id vazio: retorna [] sem chamar fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(catalogoDeezer("  ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("junta top + faixas de álbuns, deduplicando por título", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/top")) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 1, title: "Corre", album: { id: 10, title: "Álbum A", release_date: "2023-01-01", cover_medium: "cover-a.jpg" } },
            ],
          }),
        };
      }
      if (url.includes("/albums")) {
        return { ok: true, json: async () => ({ data: [{ id: 10, title: "Álbum A", release_date: "2023-01-01", cover_medium: "cover-a.jpg" }] }) };
      }
      if (url.includes("/album/10/tracks")) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 1, title: "Corre" }, // duplicado do top -> não deve dobrar
              { id: 2, title: "Nova Faixa" },
            ],
          }),
        };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await catalogoDeezer("118981132");

    expect(resultado).toHaveLength(2);
    expect(resultado.map((f) => f.titulo).sort()).toEqual(["Corre", "Nova Faixa"]);
    const corre = resultado.find((f) => f.titulo === "Corre");
    expect(corre).toEqual({
      titulo: "Corre", album: "Álbum A", deezerTrackId: "1",
      releaseDate: "2023-01-01", coverUrl: "cover-a.jpg",
    });
  });

  it("artista inexistente (erro da Deezer no /top): retorna [] sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { type: "DataException", message: "no artist" } }),
    }));

    await expect(catalogoDeezer("000000")).resolves.toEqual([]);
  });
});
