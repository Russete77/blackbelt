// Seed de exemplo para o módulo Analytics & Royalties (idempotente).
// Roda com: node scripts/seed-metricas.mjs
// Usa a service_role key (bypassa RLS) — lida de .env.local, nunca hardcoded.
// Pré-requisito: scripts/seed.mjs já rodado (precisa dos artistas/faixas base).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureMetrica({ artistaId, faixaId, plataforma, data, streams, receita }) {
  let query = admin
    .from("metricas")
    .select("id")
    .eq("artista_id", artistaId)
    .eq("plataforma", plataforma)
    .eq("data", data);
  query = faixaId ? query.eq("faixa_id", faixaId) : query.is("faixa_id", null);

  const { data: existente, error: selError } = await query.maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data: criada, error } = await admin
    .from("metricas")
    .insert({ artista_id: artistaId, faixa_id: faixaId ?? null, plataforma, data, streams, receita })
    .select("id")
    .single();
  if (error) throw error;
  return criada;
}

// R$/1k plausível por plataforma — Spotify paga mais por stream que YouTube
// (anúncios) em termos de exemplo didático; valores fictícios, não reais.
const RS_POR_MIL = { spotify: 3.6, youtube: 0.9 };

function receitaEstimada(plataforma, streams) {
  const base = (streams / 1000) * RS_POR_MIL[plataforma];
  return Math.round(base * 100) / 100;
}

async function main() {
  const { data: artistas, error: artistasError } = await admin
    .from("artistas")
    .select("id, nome, slug")
    .in("slug", ["bielzin", "vitin", "semente"]);
  if (artistasError) throw artistasError;

  const bielzin = artistas.find((a) => a.slug === "bielzin");
  const vitin = artistas.find((a) => a.slug === "vitin");
  const semente = artistas.find((a) => a.slug === "semente");
  if (!bielzin || !vitin || !semente) {
    throw new Error("Artistas base não encontrados — rode `npm run seed` antes deste script.");
  }

  const { data: projetoCorre, error: projetoError } = await admin
    .from("projetos").select("id").eq("nome", "Single — Corre").maybeSingle();
  if (projetoError) throw projetoError;
  let faixaCorreId = null;
  if (projetoCorre) {
    const { data: faixaCorre, error: faixaError } = await admin
      .from("faixas").select("id").eq("projeto_id", projetoCorre.id).eq("titulo", "Corre").maybeSingle();
    if (faixaError) throw faixaError;
    faixaCorreId = faixaCorre?.id ?? null;
  }

  const MESES = ["2026-05-15", "2026-06-15", "2026-07-01"];

  let inseridas = 0;
  const contarEExecutar = async (linha) => {
    const antes = await admin.from("metricas").select("id", { count: "exact", head: true });
    await ensureMetrica(linha);
    const depois = await admin.from("metricas").select("id", { count: "exact", head: true });
    if ((depois.count ?? 0) > (antes.count ?? 0)) inseridas++;
  };

  // Bielzin — faixa "Corre" vinculada, crescendo mês a mês, nas duas
  // plataformas (spotify e youtube).
  const streamsBielzinSpotify = [8000, 11500, 15200];
  const streamsBielzinYoutube = [3200, 4100, 5300];
  for (let i = 0; i < MESES.length; i++) {
    await contarEExecutar({
      artistaId: bielzin.id, faixaId: faixaCorreId, plataforma: "spotify", data: MESES[i],
      streams: streamsBielzinSpotify[i], receita: receitaEstimada("spotify", streamsBielzinSpotify[i]),
    });
    await contarEExecutar({
      artistaId: bielzin.id, faixaId: faixaCorreId, plataforma: "youtube", data: MESES[i],
      streams: streamsBielzinYoutube[i], receita: receitaEstimada("youtube", streamsBielzinYoutube[i]),
    });
  }

  // Vitin — métricas no nível do artista, sem faixa cadastrada ainda no
  // Estúdio (cenário comum: números chegam antes do catálogo estar completo).
  const streamsVitinSpotify = [4200, 4800, 5100];
  for (let i = 0; i < MESES.length; i++) {
    await contarEExecutar({
      artistaId: vitin.id, faixaId: null, plataforma: "spotify", data: MESES[i],
      streams: streamsVitinSpotify[i], receita: receitaEstimada("spotify", streamsVitinSpotify[i]),
    });
  }

  // Semente — só 2 dos 3 meses (para exercitar meses "faltantes" no gráfico).
  const streamsSementeSpotify = [2100, 3300];
  const streamsSementeYoutube = [900, 1500];
  for (let i = 0; i < 2; i++) {
    await contarEExecutar({
      artistaId: semente.id, faixaId: null, plataforma: "spotify", data: MESES[i],
      streams: streamsSementeSpotify[i], receita: receitaEstimada("spotify", streamsSementeSpotify[i]),
    });
    await contarEExecutar({
      artistaId: semente.id, faixaId: null, plataforma: "youtube", data: MESES[i],
      streams: streamsSementeYoutube[i], receita: receitaEstimada("youtube", streamsSementeYoutube[i]),
    });
  }

  const { count: totalMetricas } = await admin.from("metricas").select("*", { count: "exact", head: true });

  console.log("\n--- Seed de métricas concluído ---");
  console.log({ linhasNovasNestaExecucao: inseridas, totalMetricasNaTabela: totalMetricas });
}

main().catch((err) => {
  console.error("Seed de métricas falhou:", err);
  process.exit(1);
});
