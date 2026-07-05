import { notFound } from "next/navigation";
import Link from "next/link";
import { BookText, ChevronLeft, Clapperboard, Disc } from "lucide-react";
import { getFaixa, getRegistrosDaFaixa, getSplitsDaFaixa } from "@/lib/db";
import { fonogramaVazia, obraVazia, videogramaVazia } from "@/lib/registro";
import { SecaoRegistro } from "@/components/registro/SecaoRegistro";
import { ObraForm } from "@/components/registro/ObraForm";
import { FonogramaForm } from "@/components/registro/FonogramaForm";
import { VideogramaForm } from "@/components/registro/VideogramaForm";

// Detalhe de Registro & Direitos de uma faixa: 3 seções colapsáveis (obra,
// fonograma, videograma), cada uma salvando na sua própria tabela via
// app/(app)/registro/actions.ts.
export default async function RegistroFaixaPage({
  params,
}: {
  params: Promise<{ faixaId: string }>;
}) {
  const { faixaId } = await params;
  const faixa = await getFaixa(faixaId);
  if (!faixa) return notFound();

  const [registros, splits] = await Promise.all([
    getRegistrosDaFaixa(faixaId),
    getSplitsDaFaixa(faixaId),
  ]);

  // Letra: prefill de faixas.letra quando o registro da obra ainda não tem
  // letra própria salva — depois de editada e salva, o valor de
  // registros_obra.dados.letra passa a valer.
  const dadosObra = registros.obra?.dados ?? obraVazia();
  if (!dadosObra.letra.trim() && faixa.letra) dadosObra.letra = faixa.letra;

  return (
    <div className="p-4 md:p-6">
      <Link
        href="/registro"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Voltar para Registro
      </Link>
      <h1 className="mb-1 font-display text-2xl uppercase tracking-tight md:text-3xl">{faixa.titulo}</h1>
      <p className="mb-6 text-sm text-muted">
        Registro &amp; Direitos — dados legais de obra, fonograma e videograma desta faixa.
      </p>

      <div className="flex flex-col gap-4">
        <SecaoRegistro icon={BookText} titulo="Obra (composição)">
          <ObraForm faixaId={faixa.id} dadosIniciais={dadosObra} splits={splits} />
        </SecaoRegistro>

        <SecaoRegistro icon={Disc} titulo="Fonograma (gravação)">
          <FonogramaForm
            faixaId={faixa.id}
            isrcInicial={registros.fonograma?.isrc ?? ""}
            dadosIniciais={registros.fonograma?.dados ?? fonogramaVazia()}
          />
        </SecaoRegistro>

        <SecaoRegistro icon={Clapperboard} titulo="Videograma (clipe)">
          <VideogramaForm faixaId={faixa.id} dadosIniciais={registros.videograma?.dados ?? videogramaVazia()} />
        </SecaoRegistro>
      </div>
    </div>
  );
}
