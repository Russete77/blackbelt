"""
Worker de separação de stems (beat/voz) da BLACK BELT 360 — ASSÍNCRONO.

Separar em CPU leva minutos, então o /separate NÃO bloqueia: valida, responde
202 na hora e processa em segundo plano (FastAPI BackgroundTasks). Ao terminar,
o próprio worker sobe os stems pro bucket e registra cada um como uma `versao`
(tipo beat/vocal) via service role — então eles aparecem no player do app sem
o app precisar esperar. O status de cada job fica em memória e é consultável
por GET /status/<versao_id> (o app faz polling).

Segurança: exige Authorization: Bearer <WORKER_SECRET> em /separate e /status.
Nunca exponha WORKER_SECRET nem a service key.

Env necessárias (setar no Railway):
  WORKER_SECRET               segredo compartilhado com o app
  SUPABASE_URL                https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   chave service_role (server-only)
  SUPABASE_BUCKET             bucket dos stems (padrão: audio)
"""
import hmac
import ipaddress
import os
import pathlib
import shutil
import subprocess
import tempfile
import traceback
from urllib.parse import urlparse

import requests
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

WORKER_SECRET = os.environ["WORKER_SECRET"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = os.environ.get("SUPABASE_BUCKET", "audio")
MODELO = os.environ.get("DEMUCS_MODEL", "htdemucs")
# Teto do subprocess pra nunca pendurar o worker pra sempre (50 min).
TIMEOUT_DEMUCS = int(os.environ.get("DEMUCS_TIMEOUT", "3000"))

# Host permitido pra audio_url (allowlist SSRF): só o próprio Supabase.
SUPABASE_HOST = (urlparse(SUPABASE_URL).hostname or "").lower()
# Teto de download do áudio de entrada (~100MB).
LIMITE_DOWNLOAD_BYTES = 100 * 1024 * 1024

app = FastAPI(title="BLACK BELT — Demucs worker")

# Estado dos jobs em memória (instância única). Vive enquanto o container vive;
# se reiniciar, o app cai no fallback de checar os stems direto no banco.
JOBS: dict[str, dict] = {}


class PedidoSeparacao(BaseModel):
    audio_url: str          # URL assinada pra baixar o áudio
    versao_id: str          # id da versão de origem (chave do job e do caminho)
    faixa_id: str = ""      # p/ registrar os stems como versões da faixa
    user_id: str | None = None   # enviado_por das versões geradas (nullable)
    modo: str = "beat_voz"  # "beat_voz" (2 stems) | "completo" (4 stems)
    # Pasta no bucket p/ gravar os stems. O app manda "<faixa_id>/stems/<versao_id>"
    # p/ casar com a RLS de Storage (app.pode_ver_audio: 1ª pasta = faixa_id).
    prefixo_destino: str | None = None


@app.get("/")
def health():
    return {"ok": True, "service": "demucs-worker", "modelo": MODELO, "jobs": len(JOBS)}


# Nome técnico do stem -> rótulo amigável (o "no_vocals" do Demucs é o beat).
ROTULOS = {"vocals": "vocal", "no_vocals": "beat", "drums": "bateria", "bass": "baixo", "other": "outros"}
# Só beat/voz viram versão tocável no app (o enum tipo_versao só tem esses).
TIPO_POR_ROTULO = {"vocal": "vocal", "beat": "beat"}


def _url_permitida(url: str) -> bool:
    """SSRF: só https, e host EXATAMENTE igual ao do SUPABASE_URL (allowlist).

    Também rejeita explicitamente IPs privados/loopback/link-local (defesa
    extra caso o host "bata" com um literal de IP por engano/config errada).
    """
    try:
        p = urlparse(url)
    except ValueError:
        return False
    if p.scheme != "https":
        return False
    host = (p.hostname or "").lower()
    if not host or not SUPABASE_HOST or host != SUPABASE_HOST:
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None  # host é hostname (não IP literal) — segue a checagem de allowlist acima
    if ip is not None and (ip.is_private or ip.is_loopback or ip.is_link_local):
        return False
    return True


def _subir_stem(caminho_local: str, caminho_storage: str) -> str:
    with open(caminho_local, "rb") as f:
        dados = f.read()
    r = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{caminho_storage}",
        headers={
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": "audio/mpeg",
            "x-upsert": "true",
        },
        data=dados,
        timeout=180,
    )
    r.raise_for_status()
    return caminho_storage


