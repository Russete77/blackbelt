import type {
  Usuario, Projeto, Faixa, VersaoFaixa, Comentario, EstruturaFaixa,
} from "@/types/domain";

// Áudio de exemplo local (public/demo.wav, ~210s) — sem dependência de rede/CDN,
// para o player e a waveform funcionarem offline. Trocar pela URL real (R2) depois.
const AUDIO_DEMO = "/demo.wav";

export const usuarios: Usuario[] = [
  { id: "u_rick", nome: "Rick", papel: "admin" },
  { id: "u_bielzin", nome: "Bielzin", papel: "artista", artistaVinculado: "Bielzin" },
  { id: "u_postura", nome: "Postura", papel: "artista", artistaVinculado: "Postura" },
  { id: "u_eng", nome: "Engenheiro de Mix", papel: "colaborador" },
];

export const projetos: Projeto[] = [
  { id: "p_album4", nome: "Álbum 4", tipo: "album", artistas: ["Postura"], statusGeral: "mixagem" },
  { id: "p_ep_troy", nome: "EP Introdução", tipo: "ep", artistas: ["Troy"], statusGeral: "gravacao" },
  { id: "p_single_biel", nome: "Single — Corre", tipo: "single", artistas: ["Bielzin"], statusGeral: "aprovado" },
];

export const faixas: Faixa[] = [
  { id: "f_1", projetoId: "p_album4", titulo: "Abertura", genero: "rap", estagio: "mixagem" },
  { id: "f_2", projetoId: "p_album4", titulo: "Corre pela Cidade", genero: "rap", estagio: "gravacao" },
  { id: "f_3", projetoId: "p_ep_troy", titulo: "Primeiro Round", genero: "trap", estagio: "gravacao" },
  { id: "f_4", projetoId: "p_single_biel", titulo: "Corre", genero: "funk", estagio: "aprovado" },
];

export const versoes: VersaoFaixa[] = [
  { id: "v_1a", faixaId: "f_1", tipo: "beat", rotulo: "V1 — Beat", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 198, enviadoPor: "u_eng", data: "2026-06-20" },
  { id: "v_1b", faixaId: "f_1", tipo: "mix", rotulo: "V2 — Mix", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 198, enviadoPor: "u_eng", data: "2026-06-28" },
  { id: "v_2a", faixaId: "f_2", tipo: "vocal", rotulo: "V1 — Vocal", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 205, enviadoPor: "u_postura", data: "2026-06-25" },
  { id: "v_3a", faixaId: "f_3", tipo: "beat", rotulo: "V1 — Beat", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 180, enviadoPor: "u_eng", data: "2026-07-01" },
  { id: "v_4a", faixaId: "f_4", tipo: "master", rotulo: "V5 — Master", arquivoUrl: AUDIO_DEMO, duracaoSegundos: 172, enviadoPor: "u_eng", data: "2026-07-02" },
];

export const comentarios: Comentario[] = [
  { id: "c_1", versaoId: "v_1b", timestampSegundos: 38, categoria: "beat", prioridade: "media", autor: "u_postura", responsavel: "u_eng", texto: "Trocar o hi-hat aqui.", resolvido: false },
  { id: "c_2", versaoId: "v_1b", timestampSegundos: 72, categoria: "mix", prioridade: "alta", autor: "u_rick", responsavel: "u_eng", texto: "Grave baixo demais.", resolvido: false },
  { id: "c_3", versaoId: "v_1b", timestampSegundos: 96, categoria: "mix", prioridade: "baixa", autor: "u_bielzin", texto: "Vocal alto no refrão.", resolvido: true },
];

export const estruturas: EstruturaFaixa[] = [
  { id: "e_1", faixaId: "f_1", rotulo: "intro", inicioSegundos: 0, fimSegundos: 20 },
  { id: "e_2", faixaId: "f_1", rotulo: "verso", inicioSegundos: 20, fimSegundos: 70 },
  { id: "e_3", faixaId: "f_1", rotulo: "refrao", inicioSegundos: 70, fimSegundos: 110 },
];

export const getFaixasDoProjeto = (projetoId: string) =>
  faixas.filter((f) => f.projetoId === projetoId);
export const getVersoesDaFaixa = (faixaId: string) =>
  versoes.filter((v) => v.faixaId === faixaId);
export const getComentariosDaVersao = (versaoId: string) =>
  comentarios.filter((c) => c.versaoId === versaoId);
export const getUsuario = (id: string) => usuarios.find((u) => u.id === id);
