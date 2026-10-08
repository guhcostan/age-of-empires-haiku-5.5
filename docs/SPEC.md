# Especificação de referência: Age of Empires IV (civilizações English e French)

**Uso:** referência de números e mecânicas para um clone de navegador, somente para teste pessoal e sem fins comerciais. Este documento não copia assets, sons, logos nem textos longos do jogo original: registra valores, nomes de conceitos e mecânicas.

**Data da consulta:** 07/10/2026.

**Versão do jogo:** não confirmada. A patch mais recente encontrada é a 16.2.10884, de 18/06/2026 ([E], [F]). As páginas usadas não dizem a qual versão os números se referem. Trate-os como aproximados.

**Como os dados foram obtidos:**
- As tabelas de unidades e edifícios vêm principalmente de duas páginas de uma base de dados de fãs ([A] e [B]). São páginas do mesmo site e contam como uma fonte só.
- As páginas foram lidas por um resumidor automático. Um valor pode ter erro de leitura: confira na página de origem antes de codificar.
- Quando as fontes divergem, o conflito está marcado e listado em §9.
- Várias páginas estavam bloqueadas (HTTP 402/403) ou renderizadas só por JavaScript. Estão listadas no Anexo B.

**Legenda da coluna "Conf.":**
- **2 fontes:** o valor aparece em duas fontes de domínios diferentes.
- **1 fonte:** o valor vem de uma fonte. Está também listado em §9.
- **incerto:** não encontrado ou em conflito. Ver §9.

---

## 1. Recursos, aldeões, população e casas

### 1.1 Recursos
- Quatro recursos: comida, madeira, ouro e pedra. **2 fontes** ([S], [A]).
- Capacidade de carga base e taxas de coleta base por recurso: **incerto** (nenhuma fonte verificada). Ver §9.1.

### 1.2 Aldeão

| Campo | Valor | Conf. | Fonte |
|---|---|---|---|
| Custo | 50 comida | 1 fonte | [A], [B] |
| Tempo de treino | 20 s (Inglaterra) / 19 s (França) | incerto (conflito) | [A], [B] |
| Vida | 50 | 1 fonte | [A], [B] |
| Ataque | 5 à distância (Inglaterra) / 6 corpo a corpo (França) | incerto (conflito) | [A], [B] |
| Velocidade | 1,125 tiles/s | 1 fonte | [A], [B] |
| Edifício de treino | incerto | incerto | ver §9.1 |
| Capacidade de carga | incerto | incerto | ver §9.1 |
| Taxa de coleta base | incerto | incerto | ver §9.1 |
| Modificador conhecido | Horticultura: +10% de coleta de comida, sem caça | 1 fonte | [D] |

### 1.3 Casas e população

| Campo | Valor | Conf. | Fonte |
|---|---|---|---|
| Custo da casa | 50 madeira | 1 fonte | [A], [B] |
| Tempo de construção | 15 s | 1 fonte | [A], [B] |
| Vida | 750 | 1 fonte | [A], [B] |
| Tamanho (tiles) | incerto | incerto | nenhuma fonte |
| População fornecida por casa | incerto | incerto | ver §9.1 |
| População máxima | incerto | incerto | ver §9.1 |
| Atualização de patch | sem mudança nas casas no patch 5.1.148.1 | 1 fonte | [N] |

---

## 2. Edifícios principais

### 2.1 Edifícios comuns
Custos e vida são iguais nas duas civilizações, exceto onde indicado. Os bônus da França reduzem custos de edifícios de entrega e do Keep.

| Edifício | Função | Custo | Construção (s) | Vida | Tamanho (tiles) | Conf. |
|---|---|---|---|---|---|---|
| Centro da Vila | Economia e população; treina aldeões; guarnição 8 | 400 madeira + 300 pedra | 150 | 2500 | incerto | 1 fonte [A], [B] |
| Centro da Vila capital | Marco econômico e populacional; guarnição 15 | não encontrado | não encontrado | 7000 | incerto | 1 fonte [A], [B] |
| Casa | População | 50 madeira | 15 | 750 | incerto | 1 fonte [A], [B] |
| Fazenda | Entrega de comida | 37 madeira (Inglaterra, com bônus) / 75 madeira (França) | 6 | 300 | incerto | 1 fonte [A], [B]; bônus 2 fontes [A], [J] |
| Acampamento de madeira | Entrega de madeira | 50 madeira (25 com bônus da França) | 20 | 750 | incerto | 1 fonte [A], [B] |
| Acampamento de mineração | Entrega de ouro e pedra | 50 madeira (25 com bônus da França) | 20 | 750 | incerto | 1 fonte [A], [B] |
| Moinho | Entrega de comida; alvo do bônus de fazendas (Inglaterra) | 50 madeira (25 com bônus da França) | 20 | 750 | incerto | 1 fonte [A], [B] |
| Mercado | Comércio; mercado recebe comerciantes | 100 madeira | 20 | 1000 | incerto | 1 fonte [A], [B] |
| Posto avançado | Defesa; guarnição 5 | 100 madeira | 60 | 750 | incerto | 1 fonte [A], [B] |
| Quartel | Treino de infantaria | 150 madeira | 30 | 1500 | incerto | 1 fonte [A], [B] |
| Campo de tiro com arco | Treino de arqueiros | 150 madeira | 30 | 1500 | incerto | 1 fonte [A], [B] |
| Estábulo | Treino de cavalaria | 150 madeira | 30 | 1500 | incerto | 1 fonte [A], [B] |
| Ferreiro | Pesquisa de armas e armaduras | 150 madeira | 25 | 1500 | incerto | 1 fonte [A], [B] |
| Mosteiro | Treino religioso | 200 madeira | 25 | 2100 | incerto | 1 fonte [A], [B] |
| Universidade | Pesquisa avançada | 450 madeira | 60 | 2100 | incerto | 1 fonte [A], [B] |
| Oficina de cerco | Treino de máquinas de cerco | 250 madeira | 45 | 2100 | incerto | 1 fonte [A], [B] |
| Doca | Treino de navios | 150 madeira | 30 | 1750 | incerto | 1 fonte [A], [B] |
| Keep | Defesa; treina todas as unidades militares (Inglaterra) | 900 pedra (Inglaterra) / 810 pedra (França) | 180 | 5000 | incerto | 1 fonte [A], [B]; bônus 2 fontes [A], [K] |
| Torre de pedra | Defesa | 250 pedra | 90 | 3000 | incerto | 1 fonte [A], [B] |
| Paliçada | Defesa | 7 madeira | 8 | 1350 | incerto | 1 fonte [A], [B] |
| Portão de paliçada | Defesa | 25 madeira | 10 | 1350 | incerto | 1 fonte [A], [B] |
| Muro de pedra | Defesa | 25 pedra | 16 | 3000 | incerto | 1 fonte [A], [B] |
| Portão de pedra | Defesa | 50 pedra | 30 | 3000 | incerto | 1 fonte [A], [B] |

### 2.2 Marcos (landmarks) e maravilhas, por civilização
Nomes e idades: [G] (duas fontes para cada nome, junto com [J] para a Inglaterra e [L] para a França). Custos e tempos: [A] e [B], uma fonte, exceto o custo da idade II (ver §4).

**Inglaterra**

