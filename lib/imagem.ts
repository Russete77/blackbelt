// Geração de imagem por IA (OpenAI gpt-image-1) + recorte pro tamanho EXATO de
// cada plataforma com sharp. Server-only (usa OPENAI_API_KEY + sharp) — só
// importe de Server Actions. Sem referências → images/generations; COM fotos do
// artista/referências → images/edits (repagina original a partir delas).
import sharp from "sharp";
import type { FormatoImagem } from "@/lib/formatos-imagem";

const OPENAI = "https://api.openai.com/v1";

export interface ReferenciaImagem {
  nome: string;
  tipo: string;
  dados: Buffer;
}

export class SemChaveImagemError extends Error {
  constructor() {
    super("OPENAI_API_KEY não configurada.");
    this.name = "SemChaveImagemError";
  }
}

// Gera a imagem e devolve um JPEG sRGB já no tamanho exato do formato.
export async function gerarImagemIA(opts: {
  prompt: string;
  formato: FormatoImagem;
  referencias?: ReferenciaImagem[];
  qualidade?: "low" | "medium" | "high";
}): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new SemChaveImagemError();
  // Capa de streaming é a peça principal → alta qualidade; sociais → média.
  const qualidade = opts.qualidade ?? (opts.formato.capa ? "high" : "medium");

  let b64: string;
  const temRefs = opts.referencias && opts.referencias.length > 0;

  if (temRefs) {
    // images/edits (multipart) — usa as fotos do artista + referências.
    const fd = new FormData();
    fd.set("model", "gpt-image-1");
    fd.set("prompt", opts.prompt);
    fd.set("size", opts.formato.gen);
    fd.set("quality", qualidade);
    fd.set("n", "1");
    // Preserva FIELMENTE o rosto/identidade das fotos enviadas (o artista) —
    // sem isso o modelo "reinventa" a pessoa. É o parâmetro certo do gpt-image-1
    // para manter rostos/logos das imagens de entrada.
    fd.set("input_fidelity", "high");
    for (const r of opts.referencias!) {
      // Buffer é BlobPart válido em runtime; o cast evita o ruído de tipo
      // (ArrayBufferLike vs ArrayBuffer) entre Node Buffer e a DOM Blob.
      const parte = r.dados as unknown as BlobPart;
      fd.append("image[]", new Blob([parte], { type: r.tipo || "image/png" }), r.nome || "ref.png");
    }
    const res = await fetch(`${OPENAI}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`OpenAI images/edits ${res.status}: ${(await res.text()).slice(0, 300)}`);
    b64 = (await res.json())?.data?.[0]?.b64_json ?? "";
  } else {
    const res = await fetch(`${OPENAI}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: opts.prompt, size: opts.formato.gen, quality: qualidade, n: 1 }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`OpenAI images/generations ${res.status}: ${(await res.text()).slice(0, 300)}`);
    b64 = (await res.json())?.data?.[0]?.b64_json ?? "";
  }

  if (!b64) throw new Error("A IA não retornou imagem.");
  const bruto = Buffer.from(b64, "base64");

  // Recorta/redimensiona pro tamanho EXATO da plataforma (fit cover + foco na
  // região de maior detalhe) e exporta JPEG sRGB de alta qualidade.
  return sharp(bruto)
    .resize(opts.formato.w, opts.formato.h, { fit: "cover", position: "attention" })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
