# Fundação BLACK BELT 360 — Design System + Shell + Player

**Data:** 2026-07-04
**Produção executiva:** Rick
**Status:** Aprovado (fatia 1 de um produto maior)
**Origem:** `BLACK_BELT_PRD_Plataforma_Faixas.docx` + expansão de escopo para "organização 360"

---

## 1. Contexto e visão

A BLACK BELT quer um **sistema operacional 360** do selo, não só uma ferramenta de revisão
de faixas. A visão completa se organiza em 6 módulos independentes, cada um com seu próprio
ciclo de spec → plano → build:

| # | Módulo | Escopo |
|---|--------|--------|
| **0** | **Fundação** (este spec) | Design System + Shell responsivo + Player |
| 1 | Estúdio / Faixas | Upload, versões, waveform, comentários por timestamp, Kanban |
| 2 | Analytics & Royalties | Views/streams × recebimentos, transparência, comparação |
| 3 | Previsão de Lançamentos | Prever performance futura com base em histórico |
| 4 | Shows & Booking | Agenda, vendas, solicitações, riders técnicos + camarim, cachês |
| 5 | Registro & Direitos | Obra/fonograma/videograma, splits, ISRC (PRD §14) |

**Este spec cobre APENAS o Módulo 0 (Fundação).** Os demais são especificados depois,
na ordem de urgência a ser definida quando a fundação estiver de pé.

### Decisões-chave já tomadas
- **Identidade:** dark premium estilo Spotify.
- **Acento:** dourado/âmbar `#F5C518` (faixa preta + ouro de conquista). Reversível via token.
- **Sequência:** construir a Fundação primeiro (dados mockados), decidir ordem dos módulos depois.

### Alertas honestos registrados (não afetam esta fatia, mas orientam módulos futuros)
- **Edge TTS ≠ transcrição.** Edge TTS é texto→voz. Transcrição (voz→texto) exige
  Whisper/Azure/GPT-4o Transcribe. O backend "de transcrição" da SMU precisa ser verificado —
  pode ser locução (TTS), não transcrição. Isso é Fase 2 do PRD, não bloqueia a Fundação.
- **Analytics não é 100% automático.** Spotify não expõe API pública de streams a terceiros.
  YouTube tem API. Royalties vêm do distribuidor. Realista = híbrido (automático onde dá +
  importação de CSV fácil). O Módulo 2 deve nascer **agnóstico de distribuidora**.
- **Distribuidora atual: SoundOn**, com possível migração para **Symphonic ou DistroKid**.
  NÃO firmar integração específica — manter camada de importação genérica.

---

## 2. Escopo desta fatia

### Entra AGORA (com dados mockados, sem backend)
1. **Design System** — tokens (cor, tipografia, espaçamento, raio, sombra, z-index) como fonte
   única no `tailwind.config`; tema dark premium.
2. **Componentes base** — Button, Badge (status/prioridade/categoria), Card, Avatar, Tabs,
   Sidebar/Nav, IconButton, Slider (velocidade). Base shadcn/ui estilizada com nossos tokens.
3. **App Shell responsivo (mobile-first)** — navegação que já reserva os 6 módulos; 5 marcados
   como "em breve". Sidebar no desktop → barra inferior (bottom nav) no celular.
4. **Player estilo Spotify** — barra de player fixa + tela "Now Playing" expansível; waveform
   (wavesurfer.js) protagonista; play/pause; seek clicando na onda; velocidade 0.5×–1.5×;
   seletor de versão (Beat/Vocal/Mix/Master).
5. **2 telas-vitrine com mock** — Biblioteca/Projetos e Detalhe da Faixa (waveform + lista de
   comentários por timestamp).

### NÃO entra (specs futuros)
Auth por convite, upload/Cloudflare R2, Supabase, versionamento persistente, Kanban funcional,
transcrição automática, notificações, split de composição, registro de obra, e os Módulos 2–5.

---

## 3. Stack

Seguindo o PRD (reaproveita o que o Rick já opera; fácil de manter por freelancer):
- **Next.js (App Router) + React + TypeScript** — hospedável na Vercel.
- **Tailwind CSS** — tokens da marca no `tailwind.config`; design system centralizado.
- **shadcn/ui** — base de componentes acessível e headless, estilizada com nossos tokens.
- **wavesurfer.js** — waveform interativa; já validada no protótipo, migra quase sem mudança.
- **Sem backend nesta fatia** — dados de `mock/` tipado, trocável por Supabase depois.

---

## 4. Otimizações conscientes vs. Spotify

O Spotify é para ouvir passivamente; a BLACK BELT 360 é para **trabalhar o áudio**:
- Waveform é **protagonista**, não decoração — clicar e comentar no segundo exato.
- "Now Playing" mostra **comentários ancorados na timeline** e o **seletor de versão**.
- **Velocidade** (0.5×–1.5×) à mão — decifrar flow de rap linha a linha. (Loop de trecho e
  zoom entram no Módulo 1.)
- "Curtir/playlist" do Spotify → **status do pipeline** e **prioridade do comentário**.

---

## 5. Arquitetura de pastas

```
app/                    → rotas (biblioteca, faixa/[id], now-playing)
components/ui/          → design system puro (Button, Badge, Card, Tabs, Avatar, Slider...)
components/player/      → PlayerBar, NowPlaying, Waveform, VersionSelector, CommentPin
components/shell/       → AppShell, Sidebar, BottomNav, TopBar
lib/tokens.ts           → fonte única de tokens (espelha o tailwind.config)
mock/                   → dados fake tipados (projetos, faixas, versões, comentários)
types/                  → tipos do modelo de dados (espelham PRD §8)
```

**Princípio de isolamento:** cada componente do design system é entendível e testável sozinho,
com uma responsabilidade só. O player consome `types/` que **espelham o modelo de dados do
PRD §8** (usuarios, projetos, faixas, versoes_faixa, comentarios, estrutura_faixa) — plugar o
Supabase depois é trocar a fonte de dados, não reescrever telas.

---

## 6. Responsividade (requisito do PRD)

Mobile-first, testado nos dois formatos desde o início:
- **Celular:** navegação em bottom nav; waveform em tela cheia; mini-player que expande;
  comentar em poucos toques.
- **Desktop:** sidebar + player fixo embaixo; waveform larga.

---

## 7. Critérios de sucesso desta fatia

- App Next.js roda localmente e na Vercel (build limpo).
- Tema dark premium com acento dourado aplicado via tokens (trocar 1 token muda o acento).
- Navegação funciona no desktop (sidebar) e no celular (bottom nav), com os 6 módulos visíveis.
- Player toca um áudio mock, mostra waveform, permite seek na onda e ajuste de velocidade.
- Tela de Detalhe da Faixa lista comentários mockados ancorados em timestamps.
- Zero dependência de backend; dados vêm de `mock/`.
- Tipos em `types/` batem com o modelo de dados do PRD §8.

---

## 8. Fora de escopo / riscos

- Nada de dados reais, login ou upload nesta fatia — apenas a casca navegável.
- A integração de áudio real, versionamento e comentários persistentes são do Módulo 1.
- O seletor de versão e a lista de comentários usam mock; a lógica de negócio vem depois.
