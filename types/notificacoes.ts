// Tipos do módulo Notificações (in-app) — ver `notificacoes` no schema.
// Mantido fora de types/domain.ts para não conflitar com trabalho paralelo.

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  // Rota interna para onde a notificação leva (ex.: a demanda que a gerou).
  link?: string;
  lida: boolean;
  criadoEm: string;
}
