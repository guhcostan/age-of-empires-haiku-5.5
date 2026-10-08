# Haiku Empires — clone para teste

Clone de estilo RTS (inspirado em Age of Empires IV, sem assets originais) feito do zero para testar capacidades de desenvolvimento.
**Projeto pessoal, sem fins comerciais, não divulgado.** Todo o código, modelos 3D e
sons são gerados por código (primitivas do three.js e síntese WebAudio); não há arquivos
de arte ou áudio de terceiros.

## O que tem

- **Economia**: aldeões coletam comida (frutas e fazendas), madeira, ouro e pedra e levam
  para o Centro da Vila ou para o Armazém.
- **Idades**: Idade das Trevas, Feudal, dos Castelos e Imperial. Avança-se no Centro da Vila
  pagando comida, ouro e (na última) pedra. Cada idade libera edifícios e unidades.
- **Construções**: Centro da Vila, Casa (+10 população, limite 200), Armazém, Fazenda, Moinho,
  Serraria, Acampamento de Mineração, Quartel, Estábulo, Ferreiro e Torre (ataca sozinha).
  Construção por aldeões, com mais construtores acelerando a obra.
- **Técnicas**: horticultura e fertilização (comida), machados e serras (madeira),
  picaretas e carrinhos (ouro e pedra), forja de armas e armaduras (ataque).
- **Militares**: Espadachim, Arqueiro, Lanceiro (bônus contra cavalaria), Besteiro,
  Batedor e Cavaleiro.
- **Combate**: vida, alcance, cooldown, perseguição, ataque-mover, defesa automática e
  destruição de edifícios.
- **Névoa de guerra**: explorado / visível / inexplorado, com unidades inimigas ocultas.
- **Bots**: 1 a 3 adversários com três dificuldades. Os bots usam os mesmos comandos do jogador,
  gerenciam economia, constroem, treinam, defendem a base e atacam.
- **Interface**: barra de recursos e população, minimapa clicável, painel de seleção com fila de
  treino, grade de comandos com atalhos e custos, mensagens, grupos de controle e tela final
  com estatísticas.
- **Mapas**: procedurais e determinísticos por semente, com lagos, florestas e minas.

## Controles

| Ação | Controle |
| --- | --- |
| Selecionar | Clique esquerdo (Shift adiciona). Duplo clique seleciona unidades iguais na tela |
| Caixa de seleção | Arrastar com o botão esquerdo |
| Ordem | Clique direito: mover, atacar, coletar, construir ou definir ponto de encontro |
| Atacar-mover | A, depois clique |
| Parar | S |
| Câmera | Setas ou borda da tela; roda para zoom; botão do meio arrasta; Q / E giram |
| Centralizar | Espaço (seleção) ou Home (Centro da Vila) |
| Grupos | 0–9 seleciona; Ctrl + 0–9 define |
| Construir (aldeão) | H casa, M armazém, F fazenda, N moinho, L serraria, O acampamento de mineração, B quartel, T estábulo, K ferreiro, Y torre |
| Avançar de idade | U (Centro da Vila) |
| Treinar | V aldeão, Z espadachim, X arqueiro, G lanceiro, D besteiro, C batedor, R cavaleiro; Del cancela |
| Técnicas | J e I (no edifício de apoio correspondente) |
| Pausa | Esc |

## Jogo publicado

- URL: https://age-of-empires-haiku.guhcostan.workers.dev
- O Worker `age-of-empires-haiku` (conta Cloudflare do projeto) serve a pasta `public/` a partir da
  branch `claude/admiring-feynman-bxzdp3` do GitHub, buscando os arquivos no raw do repositório e
  guardando por 5 minutos. Ele precisa que o repositório seja público.
- Por isso, cada push na branch aparece no site em até 5 minutos. Para um deploy direto com
  `wrangler`, defina `CLOUDFLARE_API_TOKEN` e use `npm run deploy`: o wrangler roda `npm run build`
  antes de enviar a pasta `public/`.

## Desenvolvimento

O código é TypeScript (`strict`) empacotado com Vite. O three.js vem do npm (versão 0.160.0, MIT).

```bash
npm install
npm run dev         # servidor de desenvolvimento do Vite
npm run build       # checagem de tipos (tsc) e build de produção
npm test            # testes unitários da simulação (tsx + node:test)
npx playwright test # testes end-to-end no Chromium (ver e2e/); compila antes de rodar
npm run deploy      # publica na Cloudflare com wrangler (requer CLOUDFLARE_API_TOKEN)
```

O build é gravado em `public/` (ver `vite.config.ts`). Essa pasta é commitada de propósito: o Worker
publicado lê o branch do GitHub, então o `public/` do branch precisa estar atualizado. O CI falha se
`public/` estiver diferente do que o build do código gera; rode `npm run build` e faça commit antes de enviar.

### Estrutura

```
index.html            menus e HUD (entrada do Vite)
src/
  main.ts             ponto de entrada: liga o jogo aos menus
  game.ts             orquestra partida, loop de quadros, fim de jogo
  types.ts            tipos de domínio (entidades, comandos, eventos)
  styles/style.css    visual de madeira, pedra e ouro
  core/               simulação pura (sem DOM nem three.js; testável no Node)
    config.ts         balanceamento: custos, tempos, estatísticas
    mapgen.ts         mapa procedural (terreno, lagos, florestas, recursos)
    pathfind.ts       A* em grade com regiões conectadas
    world.ts          entidades e grade de bloqueios
    sim.ts            economia, comandos, coleta, construção, treino, combate, névoa
    ai.ts             bots
    rng.ts, noise.ts  números pseudoaleatórios determinísticos e ruído do terreno
  render/             three.js
    models.ts         modelos 3D procedurais
    terrain.ts        malha do terreno e camada de névoa
    entities.ts       representação das entidades, projéteis, efeitos
    camera.ts         câmera RTS
  ui/                 entrada, HUD, minimapa, menus, som, DOM
public/               build de produção (gerado; commitado)
tests/                testes unitários (tsx --test)
e2e/                  testes end-to-end (Playwright, em JavaScript)
```

## Limitações conhecidas

- Idades são avançadas direto no Centro da Vila, sem os marcos (landmarks) do AoE IV.
- Não há muralhas, cerco, monges, caça de animais nem civilizações diferentes.
- Os valores de custo e tempo são aproximações, não os do jogo original.
- Os bots enxergam o mapa inteiro (sem névoa).
- O visual é low-poly, com modelos montados por primitivas. Não há animações de esqueleto.
