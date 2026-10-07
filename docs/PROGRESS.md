# PROGRESSO

## Estado atual
- Fase 1 concluída no código: migração para TypeScript (strict) + Vite. Os módulos de render e de interface agora são `src/*.ts`; o three.js vem do npm (0.160.0). Não há mais JavaScript de jogo em `public/js`.
- Fase 0 concluída parcialmente: SPEC com incertezas (ver docs/SPEC.md).
- Publicado: https://age-of-empires-haiku.guhcostan.workers.dev (Worker que serve `public/` da branch `claude/admiring-feynman-bxzdp3`). Após o push, a versão nova aparece em até 5 minutos.
- PR: guhcostan/age-of-empires-haiku-5.5#1 (mesclado) e o PR da fase 1 (ver histórico do GitHub).
- Testes: 19 unitários (`npm test`), 18 E2E (`npx playwright test`, compila antes e roda contra `vite preview`).
- Verificações: `npm run build` (tsc strict + vite) limpo; CI checa que `public/` é igual ao build do código.
- CI: `main` verde no commit 456d443 (job CI e job de deploy). O job de deploy pula a publicação enquanto `CLOUDFLARE_API_TOKEN` não existir.

## Decisões
- Nome do projeto: **Haiku Empires** (provisório, sem o nome do jogo original). A UI e o README ainda citam o nome antigo; trocar na fase 8.
- Repo: guhcostan/age-of-empires-haiku-5.5 (preenchido no lugar de [USUARIO]/[REPO]).
- Civilizações: English e French (conforme briefing).
- Subagentes: fixados em `haiku` (Haiku 5.5) no lançamento.
- Build em `public/`: o Worker publicado lê o branch do GitHub sem token, então o build de produção é commitado em `public/` (`publicDir` desligado). A alternativa é `dist/` com deploy via wrangler, que depende do token. Reavaliar quando o token existir.
- Deploy: Worker via API (sem token). `wrangler deploy` depende de CLOUDFLARE_API_TOKEN e roda `npm run build` antes (`build.command` em wrangler.jsonc).
- Objeto de depuração: `window.aoe` (usado pelos E2E). A mudança para `window.__game` fica para a fase em que os testes forem reescritos.

## Pendente (por fase)
- 0 Pesquisa e SPEC: docs/SPEC.md entregue (515 linhas, 19 fontes verificadas, seção de incertezas). Muitos números têm uma única fonte; conferir antes de implementar.
- 1 TypeScript + Vite e base da fase: concluída (migração de comportamento; ver "Bugs corrigidos"). Falta: `window.__game` e E2E contra o site publicado.
- 2 Economia e construção: em grande parte pronto na versão atual.
- 3 Combate e defesas: torres prontas; muralhas, portões e fortaleza ainda faltam.
- 4 Idades, landmarks, tecnologias: versão atual usa Centro da Vila no lugar de landmarks.
- 5 Segunda civilização: não iniciada.
- 6 Relíquias, locais sagrados, comércio, vitória: não iniciada.
- 7 Bots: versão atual pronta, precisa das regras de landmark e civilização.
- 8 Menu e HUD: layout atual não é o do AoE IV.
- 9 Áudio, performance, polimento: 200 unidades a 60 fps ainda não medidos em GPU real.

## Bugs corrigidos na migração
- Evento de morte: o código antigo lia `ev.to.x` também para `death` (que só tem x e y), lançando TypeError em toda morte. Corrigido; coberto por teste E2E em `e2e/bugs-conhecidos.spec.js`.
- Barra de vida de árvores e minas: selecionar um recurso natural criava uma barra com vida NaN. Agora só unidades e edifícios têm barra.

## Bugs abertos
- Job E2E do CI falhou em runs anteriores (causa não confirmada: logs não acessíveis pela API pública).
- Renderização headless por software roda a ~2,7 fps; medir 60 fps exige GPU.
- Bundle de 567 kB (quase todo three.js) passa do limite de 500 kB do Vite; aviso esperado, sem divisão de código ainda.
