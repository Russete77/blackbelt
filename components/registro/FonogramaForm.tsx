"use client";
// Formulário de Fonograma (gravação): ISRC (coluna dedicada), título,
// intérpretes/músicos (nome/CPF), produtor fonográfico, data, local e tipo
// (estúdio/ao vivo).
import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ListaLinhasEditavel } from "@/components/registro/ListaLinhasEditavel";
import { salvarFonograma, type EstadoRegistro } from "@/app/(app)/registro/actions";
import { fonogramaCompleta } from "@/lib/registro";
import type { DadosFonograma, Pessoa } from "@/types/registro";

const ESTADO_INICIAL: EstadoRegistro = { status: "idle" };

function pessoaVazia(): Pessoa {
  return { nome: "", cpf: "" };
}

export function FonogramaForm({
  faixaId, isrcInicial, dadosIniciais,
}: { faixaId: string; isrcInicial: string; dadosIniciais: DadosFonograma }) {
  const caminho = usePathname();
  const [estado, formAction, pendente] = useActionState(salvarFonograma, ESTADO_INICIAL);
  const [isrc, setIsrc] = useState(isrcInicial);
  const [titulo, setTitulo] = useState(dadosIniciais.titulo);
  const [interpretes, setInterpretes] = useState<Pessoa[]>(dadosIniciais.interpretes);
  const [musicos, setMusicos] = useState<Pessoa[]>(dadosIniciais.musicos);
  const [produtorNome, setProdutorNome] = useState(dadosIniciais.produtorFonografico.nome);
  const [produtorCpfCnpj, setProdutorCpfCnpj] = useState(dadosIniciais.produtorFonografico.cpfCnpj);
  const [data, setData] = useState(dadosIniciais.data);
  const [local, setLocal] = useState(dadosIniciais.local);
  const [tipo, setTipo] = useState(dadosIniciais.tipo);

  const dados: DadosFonograma = {
    titulo, interpretes, musicos,
    produtorFonografico: { nome: produtorNome, cpfCnpj: produtorCpfCnpj },
    data, local, tipo,
  };
  const completo = fonogramaCompleta(dados, isrc);

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
        <Field label="ISRC">
          <Input
            name="isrc"
            value={isrc}
            onChange={(e) => setIsrc(e.target.value)}
            placeholder="BR-XXX-00-00000"
            className="font-mono uppercase"
          />
        </Field>
        <Field label="Título">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da gravação" />
        </Field>
      </div>

      <ListaLinhasEditavel
        rotulo="Intérpretes"
        itens={interpretes}
        onChange={setInterpretes}
        novoItem={pessoaVazia}
        vazio="Nenhum intérprete cadastrado ainda."
        renderLinha={(p, atualizar) => (
          <>
            <Input
              aria-label="Nome do intérprete"
              value={p.nome}
              onChange={(e) => atualizar({ nome: e.target.value })}
              placeholder="Nome completo"
              className="w-full sm:w-56"
            />
            <Input
              aria-label="CPF do intérprete"
              value={p.cpf}
              onChange={(e) => atualizar({ cpf: e.target.value })}
              placeholder="CPF"
              className="w-full sm:w-40"
            />
          </>
        )}
      />

      <ListaLinhasEditavel
        rotulo="Músicos"
        itens={musicos}
        onChange={setMusicos}
        novoItem={pessoaVazia}
        vazio="Nenhum músico cadastrado ainda."
        renderLinha={(p, atualizar) => (
          <>
            <Input
              aria-label="Nome do músico"
              value={p.nome}
              onChange={(e) => atualizar({ nome: e.target.value })}
              placeholder="Nome completo"
              className="w-full sm:w-56"
            />
            <Input
              aria-label="CPF do músico"
              value={p.cpf}
              onChange={(e) => atualizar({ cpf: e.target.value })}
              placeholder="CPF"
              className="w-full sm:w-40"
            />
          </>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Produtor fonográfico — nome">
          <Input
            value={produtorNome}
            onChange={(e) => setProdutorNome(e.target.value)}
            placeholder="Nome ou razão social"
          />
        </Field>
        <Field label="Produtor fonográfico — CPF/CNPJ">
          <Input
            value={produtorCpfCnpj}
            onChange={(e) => setProdutorCpfCnpj(e.target.value)}
            placeholder="CPF ou CNPJ"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Data da gravação">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
        <Field label="Local">
          <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Estúdio / cidade" />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as DadosFonograma["tipo"])}>
            <option value="estudio">Estúdio</option>
            <option value="ao_vivo">Ao vivo</option>
          </Select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pendente} className="sm:self-start">
          {pendente ? "Salvando..." : "Salvar fonograma"}
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
