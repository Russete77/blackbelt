// Exibição (somente leitura) dos riders na página de detalhe do show.
// Server-safe: sem estado, só renderização do JSON já normalizado.
import { ClipboardList, Mic2, Sofa } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import type { RiderCamarim, RiderTecnico } from "@/types/shows";

function TituloRider({ icone: Icone, children }: { icone: typeof Mic2; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-tight">
      <Icone className="h-5 w-5 text-accent" aria-hidden />
      {children}
    </h2>
  );
}

function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-fg">{valor}</dd>
    </div>
  );
}

function ListaInfo({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{rotulo}</dt>
      <dd className="mt-1">
        <ul className="flex flex-wrap gap-1.5">
          {itens.map((item, i) => (
            <li key={i} className="rounded-full bg-surface2 px-2.5 py-1 text-xs text-fg">{item}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function RiderVazio({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-4 text-xs text-muted">
      <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
      {texto}
    </div>
  );
}

export function RiderTecnicoView({ rider }: { rider: RiderTecnico | null }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <TituloRider icone={Mic2}>Rider técnico</TituloRider>
        {!rider ? (
          <RiderVazio texto="Rider técnico ainda não preenchido. Edite o show para adicioná-lo." />
        ) : (
          <dl className="flex flex-col gap-3">
            <LinhaInfo rotulo="P.A." valor={rider.pa} />
            <LinhaInfo rotulo="Monitores" valor={rider.monitores} />
            <ListaInfo rotulo="Backline" itens={rider.backline} />
            {rider.inputs.length > 0 && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Inputs / canais</dt>
                <dd className="mt-1 overflow-x-auto rounded-md border border-line">
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                        <th scope="col" className="px-3 py-2 font-semibold">Canal</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Fonte</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Microfone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rider.inputs.map((linha, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-xs">{linha.canal || "—"}</td>
                          <td className="px-3 py-2">{linha.fonte || "—"}</td>
                          <td className="px-3 py-2 text-muted">{linha.microfone || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </dd>
              </div>
            )}
            <LinhaInfo rotulo="Observações" valor={rider.observacoes} />
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

export function RiderCamarimView({ rider }: { rider: RiderCamarim | null }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <TituloRider icone={Sofa}>Rider de camarim</TituloRider>
        {!rider ? (
          <RiderVazio texto="Rider de camarim ainda não preenchido. Edite o show para adicioná-lo." />
        ) : (
          <dl className="flex flex-col gap-3">
            {rider.pessoas != null && <LinhaInfo rotulo="Nº de pessoas" valor={String(rider.pessoas)} />}
            <ListaInfo rotulo="Alimentação" itens={rider.alimentacao} />
            <ListaInfo rotulo="Bebidas" itens={rider.bebidas} />
            <ListaInfo rotulo="Itens" itens={rider.itens} />
            <LinhaInfo rotulo="Observações" valor={rider.observacoes} />
          </dl>
        )}
      </CardBody>
    </Card>
  );
}
