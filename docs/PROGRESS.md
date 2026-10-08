# PROGRESSO

## Estado atual
- Fase 1 concluída no código: migração para TypeScript (strict) + Vite. Os módulos de render e de interface agora são `src/*.ts`; o three.js vem do npm (0.160.0). Não há mais JavaScript de jogo em `public/js`.
- Fase 0 concluída parcialmente: SPEC com incertezas (ver docs/SPEC.md).
- Publicado: https://age-of-empires-haiku.guhcostan.workers.dev (Worker que serve `public/` da branch `claude/admiring-feynman-bxzdp3`). Após o push, a versão nova aparece em até 5 minutos.
- PRs: guhcostan/age-of-empires-haiku-5.5#1 e #2 (mesclados); #3 é a fase 1 (rascunho, TypeScript + Vite).
- Testes: 66 unitários (`npm test`), 20 E2E (`npx playwright test`, compila antes e roda contra `vite preview`). Local: 20/20 E2E e 66/66 unitários nesta rodada.
- E2E contra produção (`E2E_BASE_URL=https://age-of-empires-haiku.guhcostan.workers.dev npx playwright test`): 18/18 passando no bundle `index-B8JoBrHp.js` (commit db17232). O CI do PR #3 ainda estava rodando nesse commit.
- Commit 0e8f9c0 (campo de tiro): CI verde (push e PR). E2E contra produção 18/18 no bundle `index-BhYKMYzw.js`, que é o build desse commit.
- Commit 6018efe (valores confirmados de quartel, aldeão e torre): E2E contra produção 18/18 no bundle `index-C4HjoQAs.js`, que é o build desse commit. CI do PR: em andamento no momento da escrita.
- Commit 3e7e2ce (Keep): E2E contra produção 18/18 no bundle `index-DU5WZZjK.js`, que é o build desse commit.
- Verificações: `npm run build` (tsc strict + vite) limpo; CI checa que `public/` é igual ao build do código.
- CI: `main` verde no commit 456d443 (job CI e job de deploy). O job de deploy pula a publicação enquanto `CLOUDFLARE_API_TOKEN` não existir.

- Rodada de 2026-10-08 (gauntlet): merge de PR #3 em main depende do CI do head 5731576. Críticos de fidelidade e de balanceamento rodaram como subagentes Haiku novos (resultados em /tmp/critic-*). Medido: 1911 chamadas de desenho por quadro com 208 unidades (renderização por software, 2,8 fps); sem GPU, 60 fps não verificado.

## Decisões
- Nome do projeto: **Haiku Empires** (provisório, sem o nome do jogo original). A UI e o README ainda citam o nome antigo; trocar na fase 8.
- Repo: guhcostan/age-of-empires-haiku-5.5 (preenchido no lugar de [USUARIO]/[REPO]).
- Civilizações: English e French (conforme briefing).
- Subagentes: fixados em `haiku` (Haiku 5.5) no lançamento.
- Build em `public/`: o Worker publicado lê o branch do GitHub sem token, então o build de produção é commitado em `public/` (`publicDir` desligado). A alternativa é `dist/` com deploy via wrangler, que depende do token. Reavaliar quando o token existir.
- Deploy: Worker via API (sem token). `wrangler deploy` depende de CLOUDFLARE_API_TOKEN e roda `npm run build` antes (`build.command` em wrangler.jsonc).
- Objeto de teste: `window.__game` (`{ game, menus }`), exigido pela SPEC de arquitetura para os testes E2E e de simulação.

