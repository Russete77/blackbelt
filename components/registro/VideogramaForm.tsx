"use client";
// Formulário de Videograma (clipe): autor da obra, produtor fonográfico,
// diretor, produtor de vídeo e cue sheet (trecho/duração/titular).
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ListaLinhasEditavel } from "@/components/registro/ListaLinhasEditavel";
import { salvarVideograma, type EstadoRegistro } from "@/app/(app)/registro/actions";
import { videogramaCompleta } from "@/lib/registro";
import type { CueSheetItem, DadosVideograma } from "@/types/registro";

const ESTADO_INICIAL: EstadoRegistro = { status: "idle" };

function cueSheetVazio(): CueSheetItem {
  return { trecho: "", duracao: "", titular: "" };
}

export function VideogramaForm({
  faixaId, dadosIniciais,
}: { faixaId: string; dadosIniciais: DadosVideograma }) {
  const caminho = usePathname();
  const [estado, formAction, pendente] = useActionState(salvarVideograma, ESTADO_INICIAL);
  const [autorObra, setAutorObra] = useState(dadosIniciais.autorObra);
  const [produtorFonografico, setProdutorFonografico] = useState(dadosIniciais.produtorFonografico);
  const [diretor, setDiretor] = useState(dadosIniciais.diretor);
  const [produtorVideo, setProdutorVideo] = useState(dadosIniciais.produtorVideo);
  const [cueSheet, setCueSheet] = useState<CueSheetItem[]>(dadosIniciais.cueSheet);

  const dados: DadosVideograma = { autorObra, produtorFonografico, diretor, produtorVideo, cueSheet };
  const completo = videogramaCompleta(dados);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="faixaId" value={faixaId} />
      <input type="hidden" name="caminho" value={caminho} />
      <input type="hidden" name="dados" value={JSON.stringify(dados)} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Status do registro</span>
        <Badge tone={completo ? "aprovado" : "media"}>{completo ? "Completo" : "Incompleto"}</Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Autor da obra">
          <Input value={autorObra} onChange={(e) => setAutorObra(e.target.value)} placeholder="Nome do autor" />
        </Field>
        <Field label="Produtor fonográfico">
          <Input
            value={produtorFonografico}
            onChange={(e) => setProdutorFonografico(e.target.value)}
            placeholder="Nome ou razão social"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Diretor">
          <Input value={diretor} onChange={(e) => setDiretor(e.target.value)} placeholder="Nome do diretor" />
        </Field>
        <Field label="Produtor de vídeo">
          <Input
            value={produtorVideo}
            onChange={(e) => setProdutorVideo(e.target.value)}
            placeholder="Produtora / responsável"
          />
        </Field>
      </div>

      <ListaLinhasEditavel
        rotulo="Cue sheet"
        itens={cueSheet}
        onChange={setCueSheet}
        novoItem={cueSheetVazio}
        vazio="Nenhum trecho cadastrado ainda."
        renderLinha={(c, atualizar) => (
          <>
            <Input
              aria-label="Trecho"
              value={c.trecho}
              onChange={(e) => atualizar({ trecho: e.target.value })}
              placeholder="Trecho (ex.: 00:00–00:15)"
              className="w-full sm:w-48"
            />
            <Input
              aria-label="Duração"
              value={c.duracao}
              onChange={(e) => atualizar({ duracao: e.target.value })}
              placeholder="Duração"
              className="w-full sm:w-32"
            />
            <Input
              aria-label="Titular"
              value={c.titular}
              onChange={(e) => atualizar({ titular: e.target.value })}
              placeholder="Titular dos direitos"
              className="w-full sm:flex-1"
            />
          </>
        )}
      />

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pendente} className="sm:self-start">
          {pendente ? "Salvando..." : "Salvar videograma"}
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
