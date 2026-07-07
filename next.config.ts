import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Importação de CSV envia o texto da planilha no body da action; e o
      // Estúdio de Imagem sobe fotos em alta do artista + referências de capa
      // pro gpt-image-1, e devolve/salva a imagem gerada em base64 — ambos
      // passam do default de 1 MB. O client avisa antes de submits grandes.
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
