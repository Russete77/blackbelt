import { describe, it, expect, afterEach, vi } from "vitest";
import { buscarViewCountYoutube, youtubeConfigurado, extrairYoutubeVideoId } from "./youtube";

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
