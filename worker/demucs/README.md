# Worker Demucs — separação de stems (BLACK BELT 360)

Serviço Python que separa beat/voz (Demucs, CPU) sob demanda. Roda no Railway.

## O que ele faz
`POST /separate` (com `Authorization: Bearer <WORKER_SECRET>`) → baixa o áudio
(URL assinada do Supabase), roda o Demucs, sobe os stems em
`stems/<versao_id>/<rotulo>.mp3` no bucket e devolve os caminhos.
`GET /` = health check.

## Deploy no Railway (CLI — mais direto)
1. Instale a CLI:  `npm i -g @railway/cli`
2. Login (abre o navegador):  `railway login`
3. Dentro de `worker/demucs/`:  `railway init`  (cria o projeto) e depois  `railway up`  (builda o Dockerfile e sobe)
4. Configure as variáveis (no painel do Railway → Variables, ou via CLI `railway variables --set`):
   - `WORKER_SECRET`               = (o segredo gerado — ver abaixo)
   - `SUPABASE_URL`                = https://ndfszyjwttwzedoogsur.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY`   = (a service_role do seu .env.local)
   - `SUPABASE_BUCKET`             = audio
5. Gere o domínio público:  Railway → Settings → **Generate Domain** (ou `railway domain`)
6. Teste:  abra `https://SEU-WORKER.up.railway.app/`  → deve responder `{"ok": true, ...}`
7. Me mande a **URL pública** — eu ligo o app nela.

> CPU-only: uma faixa de ~3min leva alguns minutos. É sob demanda, sem GPU. Normal.
