# Age of Empires — clone para teste

Clone de Age of Empires feito do zero para testar capacidades de desenvolvimento.
**Projeto pessoal, sem fins comerciais, não divulgado.** Todo o código, modelos 3D e
sons são gerados por código (primitivas do three.js e síntese WebAudio); não há arquivos
de arte ou áudio de terceiros.

## O que tem

- **Economia**: aldeões coletam comida (frutas e fazendas), madeira, ouro e pedra e levam
  para o Centro da Vila ou para o Armazém.
- **Construções**: Centro da Vila, Casa (população), Armazém, Fazenda, Quartel e Estábulo.
  Construção por aldeões, com mais construtores acelerando a obra.
- **Militares**: Espadachim, Arqueiro (ataque à distância com projéteis) e Batedor (cavalaria).
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
| Construir (aldeão) | H casa, M armazém, F fazenda, B quartel, T estábulo |
| Treinar | V aldeão, Z espadachim, X arqueiro, C batedor; Del cancela |
| Pausa | Esc |

## Desenvolvimento

Não há etapa de build: os módulos ES ficam em `public/` e o three.js é servido de
`public/vendor/three.module.js` (versão 0.160.0, MIT).

```bash
npm install
npm test            # testes unitários da simulação (Node)
npx playwright test # testes end-to-end no Chromium (ver tests/e2e)
npm run dev         # servidor local com wrangler
npm run deploy      # publica na Cloudflare (requer CLOUDFLARE_API_TOKEN)
```

### Estrutura

```
public/
  index.html          menus e HUD
  css/style.css       visual de madeira, pedra e ouro
  js/
    main.js           ponto de entrada
    game.js           orquestra partida, loop, fim de jogo
    core/             simulação pura (sem DOM nem three.js; testável no Node)
      config.js       balanceamento: custos, tempos, estatísticas
      mapgen.js       mapa procedural (terreno, lagos, florestas, recursos)
      pathfind.js     A* em grade com regiões conectadas
      world.js        entidades e grade de bloqueios
      sim.js          economia, comandos, coleta, construção, treino, combate, névoa
      ai.js           bots
    render/           three.js
      models.js       modelos 3D procedurais
      terrain.js      malha do terreno e camada de névoa
      entities.js     representação das entidades, projéteis, efeitos
      camera.js       câmera RTS
    ui/               entrada, HUD, minimapa, menus, som
tests/                testes unitários (node --test)
e2e/                  testes end-to-end (Playwright)
```

## Limitações conhecidas

- Não há reconhecimento de idades (Feudal/Castelo), tecnologias, torres, muralhas, cerco nem
  unidades de suporte como monges. Esses pontos ficam para as próximas versões.
- Os bots enxergam o mapa inteiro (sem névoa).
- O visual é low-poly, com modelos montados por primitivas. Não há animações de esqueleto.
