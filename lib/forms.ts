// Helpers síncronos compartilhados por Server Actions do grupo (app).
// Fica FORA de qualquer arquivo "use server": nesses arquivos todo export
// precisa ser uma Server Action async — um helper síncrono ali quebra o build.
export function caminhoSeguro(bruto: FormDataEntryValue | null): string {
  const caminho = String(bruto ?? "/");
  return caminho.startsWith("/") ? caminho : "/";
}
