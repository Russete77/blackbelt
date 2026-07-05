// Seed único (idempotente-ish) do BLACK BELT 360.
// Roda com: node scripts/seed.mjs
// Usa a service_role key (bypassa RLS) — lida de .env.local, nunca hardcoded.
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
    return; // sem .env.local — segue só com o que já estiver em process.env
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

// --------------------------------------------------------------------
// Usuário admin (Rick) — passwordless, entra via magic link.
// --------------------------------------------------------------------
async function ensureAdminUser() {
  const email = "atendimento.smu@gmail.com";

  const { data: existentes, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw listError;

  const encontrado = existentes.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (encontrado) {
    const { error } = await admin.auth.admin.updateUserById(encontrado.id, {
      app_metadata: { ...encontrado.app_metadata, role: "admin" },
    });
    if (error) throw error;
    console.log(`[ok] Usuário admin já existia (${email}) — role garantido como admin.`);
    return encontrado.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { nome: "Rick" },
  });
  if (error) throw error;
  console.log(`[ok] Usuário admin criado (${email}).`);
  return data.user.id;
}

// --------------------------------------------------------------------
// Artistas
// --------------------------------------------------------------------
const ARTISTAS = [
  { nome: "Bielzin", slug: "bielzin" },
  { nome: "Vitin", slug: "vitin" },
  { nome: "Semente", slug: "semente" },
  { nome: "Troy", slug: "troy" },
  { nome: "Postura", slug: "postura" },
];

async function ensureArtistas() {
  const { error } = await admin.from("artistas").upsert(ARTISTAS, { onConflict: "slug" });
  if (error) throw error;

  const { data, error: selError } = await admin
    .from("artistas")
    .select("id, nome, slug")
    .in("slug", ARTISTAS.map((a) => a.slug));
  if (selError) throw selError;

  console.log(`[ok] ${data.length} artistas garantidos: ${data.map((a) => a.nome).join(", ")}`);
  return data;
}

// --------------------------------------------------------------------
// Projetos, vínculos, faixas, versões, comentários (mínimo idempotente)
// --------------------------------------------------------------------
async function ensureProjeto({ nome, tipo, statusGeral }) {
  const { data: existente, error: selError } = await admin
    .from("projetos").select("*").eq("nome", nome).maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data, error } = await admin
    .from("projetos")
    .insert({ nome, tipo, status_geral: statusGeral })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function ensureVinculo(projetoId, artistaId) {
  const { data: existente, error: selError } = await admin
    .from("projeto_artistas").select("*").eq("projeto_id", projetoId).eq("artista_id", artistaId).maybeSingle();
  if (selError) throw selError;
  if (existente) return;

  const { error } = await admin.from("projeto_artistas").insert({ projeto_id: projetoId, artista_id: artistaId });
  if (error) throw error;
}

async function ensureFaixa({ projetoId, titulo, genero, estagio }) {
  const { data: existente, error: selError } = await admin
    .from("faixas").select("*").eq("projeto_id", projetoId).eq("titulo", titulo).maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data, error } = await admin
    .from("faixas")
    .insert({ projeto_id: projetoId, titulo, genero, estagio })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function uploadDemoAudio() {
  const filePath = path.join(ROOT, "public", "demo.wav");
  const buffer = readFileSync(filePath);
  const storagePath = "seed/demo.wav";

  const { error } = await admin.storage.from("audio").upload(storagePath, buffer, {
    contentType: "audio/wav",
    upsert: true,
  });
  if (error) throw error;

  console.log(`[ok] Áudio de demo enviado para audio/${storagePath} (${buffer.length} bytes).`);
  return storagePath;
}

async function ensureVersao({ faixaId, tipo, rotulo, arquivoPath, duracaoSegundos, enviadoPor }) {
  const { data: existente, error: selError } = await admin
    .from("versoes").select("*").eq("faixa_id", faixaId).eq("rotulo", rotulo).maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data, error } = await admin
    .from("versoes")
    .insert({
      faixa_id: faixaId, tipo, rotulo,
      arquivo_path: arquivoPath, duracao_segundos: duracaoSegundos, enviado_por: enviadoPor,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function ensureComentario({ versaoId, timestampSegundos, categoria, prioridade, autor, texto }) {
  const { data: existente, error: selError } = await admin
    .from("comentarios")
    .select("*")
    .eq("versao_id", versaoId)
    .eq("timestamp_segundos", timestampSegundos)
    .eq("texto", texto)
    .maybeSingle();
  if (selError) throw selError;
  if (existente) return existente;

  const { data, error } = await admin
    .from("comentarios")
    .insert({ versao_id: versaoId, timestamp_segundos: timestampSegundos, categoria, prioridade, autor, texto })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const adminUserId = await ensureAdminUser();
  const artistas = await ensureArtistas();

  const bielzin = artistas.find((a) => a.slug === "bielzin");
  if (!bielzin) throw new Error("Artista 'bielzin' não encontrado após upsert.");

  // 1 projeto do artista (Bielzin) + 1 projeto do Selo (sem vínculo em projeto_artistas).
  const projetoArtista = await ensureProjeto({ nome: "Single — Corre", tipo: "single", statusGeral: "aprovado" });
  await ensureVinculo(projetoArtista.id, bielzin.id);

  const projetoSelo = await ensureProjeto({ nome: "Coletânea BLACK BELT Vol. 1", tipo: "album", statusGeral: "mixagem" });

  const faixa1 = await ensureFaixa({ projetoId: projetoArtista.id, titulo: "Corre", genero: "funk", estagio: "aprovado" });
  const faixa2 = await ensureFaixa({ projetoId: projetoSelo.id, titulo: "Abertura", genero: "rap", estagio: "mixagem" });
  await ensureFaixa({ projetoId: projetoSelo.id, titulo: "Corre pela Cidade", genero: "rap", estagio: "gravacao" });

  const arquivoPath = await uploadDemoAudio();

  const versao1 = await ensureVersao({
    faixaId: faixa1.id, tipo: "master", rotulo: "V5 — Master",
    arquivoPath, duracaoSegundos: 172, enviadoPor: adminUserId,
  });
  const versao2 = await ensureVersao({
    faixaId: faixa2.id, tipo: "mix", rotulo: "V2 — Mix",
    arquivoPath, duracaoSegundos: 198, enviadoPor: adminUserId,
  });

  await ensureComentario({
    versaoId: versao1.id, timestampSegundos: 12, categoria: "mix",
    prioridade: "media", autor: adminUserId, texto: "Ajustar o grave no início.",
  });
  await ensureComentario({
    versaoId: versao2.id, timestampSegundos: 38, categoria: "beat",
    prioridade: "alta", autor: adminUserId, texto: "Trocar o hi-hat aqui.",
  });
  await ensureComentario({
    versaoId: versao2.id, timestampSegundos: 96, categoria: "geral",
    prioridade: "baixa", autor: adminUserId, texto: "Vocal alto no refrão.",
  });

  const [{ count: artistasC }, { count: projetosC }, { count: faixasC }, { count: versoesC }, { count: comentariosC }] =
    await Promise.all([
      admin.from("artistas").select("*", { count: "exact", head: true }),
      admin.from("projetos").select("*", { count: "exact", head: true }),
      admin.from("faixas").select("*", { count: "exact", head: true }),
      admin.from("versoes").select("*", { count: "exact", head: true }),
      admin.from("comentarios").select("*", { count: "exact", head: true }),
    ]);

  console.log("\n--- Seed concluído ---");
  console.log({ artistas: artistasC, projetos: projetosC, faixas: faixasC, versoes: versoesC, comentarios: comentariosC });
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