## Pendente (por fase)
- 0 Pesquisa e SPEC: docs/SPEC.md entregue (515 linhas, 19 fontes verificadas, seção de incertezas). Muitos números têm uma única fonte; conferir antes de implementar.
- 1 TypeScript + Vite e base da fase: concluída (migração de comportamento; ver "Bugs corrigidos"). `window.__game` no lugar de `window.aoe`. A suíte E2E aceita `E2E_BASE_URL` para rodar contra o site publicado; a rodada contra produção ainda está pendente de confirmação do deploy.
- 2 Economia e construção: análise de lacunas feita por crítico independente (SPEC x código, Haiku). Corrigido: custo da Idade Feudal, 400 comida (duas fontes na SPEC). Pendente, confirmado: idade exige marco (fase 4); edifícios ausentes (Mercado, Universidade, Keep, Doca, Mosteiro, Oficina de cerco, Posto avançado, muros, marcos; fases 3 a 6); civilizações sem conceito (fase 5); Campo de tiro treina arqueiros e o Quartel não: feito. O campo (150 madeira, 30 s, 1500 de vida) vem da fonte única da SPEC, então fica marcado como incerto. Bots constroem o campo e treinam arqueiros. Grade de comandos agora 5x3 para caber a lista mais longa.
- 2 Incertos, não alterar sem fonte que resolva: custos de Idades III e IV (SPEC 1200+600 e 2400+1200, código 800+400 e 1000+700+300 pedra); custos e tempos de unidades militares (SPEC Besteiro 80+40, Batedor 65 comida, Cavaleiro 140+100 e 35 s; código usa madeira); treino de aldeão (SPEC 19–20 s, código 8 s); construções (SPEC Casa 50 madeira, código 60; Fazenda e acampamentos divergem); técnicas de coleta em outra idade (SPEC Machado e Picareta na II, código na I); carga e caça; teto de população; armadura da Forja.
- Tempo do marco da Feudal: SPEC 190 s (uma fonte), código 60 s. Mantido até nova fonte.
- 3 Combate e defesas: análise de lacunas feita por crítico independente (Haiku). Torres prontas; campo de tiro prontíssimo (ver fase 2).
  - Keep: implementado (função e valores de duas fontes; idade 3 só do aoe4world). Footprint e visão são provisórios.
  - Pendente, existência confirmada (ligado à civilização, fase 5): Homem de Armas Vanguarda, Arqueiro Longo, Cavaleiro Real (Feudal, duas fontes), Arbalétrier, Canhão.
  - Pendente, mecânica sem fórmula na SPEC: armadura (o código não tem campo de armadura e o ataque não reduz dano), dano a edifícios (hoje ×0,5 sem fonte), counters por classe (só o lanceiro tem bônus, ×2 sem fonte), Rede de Castelos (aceleração perto de defesas).
  - Oficina de cerco e aríete: implementados (ver SPEC anexo C, adendo 2). Velocidade e alcance do aríete são provisórios.
  - Muro de pedra: implementado (1 tile por clique, Shift repete). Portões, paliçada e posto avançado continuam pendentes.
  - Pendente, incerto: portões, paliçada e posto avançado (fonte única); valores de vida e custo da torre e do quartel: resolvidos na rodada de 2026-10-08 (SPEC anexo C, duas fontes; aplicados no código); estatísticas do Espadachim (SPEC não tem a unidade); forja: técnica "Armaduras" só dá ataque.
- 4 Idades, landmarks, tecnologias: idades por marco implementadas (Inglaterra; SPEC anexo C, adendo 4). Custos corrigidos: 2.ª 400+200 em 190 s, 3.ª 1200+600 em 220 s, 4.ª 2400+1200 em 250 s. Bots constroem o marco. Falta: marcos franceses (fase 5) e o efeito de cada marco.
- 5 Segunda civilização: escolha de civilização no menu; marcos e maravilha franceses e fazenda inglesa implementados (SPEC anexo C, adendo 6). Cavaleiro Real implementado (adendo 7). Falta: comerciantes, Centro da Vila mais rápido e bônus ingleses dependentes de unidades (Homem de Armas Vanguarda, arco curto).
- 6 Relíquias, locais sagrados, comércio, vitória (pesquisa de relíquias e comércio em SPEC adendo 12; só resumos de busca, nada implementado ainda): vitória por maravilha e por locais sagrados implementadas (opções no menu; números provisórios, SPEC adendos 5 e 8). Vitória por marcos implementada (provisória, adendo 9). Pendentes: relíquias e comércio.
- 7 Bots: constroem a maravilha na Imperial, mandam o exército ocioso para os locais sagrados, guardam recursos para cada idade e não deixam unidades presas (SPEC anexo C, adendo 10). Partidas completas por condição em tests/partidas.test.ts: conquista entre bots; maravilha, locais e marcos com início preparado. Falta: bot-vs-bot chegar à maravilha ou aos locais sem preparo (hoje a conquista acaba antes).
- 8 Menu e HUD: layout atual não é o do AoE IV. Botão "Ociosos" na barra de cima (adendo 11, provisório). Falta: layout de referência, painel de objetivos e pontuação.
- 9 Áudio, performance, polimento: 200 unidades a 60 fps ainda não medidos em GPU real. Medido só a simulação (Node, 208 unidades, mapa 128, dois exércitos em ataque-movimento): 0,60 ms por passo em média, 10 ms no pior passo (um pico isolado). Renderização não medida.

## Fidelidade: crítico independente (Haiku, 2026-10-08)

Corrigido nesta rodada:
- Grade de comandos saía da tela (8 de 18 botões fora em 1280x720). Barra de 230 px, botões de 49 px, custo recortado. Teste permanente em e2e/hud-grade.spec.js.
- Nome do jogo: título, cabeçalho e descrição usavam o nome original. Agora "Haiku Empires" (provisório).
- Ajuda: "U avançar de idade" não existia e o Quartel não treina arqueiros (o Campo de tiro treina, tecla X).

