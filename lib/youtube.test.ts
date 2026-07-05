import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buscarViewCountYoutube, youtubeConfigurado } from "./youtube";

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
