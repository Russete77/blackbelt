// Regras e helpers de upload de áudio compartilhados entre o "Subir versão"
// (components/faixa/UploadVersao.tsx) e o fluxo em um passo só "＋ Subir
// música" (components/estudio/SubirMusica.tsx). Mantém uma única fonte de
// verdade para extensões aceitas, tamanho máximo e leitura de duração.

// accept="audio/*" é só dica de UI — validamos de verdade antes de subir.
export const EXTENSOES_AUDIO = ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus"];
export const TAMANHO_MAX_MB = 200; // WAV de mix passa fácil de 100 MB

// Valida extensão e tamanho; devolve a extensão em minúsculas quando ok,
// ou uma mensagem de erro amigável para exibir no formulário.
export function validarArquivoAudio(file: File): { ext: string } | { erro: string } {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!EXTENSOES_AUDIO.includes(ext)) {
    return { erro: `Formato não suportado (.${ext || "?"}). Use: ${EXTENSOES_AUDIO.join(", ")}.` };
  }
  if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
    return { erro: `Arquivo de ${Math.round(file.size / 1024 / 1024)} MB — o limite é ${TAMANHO_MAX_MB} MB.` };
  }
  return { ext };
}

// Lê a duração do arquivo no próprio browser via <audio> (metadata).
// Se o formato não for decodificável (ou nenhum evento disparar), segue
// com null após o timeout — o fluxo não pode ficar preso em "Enviando...".
export function lerDuracao(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let resolvido = false;
    const finalizar = (valor: number | null) => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(valor);
    };
    const timeout = setTimeout(() => finalizar(null), 10_000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finalizar(Number.isFinite(audio.duration) ? Math.round(audio.duration * 100) / 100 : null);
    audio.onerror = () => finalizar(null);
    audio.src = url;
  });
}
