import { describe, it, expect } from "vitest";
import { extrairSpotifyTrackId, extrairDeezerTrackId } from "./plataformas";

describe("extrairSpotifyTrackId", () => {
  it("aceita um id solto de 22 chars", () => {
    expect(extrairSpotifyTrackId("4cOdK2wGLETKBW3PvgPWqT")).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("aceita URI spotify:track:{id}", () => {
    expect(extrairSpotifyTrackId("spotify:track:4cOdK2wGLETKBW3PvgPWqT")).toBe(
      "4cOdK2wGLETKBW3PvgPWqT",
    );
  });

  it("aceita a URL padrão open.spotify.com/track/{id}", () => {
    expect(
      extrairSpotifyTrackId("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"),
    ).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("aceita a URL com parâmetro ?si=", () => {
    expect(
      extrairSpotifyTrackId(
        "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123",
      ),
    ).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("aceita a URL com prefixo de locale (intl-pt)", () => {
    expect(
      extrairSpotifyTrackId(
        "https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT",
      ),
    ).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("aceita sem esquema (www.open.spotify.com/track/{id})", () => {
    expect(
      extrairSpotifyTrackId("open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"),
    ).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("rejeita string vazia", () => {
    expect(extrairSpotifyTrackId("")).toBeNull();
    expect(extrairSpotifyTrackId("   ")).toBeNull();
  });

  it("rejeita link de outra plataforma", () => {
    expect(extrairSpotifyTrackId("https://deezer.com/track/123456")).toBeNull();
  });

  it("rejeita URL do Spotify sem /track/", () => {
    expect(extrairSpotifyTrackId("https://open.spotify.com/album/xyz")).toBeNull();
  });

  it("rejeita lixo qualquer", () => {
    expect(extrairSpotifyTrackId("não é um link")).toBeNull();
  });
});

describe("extrairDeezerTrackId", () => {
  it("aceita um id solto numérico", () => {
    expect(extrairDeezerTrackId("123456789")).toBe("123456789");
  });

  it("aceita a URL padrão deezer.com/track/{id}", () => {
    expect(extrairDeezerTrackId("https://www.deezer.com/track/123456789")).toBe("123456789");
  });

  it("aceita a URL com prefixo de idioma (en, pt-br)", () => {
    expect(extrairDeezerTrackId("https://www.deezer.com/en/track/123456789")).toBe("123456789");
    expect(extrairDeezerTrackId("https://deezer.com/pt-br/track/123456789")).toBe("123456789");
  });

  it("rejeita string vazia", () => {
    expect(extrairDeezerTrackId("")).toBeNull();
  });

  it("rejeita link de outra plataforma", () => {
    expect(extrairDeezerTrackId("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBeNull();
  });

  it("rejeita um link curto deezer.page.link (resolvido à parte, via rede)", () => {
    expect(extrairDeezerTrackId("https://deezer.page.link/abc123")).toBeNull();
  });

  it("rejeita lixo qualquer", () => {
    expect(extrairDeezerTrackId("não é um link")).toBeNull();
  });
});