| Marco | Idade | Função | Custo | Construção (s) | Vida | Conf. |
|---|---|---|---|---|---|---|
| Concílio (Council Hall) | Feudal (II) | Militar: aumenta a produção de arqueiros longos (+100% segundo [J]) | 400 comida + 200 ouro | 190 | 5000 | nome 2 fontes; custo 1 fonte [A] |
| Abadia dos Reis (Abbey of Kings) | Feudal (II) | Religioso: cura unidades ociosas próximas; treina o Rei | 400 comida + 200 ouro | 190 | 5000 | nome 2 fontes [G], [J]; custo 1 fonte [A] |
| Torre Branca (White Tower) | Castelo (III) | Defensivo: age como Keep | 1200 comida + 600 ouro | 220 | 5000 | nome e idade 2 fontes [G], [J]; custo 1 fonte [A]; conflito com [K] (diz Idade II) |
| Palácio Real (King's Palace) | Castelo (III) | Econômico: age como Centro da Vila | 1200 comida + 600 ouro | 220 | 5000 | nome e função 2 fontes [G], [K]; custo 1 fonte [A] |
| Palácio de Berkshire (Berkshire Palace) | Imperial (IV) | Defensivo: age como Keep, com +50% de alcance | 2400 comida + 1200 ouro | 250 | 6500 | nome e função 2 fontes [G], [J]; custo 1 fonte [A] |
| Palácio de Wynguard (Wynguard Palace) | Imperial (IV) | Militar: produz quatro batalhões Wynguard | 2400 comida + 1200 ouro | 250 | 5000 (tabela) / 6500 (página própria) | nome 2 fontes [G], [K]; custo 1 fonte [A], [C]; vida em conflito |
| Catedral de St. Thomas (Wonder) | Imperial | Maravilha (ver §8) | 5000 de cada recurso | 600 | 5000 | 1 fonte [A]; conflito de custo com [M] (ver §8) |

**França**

| Marco | Idade | Função | Custo | Construção (s) | Vida | Conf. |
|---|---|---|---|---|---|---|
| Câmara de Comércio (Chamber of Commerce) | Feudal (II) | Econômico: aumenta retorno de carroças de comércio | 400 comida + 200 ouro | 190 | 5000 | nome e idade 2 fontes [G], [L]; custo 1 fonte [B] |
| Escola de Cavalaria (School of Cavalry) | Feudal (II) | Militar: acelera estábulos (número não verificado) | 400 comida + 200 ouro | 190 | 5000 | nome 1 fonte [G]; custo 1 fonte [B] |
| Sede da Guilda (Guild Hall) | Castelo (III) | Função não confirmada | 1200 comida + 600 ouro | 220 | 5000 | nome 1 fonte [G]; custo 1 fonte [B]; função incerta |
| Instituto Real (Royal Institute) | Castelo (III) | Tecnológico: abriga as tecnologias exclusivas francesas | 1200 comida + 600 ouro | 220 | 5000 | nome e idade 2 fontes [G], [L]; custo 1 fonte [B] |
| Palácio Vermelho (Red Palace) | Imperial (IV) | Defensivo: ataque à distância 60, alcance 10 | 2400 comida + 1200 ouro | 250 | 5000 | nome 1 fonte [G]; custo e stats 1 fonte [B] |
| Colégio de Artilharia (College of Artillery) | Imperial (IV) | Militar: libera unidades de pólvora (artilharia) | 2400 comida + 1200 ouro | 250 | 5000 | nome e idade 2 fontes [G], [L]; custo 1 fonte [B] |
| Notre Dame (Wonder) | Imperial | Maravilha | 5000 de cada recurso | 600 | 5000 | 1 fonte [B]; conflito de custo com [M] |

---

## 3. Unidades

### 3.1 Inglaterra

| Unidade | Custo | Treino (s) | Vida | Ataque corpo / distância | Armadura corpo / distância | Alcance (tiles) | Velocidade (tiles/s) | Treinada em | Idade mínima | Papel e counters | Conf. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Aldeão | 50 comida | 20 | 50 | — / 5 | incerto | 5 | 1,125 | incerto | — | Coleta; ataca com arco curto [J], [K] | 1 fonte [A] |
| Rei (King) | 100 comida + 100 ouro | 50 | 220 | 16 / — | 2 / 2 | incerto | 1,6875 | Abadia dos Reis [I] | incerto | Unidade montada, sai da Abadia [I] | 1 fonte [A]; edifício 1 fonte [I] |
| Homem de Armas Vanguarda (Vanguard Man-at-Arms) | 90 comida + 20 ouro | 14,65 | 180 | 14 / — | 5 / 6 | corpo a corpo | 1,125 | incerto | Idade das Trevas (I) | Pesado; ataque 1,375 s. Flechas comuns são ineficientes [I] | idade 3 fontes [A], [J], [K]; números 1 fonte [A] |
| Lanceiro Endurecido (Hardened Spearman) | 60 comida + 20 madeira | 15 | 140 | 11 / — | incerto | corpo a corpo | 1,3 | incerto | incerto | Anticavalaria [I] | 1 fonte [A] |
| Arqueiro Longo (Longbowman) | 40 comida + 50 madeira | 15 | 95 | — / 9 | incerto | 7 | 1,125 | incerto (Campo de tiro: resumo de busca) | Feudal (II) [J] | Alcance longo; coloca estacas [J]; forte contra lanceiros [I] | 1 fonte [A]; idade 1 fonte [J] |
| Besteiro (Crossbowman) | 80 comida + 40 ouro | 22,5 | 95 | — / 14 | incerto | 5 | 1,125 | incerto | incerto (Castelo, só resumo de busca) | Anti-pesado; fraco contra cavalaria leve [I] | incerto (conflito de vida e ataque; §9.4) |
| Ranger Wynguard (Wynguard Ranger) | 40 comida + 50 madeira | 15 | 125 | — / 12 | incerto | 8 | 1,125 | incerto | incerto | Alcance maior que o Arqueiro Longo [A] | 1 fonte [A]; conflito com busca (§9.4) |
| Arcabuzeiro (Handcannoneer) | 120 comida + 120 ouro | 35 | 130 | — / 38 | incerto | 4 | 1,125 | incerto | incerto | Dano alto à distância, alcance curto | 1 fonte [A], [B] (mesmos valores) |
| Monge (Monk) | 150 ouro | 30 | 90 | incerto | incerto | incerto | 1,125 | incerto (Mosteiro) | incerto | Religioso; função detalhada não verificada | 1 fonte [A] |
| Batedor (Scout) | 65 comida | 23 | 110 | 1 / — | incerto | corpo a corpo | 1,625 | incerto (Estábulo) | incerto | Explorador; bônus contra batedores e cerco [A] | 1 fonte [A] |
| Cavalaria leve (Horseman) | 100 comida + 20 madeira | 22,5 | 180 | 13 / — | incerto / 5 | corpo a corpo | 1,875 | incerto (Estábulo) | incerto | Cavalaria rápida; bônus contra à distância e cerco [A] | 1 fonte [A] |
| Cavaleiro (Knight) | 140 comida + 100 ouro | 35 | 270 | 29 / — | 5 / 5 | corpo a corpo | 1,625 | incerto (Estábulo) | incerto | Pesado; alto dano corpo a corpo | 1 fonte [A] |

**Máquinas de cerco (Inglaterra, 1 fonte [A])**

| Unidade | Custo | Treino (s) | Vida | Alcance (tiles) | Velocidade | Papel e counters |
|---|---|---|---|---|---|---|
| Aríete (Battering Ram) | 200 madeira | 35 | 370 | 0,54 | 0,75 | Contra edifícios |
| Mangonel | 400 madeira + 200 ouro | 40 | 130 | 8 | 0,75 | Contra unidades agrupadas à distância [I]; ataque de cerco incerto |
| Trabuco de contrapeso (Counterweight Trebuchet) | 400 madeira + 150 ouro | 30 | 140 | 16 | 0,625 | Longo alcance |
| Bombarda (Bombard) | 350 madeira + 500 ouro | 45 | 210 | 10 | 0,75 | Cerco pesado |
| Springald | 150 madeira + 100 ouro | 20 | 85 | 7,5 | 0,875 | Contra infantaria corpo a corpo [I] |

Treinadas em oficina de cerco (presumido; não confirmado em fonte). Idade mínima: incerto para todas.

### 3.2 França

| Unidade | Custo | Treino (s) | Vida | Ataque corpo / distância | Armadura corpo / distância | Alcance (tiles) | Velocidade (tiles/s) | Treinada em | Idade mínima | Papel e counters | Conf. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Aldeão | 50 comida | 19 | 50 | 6 / — | incerto | incerto | 1,125 | incerto | — | Coleta (ver conflito em §1.2) | 1 fonte [B] |
| Lança (Spearman) | 60 comida + 20 madeira | 15 | 80 | 7 / — | incerto | corpo a corpo | 1,3 | incerto | incerto | Defesa contra cavalaria [I] | 1 fonte [B] |
| Arqueiro (Archer) | 30 comida + 50 madeira | 15 | 70 | — / 5 | incerto | 5 | 1,25 | incerto (Campo de tiro: busca) | incerto | Arqueiro básico | 1 fonte [B] |
| Arbalétrier | 80 comida + 40 ouro | 22,5 | 80 | — / 11 | 1 / incerto | 5 | 1,125 | incerto | incerto | Anti-pesado; pode montar pavês (escudo) [L] | 1 fonte [B]; consistente com resumo de busca do wiki, não aberto |
| Homem de Armas (Man-at-Arms) | 90 comida + 20 ouro | 20,5 | 155 | 12 / — | 4 / 4 | corpo a corpo | 1,125 | Quartel (resumo de busca) | incerto | Pesado; flechas comuns ineficientes [I] | 1 fonte [B] |
| Arcabuzeiro (Handcannoneer) | 120 comida + 120 ouro | 35 | 130 | — / 38 | incerto | 4 | 1,125 | incerto | incerto | Dano alto à distância | 1 fonte [B] |
| Batedor (Scout) | 65 comida | 21 | 110 | 1 / — | incerto | corpo a corpo | 1,625 | Estábulo (resumo de busca) | incerto | Explorador | 1 fonte [B] |
| Cavalaria leve (Horseman) | 100 comida + 20 madeira | 22,5 | 125 | 9 / — | incerto / 2 | corpo a corpo | 1,875 | Estábulo (resumo de busca) | incerto | Cavalaria rápida | 1 fonte [B] |
| Cavaleiro Real (Royal Knight) | 140 comida + 100 ouro | 35 | 190 | 19 / — | 3 / 3 | corpo a corpo | 1,625 | Estábulo (resumo de busca) | Feudal (II) [B], [L] | Carga: dano temporário após a carga (3 ou 5 s, em conflito, §9.4) | idade 2 fontes; números 1 fonte [B] |

**Máquinas de cerco (França, 1 fonte [B])**

| Unidade | Custo | Treino (s) | Vida | Ataque de cerco | Alcance (tiles) | Velocidade | Papel |
|---|---|---|---|---|---|---|---|
| Aríete (Battering Ram) | 200 madeira | 35 | 370 | 200 | 0,54 | 0,75 | Contra edifícios |
| Springald | 150 madeira + 100 ouro | 20 | 85 | à distância 15 | 7,5 | 0,875 | Contra infantaria |
| Mangonel | 400 madeira + 200 ouro | 40 | 130 | 10 | 8 | 0,75 | Contra unidades agrupadas |
| Trabuco de contrapeso | 400 madeira + 150 ouro | 30 | 140 | 40 | 16 | 0,625 | Longo alcance |
| Canhão Real (Royal Cannon) | 300 madeira + 450 ouro | 45 | 190 | 60 | 10 | 0,875 | Artilharia de pólvora; ver conflito de custo com "Canhão" |
| Canhão (Cannon) | 300 madeira + 600 ouro | 45 | 190 | 60 | 10 | 0,875 | Artilharia móvel, sem montar e desmontar [L] |
| Ribauldequin | 350 madeira + 500 ouro | 45 | 215 | à distância 42 | 3,75 | 0,875 | Artilharia de pólvora |

Idade mínima das máquinas: incerto. Treinadas em oficina de cerco (presumido; não confirmado).

### 3.3 Navios (1 fonte cada, conflito de custo)
- Navio de comércio: 90 madeira + 90 ouro (Inglaterra, [A]) / 100 madeira + 100 ouro (França, [B]); 30 s; vida 225.
- Galera: 72 comida + 135 madeira (Inglaterra) / 80 comida + 150 madeira (França); 25 s; vida 300.
- Navio de pesca: 68 madeira (Inglaterra) / 75 madeira (França); 30 s; vida 100.

### 3.4 Batalhões Wynguard (Inglaterra, Palácio de Wynguard, 1 fonte [A])

| Batalhão | Custo | Treino (s) | População |
|---|---|---|---|
| Exército Wynguard (Wynguard Army) | 100 comida + 100 madeira + 200 ouro | 55 | 6 |
| Footmen Wynguard | 300 comida + 400 ouro | 45 | 6 |
| Raiders Wynguard | 650 comida + 200 ouro | 25 | 6 |
| Rangers Wynguard | 450 madeira + 300 ouro | 45 | 6 |

A lista de unidades do Palácio de Wynguard também diverge entre [C] (batalhões acima) e [K] (menciona homem de armas, lanceiro, arqueiro longo, cavaleiro e trabuco). Ver §9.4.

---

## 4. Idades

Há quatro idades. Para avançar, o jogador constrói um marco da próxima idade. Cada civilização tem duas opções de marco por idade (a maioria escolhe uma; o marco construído permanece com seu efeito) [G].

| Idade | Como avançar | Custo (comida + ouro) | Marco exigido (Inglaterra) | Marco exigido (França) | Tempo de construção | Conf. |
|---|---|---|---|---|---|---|
| I, Idade das Trevas | Ponto de partida | — | — | — | — | 2 fontes [G], [K] |
| II, Feudal | Marco da Feudal | 400 + 200 | Concílio ou Abadia dos Reis | Câmara de Comércio ou Escola de Cavalaria | 190 s | custo 2 fontes [A], [I]; tempo 1 fonte [A] |
| III, Castelo | Marco do Castelo | 1200 + 600 | Palácio Real ou Torre Branca | Sede da Guilda ou Instituto Real | 220 s | custo 1 fonte [A], [B]; tempo 1 fonte |
| IV, Imperial | Marco da Imperial | 2400 + 1200 | Palácio de Berkshire ou Palácio de Wynguard | Palácio Vermelho ou Colégio de Artilharia | 250 s | custo 1 fonte [A], [B]; tempo 1 fonte |

Observações:
- Custos e tempos de III e IV aparecem só em [A] e [B]. Um resumo de busca cita os mesmos valores, mas não tem URL verificada, então não conta como segunda fonte.
- A página oficial [K] diz que a Torre Branca é da Idade II. As fontes [G] e [J] dizem Castelo, como a base [A].

---

## 5. Tecnologias

Só a Horticultura tem custo e tempo de fonte verificada. As demais estão listadas pelo nome e efeito, indicados em resumos de busca de wiki de fãs. Não foram abertas e precisam de conferência.

| Tecnologia | Idade | Custo | Tempo (s) | Efeito | Conf. |
|---|---|---|---|---|---|
| Horticultura (Horticulture) | incerto (busca indica II) | 50 madeira + 100 ouro | 45 | +10% de coleta de comida, sem caça | 1 fonte [D] |
| Carrinho de mão (Wheelbarrow) | I | incerto | incerto | +5 de carga; +15% de velocidade (aldeões) | incerto (resumo de busca) |
| Machado duplo (Double Broadaxe) | II | incerto | incerto | +15% de coleta de madeira | incerto (resumo de busca) |
| Picareta especializada (Specialized Pick) | II | incerto | incerto | +15% de coleta de ouro e pedra | incerto (resumo de busca) |
| Preservação de madeira (Lumber Preservation) | III | incerto | incerto | +15% de coleta de madeira | incerto (resumo de busca) |
| Mineração em poço (Shaft Mining) | III | incerto | incerto | +15% de coleta de ouro e pedra | incerto (resumo de busca) |
| Fertilização (Fertilization) | III | incerto | incerto | +10% de coleta de comida (era +15%; reduzida na patch 12.0.1974, segundo busca) | incerto (resumo de busca) |
| Serra transversal (Crosscut Saw) | IV | incerto | incerto | +15% de coleta de madeira; +5 de carga | incerto (resumo de busca) |
| Técnicas de sobrevivência (Survival Techniques) | incerto | incerto | incerto | +15% de coleta de caça (só animais caçáveis) | incerto (resumo de busca) |
| Melhorias de forja (armas e armaduras) | incerto | incerto | incerto | Dano e armadura de unidades corpo a corpo e à distância | incerto (nomes não verificados) |

Nota: [D] (página da Horticultura) também registra uma fusão em "Horticultura Aprimorada" (+20% de comida, custo de 500 pedra) em 30/10/2025. Não confirmado; ver §9.5.

Habilidade de unidade relevante: o Arqueiro Longo coloca estacas (paliçadas) à sua frente [J]. Dado qualitativo, 1 fonte.

---

## 6. Bônus de civilização

### 6.1 Inglaterra

| Bônus | Efeito | Conf. |
|---|---|---|
| Fazendas mais baratas | Fazendas custam 50% menos madeira | 2 fontes [A], [J]; também [K] (qualitativo) |
| Fazendas perto de moinhos | Fazendas perto de moinhos coletam mais rápido, com bônus crescente por era (+20%, +25%, +30%, +30% em [A]; +15% em [J]) | incerto (conflito de valor) |
| Homem de Armas Vanguarda na Idade das Trevas | Libera o Homem de Armas Vanguarda já na Idade I | 3 fontes [A], [J], [K] |
| Aldeões com arco curto | Aldeões atacam unidades inimigas com arco curto | 3 fontes [A], [J], [K] |
| Rede de Castelos | Centro da Vila, Posto avançado, Torre e Keep dão +20% de velocidade de ataque a unidades próximas quando há inimigo no alcance ([A]); [J] (2021) diz +25% | efeito 2 fontes; valor incerto (conflito) |
| Rede de Cidadelas (Keep) | +30% extra ao pesquisar a rede no Keep | 1 fonte [A] |
| Keep treina todas as unidades militares | Keep produz todas as unidades militares | 2 fontes [A], [K] |
| Centro da Vila: flecha extra | Centro da Vila capital dispara uma flecha extra ([A]); [J] (2021) diz que atira o dobro de flechas | incerto (conflito) |
| Navios | Navios custam 10% menos ([A]); [J] (2021) diz +1 de alcance em navios militares | incerto (ambos podem valer; §9.6) |
| Homem de Armas mais rápido | Produção de Homens de Armas 40% mais rápida | 1 fonte [A] |
| Fogueiras de batedores e Homens de Armas | +10% de visão e de caça perto da fogueira | 1 fonte [A] |
| Recinto (Idade IV) | Aldeões em fazendas geram ouro ao longo do tempo ([A]: +1 de ouro a cada 6 s) | 1 fonte numérica [A]; efeito qualitativo em [K] |

Marcos e unidades únicas: Concílio, Abadia dos Reis, Palácio Real, Torre Branca, Palácio de Berkshire, Palácio de Wynguard, Catedral de St. Thomas (maravilha), Homem de Armas Vanguarda, Arqueiro Longo, Rei [A], [K].

### 6.2 França

| Bônus | Efeito | Conf. |
|---|---|---|
| Cavaleiro Real na Idade Feudal | Libera o Cavaleiro Real na Feudal | 2 fontes [B], [L] |
| Centro da Vila mais rápido por idade | Taxa de trabalho +15%, +15%, +20%, +25% por idade | 1 fonte [B]; efeito qualitativo em [L] |
| Edifícios de entrega mais baratos | Edifícios de entrega custam 50% menos | 1 fonte [B] |
| Tecnologias econômicas mais baratas | Tecnologias econômicas custam 35% menos ([B]); resumo de busca diz 30% | incerto (conflito) |
| Navios de comércio | Trazem 20% mais recursos | 1 fonte [B] |
| Ferreiros | Dão de graça as tecnologias de dano corpo a corpo após cada idade | 1 fonte [B] |
| Comerciantes | Levam recursos ao mercado: comida, madeira e ouro em [B]; qualquer recurso em [L] | 2 fontes [B], [L] (o escopo exato difere) |
| Influência do Keep | Keeps custam 10% menos; unidades de campo de tiro e estábulo dentro da área de influência custam 20% menos | números 1 fonte [B]; efeito 2 fontes [B], [L] |
| Postos de comércio | Aparecem no minimapa | 1 fonte [B] |

Marcos e unidades únicas: Câmara de Comércio, Escola de Cavalaria, Sede da Guilda, Instituto Real, Palácio Vermelho, Colégio de Artilharia, Notre Dame (maravilha), Cavaleiro Real, Arbalétrier, Canhão [B], [L].

Resumo oficial por idade [L] (1 fonte, qualitativo):
- Idade I: tecnologias econômicas mais baratas; moinho e mina de ouro mais baratos.
- Idade II: com a Câmara de Comércio construída antes, as carroças de comércio trazem mais recursos.
- Idade III: o Instituto Real libera tecnologias exclusivas com custo reduzido.
- Idade IV: o Colégio de Artilharia libera unidades de pólvora com dano extra, sem a tecnologia de Química.

---

## 7. HUD e atalhos

### 7.1 Regiões da tela

Nenhuma fonte verificada mostra um diagrama do HUD do AoE IV. As posições abaixo estão marcadas como incertas. O que se confirmou é a existência do elemento e, quando indicado, o seu uso.

| Região | O que contém | Posição | Conf. |
|---|---|---|---|
| Barra de recursos | Quatro recursos (comida, madeira, ouro, pedra) | incerto | 2 fontes [S], [A] (recursos); posição incerta |
| Contador de população | População atual e teto; ícone fica vermelho ao atingir o teto (relato de jogador) | incerto | 1 fonte (busca) |
| Minimapa | Terreno e unidades. Sem filtros, segundo a equipe oficial no fórum (sem data). Melhorias de legibilidade anunciadas | incerto | 1 fonte (busca) |
| Painel de seleção | Unidades selecionadas; ciclo com Tab; painel secundário com Y (Ctrl+Y) | incerto | 2 fontes [O], [P] (teclas) |
| Grade de comandos | Botões de construção e treino; atalhos por tecla | incerto | atalhos 2 fontes; layout incerto |
| Fila de produção | Fila global de construção e treino; itens cancelados por atalho global | incerto | 1 fonte (busca) |
| Escala de texto do HUD | Texto de 100% a 150%; modo de alto contraste | incerto | 1 fonte (busca; página de acessibilidade não aberta) |

### 7.2 Atalhos padrão (PC)

Atalhos de 2021 (lançamento). Confira em Configurações > Controles > Ver e remapear controles > Teclas comuns. Esse caminho está em [O] (1 fonte).

| Ação | Tecla padrão | Fontes | Conf. |
|---|---|---|---|
| Selecionar unidade | Clique esquerdo | [P] | 1 fonte |
| Selecionar todas as unidades do mesmo tipo na tela | Duplo clique esquerdo, ou Ctrl + clique esquerdo | [P] | 1 fonte |
| Adicionar/remover unidade da seleção | Shift + clique esquerdo | [P] | 1 fonte |
| Selecionar unidades na área (caixa) | Clique esquerdo e arrastar | [P] | 1 fonte |
| Selecionar todas as unidades na tela | Ctrl + A (alternativa: Ctrl + K) | [P] | 1 fonte |
| Selecionar todas as unidades | Ctrl + Shift + A (alternativa: Ctrl + Shift + K) | [P] | 1 fonte |
| Ciclar entre unidades selecionadas | Tab (anterior: Ctrl + Tab) | [O], [P] | 2 fontes |
| Painel secundário da interface | Y com unidade selecionada (alternativa: Ctrl + Y) | [P] | 1 fonte |
| Selecionar todas as unidades militares | Ctrl + Shift + C (alternativa: Ctrl + M) | [P] | 1 fonte |
| Selecionar edifícios militares | F1 (alternativa: M) | [O], [P] | 2 fontes |
| Selecionar edifícios econômicos | F2 (alternativa: K) | [O], [P] | 2 fontes |
| Selecionar edifícios de pesquisa | F3 (alternativa: O) | [O], [P] | 2 fontes |
| Selecionar maravilhas, marcos e centros da vila capitais | F4 (alternativa: P) | [P] | 1 fonte |
| Centralizar a câmera no Centro da Vila | H | [O], [P] | 2 fontes |
| Focar no Centro da Vila capital | Ctrl + H (alternativa: Ctrl + L) | [P] | 1 fonte |
| Definir grupo de controle | Ctrl + 0–9 | [O], [P] | 2 fontes |
| Selecionar grupo de controle | 0–9 (dois toques centralizam a câmera) | [P] | 1 fonte |
| Adicionar seleção ao grupo | Shift + 0–9 | [P] | 1 fonte |
| Apagar grupo | Ctrl + 0–9 sem nenhuma unidade selecionada | [P] | 1 fonte |
| Girar a câmera (segurando) | Alt + mover o mouse (alternativa: Caps Lock) | [O], [P] | 2 fontes |
| Girar a câmera 45° | [ (anti-horário) e ] (horário) | [P] | 1 fonte |
| Resetar câmera | Backspace (alternativa: Num 0) | [O], [P] | 2 fontes |
| Focar nas unidades selecionadas | F5 (alternativa: J) | [P] | 1 fonte |
| Seguir unidade selecionada | Home | [P] | 1 fonte |
| Mover a câmera | Alt + W / A / S / D | [P] | 1 fonte |
| Selecionar aldeões ociosos (economia) | . (ponto) | [O], [P] | 2 fontes |
| Selecionar militares ociosos | , (vírgula) | [P] | 1 fonte |
| Selecionar todos os aldeões ociosos | Ctrl + . | [P] | 1 fonte |
| Enfileirar vários comandos ou produção | Shift + qualquer comando (ou Shift + tecla de produção, para 5 unidades) | [O], [P] | 2 fontes |
| Enfileirar construção ou habilidade | Shift + clique esquerdo no chão | [P] | 1 fonte |
| Chat com a equipe | Enter (todos: Shift + Enter) | [O] | 1 fonte |

**Teclas de construção por era (fonte única, incertas):** [O] lista teclas de construção por era (ex.: Casa Q, Moinho S, Fazenda X; Quartel Q, Doca W, Posto avançado E, Oficina de cerco Q). A própria lista aponta duplicatas (Casa e Quartel com Q; Torre de pedra e Doca com W). Não usar sem conferir no jogo. A tecla do menu de construção geral não foi encontrada.

---

## 8. Condições de vitória

| Condição | Regra | Números | Conf. |
|---|---|---|---|
| Vitória por marcos (Landmarks) | Destruir todos os marcos do jogador adversário o elimina. Em equipe, todos os marcos da equipe adversária | Não há tempo. Existência confirmada pela conquista "By Force" (vitória por marcos) e "Make It Quick" (vitória por marcos na Idade I) [Q] | existência 1 fonte [Q]; regra detalhada 1 fonte (busca) |
| Locais sagrados (Sacred Sites) | Controlar todos os locais sagrados do mapa. Vence quem mantém todos por uma contagem regressiva | Contagem regressiva de 10 min; reseta se perder um local; pausa se há inimigo dentro; 100 de ouro por minuto por local, para quem capturou [R] | existência 1 fonte [Q]; números 1 fonte [R] (post de fórum de 20/04/2025) |
| Maravilha (Wonder) | Construir a maravilha e defendê-la até a contagem terminar | Construção de 600 s [A], [B]. Contagem de 30 min após a conclusão (guia de comunidade, busca): incerto | existência 1 fonte [Q]; tempo de construção 2 fontes [A], [B] (mesmo site); contagem incerta |
| Relíquias | Não há regra de vitória por relíquias confirmada para o AoE IV | — | incerto |
| Eliminação total (conquista) | Em partidas personalizadas, desativar as três condições deixa só a eliminação total | — | incerto (resumo de busca de fórum) |

**Custo da maravilha (conflito):** [A] e [B] dão 5000 de cada recurso (Catedral e Notre Dame). O anúncio oficial da patch 5.0.11963.0 diz que o custo base subiu de 3000 para 6000 por recurso, e o dos mongóis de 4000 para 8000 [M]. Não se sabe qual valor vale na versão atual. Ver §9.3.

**Rendição (incerto):** um post de fórum diz que a rendição conta como vitória por marcos. Resumo de busca, não aberto.

---

## 9. Incertezas

Esta seção lista todo valor que não foi confirmado em pelo menos duas fontes independentes, com a fonte de cada um. Valores de fonte única aparecem por tabela e campo, com a fonte indicada. Valores em conflito aparecem com as duas versões.

### 9.1 Economia, aldeões, casas e população
- **Aldeão, tempo de treino:** 20 s [A] (Inglaterra) vs 19 s [B] (França). Conflito dentro do mesmo site.
- **Aldeão, ataque:** 5 à distância [A] vs 6 corpo a corpo [B].
- **Aldeão, edifício de treino (Centro da Vila):** não confirmado em fonte aberta. Página de Centro da Vila de [ludo.guide] descartada (ver Anexo B).
- **Capacidade de carga base (todos os recursos):** sem fonte verificada.
- **Taxas de coleta base por recurso:** sem fonte verificada.
- **Melhorias de coleta (valores de busca, não abertos):** Carrinho de mão (+5 carga, +15% velocidade); Machado duplo, Preservação de madeira, Serra transversal (+15% madeira cada, Serra +5 carga); Picareta especializada e Mineração em poço (+15% ouro e pedra); Fertilização (+10%, era +15%); Sobrevivência (+15% caça). Fontes: wiki de fãs do AoE e aoe4world, citadas em busca.
- **Casa, custo:** 50 madeira [A], [B] (fonte única, mesmo site). Página de casa de Bizantinos em aoe4world citada em busca (50 madeira, 15 s), não aberta. Conflito: 30 madeira em [ludo.guide] (descartado).
- **Casa, vida:** 750 [A], [B]. Conflito: 75 em [ludo.guide] (descartado).
- **Casa, população fornecida:** incerto. Resumo de busca diz 10 (wiki AoE, não aberto); outro resumo cita 5 para malineses; [ludo.guide] diz 4 (descartado).
- **População máxima:** incerto. Não há fonte verificada para o teto de 200.
- **Aldeões sem casa:** um guia de comunidade citado em busca diz que o teto sem casa é 11. URL não confirmada.
- **Centro da Vila, população fornecida:** incerto.
- **Centro da Vila, custo e vida:** 400 madeira + 300 pedra e vida 2500 [A], [B] (fonte única). Conflito: 200 madeira e vida 600 em [ludo.guide] (descartado).
- **Centro da Vila, tamanho em tiles:** incerto.
- **Fazenda, custo base:** 75 madeira [B], com bônus 37 [A]. Fonte única. Conflito: 75 madeira e vida 50 em [ludo.guide] (descartado). Vida 300 em [A], [B].
- **Acampamentos e moinho, custo base:** 50 madeira [A]; 25 com bônus francês [B]. Fonte única.
- **Tamanhos em tiles de todos os edifícios e unidades:** sem fonte verificada.

### 9.2 Edifícios militares, defesas e pesquisa
Todos os valores da tabela §2.1 que não aparecem em duas fontes são de fonte única ([A] e [B] são o mesmo site). Lista por edifício:
- Quartel, Campo de tiro, Estábulo: 150 madeira, 30 s, vida 1500. Fonte única.
- Ferreiro: 150 madeira, 25 s, vida 1500. Fonte única.
- Mercado: 100 madeira, 20 s, vida 1000. Fonte única.
- Mosteiro: 200 madeira, 25 s, vida 2100. Fonte única.
- Universidade: 450 madeira, 60 s, vida 2100. Fonte única.
- Oficina de cerco: 250 madeira, 45 s, vida 2100. Fonte única.
- Doca: 150 madeira, 30 s, vida 1750. Fonte única.
- Posto avançado: 100 madeira, 60 s, vida 750, guarnição 5. Fonte única.
- Keep: 900 pedra (Inglaterra) e 810 pedra (França, com bônus de -10%), 180 s, vida 5000. Fonte única, mas coerente internamente.
- Torre de pedra, paliçada, portões e muros: custos e tempos da §2.1. Fonte única.
- Edifícios que treinam cada unidade: incerto para a maioria (ver §3).

### 9.3 Marcos e maravilhas
- **Custo do marco da Castelo e Imperial (1200/600 e 2400/1200):** 1 fonte [A], [B]. Um resumo de busca cita os mesmos valores, mas sem URL verificada.
- **Tempo do marco da Castelo (220 s) e da Imperial (250 s):** 1 fonte [A], [B].
- **Tempo do marco da Feudal (190 s):** 1 fonte [A], [B]; um resumo de busca cita "3 min 10 s" (progameguides, não aberto).
- **Vida do Palácio de Wynguard:** 5000 [A] (tabela) vs 6500 [C] (página própria; inclui +1500 de Arquitetos da Corte).
- **Torre Branca, idade:** Castelo [G], [J] vs Idade II [K] (conflito; a maioria diz Castelo).
- **Concílio, aumento de produção:** +100% segundo [J] (2021). Número fonte única.
- **Escola de Cavalaria, efeito (+20% em estábulos):** resumo de busca, não aberto.
- **Sede da Guilda, função:** incerto.
- **Palácio Vermelho, números (vida 5000, alcance 10, ataque à distância 60):** 1 fonte [B]. Nome e idade 1 fonte [G].
- **Maravilhas (Catedral de St. Thomas, Notre Dame):** 5000 de cada recurso e 600 s [A], [B] (fonte única). Conflito com [M]: custo base de 6000 por recurso (patch 5.0.11963.0, oficial, data não informada; pode ter sido alterado depois).
- **Contagem regressiva da maravilha:** 30 min (guia de comunidade, busca), não aberto. Incerto.

### 9.4 Unidades
- **Todas as estatísticas numéricas da §3** (custo, treino, vida, ataque, armadura, alcance, velocidade) vêm de [A] e [B] (mesmo site). Fonte única, exceto onde indicado.
- **Besteiro (Inglaterra):** vida 95 e ataque 14 [A] vs 80 e 11 (regular) e 95 e 14 (elite) em resumo do wiki de fãs (busca). Conflito.
- **Ranger Wynguard:** resumo de busca diz custo 27 maior e tempo 80% menor que o Arqueiro Longo. [A] dá o mesmo custo (40/50) e tempo (15 s) para os dois. Conflito.
- **Rei:** custo de Abadia (100 comida + 100 ouro) citado em busca como redução de 150/150. Não aberto.
- **Arqueiro Longo, treinado em:** Campo de tiro [resumo de busca]. Não aberto.
- **Arqueiro Longo, idade:** Feudal [J] (1 fonte) e resumo de busca (não aberto).
- **Besteiro, idade mínima:** Castelo, só resumo de busca (não aberto).
- **Homem de Armas (França), treinado em:** Quartel, só resumo de busca.
- **Batedor, Cavalaria leve e Cavaleiro Real, treinados em:** Estábulo, resumo de busca (progameguides, 403, não aberto).
- **Cavaleiro Real, bônus de carga:** +3 de dano por 5 s [resumo aoe4world] vs 3 s [guia de diamondlobby]. Conflito; não aberto.
- **Cavalaria leve (Inglaterra) vs (França):** valores diferentes (vida 180 vs 125; ataque 13 vs 9). Fonte única cada.
- **Canhão Real vs Canhão:** 300 madeira + 450 ouro vs 300 madeira + 600 ouro; Ribauldequin 350 madeira + 375 ouro vs 500 ouro; Culverin 325 madeira + 550 ouro. Duplicatas em [B]. Incerto.
- **Navios:** Navio de comércio (90/90 vs 100/100), Galera (72+135 vs 80+150). Fonte única cada, conflito entre civilizações.
- **Batalhões Wynguard, unidades:** [C] (Exército, Rangers, Raiders, Footmen) vs [K] (MAA, lanceiro, arqueiro longo, cavaleiro, trabuco). Conflito.
- **Contramedidas (counters):** de [I] (1 fonte, guia de iniciantes). Não há estatística que as confirme.

### 9.5 Tecnologias e idades
- **Horticultura, idade:** incerta (busca indica II).
- **Horticultura, "Horticultura Aprimorada" (+20%, 500 pedra) em 30/10/2025:** só em [D]; não confirmado.
- **Todas as tecnologias de §5 exceto Horticultura:** custo, tempo e efeito numérico, só de resumo de busca (wiki de fãs e aoe4world), não abertos.
- **Custo da Feudal (400 comida + 200 ouro):** 2 fontes ([A], [I]). Não está nesta lista.

### 9.6 Bônus de civilização
- **Fazendas perto de moinhos:** +20/25/30/30% por idade [A] vs +15% [J] (2021). Conflito.
- **Rede de Castelos:** +20% [A] vs +25% [J]. Conflito.
- **Rede de Cidadelas (Keep, +30%):** 1 fonte [A].
- **Centro da Vila (flecha extra):** 1 flecha [A] vs 2x flechas [J]. Conflito.
- **Navios:** -10% custo [A] vs +1 de alcance [J]. Conflito.
- **Homem de Armas: produção +40%:** 1 fonte [A].
- **Fogueiras (+10% visão e caça):** 1 fonte [A].
- **Recinto (+1 ouro a cada 6 s):** 1 fonte [A]; efeito qualitativo em [K].
- **França, Centro da Vila (+15/+15/+20/+25%):** 1 fonte [B].
- **França, entrega (-50%):** 1 fonte [B].
- **França, tecnologias econômicas (-35%):** [B] vs -30% em resumo de busca. Conflito.
- **França, navios de comércio (+20%):** 1 fonte [B].
- **França, ferreiros (tecnologias grátis):** 1 fonte [B].
- **França, Keep (-10%) e unidades de campo de tiro e estábulo (-20%):** números 1 fonte [B]; efeito 2 fontes.
- **França, resumo oficial por idade:** 1 fonte [L] (qualitativo).

### 9.7 Vitória
- **Locais sagrados (10 min, reset, pausa, 100 ouro/min):** 1 fonte [R] (post de fórum de 20/04/2025, de usuário, não de fonte oficial).
- **Maravilha (contagem de 30 min):** guia de comunidade citado em busca, não aberto. Incerto.
- **Maravilha (custo):** 5000 [A], [B] vs 6000 por recurso [M]. Conflito.
- **Relíquias:** sem regra confirmada. Resumo de busca diz que maravilhas guardam até 3 relíquias nas campanhas. Incerto.
- **Rendição conta como vitória por marcos:** post de fórum, busca, não aberto. Incerto.
- **Eliminação total em partidas personalizadas:** resumo de busca de fórum. Incerto.

### 9.8 HUD
- **Posição de cada região (barra de recursos, população, minimapa, painel de seleção, grade de comandos, fila):** nenhuma fonte verificada com diagrama. Incerto. A indicação "barra superior" de um tutorial do AoE II foi descartada (Anexo B).
- **Fila global de produção:** resumo de busca, não aberto. Existência 1 fonte.
- **Minimapa:** sem filtros; melhorias prometidas (fórum oficial, sem data). Incerto.
- **Escala de texto (100% a 150%) e modo de alto contraste:** resumo de busca (página de acessibilidade não aberta). Incerto.
- **Conteúdo do painel secundário (Y / Ctrl+Y):** não identificado. Incerto.

### 9.9 Atalhos
- **Teclas de construção por era:** [O] (1 fonte), com duplicatas. Incertas. Ver §7.2.
- **Tecla do menu de construção geral:** não encontrada.
- **Teclas individuais de produção:** não encontradas ([P]).
- **Tecla de cancelar (Esc):** resumo de busca. Incerto.
- **Ctrl + . (todos os aldeões ociosos):** [P] (1 fonte).
- **Todos os atalhos de §7.2:** são de 2021. Podem ter mudado.

### 9.10 Versão e método
- **Versão dos números:** incerta. [A] e [B] não têm data. A patch mais recente encontrada é 16.2.10884 ([E], [F]); a [F] não traz mudanças de unidades, casas, Centro da Vila ou idades.
- **Leitura automática:** os valores foram extraídos por um resumidor. Conferir na página de origem antes de codificar.

---

## Anexo A. Fontes verificadas (abertas e lidas)

| Código | Fonte | URL | Usada em |
|---|---|---|---|
| [A] | AoE4 Helper (aoe4.club), página da Inglaterra | https://www.aoe4.club/en/civs/english | §1, §2, §3, §4, §6, §8 |
| [B] | AoE4 Helper (aoe4.club), página da França | https://www.aoe4.club/en/civs/french | §1, §2, §3, §4, §6, §8 |
| [C] | AoE4 Helper, Palácio de Wynguard | https://www.aoe4.club/en/civs/english/buildings/wynguard-palace | §2, §3.4 |
| [D] | AoE4 Helper, Horticultura | https://www.aoe4.club/en/civs/orderofthedragon/technologies/horticulture | §1.2, §5 |
| [E] | AoE4 Helper, lista de patches | https://www.aoe4.club/en/patchs | Versão |
| [F] | AoE4 Helper, patch 16.2.10884 | https://www.aoe4.club/en/patchs/age-of-empires-iv-patch-16-2-10884 | Versão |
| [G] | GuildOrder, marcos por idade | https://guildorder.com/games/aoe4/wiki/age-progression-landmarks | §2.2, §4 |
| [H] | GuildOrder, identidades de civilização (lida; sem números) | https://guildorder.com/games/aoe4/guides/civ-identities-and-uniques | §6 (contexto) |
| [I] | Pixel Twelve, guia para iniciantes (publicado em 19/09/2026) | https://pixeltwelve.com/articles/age-of-empires-4-beginner-guide-landmarks-counters | §3, §4 |
| [J] | TheGamer, guia da Inglaterra (nov/2021) | https://www.thegamer.com/age-of-empires-iv-english-civilization-guide/ | §2.2, §3, §6 |
| [K] | Age of Empires (oficial), civilização inglesa | https://www.ageofempires.com/games/age-of-empires-iv/civilizations/english/ | §2.2, §3, §4, §6 |
| [L] | Age of Empires (oficial), civilização francesa | https://ageofempires.com/games/age-of-empires-iv/civilizations/french | §2.2, §3, §4, §6 |
| [M] | Age of Empires (oficial), patch 5.0.11963.0 | https://www.ageofempires.com/news/age-of-empires-iv-patch-11963/ | §8, §9.3 |
| [N] | Age of Empires (oficial), patch 5.1.148.1 | https://www.ageofempires.com/news/age-of-empires-iv-server-side-patch-5-1-148-1/ | §1.3 |
| [O] | Age of Empires (oficial), atalhos revelados (2021) | https://www.ageofempires.com/news/aoeiv-shortcuts-revealed/ | §7 |
| [P] | Xbox Wire, atalhos revelados (2021) | https://news.xbox.com/en-us/2021/10/22/age-of-empires-iv-hotkeys-revealed/ | §7 |
| [Q] | Xbox Wire, lista de conquistas (2021) | https://news.xbox.com/es-latam/2021/10/11/conoce-la-lista-de-logros-de-age-of-empires-iv/ | §8 |
| [R] | Fórum oficial, post de 20/04/2025 sobre locais sagrados | https://forums.ageofempires.com/t/you-dont-have-to-hold-on-to-sacred-sites/273581 | §8 |
| [S] | InvenGlobal, guia de recursos (2021) | https://www.invenglobal.com/articles/15515/aoe-4-resource-economy-guide | §1.1 |

Total de fontes com conteúdo verificado: 19.

## Anexo B. Fontes consultadas sem uso, bloqueadas ou descartadas

**Bloqueadas (HTTP 402/403/404) ou sem dados (JavaScript):**
- Wiki de fãs do AoE (ageofempires.fandom.com): 402 em casa, aldeão, marco do Rei e Ranger Wynguard. Só resumos de busca (Forestry, Wonder, House, Genoese Crossbowman).
- progameguides.com: 403 em avanço de idade, marcos, unidades militares e controles. Só resumos de busca.
- aoe4world.com (explorer de unidades, edifícios e civilização): página renderizada por JavaScript. Só navegação; sem dados.
- aoe4world.com (casa de Bizantinos): idem. Só resumo de busca.

**Descartadas (conteúdo de outros jogos da série ou incoerente):**
- ludo.guide, páginas de casa, Centro da Vila, quartel, fazenda, maravilha e aldeão: citam Clubman, Axeman, Legion, Iron Age, Granary, Priests e outros nomes que não são do AoE IV. Não usado.
- ageofempires.com (tutorial do AoE II, sobre a interface): descartado para o layout do AoE IV.

**Consultadas, sem valores utilizáveis:**
- pcgamesn.com (estatísticas da versão beta de 2021): planilha externa, sem dados na página.
- aoe4.christitus.com (dicas): sem número de população.
- guildorder.com (rotas de eco por idade): benchmarks de comunidade, sem valores base.
- jeu.video e gameskeys.net: sem posições do HUD.
- support.ageofempires.com (teclas remapeáveis): 403.
- ageofempires.com/news (lista de patches): só itens do AoE II e III, e uma pré-venda.

## Anexo C: rodada de confirmação (2026-10-08)

Fontes de números: aoe4.club (páginas de civilização e de edifício), o JSON do repositório aoe4world/data (dados extraídos dos arquivos do jogo) e aoe4units.com. Nenhuma página oficial trouxe números, e nenhuma informa a versão do jogo.

**Confirmados em duas fontes e aplicados ao código:**
- Quartel: 150 madeira, 30 s, 1500 de vida (antes: 175, 40 s, 900). Fontes: aoe4.club/en/civs/english; aoe4world/data buildings/english.json.
- Aldeão: 50 de vida; treino de 20 s na Inglaterra e 19 s na França (antes: 25 de vida e 8 s). Fontes: aoe4.club (english e french); aoe4world/data units/unified/villager.json. Conflito: aoe4units.com dá corpo a corpo 6 para a Inglaterra, e o JSON dá arco 5.
- Torre de pedra (Stone Wall Tower): 250 pedra, 90 s, 3000 de vida, ataque à distância 60, intervalo 3,875 s, alcance 9 (antes: 100 madeira + 100 pedra, 40 s, 600 de vida, ataque 7, recarga 2,2 s). Fontes: aoe4.club/en/civs/english; aoe4world/data buildings/english.json (stone-wall-tower-2).

**Confirmados, ainda não implementados** (dependem de civilização, cerco ou muralhas):
- Keep (Inglaterra): 900 pedra, 180 s, 5000 de vida; França: 810 pedra. Idade: SPEC não especifica.
- Posto avançado: 100 madeira, 60 s, 750 de vida, sem ataque base.
- Oficina de cerco: 250 madeira, 45 s, 2100 de vida. Aríete: 200 madeira, 35 s, 370 de vida, dano de cerco 200 (+300 contra muros), velocidade 0,75. Fontes: aoe4.club/en/civs/english; aoe4world/data. Divergência: aoedb.net dá 420 de vida e 300 madeira, sem data.
- Muro de pedra: 25 pedra, 16 s, 3000 de vida. Portão de pedra: 50 pedra, 30 s, 3000. Paliçada: 7 madeira, 8 s, 1350. Portão de paliçada: 25 madeira, 10 s, 1350. Fontes: aoe4.club/en/civs/english e páginas de cada edifício; aoe4world/data.
- Lanceiro francês (idade 1): 60 comida + 20 madeira, 15 s, 80 de vida, ataque 7, velocidade 1,25. O código tem lanceiro de idade 2, com 50 comida + 35 madeira. A Inglaterra começa com o Lanceiro Endurecido (90 de vida, ataque 8). Divergência: aoedb.net dá 70 de vida e ataque 5.
- Homem de Armas francês (idade 3): 90 comida + 20 ouro, 20,5 s, 155 de vida, ataque 12, armadura 4/4. Inglaterra: 14,65 s; Vanguarda (idade 1): 100 de vida, ataque 8, armadura 2/3.

**Não encontrado:** fórmula de redução de dano por armadura. Há valores de armadura por unidade e um percentual de prévia de patch (aríete reduz 95% do dano à distância), sem data e sem fórmula. Não implementar armadura até haver fonte.

### Anexo C, adendo: idades e valores dos edifícios (aoe4world/data, 2026-10-08)

Fonte: https://raw.githubusercontent.com/aoe4world/data/main/buildings/english.json (campos `age`, `costs`, `hitpoints`). Os dados vêm de extração dos arquivos do jogo, e cada edifício tem uma única fonte nesse arquivo. Uma idade só conta como confirmada quando outra fonte concorda.

- Keep: idade 3, 900 pedra, 180 s, 5000 de vida. Custo, tempo e vida também batem com aoe4.club. **Implementado** (idade 3 só do aoe4world).
- Oficina de cerco: idade 3, 250 madeira, 45 s, 2100 de vida.
- Muro de pedra, portão de pedra e torre de pedra: idade 2.
- Paliçada e portão de paliçada: idade 1. Posto avançado: idade 1, 100 madeira, 60 s, 750 de vida.
- Campo de tiro: idade 2 no aoe4world. O código tem idade 1. **Não alterado**: falta a segunda fonte para a idade.
- Ferreiro e estábulo: idade 2 no aoe4world. Conferir com o código antes de mudar.
- Abadia dos Reis e Concílio: idade 1, 400 comida + 200 ouro, 190 s, 5000 de vida. Ou seja, o marco da Feudal tem o custo da passagem de idade (ver §4).

### Anexo C, adendo 2: oficina de cerco e aríete (implementados em 2026-10-08)

- Oficina de cerco: idade 3 (aoe4world), 250 madeira, 45 s, 2100 de vida (aoe4.club e aoe4world). Footprint 3x3 e visão 7 são provisórios.
- Aríete (variação inglesa, aoe4world): idade 2, 200 madeira, 35 s, 370 de vida, dano de cerco 200, recarga 4 s, alcance 0,5375, +300 de dano de cerco contra muros, resistência a flechas 95, só ataca edifícios. Produzido na oficina de cerco e no keep.
- Não confirmados: velocidade (aoe4world 0,75; o código usa 1,2, proporção do aldeão, não valor medido) e alcance no código (0,54, valor do aoe4world sem conversão validada).
- Não implementados: bônus de 300 contra muros (não há muros ainda) e resistência a flechas 95 (não há armadura nem resistência no código).
- A redução de 0,5 contra prédios, que o código aplica aos demais atacantes, não tem fonte na SPEC. Continua como estava; o aríete a ignora por ser dano de cerco.

### Anexo C, adendo 3: muro de pedra (implementado em 2026-10-08)

- Muro de pedra: 25 pedra, 16 s, 3000 de vida (aoe4.club e aoe4world concordam); idade 2 só no aoe4world.
- Provisórios: footprint 1x1 e visão 3 (a SPEC não tem esses números).
- Colocação: um tile por clique; Shift repete a colocação, como os demais edifícios.
- Não implementados: portões (passagem para o dono), paliçada e linhas arrastadas. O muro bloqueia tiles como qualquer edifício.

### Anexo C, adendo 4: idades por marco (implementado em 2026-10-08)

- Avançar de idade é construir o marco da próxima idade (SPEC §4). Ao ser concluído, o jogador entra na idade. Só há um marco por idade e não se constrói marco de idade já alcançada.
- Marcos da Inglaterra (duas opções por idade): Feudal, Concílio (idade 1, 400 comida + 200 ouro, 190 s, 5000 de vida) ou Abadia dos Reis (mesmos valores); Castelo, Palácio Real (idade 2, 1200 comida + 600 ouro, 220 s, 5000) ou Torre Branca (mesmos valores); Imperial, Palácio de Berkshire (idade 3, 2400 + 1200, 250 s, 6500 de vida) ou Palácio de Wynguard (mesmos custos e tempo, 5000 de vida).
- Custos e tempos: aoe4world confirma os marcos da Feudal, do Castelo e da Imperial; SPEC §4 dá os mesmos valores para as passagens. O código tinha 800+400 (Castelo) e 1000+700+300 pedra (Imperial), com tempos de 60, 75 e 90 s: corrigido.
- Provisórios: footprint 3x3 e visão 7 dos marcos (a SPEC não tem esses números).
- Não implementado: marcos francês (fase 5), e o efeito do marco depois de construído (fica como edifício).
- Bots: constroem o primeiro marco da lista quando têm aldeões e recursos suficientes.

### Anexo C, adendo 5: vitória por maravilha (implementado em 2026-10-08)

- Maravilha: a Catedral de São Tomás (inglesa). Idade 4, 5000 de cada recurso, 600 s, 5000 de vida: aoe4world confirma; a SPEC §8 dá os mesmos 5000 e 600 s em duas fontes. A nota de patch da SPEC (base 6000) continua em conflito: o código segue o aoe4world.
- Vitória: a catedral precisa ficar de pé pela contagem inteira; se cai, a contagem recomeça do zero. Provisório: a contagem de 30 min vem de uma fonte de guia (SPEC §8, incerto).
- Opção do menu: "Maravilha" (desligada por padrão). A conquista fica sempre ativa.
- Não implementados: vitória por marcos (a regra detalhada tem uma fonte, de busca), locais sagrados (números de um post de fórum) e relíquias (sem regra confirmada).

### Anexo C, adendo 6: economia, civilizações e marcos franceses (implementado em 2026-10-08)

- Custos e tempos corrigidos (SPEC e aoe4world concordam): casa 50 madeira e 15 s; fazenda 75 madeira e 6 s; moinho, serraria e acampamento de mineração 50 madeira e 20 s; estábulo 150 madeira, 30 s e 1500 de vida.
- Fazenda inglesa: 37 de madeira (50% menos; SPEC §6.1 e aoe4world). Implementada como tabela de custo por civilização (CIV_BUILDING_COST).
- Menu: escolha de civilização (Inglaterra ou França). Os bots são sempre ingleses.
- Marcos franceses, do aoe4world (custos e tempos iguais aos das idades): Câmara de Comércio e Escola de Cavalaria (Feudal, 400+200, 190 s, 5000); Sede da Guilda e Instituto Real (Castelo, 1200+600, 220 s, 5000); Palácio Vermelho e Colégio de Artilharia (Imperial, 2400+1200, 250 s, 5000).
- Notre Dame (maravilha francesa, idade 4): 5000 de cada, 600 s, 5000 de vida (aoe4world). Conta para a vitória por maravilha.
- Ficam para depois, porque dependem de mecânicas novas: Cavaleiro Real (Feudal), Homem de Armas Vanguarda (Idade I), aldeões com arco curto, Rede de Castelos, comerciantes e Centro da Vila mais rápido por idade.
- Não alterado por falta de segunda fonte: vida da casa (300 no código; 750 no aoe4world), vida do moinho e dos acampamentos (350; 750 no aoe4world), tempo e vida do ferreiro (40 s e 700; 25 s e 1500 no aoe4world), vida e custo do centro da vila (2000; SPEC e aoe4world dão 2500 para o centro comum e 7000 para o capital).

### Anexo C, adendo 7: Cavaleiro Real francês (implementado em 2026-10-08)

- Cavaleiro Real: Feudal (idade 2), 140 comida + 100 ouro, 35 s, 190 de vida, ataque 19 (SPEC §3, linha 159, e aoe4world: mesmos valores). Treina no estábulo e na Escola de Cavalaria francesa. Armadura 3/3 do aoe4world: não modelada, porque o combate ainda não tem armadura.
- Provisórios: recarga 0,875 s (aoe4world), alcance e velocidade (iguais aos do Cavaleiro; o aoe4world usa outra escala de velocidade e alcance).
- Estábulo francês treina o Cavaleiro Real em vez do Cavaleiro. O Keep francês não treina cavaleiros.
