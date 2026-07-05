import { describe, it, expect } from "vitest";
import {
  detectarDelimitador, parseCSV, parseNumeroPtBR, parseDataCSV, detectarMapeamentoInicial,
} from "./csv";

describe("detectarDelimitador", () => {
  it("detecta vírgula quando não há ponto e vírgula", () => {
    expect(detectarDelimitador("plataforma,data,streams,receita")).toBe(",");
  });
  it("detecta ponto e vírgula quando predominante (planilha pt-BR)", () => {
    expect(detectarDelimitador("plataforma;data;streams;receita")).toBe(";");
  });
});

describe("parseCSV", () => {
  it("separa cabeçalho e linhas por vírgula", () => {
    const texto = "plataforma,data,streams,receita\nspotify,2026-01-01,1000,50.5\nyoutube,2026-01-02,500,10";
    const { headers, linhas } = parseCSV(texto);
    expect(headers).toEqual(["plataforma", "data", "streams", "receita"]);
    expect(linhas).toEqual([
      ["spotify", "2026-01-01", "1000", "50.5"],
      ["youtube", "2026-01-02", "500", "10"],
    ]);
  });

  it("separa por ponto e vírgula quando a planilha usa vírgula decimal", () => {
    const texto = "plataforma;data;receita\nspotify;01/01/2026;1.234,56";
    const { headers, linhas } = parseCSV(texto);
    expect(headers).toEqual(["plataforma", "data", "receita"]);
    expect(linhas).toEqual([["spotify", "01/01/2026", "1.234,56"]]);
  });

  it("ignora linhas em branco e aceita CRLF", () => {
    const texto = "a,b\r\n1,2\r\n\r\n3,4\r\n";
    const { linhas } = parseCSV(texto);
    expect(linhas).toEqual([["1", "2"], ["3", "4"]]);
  });

  it("respeita campos entre aspas contendo o delimitador", () => {
    const texto = 'faixa,plataforma\n"Corre, pela Cidade",spotify';
    const { linhas } = parseCSV(texto);
    expect(linhas).toEqual([["Corre, pela Cidade", "spotify"]]);
  });

  it("texto vazio devolve headers e linhas vazios", () => {
    expect(parseCSV("")).toEqual({ headers: [], linhas: [] });
  });
});

describe("parseNumeroPtBR", () => {
  it("aceita formato pt-BR com milhar e decimal", () => {
    expect(parseNumeroPtBR("1.234,56")).toBeCloseTo(1234.56);
  });
  it("aceita decimal simples com vírgula", () => {
    expect(parseNumeroPtBR("50,5")).toBeCloseTo(50.5);
  });
  it("aceita formato en-US", () => {
    expect(parseNumeroPtBR("1234.56")).toBeCloseTo(1234.56);
  });
  it("aceita inteiro puro", () => {
    expect(parseNumeroPtBR("1000")).toBe(1000);
  });
  it("aceita prefixo R$", () => {
    expect(parseNumeroPtBR("R$ 50,50")).toBeCloseTo(50.5);
  });
  it("string vazia ou inválida vira null", () => {
    expect(parseNumeroPtBR("")).toBeNull();
    expect(parseNumeroPtBR("abc")).toBeNull();
  });
  it("milhar en-US puro (grupos de 3) não vira decimal", () => {
    expect(parseNumeroPtBR("1,234")).toBe(1234);
    expect(parseNumeroPtBR("1,234,567")).toBe(1234567);
  });
  it("vírgula com grupo ≠ 3 dígitos continua decimal pt-BR", () => {
    expect(parseNumeroPtBR("1234,56")).toBeCloseTo(1234.56);
    expect(parseNumeroPtBR("12,5")).toBeCloseTo(12.5);
  });
});

describe("parseDataCSV", () => {
  it("aceita ISO", () => {
    expect(parseDataCSV("2026-07-04")).toBe("2026-07-04");
  });
  it("aceita pt-BR DD/MM/YYYY", () => {
    expect(parseDataCSV("04/07/2026")).toBe("2026-07-04");
  });
  it("aceita DD-MM-YYYY", () => {
    expect(parseDataCSV("04-07-2026")).toBe("2026-07-04");
  });
  it("rejeita datas inválidas", () => {
    expect(parseDataCSV("32/13/2026")).toBeNull();
    expect(parseDataCSV("não é data")).toBeNull();
    expect(parseDataCSV("")).toBeNull();
  });
});

describe("detectarMapeamentoInicial", () => {
  it("não mapeia dois campos para a mesma coluna", () => {
    // "Data de pagamento" casa "data" e casaria "receita" ("pagamento") —
    // a coluna ocupada não pode ser reusada.
    const headers = ["Plataforma", "Data de pagamento", "Streams"];
    const mapeamento = detectarMapeamentoInicial(headers);
    expect(mapeamento.data).toBe(1);
    expect(mapeamento.receita).toBeUndefined();
  });

  it("casa cabeçalhos comuns em português", () => {
    const headers = ["Plataforma", "Data", "Streams", "Receita (R$)", "Artista", "Faixa"];
    expect(detectarMapeamentoInicial(headers)).toEqual({
      plataforma: 0, data: 1, streams: 2, receita: 3, artista: 4, faixa: 5,
    });
  });

  it("casa cabeçalhos em inglês e ignora acentos/caixa", () => {
    const headers = ["PLATFORM", "date", "Views", "Royalties", "Track Title"];
    const mapeamento = detectarMapeamentoInicial(headers);
    expect(mapeamento.plataforma).toBe(0);
    expect(mapeamento.data).toBe(1);
    expect(mapeamento.streams).toBe(2);
    expect(mapeamento.receita).toBe(3);
    expect(mapeamento.faixa).toBe(4);
  });

  it("colunas sem correspondência ficam de fora do mapeamento", () => {
    const mapeamento = detectarMapeamentoInicial(["coluna estranha", "outra"]);
    expect(mapeamento).toEqual({});
  });
});
