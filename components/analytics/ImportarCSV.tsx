"use client";
// Importação de planilha/CSV — o caminho real para números de
// plataforma/royalties (não existe scraper mágico do Spotify). Fluxo em 3
// passos: colar/enviar -> mapear colunas (com prévia) -> confirmar.
import { useActionState, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Upload, X, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  parseCSV, detectarMapeamentoInicial, parseDataCSV, parseNumeroPtBR,
  CAMPOS_CSV, CAMPOS_OBRIGATORIOS, type CampoCSV,
} from "@/lib/csv";
import { importarMetricasCSV, type EstadoImportacao } from "@/app/(app)/analytics/actions";

const ESTADO_INICIAL: EstadoImportacao = { status: "idle" };

const RUBRICA_CAMPO: Record<CampoCSV, string> = {
  plataforma: "Plataforma",
  data: "Data",
  streams: "Streams",
  receita: "Receita",
  artista: "Artista",
  faixa: "Faixa",
};

export function ImportarCSV({
  artistas, artistaFixoId,
}: {
  artistas: { id: string; nome: string }[];
  artistaFixoId?: string;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [csvTexto, setCsvTexto] = useState("");
  const [analisado, setAnalisado] = useState<{ headers: string[]; linhas: string[][] } | null>(null);
  const [mapeamento, setMapeamento] = useState<Partial<Record<CampoCSV, number>>>({});
  const [artistaPadraoId, setArtistaPadraoId] = useState(artistaFixoId ?? "");
  // Moeda da coluna de receita da planilha inteira (não é por linha) —
  // distribuidoras internacionais (YouTube AdSense, agregadoras) costumam
  // reportar em dólar; o resto normalmente já vem em real.
  const [moeda, setMoeda] = useState<"BRL" | "USD">("BRL");
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const [estado, formAction, pendente] = useActionState(
    async (prev: EstadoImportacao, formData: FormData) => importarMetricasCSV(prev, formData),
    ESTADO_INICIAL,
  );
  // useActionState não tem reset — sem isto, depois de uma importação com
  // sucesso o widget reabria preso na tela de sucesso anterior (segunda
  // importação impossível sem F5). Fechar "consome" o resultado atual por
  // referência; um novo submit produz um objeto novo e volta a aparecer.
  const [estadoConsumido, setEstadoConsumido] = useState<EstadoImportacao | null>(null);
  const estadoVisivel = estado === estadoConsumido ? ESTADO_INICIAL : estado;

  function fechar() {
    setAberto(false);
    setCsvTexto("");
    setAnalisado(null);
    setMapeamento({});
    setArtistaPadraoId(artistaFixoId ?? "");
    setMoeda("BRL");
    setEstadoConsumido(estado);
  }

  const [avisoTamanho, setAvisoTamanho] = useState<string | null>(null);

  function analisarCsv(texto: string) {
    // O CSV viaja no body da Server Action (limite configurado em
    // next.config.ts). Avisamos antes do submit em vez de deixar o Next
    // estourar com erro genérico.
    const tamanhoMB = new Blob([texto]).size / 1024 / 1024;
    if (tamanhoMB > 3.5) {
      setAvisoTamanho(
        `Planilha de ${tamanhoMB.toFixed(1)} MB — o limite é ~3,5 MB. Divida o arquivo em partes menores e importe uma de cada vez.`,
      );
      return;
    }
    setAvisoTamanho(null);
    const resultado = parseCSV(texto);
    if (resultado.headers.length === 0) return;
    setCsvTexto(texto);
    setAnalisado(resultado);
    const deteccao = detectarMapeamentoInicial(resultado.headers);
    // Importação a partir da página de um artista específico: todas as
    // linhas pertencem a ele, mesmo que a planilha traga uma coluna
    // "artista" (evita split silencioso para outro artista pelo nome da coluna).
    if (artistaFixoId) delete deteccao.artista;
    setMapeamento(deteccao);
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const texto = await arquivo.text();
    analisarCsv(texto);
  }

  // Vindo da página de um artista: a coluna "artista" do CSV não aparece
  // no mapeamento (todas as linhas já pertencem a `artistaFixoId`).
  const camposVisiveis = artistaFixoId ? CAMPOS_CSV.filter((c) => c !== "artista") : CAMPOS_CSV;

  const precisaArtistaPadrao = mapeamento.artista == null && !artistaFixoId;
  const camposFaltando = CAMPOS_OBRIGATORIOS.filter((c) => mapeamento[c] == null);
  const podeConfirmar = camposFaltando.length === 0 && (!precisaArtistaPadrao || artistaPadraoId !== "");

  const preview = useMemo(() => {
    if (!analisado) return [];
    const valorDe = (campo: CampoCSV, linha: string[]): string => {
      const indice = mapeamento[campo];
      if (indice == null) return "—";
      const bruto = linha[indice] ?? "";
      if (campo === "data") return parseDataCSV(bruto) ?? `${bruto} (inválida)`;
      if (campo === "streams" || campo === "receita") return String(parseNumeroPtBR(bruto) ?? "—");
      return bruto;
    };
    return analisado.linhas.slice(0, 5).map((linha) =>
      Object.fromEntries(camposVisiveis.map((c) => [c, valorDe(c, linha)])) as Record<CampoCSV, string>,
    );
  }, [analisado, mapeamento, camposVisiveis]);

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <Upload className="h-4 w-4" aria-hidden />
        Importar planilha
      </Button>
    );
  }

  return (
    <div className="w-full animate-fade-in-up rounded-lg border border-line bg-surface p-4 shadow-lg shadow-black/20 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-accent" aria-hidden />
          <h3 className="font-display text-sm uppercase tracking-wide">Importar planilha</h3>
        </div>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface2 hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {estadoVisivel.status === "ok" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-fg">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <p>{estadoVisivel.message}</p>
          </div>
          {estadoVisivel.motivos && estadoVisivel.motivos.length > 0 && (
            <div className="rounded-md border border-line bg-surface2/60 p-3 text-xs text-muted">
              <p className="mb-1 font-medium text-fg">Linhas ignoradas:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {estadoVisivel.motivos.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          )}
          <Button size="sm" onClick={fechar}>Concluir</Button>
        </div>
      ) : !analisado ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            Envie o arquivo .csv exportado da plataforma (Spotify for Artists, DistroKid, agregadora...) ou cole o
            conteúdo abaixo. Aceita separador vírgula ou ponto e vírgula, e receita com vírgula decimal (pt-BR).
          </p>
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".csv,text/csv"
            onChange={aoEscolherArquivo}
            className="text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-fg"
          />
          <Textarea
            rows={6}
            placeholder="plataforma,data,streams,receita&#10;spotify,2026-06-01,10234,182.40"
            value={csvTexto}
            onChange={(e) => setCsvTexto(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!csvTexto.trim()}
            onClick={() => analisarCsv(csvTexto)}
          >
            Analisar planilha
          </Button>
          {avisoTamanho && (
            <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{avisoTamanho}</p>
            </div>
          )}
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="csv" value={csvTexto} />
          <input type="hidden" name="mapeamento" value={JSON.stringify(mapeamento)} />
          <input type="hidden" name="artistaPadraoId" value={artistaPadraoId} />
          <input type="hidden" name="caminho" value={caminho} />
          <input type="hidden" name="moeda" value={moeda} />

          <div>
            <p className="mb-2 text-xs font-medium text-muted">
              {analisado.linhas.length} linha(s) detectada(s). Confirme o que cada coluna significa:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {camposVisiveis.map((campo) => (
                <Field key={campo} label={`${RUBRICA_CAMPO[campo]}${CAMPOS_OBRIGATORIOS.includes(campo) ? " *" : ""}`}>
                  <Select
                    value={mapeamento[campo] ?? ""}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setMapeamento((prev) => {
                        const proximo = { ...prev };
                        if (valor === "") delete proximo[campo];
                        else proximo[campo] = Number(valor);
                        return proximo;
                      });
                    }}
                  >
                    <option value="">(nenhuma)</option>
                    {analisado.headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </div>

          {mapeamento.receita != null && (
            <Field label="Moeda da receita">
              <Select value={moeda} onChange={(e) => setMoeda(e.target.value as "BRL" | "USD")}>
                <option value="BRL">Real (R$)</option>
                <option value="USD">Dólar (US$)</option>
              </Select>
            </Field>
          )}

          {precisaArtistaPadrao && (
            <Field label="Artista padrão (o CSV não tem coluna de artista) *">
              <Select value={artistaPadraoId} onChange={(e) => setArtistaPadraoId(e.target.value)}>
                <option value="">Selecione um artista</option>
                {artistas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Select>
            </Field>
          )}

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-surface2 text-muted">
                  <tr>
                    {camposVisiveis.map((c) => <th key={c} className="px-2.5 py-2 font-medium">{RUBRICA_CAMPO[c]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.map((linha, i) => (
                    <tr key={i}>
                      {camposVisiveis.map((c) => (
                        <td key={c} className={c === "plataforma" || c === "artista" || c === "faixa" ? "px-2.5 py-1.5" : "px-2.5 py-1.5 font-mono"}>
                          {linha[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {estadoVisivel.status === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{estadoVisivel.message}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={!podeConfirmar || pendente}>
              {pendente ? "Importando..." : "Confirmar importação"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAnalisado(null)}>
              Voltar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
