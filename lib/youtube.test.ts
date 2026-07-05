import { describe, it, expect, afterEach, vi } from "vitest";
import {
  buscarViewCountYoutube, youtubeConfigurado, extrairYoutubeVideoId,
  resolverCanalYoutube, listarVideosCanal, buscarVideosArtistaYoutube,
} from "./youtube";

const ORIGINAL_ENV = process.env.YOUTUBE_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_ENV === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = ORIGINAL_ENV;
});

describe("youtubeConfigurado", () => {
  it("false quando não há chave no ambiente", () => {
    delete process.env.YOUTUBE_API_KEY;
    expect(youtubeConfigurado()).toBe(false);
  });
  it("true quando há chave", () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    expect(youtubeConfigurado()).toBe(true);
  });
});

describe("buscarViewCountYoutube", () => {
  it("sem YOUTUBE_API_KEY: retorna null sem chamar fetch", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const resultado = await buscarViewCountYoutube("abc123");

    expect(resultado).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("com chave: parseia viewCount da resposta da API", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ statistics: { viewCount: "123456" }, snippet: { title: "Corre (Clipe Oficial)" } }],
      }),
    }));

    const resultado = await buscarViewCountYoutube("abc123");

    expect(resultado).toEqual({ videoId: "abc123", titulo: "Corre (Clipe Oficial)", viewCount: 123456 });
  });

  it("resposta não-ok: retorna null sem lançar", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    await expect(buscarViewCountYoutube("abc123")).resolves.toBeNull();
  });

  it("vídeo inexistente (items vazio): retorna null", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));

    await expect(buscarViewCountYoutube("abc123")).resolves.toBeNull();
  });

  it("erro de rede: retorna null sem lançar", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(buscarViewCountYoutube("abc123")).resolves.toBeNull();
  });

  it("videoId vazio: retorna null sem chamar fetch", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(buscarViewCountYoutube("   ")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("extrairYoutubeVideoId", () => {
  const ID = "dQw4w9WgXcQ";

  it("aceita um id de 11 caracteres solto", () => {
    expect(extrairYoutubeVideoId(ID)).toBe(ID);
  });

  it("ignora espaços em volta do id solto", () => {
    expect(extrairYoutubeVideoId(`  ${ID}  `)).toBe(ID);
  });

  it("extrai de youtube.com/watch?v=ID", () => {
    expect(extrairYoutubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("extrai de watch com parâmetros extras (t, list)", () => {
    expect(extrairYoutubeVideoId(`https://www.youtube.com/watch?v=${ID}&t=43s&list=PL123`)).toBe(ID);
  });

  it("extrai de youtu.be/ID", () => {
    expect(extrairYoutubeVideoId(`https://youtu.be/${ID}`)).toBe(ID);
  });

  it("extrai de youtu.be/ID com query string", () => {
    expect(extrairYoutubeVideoId(`https://youtu.be/${ID}?si=abc123`)).toBe(ID);
  });

  it("extrai de youtube.com/shorts/ID", () => {
    expect(extrairYoutubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
  });

  it("extrai de shorts com query string", () => {
    expect(extrairYoutubeVideoId(`https://youtube.com/shorts/${ID}?feature=share`)).toBe(ID);
  });

  it("extrai de youtube.com/embed/ID", () => {
    expect(extrairYoutubeVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
  });

  it("aceita m.youtube.com (versão mobile)", () => {
    expect(extrairYoutubeVideoId(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("aceita URL sem esquema (sem https://)", () => {
    expect(extrairYoutubeVideoId(`youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("string vazia: retorna null", () => {
    expect(extrairYoutubeVideoId("")).toBeNull();
    expect(extrairYoutubeVideoId("   ")).toBeNull();
  });

  it("texto que não é URL nem id válido: retorna null", () => {
    expect(extrairYoutubeVideoId("isso não é um link")).toBeNull();
  });

  it("id curto demais: retorna null", () => {
    expect(extrairYoutubeVideoId("abc")).toBeNull();
  });

  it("URL do YouTube sem vídeo (home): retorna null", () => {
    expect(extrairYoutubeVideoId("https://www.youtube.com/")).toBeNull();
  });

  it("URL de outro site: retorna null", () => {
    expect(extrairYoutubeVideoId(`https://vimeo.com/${ID}`)).toBeNull();
  });
});

describe("resolverCanalYoutube", () => {
  const CANAL_ID = "UC9uxk-1fKR13LNZ8ji0F7Uw";

  it("sem YOUTUBE_API_KEY: retorna null sem chamar fetch", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(resolverCanalYoutube("@BLACKBEELT")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolve @handle para channelId + playlist de uploads", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: CANAL_ID,
          snippet: { title: "BLACK BEELT" },
          contentDetails: { relatedPlaylists: { uploads: "UU9uxk-1fKR13LNZ8ji0F7Uw" } },
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await resolverCanalYoutube("@BLACKBEELT");

    expect(resultado).toEqual({
      channelId: CANAL_ID, titulo: "BLACK BEELT", uploadsPlaylistId: "UU9uxk-1fKR13LNZ8ji0F7Uw",
    });
    const urlChamada = new URL(fetchMock.mock.calls[0][0]);
    expect(urlChamada.searchParams.get("forHandle")).toBe("@BLACKBEELT");
  });

  it("resolve a partir de uma URL completa do canal (/channel/ID)", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: CANAL_ID, snippet: { title: "X" }, contentDetails: { relatedPlaylists: { uploads: "UU123" } } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await resolverCanalYoutube(`https://www.youtube.com/channel/${CANAL_ID}`);

    const urlChamada = new URL(fetchMock.mock.calls[0][0]);
    expect(urlChamada.searchParams.get("id")).toBe(CANAL_ID);
  });

  it("resolve um id de canal (UC...) solto direto", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: CANAL_ID, snippet: { title: "X" }, contentDetails: { relatedPlaylists: { uploads: "UU123" } } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await resolverCanalYoutube(CANAL_ID);

    const urlChamada = new URL(fetchMock.mock.calls[0][0]);
    expect(urlChamada.searchParams.get("id")).toBe(CANAL_ID);
  });

  it("canal inexistente (items vazio): retorna null", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));

    await expect(resolverCanalYoutube("@naoexiste")).resolves.toBeNull();
  });

  it("entrada inválida: retorna null sem chamar fetch", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(resolverCanalYoutube("https://vimeo.com/algo")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("erro de rede: retorna null sem lançar", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(resolverCanalYoutube("@BLACKBEELT")).resolves.toBeNull();
  });
});

describe("listarVideosCanal", () => {
  it("sem YOUTUBE_API_KEY: retorna [] sem chamar fetch", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(listarVideosCanal("UU123")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pagina playlistItems e busca estatísticas em lote", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn(async (rawUrl: string) => {
      const url = new URL(rawUrl);
      if (url.pathname.endsWith("/playlistItems")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { contentDetails: { videoId: "vid1", videoPublishedAt: "2024-01-01T00:00:00Z" } },
              { contentDetails: { videoId: "vid2", videoPublishedAt: "2024-02-01T00:00:00Z" } },
            ],
          }),
        };
      }
      if (url.pathname.endsWith("/videos")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: "vid1", statistics: { viewCount: "100" }, snippet: { title: "Vídeo 1" } },
              { id: "vid2", statistics: { viewCount: "200" }, snippet: { title: "Vídeo 2" } },
            ],
          }),
        };
      }
      throw new Error(`unexpected url ${rawUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await listarVideosCanal("UU123");

    expect(resultado).toEqual([
      { videoId: "vid1", titulo: "Vídeo 1", viewCount: 100, publishedAt: "2024-01-01T00:00:00Z" },
      { videoId: "vid2", titulo: "Vídeo 2", viewCount: 200, publishedAt: "2024-02-01T00:00:00Z" },
    ]);
  });

  it("playlist vazia: retorna [] sem chamar videos.list", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn(async (rawUrl: string) => {
      const url = new URL(rawUrl);
      if (url.pathname.endsWith("/playlistItems")) {
        return { ok: true, json: async () => ({ items: [] }) };
      }
      throw new Error(`unexpected url ${rawUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listarVideosCanal("UU123")).resolves.toEqual([]);
  });

  it("erro na paginação: retorna [] sem lançar", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(listarVideosCanal("UU123")).resolves.toEqual([]);
  });
});

