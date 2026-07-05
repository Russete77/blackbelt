import { describe, it, expect } from "vitest";
import { youtubeThumbnailUrl, capaPublicaOuThumbnail } from "./faixa";

describe("youtubeThumbnailUrl", () => {
  it("monta a URL do thumbnail hqdefault a partir do id do vídeo", () => {
    expect(youtubeThumbnailUrl("abc123XYZ_-")).toBe(
      "https://img.youtube.com/vi/abc123XYZ_-/hqdefault.jpg",
    );
  });
});

describe("capaPublicaOuThumbnail", () => {
  it("usa capa_url quando já é uma URL http(s) pública", () => {
    expect(capaPublicaOuThumbnail({ capaUrl: "https://cdn.example.com/capa.jpg" })).toBe(
      "https://cdn.example.com/capa.jpg",
    );
  });

  it("usa capa_url http (sem s) também", () => {
    expect(capaPublicaOuThumbnail({ capaUrl: "http://cdn.example.com/capa.jpg" })).toBe(
      "http://cdn.example.com/capa.jpg",
    );
  });

  it("ignora capa_url que é um caminho de Storage (não http) e cai no thumbnail do YouTube", () => {
    expect(
      capaPublicaOuThumbnail({ capaUrl: "faixa/123.jpg", youtubeVideoId: "abcdefghijk" }),
    ).toBe("https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg");
  });

  it("sem capa_url, deriva do youtubeVideoId", () => {
    expect(capaPublicaOuThumbnail({ youtubeVideoId: "abcdefghijk" })).toBe(
      "https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg",
    );
  });

  it("sem capa_url nem youtubeVideoId, retorna undefined", () => {
    expect(capaPublicaOuThumbnail({})).toBeUndefined();
  });
});
