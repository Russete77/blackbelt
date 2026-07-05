"use client";
// Formulário completo de show (criar e editar): dados do show + rider
// técnico + rider de camarim. Os riders vivem em estado React e são
// serializados em JSON (hidden inputs) para a Server Action — que valida,
// normaliza e grava nas colunas jsonb via RLS.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { Mic2, Sofa } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RiderCamarimFields } from "@/components/shows/RiderCamarimFields";
import { RiderTecnicoFields } from "@/components/shows/RiderTecnicoFields";
import { criarShow, editarShow, type EstadoAcaoShow } from "@/app/(app)/shows/actions";
import {
  STATUS_SHOW, isoParaInputLocal, labelStatusShow,
  riderCamarimVazio, riderTecnicoVazio,
} from "@/lib/shows";
import type { Artista } from "@/types/domain";
import type { ShowDetalhado } from "@/types/shows";

const ESTADO_INICIAL: EstadoAcaoShow = { status: "idle" };

export function ShowForm({
  artistas, artistaIdInicial, show,
}: {
  artistas: Artista[];
  // Pré-seleção vinda da aba do artista ("Novo show" já vinculado).
  artistaIdInicial?: string;
  // Presente = modo edição.
  show?: ShowDetalhado;
}) {
  const caminho = usePathname();
  const editando = Boolean(show);
  const [estado, formAction, pendente] = useActionState(
    editando ? editarShow : criarShow,
    ESTADO_INICIAL,
  );
  const [riderTecnico, setRiderTecnico] = useState(show?.riderTecnico ?? riderTecnicoVazio());
  const [riderCamarim, setRiderCamarim] = useState(show?.riderCamarim ?? riderCamarimVazio());

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {show && <input type="hidden" name="id" value={show.id} />}
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="riderTecnico" value={JSON.stringify(riderTecnico)} />
      <input type="hidden" name="riderCamarim" value={JSON.stringify(riderCamarim)} />

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="font-display text-lg uppercase tracking-tight">Dados do show</h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Artista">
              <Select name="artistaId" required defaultValue={show?.artistaId ?? artistaIdInicial ?? ""}>
                <option value="" disabled>Selecione o artista</option>
                {artistas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Data e hora">
              <Input
                type="datetime-local"
                name="data"
                required
                defaultValue={show?.data ? isoParaInputLocal(show.data) : ""}
              />
            </Field>
          </div>

          <Field label="Local">
            <Input
              name="local"
              required
              placeholder="Ex.: Audio Club — São Paulo/SP"
              defaultValue={show?.local ?? ""}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Field label="Cachê (R$)">
              <Input
                type="number"
                name="cache"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Ex.: 15000"
                className="font-mono"
                defaultValue={show?.cache ?? ""}
              />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={show?.status ?? "negociando"}>
                {STATUS_SHOW.map((s) => (
                  <option key={s} value={s}>{labelStatusShow(s)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-tight">
            <Mic2 className="h-5 w-5 text-accent" aria-hidden />
            Rider técnico
          </h2>
          <RiderTecnicoFields valor={riderTecnico} onChange={setRiderTecnico} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-tight">
            <Sofa className="h-5 w-5 text-accent" aria-hidden />
            Rider de camarim
          </h2>
          <RiderCamarimFields valor={riderCamarim} onChange={setRiderCamarim} />
        </CardBody>
      </Card>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pendente} className="sm:self-start">
          {pendente ? "Salvando..." : editando ? "Salvar alterações" : "Criar show"}
        </Button>
        {estado.status === "error" && (
          <p className="text-xs text-danger">{estado.message}</p>
        )}
      </div>
    </form>
  );
}
