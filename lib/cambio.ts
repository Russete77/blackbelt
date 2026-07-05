// Câmbio USD/BRL do dia — royalties de plataformas internacionais (YouTube
// AdSense, agregadoras) costumam chegar em dólar; o resto do painel (splits,
// metas, o resto do produto) pensa em real. Em vez de forçar o usuário a
// converter na cabeça, mostramos SEMPRE as duas moedas lado a lado, com a
// cotação do dia.
//
// AwesomeAPI (economia.awesomeapi.com.br) é gratuita, sem chave e sem CORS
// bloqueado — dá pra chamar direto do servidor (Server Component/Action).
// `next: { revalidate: 86400 }` cacheia por 1 dia: a cotação não precisa (e
// não deveria) mudar a cada request, só uma vez por dia é o suficiente pro
// caso de uso ("Dólar hoje").
import { formatarReceita } from "@/lib/metricas";

export interface Cotacao {
  brl: number;
  atualizadoEm: string;
  // true quando a API falhou e `brl` é um valor de emergência (não real) —
  // a UI deve avisar em vez de fingir que é a cotação do dia.
  indisponivel?: boolean;
}

// Cotação de emergência quando a API está fora do ar — só pra não quebrar a
// exibição de valores; a UI sinaliza `indisponivel` para o usuário saber que
// não é a cotação real de hoje.
const COTACAO_FALLBACK_BRL = 5.5;

export async function cotacaoDolar(): Promise<Cotacao> {
  try {
    // Timeout: no primeiro cache miss esta chamada bloqueia a renderização
    // de /analytics e /numeros — API pendurada não pode travar a página.
    const resposta = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL", {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) throw new Error(`AwesomeAPI respondeu ${resposta.status}`);

    const dados = await resposta.json();
    const bid = Number(dados?.USDBRL?.bid);
    const criadoEm = dados?.USDBRL?.create_date;
    if (!Number.isFinite(bid) || bid <= 0) throw new Error("bid inválido na resposta da AwesomeAPI");

    return { brl: bid, atualizadoEm: typeof criadoEm === "string" ? criadoEm : new Date().toISOString() };
  } catch {
    return { brl: COTACAO_FALLBACK_BRL, atualizadoEm: new Date().toISOString(), indisponivel: true };
  }
}

// ------------------------------------------------------------------
// Formatação dual (pt-BR) — R$ 1.234,56 · US$ 1,234.56
// ------------------------------------------------------------------

export function formatarDolar(valor: number): string {
  const numero = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
  return `US$ ${numero}`;
}

export type Moeda = "BRL" | "USD";

// Valor + a moeda em que ele foi lançado -> string com AS DUAS moedas, na
// ordem "moeda de origem primeiro": um valor em USD mostra "US$ X · R$ Y"
// (Y = X × taxaBrl); um valor em BRL mostra "R$ Y · US$ (Y / taxaBrl)".
export function formatarValorDual(valor: number, moeda: Moeda, taxaBrl: number): string {
  if (moeda === "USD") {
    const emReal = valor * taxaBrl;
    return `${formatarDolar(valor)} · ${formatarReceita(emReal)}`;
  }
  const emDolar = taxaBrl > 0 ? valor / taxaBrl : 0;
  return `${formatarReceita(valor)} · ${formatarDolar(emDolar)}`;
}

// "atualizado às HH:MM" a partir do create_date da AwesomeAPI
// ("2026-07-04 13:15:00", sem timezone — string, não Date, pra não depender
// do fuso horário de quem roda o código).
export function horaAtualizacao(atualizadoEm: string): string {
  const match = atualizadoEm.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : atualizadoEm;
}
