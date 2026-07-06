"""
Worker de separação de stems (beat/voz) da BLACK BELT 360.

Recebe a URL assinada do áudio (Supabase Storage), roda o Demucs em CPU,
sobe os stems de volta pro bucket e devolve os caminhos. Sob demanda: uma
faixa de ~3min leva alguns minutos em CPU — é o esperado sem GPU.

Segurança: exige o header Authorization: Bearer <WORKER_SECRET> — só o app
da BLACK BELT chama. Nunca exponha WORKER_SECRET nem a service key.

Env necessárias (setar no Railway):
  WORKER_SECRET               segredo compartilhado com o app
  SUPABASE_URL                https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   chave service_role (server-only)
  SUPABASE_BUCKET             bucket dos stems (padrão: audio)
"""
import os
import pathlib
import shutil
import subprocess
import tempfile

import requests
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

WORKER_SECRET = os.environ["WORKER_SECRET"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
BUCKET = os.environ.get("SUPABASE_BUCKET", "audio")
MODELO = os.environ.get("DEMUCS_MODEL", "htdemucs")

app = FastAPI(title="BLACK BELT — Demucs worker")


class PedidoSeparacao(BaseModel):
    audio_url: str          # URL assinada pra baixar o áudio
    versao_id: str          # id da versão da faixa (usado no caminho dos stems)
    modo: str = "beat_voz"  # "beat_voz" (2 stems) | "completo" (4 stems)


@app.get("/")
def health():
    return {"ok": True, "service": "demucs-worker", "modelo": MODELO}


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


# Nome técnico do stem -> rótulo amigável (o "no_vocals" do Demucs é o beat).
ROTULOS = {"vocals": "vocal", "no_vocals": "beat", "drums": "bateria", "bass": "baixo", "other": "outros"}


@app.post("/separate")
def separate(pedido: PedidoSeparacao, authorization: str = Header(default="")):
    if authorization != f"Bearer {WORKER_SECRET}":
        raise HTTPException(status_code=401, detail="não autorizado")

    trabalho = tempfile.mkdtemp(prefix="demucs_")
    try:
        # 1) baixa o áudio
        entrada = os.path.join(trabalho, "in.mp3")
        with requests.get(pedido.audio_url, stream=True, timeout=180) as r:
            r.raise_for_status()
            with open(entrada, "wb") as f:
                for chunk in r.iter_content(1 << 16):
                    f.write(chunk)

        # 2) roda o Demucs (CPU). --segment limita a RAM (Railway ~sem GPU).
        saida = os.path.join(trabalho, "out")
        cmd = ["python", "-m", "demucs", "-n", MODELO, "--mp3", "--mp3-bitrate", "192", "-o", saida]
        if pedido.modo == "beat_voz":
            cmd += ["--two-stems", "vocals"]  # gera vocals.mp3 + no_vocals.mp3 (beat)
        cmd += ["--segment", "7", entrada]
        subprocess.run(cmd, check=True)

        # 3) sobe cada stem pro Storage: stems/<versao_id>/<rotulo>.mp3
        pasta_stems = os.path.join(saida, MODELO, "in")
        stems = {}
        for arquivo in os.listdir(pasta_stems):
            nome = pathlib.Path(arquivo).stem  # vocals | no_vocals | drums | bass | other
            rotulo = ROTULOS.get(nome, nome)
            destino = f"stems/{pedido.versao_id}/{rotulo}.mp3"
            _subir_stem(os.path.join(pasta_stems, arquivo), destino)
            stems[rotulo] = destino

        return {"ok": True, "stems": stems}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Demucs falhou: {e}")
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"falha ao baixar/subir áudio: {e}")
    finally:
        shutil.rmtree(trabalho, ignore_errors=True)
