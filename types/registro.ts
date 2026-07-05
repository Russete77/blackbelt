// Tipos do módulo Registro & Direitos — obra (composição) / fonograma
// (gravação) / videograma (clipe) por faixa. `dados` de cada tabela é jsonb
// livre; estes shapes são o contrato da aplicação sobre esse JSON.
// Mantidos fora de types/domain.ts para não conflitar com trabalho paralelo
// (mesmo motivo de types/shows.ts).

// Autor da composição, para fins de registro na obra (ECAD/BN).
export interface Autor {
  nome: string;
  cpf: string;
  nascimento: string; // "YYYY-MM-DD" (input type=date)
  endereco: string;
  rg: string;
}

// Shape salvo em registros_obra.dados (jsonb).
export interface DadosObra {
  tituloExato: string;
  autores: Autor[];
  letra: string;
  partitura: string; // texto livre ou URL
}

// Pessoa física simples (intérprete/músico) — nome + CPF.
export interface Pessoa {
  nome: string;
  cpf: string;
}

export interface ProdutorFonografico {
  nome: string;
  cpfCnpj: string;
}

export type TipoGravacao = "estudio" | "ao_vivo";

// Shape salvo em registros_fonograma.dados (jsonb); `isrc` é coluna dedicada
// da tabela (não faz parte deste JSON).
export interface DadosFonograma {
  titulo: string;
  interpretes: Pessoa[];
  musicos: Pessoa[];
  produtorFonografico: ProdutorFonografico;
  data: string; // "YYYY-MM-DD"
  local: string;
  tipo: TipoGravacao;
}

export interface CueSheetItem {
  trecho: string;
  duracao: string;
  titular: string;
}

// Shape salvo em registros_videograma.dados (jsonb).
export interface DadosVideograma {
  autorObra: string;
  produtorFonografico: string;
  diretor: string;
  produtorVideo: string;
  cueSheet: CueSheetItem[];
}

export interface RegistroObra {
  id: string;
  faixaId: string;
  dados: DadosObra;
}

export interface RegistroFonograma {
  id: string;
  faixaId: string;
  isrc: string;
  dados: DadosFonograma;
}

export interface RegistroVideograma {
  id: string;
  faixaId: string;
  dados: DadosVideograma;
}

// Os três registros de uma faixa — cada um `null` quando ainda não existe
// nenhuma linha salva (faixa nunca teve o formulário submetido).
export interface RegistrosDaFaixa {
  obra: RegistroObra | null;
  fonograma: RegistroFonograma | null;
  videograma: RegistroVideograma | null;
}

// Linha da lista /registro: faixa + artista (resolvido) + status de
// preenchimento de cada um dos 3 registros — base dos chips da lista.
export interface StatusRegistroFaixa {
  faixaId: string;
  faixaTitulo: string;
  artistaId?: string;
  artistaNome?: string;
  obraOk: boolean;
  fonogramaOk: boolean;
  videogramaOk: boolean;
}
