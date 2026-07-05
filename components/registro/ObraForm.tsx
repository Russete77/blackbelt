"use client";
// Formulário de Obra (composição): título exato, autores (nome/CPF/nascimento/
// endereço/RG), letra (prefill de faixas.letra, editável) e partitura
// (texto/URL livre). Percentuais aparecem só como referência de leitura —
// quem edita split é components/faixa/SplitsFaixa.tsx, na página da faixa.
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, Percent } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ListaLinhasEditavel } from "@/components/registro/ListaLinhasEditavel";
import { salvarObra, type EstadoRegistro } from "@/app/(app)/registro/actions";
import { obraCompleta } from "@/lib/registro";
import type { Autor, DadosObra } from "@/types/registro";
import type { SplitFaixa } from "@/lib/db";

const ESTADO_INICIAL: EstadoRegistro = { status: "idle" };

function autorVazio(): Autor {
  return { nome: "", cpf: "", nascimento: "", endereco: "", rg: "" };
}

export function ObraForm({
  faixaId, dadosIniciais, splits,
}: { faixaId: string; dadosIniciais: DadosObra; splits: SplitFaixa[] }) {
  const caminho = usePathname();
  const [estado, formAction, pendente] = useActionState(salvarObra, ESTADO_INICIAL);
  const [tituloExato, setTituloExato] = useState(dadosIniciais.tituloExato);
  const [autores, setAutores] = useState<Autor[]>(dadosIniciais.autores);
  const [letra, setLetra] = useState(dadosIniciais.letra);
  const [partitura, setPartitura] = useState(dadosIniciais.partitura);

  const dados: DadosObra = { tituloExato, autores, letra, partitura };
  const completo = obraCompleta(dados);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="faixaId" value={faixaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="dados" value={JSON.stringify(dados)} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Status do registro</span>
        <Badge tone={completo ? "aprovado" : "media"}>{completo ? "Completo" : "Incompleto"}</Badge>
      </div>

      <Field label="Título exato">
        <Input
          value={tituloExato}
          onChange={(e) => setTituloExato(e.target.value)}
          placeholder="Título exato para o registro da obra"
        />
      </Field>

      <ListaLinhasEditavel
        rotulo="Autores"
        itens={autores}
        onChange={setAutores}
        novoItem={autorVazio}
        vazio="Nenhum autor cadastrado ainda."
        renderLinha={(a, atualizar) => (
          <>
            <Input
              aria-label="Nome do autor"
              value={a.nome}
              onChange={(e) => atualizar({ nome: e.target.value })}
              placeholder="Nome completo"
              className="w-full sm:w-48"
            />
            <Input
              aria-label="CPF do autor"
              value={a.cpf}
              onChange={(e) => atualizar({ cpf: e.target.value })}
              placeholder="CPF"
              className="w-full sm:w-36"
            />
            <Input
              aria-label="Nascimento do autor"
              type="date"
              value={a.nascimento}
              onChange={(e) => atualizar({ nascimento: e.target.value })}
              className="w-full sm:w-40"
            />
            <Input
              aria-label="RG do autor"
              value={a.rg}
              onChange={(e) => atualizar({ rg: e.target.value })}
              placeholder="RG"
              className="w-full sm:w-28"
            />
            <Input
              aria-label="Endereço do autor"
              value={a.endereco}
              onChange={(e) => atualizar({ endereco: e.target.value })}
              placeholder="Endereço completo"
              className="w-full sm:flex-1"
            />
          </>
        )}
      />

      <Field label="Letra">
        <Textarea
          rows={8}
          value={letra}
          onChange={(e) => setLetra(e.target.value)}
          placeholder="Letra da composição"
        />
      </Field>

      <Field label="Partitura (texto ou URL, opcional)">
        <Input
          value={partitura}
          onChange={(e) => setPartitura(e.target.value)}
          placeholder="Link para a partitura ou observação"
        />
      </Field>

      {splits.length > 0 && (
        <div className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" aria-hidden />
              Percentuais (splits da faixa — referência)
            </span>
            <Link href={`/faixa/${faixaId}`} className="font-medium text-accent hover:underline">
              Editar splits
            </Link>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-line bg-surface2/40 p-2">
            {splits.map((s) => (
              <div key={s.artistaId} className="flex items-center justify-between text-xs text-fg">
                <span>{s.artistaNome}{s.papel ? ` — ${s.papel}` : ""}</span>
                <span className="font-mono">{s.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pendente} className="sm:self-start">
          {pendente ? "Salvando..." : "Salvar obra"}
        </Button>
        {estado.status === "ok" && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
          </p>
        )}
        {estado.status === "error" && (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />{estado.message}
          </p>
        )}
      </div>
    </form>
  );
}