Pendente (lista do crítico, sem alteração):
- Roster militar: faltam 23 unidades da SPEC §3 (rei, homem de armas vanguarda, arqueiro longo, ranger, arcabuzeiro, monge, cavalaria leve, arbalétrier, homem de armas francês, mangonel, trabuco, bombarda, springald, canhão real, canhão, ribauldequin, 4 batalhões Wynguard, 3 navios). Navios estão fora de escopo.
- Bônus de civilização: 3 de 21 implementados (SPEC §6.1–6.2).
- Edifícios da SPEC §2.1 faltando: mercado, posto avançado, mosteiro, universidade, doca, paliçada, portões. Espadachim e armazém não estão na SPEC.
- Marcos sem efeito (Palácio Vermelho, Concílio).
- Técnicas: custo e tempo de 7 de 8 sem fonte; nomes inventados.
- HUD: aldeões por recurso, relógio, placar e objetivo já implementados (adendo 15). Ícones são glifos Unicode; retrato é a inicial.
- Atalhos da SPEC §7.2 ausentes: F5 e Shift+comando. Ctrl+A, ponto, vírgula, Tab e F1–F4 implementados (adendo 16, provisórios). H é casa (SPEC: centralizar no Centro da Vila).
- Centro da Vila sem custo e não construível.
- Avançar de idade só aparece com aldeão selecionado. É decisão de desenho (o aldeão constrói o marco), não bug; registrar na SPEC.

## Balanceamento: crítico independente (Haiku, 2026-10-08)

Crítico novo comparou config.ts com o anexo C. Corrigido: torre de jogador eliminado por marcos ainda atirava (teste em tests/partidas.test.ts).

Não alterado (a SPEC marca como conflitante ou de uma fonte; mudar sem fonte nova viola a regra da SPEC):
- Aldeão: velocidade 1,8 no código, 1,125 na SPEC (conflito); ataque corpo a corpo 2 contra 5 à distância.
- Batedor: código 80 comida, ataque 6, velocidade 3,4; SPEC 65 comida, ataque 1, velocidade 1,625 (uma fonte). É a tropa mais numerosa dos bots.
- Cavaleiro (inglês, idade 3): código 80+60, 180 de vida; SPEC 140+100, 270 de vida (uma fonte).
- Lanceiro, arqueiro, besteiro e espadachim: códigos diferentes da SPEC; espadachim sem equivalente na SPEC.
- Vida de moinho, serraria, acampamento (350 contra 750), casa (300 contra 750), centro da vila (2000 contra 2500) e ferreiro (700 contra 1500, idade 2 contra 25 s).
- Desconto francês de 25% na madeira dos moinhos e serrarias ausente; Keep francês 900 contra 810.
- Catedral e Notre Dame: a SPEC cita 6000 na patch 5.0 em um trecho e 5000 em outro.
- Técnicas: só Horticultura bate; "Armaduras" dá +15% de ataque e a SPEC fala em armadura.
- Não implementados pela SPEC: palissada, portões, posto avançado, mercado, universidade, doca, navios, batalhões Wynguard, artilharia.
- Sem fonte no código: dano a prédios (x0,5), bônus x2 do lanceiro, carga 10, início de recursos, teto de população 200.

Balanceamento medido (bots, mapa 64, duas sementes): conquista entre 1124 e 1409 s de jogo.

## Bugs corrigidos na migração
- Evento de morte: o código antigo lia `ev.to.x` também para `death` (que só tem x e y), lançando TypeError em toda morte. Corrigido; coberto por teste E2E em `e2e/bugs-conhecidos.spec.js`.
- Barra de vida de árvores e minas: selecionar um recurso natural criava uma barra com vida NaN. Agora só unidades e edifícios têm barra.
- Vitória por marcos era sobrescrita pela conquista no mesmo passo da simulação: a tela final mostrava "conquista". Agora o motivo é o da regra que encerrou a partida.
- Aldeões presos: o centro da vila cercado por edifícios fazia novas unidades nascerem num bolsão sem saída, ociosas para sempre. Corrigido com nascimento na região aberta e regra de placement (adendo 10).
- Bots paravam na Feudal: o exército consumia a comida que a idade seguinte pedia. Corrigido com a regra de guardar recursos (adendo 10).

## Bugs abertos
- Job E2E do CI falhou em runs anteriores (causa não confirmada: logs não acessíveis pela API pública).
- Bot-só de maravilha não decide nenhuma partida: falta ouro (adendo 13). Bot-só de locais sagrados decide 6 de 8 sementes sem ataque; de marcos, 7 de 8 com ataque.
- No E2E de locais sagrados, o bot ataca os locais do jogador passivo e vence por conquista; por isso o teste de navegador só checa a tela final, e a regra está nos testes de partida completa.
- Renderização headless por software roda a ~2,7 fps; medir 60 fps exige GPU.
- Bundle de 567 kB (quase todo three.js) passa do limite de 500 kB do Vite; aviso esperado, sem divisão de código ainda.
