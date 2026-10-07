# PROGRESSO

## Estado atual (rodada 0)
- Fase atual: 0 (pesquisa e SPEC). Fases anteriores: versão jogável em JavaScript puro, com ages aproximadas (ver README).
- Publicado: https://age-of-empires-haiku.guhcostan.workers.dev (Worker que serve `public/` da branch `claude/admiring-feynman-bxzdp3`).
- PR: guhcostan/age-of-empires-haiku-5.5#1 (rascunho, base `main`, criada com commit vazio).
- Testes: 19 unitários (`npm test`), 17 E2E (`npx playwright test`), contra servidor local.
- CI: workflow `.github/workflows/ci.yml` roda no PR; o job de E2E falhou em runs anteriores, investigação em andamento.

## Decisões
- Nome do projeto: **Haiku Empires** (provisório, sem o nome do jogo original). A UI e o README ainda citam o nome antigo; trocar na fase 8.
- Repo: guhcostan/age-of-empires-haiku-5.5 (preenchido no lugar de [USUARIO]/[REPO]).
- Civilizações: English e French (conforme briefing).
- Subagentes: fixados em `haiku` (Haiku 5.5) no lançamento.
- Deploy: Worker via API (sem token). `wrangler deploy` depende de CLOUDFLARE_API_TOKEN.

## Pendente (por fase)
- 0 Pesquisa e SPEC: docs/SPEC.md (em andamento por subagente Haiku).
- 1 Terreno, câmera, seleção, pathfinding: revisar contra SPEC.
- 2 Economia e construção: em grande parte pronto na versão JS atual.
- 3 Combate e defesas: torres, muralhas e portões ainda faltam.
- 4 Idades, landmarks, tecnologias: versão atual usa Centro da Vila no lugar de landmarks.
- 5 Segunda civilização: não iniciada.
- 6 Relíquias, locais sagrados, comércio, vitória: não iniciada.
- 7 Bots: versão atual pronta, precisa das regras de landmark e civilização.
- 8 Menu e HUD: layout atual não é o do AoE IV.
- 9 Áudio, performance, polimento: 200 unidades a 60 fps ainda não medidos em GPU real.
- CI verde na main: depende de merge do PR #1 e de E2E passar no runner.
- TypeScript + Vite: não iniciado.

## Bugs abertos
- Job E2E do CI falhou em runs anteriores (causa não confirmada: logs não acessíveis pela API pública).
- Renderização headless por software roda a ~2,7 fps; medir 60 fps exige GPU.