def _inserir_versao(faixa_id: str, tipo: str, rotulo: str, arquivo_path: str, enviado_por: str | None) -> None:
    # Insert via service role (bypassa RLS) — assim o stem vira versão tocável.
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/versoes",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={
            "faixa_id": faixa_id, "tipo": tipo, "rotulo": rotulo,
            "arquivo_path": arquivo_path, "enviado_por": enviado_por,
        },
        timeout=30,
    )
    r.raise_for_status()


def processar(pedido: PedidoSeparacao) -> None:
    """Roda em background: baixa, separa, sobe os stems e registra as versões."""
    JOBS[pedido.versao_id] = {"status": "processando"}
    if not _url_permitida(pedido.audio_url):
        JOBS[pedido.versao_id] = {"status": "erro", "detail": "audio_url inválida (host não permitido)."}
        print(f"[separate] audio_url rejeitada (SSRF) versao {pedido.versao_id}", flush=True)
        return
    trabalho = tempfile.mkdtemp(prefix="demucs_")
    try:
        # 1) baixa o áudio (com teto de tamanho pra não estourar disco/memória)
        entrada = os.path.join(trabalho, "in.mp3")
        with requests.get(pedido.audio_url, stream=True, timeout=180) as r:
            r.raise_for_status()
            content_length = r.headers.get("Content-Length")
            if content_length and int(content_length) > LIMITE_DOWNLOAD_BYTES:
                raise RuntimeError("audio_url excede o limite de download (100MB).")
            baixado = 0
            with open(entrada, "wb") as f:
                for chunk in r.iter_content(1 << 16):
                    baixado += len(chunk)
                    if baixado > LIMITE_DOWNLOAD_BYTES:
                        raise RuntimeError("audio_url excede o limite de download (100MB).")
                    f.write(chunk)

        # 2) roda o Demucs (CPU). --segment limita a RAM.
        saida = os.path.join(trabalho, "out")
        cmd = ["python", "-m", "demucs", "-n", MODELO, "--mp3", "--mp3-bitrate", "192", "-o", saida]
        if pedido.modo == "beat_voz":
            cmd += ["--two-stems", "vocals"]
        cmd += ["--segment", "7", entrada]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_DEMUCS)
        if proc.returncode != 0:
            cauda = (proc.stderr or proc.stdout or "").strip()[-1800:]
            raise RuntimeError(f"Demucs exit {proc.returncode}: {cauda}")

        # 3) sobe cada stem e registra beat/voz como versão da faixa
        prefixo = (pedido.prefixo_destino or f"stems/{pedido.versao_id}").strip("/")
        pasta_stems = os.path.join(saida, MODELO, "in")
        stems = {}
        for arquivo in os.listdir(pasta_stems):
            nome = pathlib.Path(arquivo).stem  # vocals | no_vocals | ...
            rotulo = ROTULOS.get(nome, nome)
            destino = f"{prefixo}/{rotulo}.mp3"
            _subir_stem(os.path.join(pasta_stems, arquivo), destino)
            stems[rotulo] = destino
            if rotulo in TIPO_POR_ROTULO and pedido.faixa_id:
                _inserir_versao(
                    pedido.faixa_id, TIPO_POR_ROTULO[rotulo],
                    "Vocal (stem)" if rotulo == "vocal" else "Beat (stem)",
                    destino, pedido.user_id,
                )

        JOBS[pedido.versao_id] = {"status": "pronto", "stems": stems}
    except subprocess.TimeoutExpired:
        JOBS[pedido.versao_id] = {"status": "erro", "detail": "Demucs passou do tempo limite (faixa muito longa pra CPU)."}
        print(f"[separate] timeout versao {pedido.versao_id}", flush=True)
    except Exception as e:  # noqa: BLE001 — worker de background, loga tudo
        JOBS[pedido.versao_id] = {"status": "erro", "detail": str(e)[-800:]}
        print(f"[separate] erro versao {pedido.versao_id}: {traceback.format_exc()}", flush=True)
    finally:
        shutil.rmtree(trabalho, ignore_errors=True)


@app.post("/separate", status_code=202)
def separate(pedido: PedidoSeparacao, background_tasks: BackgroundTasks, authorization: str = Header(default="")):
    if not hmac.compare_digest(authorization, f"Bearer {WORKER_SECRET}"):
        raise HTTPException(status_code=401, detail="não autorizado")
    JOBS[pedido.versao_id] = {"status": "processando"}
    background_tasks.add_task(processar, pedido)
    return {"ok": True, "status": "processando"}


@app.get("/status/{versao_id}")
def status(versao_id: str, authorization: str = Header(default="")):
    if not hmac.compare_digest(authorization, f"Bearer {WORKER_SECRET}"):
        raise HTTPException(status_code=401, detail="não autorizado")
    return JOBS.get(versao_id, {"status": "desconhecido"})
