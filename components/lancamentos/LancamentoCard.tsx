"use client";
// Card de um lançamento: título/tipo/data/faixa vinculada, chip de status,
// plataformas, ISRC, progresso do checklist e ações (editar em modal,
// apagar para admin).
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarDataPura } from "@/lib/datas";
import { labelTipoLancamento, labelStatusLancamento, toneStatusLancamento, labelPlataforma } from "@/lib/labels";
import { LancamentoFormModal } from "./LancamentoFormModal";
import { ExcluirLancamentoButton } from "./ExcluirLancamentoButton";
import type { Faixa } from "@/types/domain";
import type { Lancamento } from "@/types/lancamentos";

export function LancamentoCard({
  lancamento, artistaId, faixas, capaUrlAssinada, podeExcluir, caminho,
}: {
  lancamento: Lancamento;
  artistaId: string;
  faixas: Faixa[];
  capaUrlAssinada: string | null;
  podeExcluir: boolean;
  caminho: string;
}) {
  const faixaVinculada = faixas.find((f) => f.id === lancamento.faixaId)?.titulo;
  const feitos = lancamento.checklist.filter((c) => c.feito).length;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-base uppercase tracking-tight">{lancamento.titulo}</h3>
            <p className="text-xs text-muted">
              {labelTipoLancamento(lancamento.tipo)}
              {lancamento.dataLancamento && ` · ${formatarDataPura(lancamento.dataLancamento)}`}
              {faixaVinculada && ` · Faixa: ${faixaVinculada}`}
            </p>
          </div>
          <Badge tone={toneStatusLancamento(lancamento.status)} className="shrink-0">
            {labelStatusLancamento(lancamento.status)}
          </Badge>
        </div>

        {lancamento.plataformas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lancamento.plataformas.map((p) => (
              <span key={p} className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted">
                {labelPlataforma(p)}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-muted">
          <span className="flex flex-wrap items-center gap-2">
            {lancamento.isrc && <span className="font-mono">{lancamento.isrc}</span>}
            {lancamento.checklist.length > 0 && (
              <span>Checklist: {feitos}/{lancamento.checklist.length}</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <LancamentoFormModal
              artistaId={artistaId}
              faixas={faixas}
              lancamento={lancamento}
              capaUrlAssinada={capaUrlAssinada}
              trigger={(abrir) => (
                <button
                  type="button"
                  onClick={abrir}
                  className="text-xs font-medium text-accent transition-colors duration-200 hover:brightness-110"
                >
                  Editar
                </button>
              )}
            />
            {podeExcluir && <ExcluirLancamentoButton id={lancamento.id} caminho={caminho} />}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
