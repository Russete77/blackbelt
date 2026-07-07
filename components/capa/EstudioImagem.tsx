"use client";
// Estúdio de Imagem por IA da faixa: o artista escolhe o FORMATO (capa de
// streaming, story, thumbnail YouTube…), escreve um briefing e sobe fotos em
// alta/referências → a IA gera a arte já no tamanho exato da plataforma. A capa
// de streaming pode virar a capa oficial; qualquer formato pode ser baixado.
// Ver app/(app)/faixa/[id]/capa-actions.ts e lib/imagem.ts.
import { useActionState, useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2, Download, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { FORMATOS_IMAGEM } from "@/lib/formatos-imagem";
import { gerarCapaIA, salvarComoCapa, type EstadoCapa } from "@/app/(app)/faixa/[id]/capa-actions";

const ESTADO_INICIAL: EstadoCapa = { status: "idle" };

export function EstudioImagem({ faixaId }: { faixaId: string }) {
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [nRefs, setNRefs] = useState(0);
  const [estado, formAction, gerando] = useActionState(gerarCapaIA, ESTADO_INICIAL);
  const [salvando, iniciarSalvar] = useTransition();
  const [salvo, setSalvo] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [baixado, setBaixado] = useState(false);

  const src = estado.status === "ok" && estado.imagemBase64 ? `data:image/jpeg;base64,${estado.imagemBase64}` : null;

  function baixar() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${estado.formatoId ?? "arte"}.jpg`;
    a.click();
    setBaixado(true);
    setTimeout(() => setBaixado(false), 2000);
  }

  function usarComoCapa() {
    if (!estado.imagemBase64) return;
    setSalvo(null);
    iniciarSalvar(async () => {
      const r = await salvarComoCapa(faixaId, estado.imagemBase64!);
      setSalvo({ tipo: r.status === "ok" ? "ok" : "error", texto: r.message ?? "" });
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        <ImageIcon className="h-4 w-4" aria-hidden />
        Gerar imagem (IA)
      </Button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="Estúdio de imagem (IA)">
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="faixaId" value={faixaId} />

          <Field label="Formato">
            <Select name="formato" defaultValue="capa">
              {FORMATOS_IMAGEM.map((f) => (
                <option key={f.id} value={f.id}>{f.rotulo}</option>
              ))}
            </Select>
          </Field>

          <Field label="Direção (briefing)">
            <Textarea
              name="briefing"
              rows={3}
              placeholder="Conceito, mood, cores, elementos, o que evitar… (ex.: dourado BLACK BELT, quebrada ao entardecer, sem ostentação)"
            />
          </Field>

          <Field label="Fotos do artista / referências (opcional)">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 self-start rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {nRefs > 0 ? `${nRefs} imagem(ns) selecionada(s)` : "Escolher imagens"}
            </button>
            <input
              ref={inputRef}
              type="file"
              name="referencias"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setNRefs(e.target.files?.length ?? 0)}
            />
            <p className="mt-1 text-[11px] text-muted">
              A IA repagina algo <b>original</b> a partir das fotos em alta e das referências — sem copiar capas existentes.
            </p>
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={gerando}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImageIcon className="h-4 w-4" aria-hidden />}
              {gerando ? "Gerando…" : estado.status === "ok" ? "Gerar outra" : "Gerar"}
            </Button>
          </div>

          {gerando && (
            <p className="text-xs text-muted" role="status" aria-live="polite">
              Gerando no tamanho exato do formato — leva alguns segundos.
            </p>
          )}
          {!gerando && estado.status === "error" && (
            <p className="text-xs text-danger" role="alert">{estado.message}</p>
          )}
        </form>

        {src && (
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Arte gerada" className="mx-auto max-h-[45vh] w-auto rounded-lg border border-line" />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={baixar}>
                {baixado ? <Check className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                {baixado ? "Baixado" : "Baixar"}
              </Button>
              {estado.ehCapa && (
                <Button type="button" size="sm" onClick={usarComoCapa} disabled={salvando}>
                  {salvando ? "Salvando…" : "Usar como capa da faixa"}
                </Button>
              )}
              {salvo && (
                <span className={`text-xs ${salvo.tipo === "ok" ? "text-success" : "text-danger"}`} role="status" aria-live="polite">
                  {salvo.texto}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
