import { describe, it, expect } from "vitest";
import {
  obraVazia, parseObra, obraDeJson, obraCompleta,
  fonogramaVazia, parseFonograma, fonogramaCompleta, normalizarTipoGravacao,
  videogramaVazia, parseVideograma, videogramaCompleta,
} from "./registro";

describe("obra", () => {
  it("parseObra degrada JSON solto/vazio para o shape vazio", () => {
    expect(parseObra(null)).toEqual(obraVazia());
    expect(parseObra("string qualquer")).toEqual(obraVazia());
    expect(parseObra([1, 2, 3])).toEqual(obraVazia());
  });

  it("parseObra lê os campos do jsonb, ignorando lixo", () => {
    const d = parseObra({
      tituloExato: "Minha Música",
      autores: [{ nome: "Fulano", cpf: "111.111.111-11", nascimento: "1990-01-01", endereco: "Rua X", rg: "123" }, "lixo"],
      letra: "la la la",
      partitura: "https://exemplo.com/partitura.pdf",
    });
    expect(d.tituloExato).toBe("Minha Música");
    expect(d.autores).toHaveLength(2); // "lixo" vira autor com campos vazios, não é descartado
    expect(d.autores[0].nome).toBe("Fulano");
    expect(d.letra).toBe("la la la");
  });

  it("obraDeJson degrada JSON quebrado para vazio", () => {
    expect(obraDeJson("{ isso não é json")).toEqual(obraVazia());
  });

  it("obraCompleta exige título e ao menos um autor com nome", () => {
    expect(obraCompleta(null)).toBe(false);
    expect(obraCompleta(obraVazia())).toBe(false);
    expect(obraCompleta({ ...obraVazia(), tituloExato: "X" })).toBe(false);
    expect(obraCompleta({ ...obraVazia(), tituloExato: "X", autores: [{ nome: "", cpf: "", nascimento: "", endereco: "", rg: "" }] })).toBe(false);
    expect(obraCompleta({ ...obraVazia(), tituloExato: "X", autores: [{ nome: "Fulano", cpf: "", nascimento: "", endereco: "", rg: "" }] })).toBe(true);
  });
});

describe("fonograma", () => {
  it("normalizarTipoGravacao cai para 'estudio' em valor inválido", () => {
    expect(normalizarTipoGravacao("ao_vivo")).toBe("ao_vivo");
    expect(normalizarTipoGravacao("estudio")).toBe("estudio");
    expect(normalizarTipoGravacao("qualquer coisa")).toBe("estudio");
    expect(normalizarTipoGravacao(undefined)).toBe("estudio");
  });

  it("parseFonograma degrada e lê campos", () => {
    expect(parseFonograma(null)).toEqual(fonogramaVazia());
    const d = parseFonograma({
      titulo: "Faixa X", interpretes: [{ nome: "A", cpf: "1" }], musicos: [],
      produtorFonografico: { nome: "Selo Y", cpfCnpj: "00.000.000/0001-00" },
      data: "2026-01-01", local: "Estúdio Z", tipo: "ao_vivo",
    });
    expect(d.titulo).toBe("Faixa X");
    expect(d.interpretes).toEqual([{ nome: "A", cpf: "1" }]);
    expect(d.produtorFonografico.nome).toBe("Selo Y");
    expect(d.tipo).toBe("ao_vivo");
  });

  it("fonogramaCompleta exige isrc + título + ao menos um intérprete com nome", () => {
    expect(fonogramaCompleta(fonogramaVazia(), "")).toBe(false);
    expect(fonogramaCompleta({ ...fonogramaVazia(), titulo: "X" }, "BR-XXX-00-00000")).toBe(false);
    expect(fonogramaCompleta(
      { ...fonogramaVazia(), titulo: "X", interpretes: [{ nome: "Fulano", cpf: "" }] },
      "BR-XXX-00-00000",
    )).toBe(true);
    expect(fonogramaCompleta(
      { ...fonogramaVazia(), titulo: "X", interpretes: [{ nome: "Fulano", cpf: "" }] },
      undefined,
    )).toBe(false);
  });
});

describe("videograma", () => {
  it("parseVideograma degrada e lê campos", () => {
    expect(parseVideograma(undefined)).toEqual(videogramaVazia());
    const d = parseVideograma({
      autorObra: "Fulano", produtorFonografico: "Selo", diretor: "Ciclano", produtorVideo: "Produtora",
      cueSheet: [{ trecho: "00:00-00:15", duracao: "15s", titular: "Fulano" }],
    });
    expect(d.diretor).toBe("Ciclano");
    expect(d.cueSheet).toHaveLength(1);
  });

  it("videogramaCompleta exige diretor + ao menos um trecho de cue sheet", () => {
    expect(videogramaCompleta(videogramaVazia())).toBe(false);
    expect(videogramaCompleta({ ...videogramaVazia(), diretor: "Ciclano" })).toBe(false);
    expect(videogramaCompleta({
      ...videogramaVazia(), diretor: "Ciclano",
      cueSheet: [{ trecho: "00:00-00:15", duracao: "", titular: "" }],
    })).toBe(true);
  });
});