describe("buscarVideosArtistaYoutube", () => {
  it("sem YOUTUBE_API_KEY: retorna [] sem chamar fetch", async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(buscarVideosArtistaYoutube("Bielzin")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("termo vazio: retorna [] sem chamar fetch", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(buscarVideosArtistaYoutube("   ")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("busca em search.list e detalha em videos.list (cross-channel)", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn(async (rawUrl: string) => {
      const url = new URL(rawUrl);
      if (url.pathname.endsWith("/search")) {
        expect(url.searchParams.get("order")).toBe("viewCount");
        expect(url.searchParams.get("type")).toBe("video");
        return {
          ok: true,
          json: async () => ({
            items: [{ id: { videoId: "abc" } }, { id: { videoId: "def" } }],
          }),
        };
      }
      if (url.pathname.endsWith("/videos")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: "abc", statistics: { viewCount: "1000" }, snippet: { title: "Feat A", channelTitle: "Mainstreet Records", publishedAt: "2024-01-01T00:00:00Z" } },
              { id: "def", statistics: { viewCount: "500" }, snippet: { title: "Feat B", channelTitle: "MC Cabelinho", publishedAt: "2024-02-01T00:00:00Z" } },
            ],
          }),
        };
      }
      throw new Error(`unexpected url ${rawUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await buscarVideosArtistaYoutube("Bielzin", 10);

    expect(resultado).toEqual([
      { videoId: "abc", titulo: "Feat A", canalTitulo: "Mainstreet Records", viewCount: 1000, publishedAt: "2024-01-01T00:00:00Z" },
      { videoId: "def", titulo: "Feat B", canalTitulo: "MC Cabelinho", viewCount: 500, publishedAt: "2024-02-01T00:00:00Z" },
    ]);
  });

  it("sem resultados na busca: retorna [] sem chamar videos.list", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    const fetchMock = vi.fn(async (rawUrl: string) => {
      const url = new URL(rawUrl);
      if (url.pathname.endsWith("/search")) return { ok: true, json: async () => ({ items: [] }) };
      throw new Error(`unexpected url ${rawUrl}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(buscarVideosArtistaYoutube("nada")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("erro de rede: retorna [] sem lançar", async () => {
    process.env.YOUTUBE_API_KEY = "fake-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(buscarVideosArtistaYoutube("Bielzin")).resolves.toEqual([]);
  });
});
