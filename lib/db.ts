// Camada de dados real (Supabase) — substitui mock/data.ts.
// Todas as funções retornam os shapes camelCase de types/domain.ts, mapeando
// a partir das tabelas snake_case do schema (ver supabase/migrations/).
// Server-only: usa lib/supabase/server.ts (cookies()), então só pode ser
// chamado a partir de Server Components, Server Actions ou Route Handlers.
//
// BARREL: a implementação real vive em lib/db/*, um módulo por domínio. Este
// arquivo só re-exporta os símbolos públicos, preservando a API `@/lib/db`
// (todos os consumidores continuam importando daqui, sem mudança). Os
// helpers/tipos privados (row types + mappers) ficam em lib/db/_shared.ts e
// NÃO são re-exportados aqui de propósito.
export * from "./db/artistas";
export * from "./db/projetos";
export * from "./db/faixas";
export * from "./db/versoes";
export * from "./db/capas";
export * from "./db/comentarios";
export * from "./db/metricas";
export * from "./db/splits";
export * from "./db/registros";
export * from "./db/shows";
export * from "./db/notificacoes";
export * from "./db/demandas";
export * from "./db/lancamentos-clipes-documentos";
