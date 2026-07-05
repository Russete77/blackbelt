import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Importação de CSV envia o texto da planilha no body da action —
      // o default de 1 MB estourava com export anual de agregadora.
      // O client (ImportarCSV) avisa antes do submit acima de ~3,5 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
