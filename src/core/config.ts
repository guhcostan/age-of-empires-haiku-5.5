// Dados e balanceamento do jogo. Todo o resto do código lê daqui.
// Inspirado no Age of Empires IV: quatro idades, coleta com técnicas, edifícios de apoio
// (moinho, acampamentos e ferreiro) e unidades liberadas por idade.
import type {
  AgeNumber,
  AgeUpDef,
  BuildingDef,
  BuildingType,
  DifficultyDef,
  DifficultyKey,
  MapSizeKey,
  NextAge,
  NodeDef,
  NodeType,
  ResourceName,
  Resources,
  TechDef,
  TechId,
  UnitDef,
  UnitType,
  Civ,
  Cost,
  VictoryReason,
} from '../types.ts';

export const RESOURCES: readonly ResourceName[] = ['food', 'wood', 'gold', 'stone'];

export const RESOURCE_INFO: Record<ResourceName, { name: string; color: string }> = {
  food: { name: 'Comida', color: '#e7a53b' },
  wood: { name: 'Madeira', color: '#a06d3a' },
  gold: { name: 'Ouro', color: '#f2c94c' },
  stone: { name: 'Pedra', color: '#aeb8c2' },
};

export const START_RESOURCES: Resources = { food: 200, wood: 200, gold: 100, stone: 0 };
export const START_VILLAGERS = 4;
export const CARRY_CAPACITY = 10;
export const MAX_POP = 200;
export const MAX_QUEUE = 6;

export const PLAYER_COLORS: readonly string[] = ['#2f7de1', '#e04848', '#e8c23a', '#9b59d0'];
export const PLAYER_NAMES: readonly string[] = ['Você', 'Vermelhos', 'Amarelos', 'Roxos'];

export const MAP_SIZES: Record<MapSizeKey, { name: string; size: number }> = {
  pequeno: { name: 'Pequeno (64×64)', size: 64 },
  medio: { name: 'Médio (96×96)', size: 96 },
  grande: { name: 'Grande (128×128)', size: 128 },
};

export const DIFFICULTY: Record<DifficultyKey, DifficultyDef> = {
  facil: { name: 'Fácil', think: 2.5, villagers: 14, attackArmy: 10, gather: 0.8 },
  normal: { name: 'Normal', think: 1.5, villagers: 22, attackArmy: 14, gather: 1.0 },
  dificil: { name: 'Difícil', think: 0.8, villagers: 30, attackArmy: 18, gather: 1.2 },
};

// Idades: 1 Idade das Trevas, 2 Feudal, 3 dos Castelos, 4 Imperial.
export const AGE_NAMES: Record<AgeNumber, string> = {
  1: 'Idade das Trevas',
  2: 'Idade Feudal',
  3: 'Idade dos Castelos',
  4: 'Idade Imperial',
};

// Custo e tempo de cada passagem de idade: são os do marco que a constrói (SPEC §4; aoe4world confirma).
export const AGE_UP: Record<NextAge, AgeUpDef> = {
  2: { cost: { food: 400, gold: 200 }, time: 190 },
  3: { cost: { food: 1200, gold: 600 }, time: 220 },
  4: { cost: { food: 2400, gold: 1200 }, time: 250 },
};

// Unidades. `civil` = coleta e constrói. `ranged` = dispara. `bonus` = multiplicador de dano
// contra classes específicas. `age` = idade mínima. `from` = edifício que treina.
export const UNITS: Record<UnitType, UnitDef> = {
  // Aríete (aoe4world, variação inglesa): 200 madeira, 35 s, 370 de vida, dano de cerco 200 a cada 4 s.
  // Alcance e velocidade não são valores confirmados: a velocidade é proporcional à do aldeão no aoe4world
  // (0,75 / 1,125 de 1,8). Ver docs/SPEC.md, anexo C.
  ram: {
    name: 'Aríete', hp: 370, attack: 200, cooldown: 4, range: 0.54, speed: 1.2, sight: 7,
    cost: { wood: 200 }, time: 35, age: 2, from: 'siegeWorkshop', siege: true,
  },
  villager: {
    name: 'Aldeão', civil: true, hp: 50, attack: 2, cooldown: 1.5, range: 1.0,
    speed: 1.8, sight: 7, cost: { food: 50 }, time: 20, age: 1, from: 'towncenter',
  },
  swordsman: {
    name: 'Espadachim', hp: 110, attack: 9, cooldown: 1.2, range: 1.1,
    speed: 1.9, sight: 7, cost: { food: 60, gold: 20 }, time: 14, age: 1, from: 'barracks',
  },
  // Homem de Armas Vanguarda (inglês, já na Idade das Trevas). SPEC anexo C, adendo 18: custo, vida, ataque e intervalo
  // de uma fonte [A]; velocidade e armadura (5/6) não usadas: a velocidade segue a escala do espadachim e não há armadura no código.
  vanguard: {
    name: 'Homem de Armas Vanguarda', hp: 180, attack: 14, cooldown: 1.375, range: 1.1,
    speed: 1.9, sight: 7, cost: { food: 90, gold: 20 }, time: 14.65, age: 1, from: 'barracks',
  },
  archer: {
    name: 'Arqueiro', hp: 45, attack: 6, cooldown: 1.6, range: 5.5, ranged: true,
    speed: 2.0, sight: 8, cost: { food: 40, wood: 50 }, time: 12, age: 1, from: 'archeryRange',
  },
  // Arqueiro Longo (inglês, Feudal). SPEC anexo C, adendo 18: vida 95, ataque 9, alcance 7, custo e tempo de uma fonte;
  // recarga do arqueiro (sem valor na SPEC) e velocidade do arqueiro, para manter a escala do código.
  longbowman: {
    name: 'Arqueiro Longo', hp: 95, attack: 9, cooldown: 1.6, range: 7, ranged: true,
    speed: 2.0, sight: 8, cost: { food: 40, wood: 50 }, time: 15, age: 2, from: 'archeryRange',
  },
  spearman: {
    name: 'Lanceiro', hp: 100, attack: 7, cooldown: 1.3, range: 1.6, bonus: { scout: 2, knight: 2 },
    speed: 1.9, sight: 7, cost: { food: 50, wood: 35 }, time: 12, age: 2, from: 'barracks',
  },
  crossbow: {
    name: 'Besteiro', hp: 55, attack: 9, cooldown: 1.8, range: 6.5, ranged: true,
    speed: 1.9, sight: 8, cost: { food: 40, wood: 70, gold: 20 }, time: 14, age: 3, from: 'barracks',
  },
  scout: {
    name: 'Batedor', hp: 80, attack: 6, cooldown: 1.0, range: 1.2,
    speed: 3.4, sight: 10, cost: { food: 80, wood: 30 }, time: 16, age: 2, from: 'stable',
  },
  knight: {
    name: 'Cavaleiro', hp: 180, attack: 12, cooldown: 1.4, range: 1.3,
    speed: 2.6, sight: 9, cost: { food: 80, gold: 60 }, time: 22, age: 3, from: 'stable',
  },
  // Cavaleiro Real (francês, Feudal): 140 comida + 100 ouro, 35 s, 190 de vida, ataque 19 (SPEC §3 e aoe4world).
  // Recarga 0,875 s só no aoe4world. Alcance e velocidade são os do cavaleiro (provisórios).
  royalKnight: {
    name: 'Cavaleiro Real', hp: 190, attack: 19, cooldown: 0.875, range: 1.3,
    speed: 2.6, sight: 9, cost: { food: 140, gold: 100 }, time: 35, age: 2, from: 'stable',
  },
};

// Edifícios. `dropoff` = recursos aceitos aqui. `gather` = recurso coletável no próprio prédio.
// `attack`/`range`/`cooldown` = torres que atiram sozinhas. `age` = idade mínima.
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  towncenter: {
    name: 'Centro da Vila', w: 4, h: 4, hp: 2000, sight: 11, pop: 20, cost: {}, time: 0, age: 1,
    trains: ['villager'], dropoff: ['food', 'wood', 'gold', 'stone'],
  },
  house: { name: 'Casa', w: 2, h: 2, hp: 300, sight: 6, pop: 10, cost: { wood: 50 }, time: 15, age: 1 },
  storehouse: {
    name: 'Armazém', w: 2, h: 2, hp: 400, sight: 6, cost: { wood: 100 }, time: 20, age: 1,
    dropoff: ['wood', 'gold', 'stone'],
  },
  farm: {
    name: 'Fazenda', w: 2, h: 2, hp: 300, sight: 5, cost: { wood: 75 }, time: 6, age: 1,
    dropoff: ['food'], gather: 'food', gatherTime: 1.1, maxGatherers: 5,
  },
  mill: {
    name: 'Moinho', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 50 }, time: 20, age: 1,
    dropoff: ['food'], techs: ['horticulture', 'fertilization'],
  },
  lumberCamp: {
    name: 'Serraria', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 50 }, time: 20, age: 1,
    dropoff: ['wood'], techs: ['lumber', 'lumber2'],
  },
  miningCamp: {
    name: 'Acampamento de Mineração', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 50 }, time: 20, age: 1,
    dropoff: ['gold', 'stone'], techs: ['mining', 'mining2'],
  },
  barracks: {
    name: 'Quartel', w: 3, h: 3, hp: 1500, sight: 7, cost: { wood: 150 }, time: 30, age: 1,
    trains: ['swordsman', 'spearman', 'crossbow'],
  },
  // Marcos da França (SPEC §4 e §6.2). Custo, tempo e vida: aoe4world (mesmos valores das idades).
  // Footprint 3x3 e visão 7 são provisórios.
  chamberOfCommerce: {
    name: 'Câmara de Comércio', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[2].cost, time: AGE_UP[2].time, age: 1, landmarkFor: 2,
  },
  schoolOfCavalry: {
    name: 'Escola de Cavalaria', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[2].cost, time: AGE_UP[2].time, age: 1, landmarkFor: 2,
    trains: ['royalKnight'],
  },
  guildHall: {
    name: 'Sede da Guilda', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[3].cost, time: AGE_UP[3].time, age: 2, landmarkFor: 3,
  },
  royalInstitute: {
    name: 'Instituto Real', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[3].cost, time: AGE_UP[3].time, age: 2, landmarkFor: 3,
  },
  redPalace: {
    name: 'Palácio Vermelho', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[4].cost, time: AGE_UP[4].time, age: 3, landmarkFor: 4,
  },
  collegeOfArtillery: {
    name: 'Colégio de Artilharia', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[4].cost, time: AGE_UP[4].time, age: 3, landmarkFor: 4,
  },
  // Notre Dame (maravilha francesa): 5000 de cada, 600 s, 5000 de vida (aoe4world). Footprint 4x4 provisório.
  notreDame: {
    name: 'Notre Dame', w: 4, h: 4, hp: 5000, sight: 9,
    cost: { food: 5000, wood: 5000, stone: 5000, gold: 5000 }, time: 600, age: 4,
  },
  // Marcos da Inglaterra (SPEC §4). Custo e tempo são os da passagem de idade; vida em aoe4world.
  // Footprint 3x3 e visão 7 são provisórios: a SPEC não tem esses números.
  councilHall: {
    name: 'Concílio', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[2].cost, time: AGE_UP[2].time, age: 1, landmarkFor: 2,
  },
  abbeyOfKings: {
    name: 'Abadia dos Reis', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[2].cost, time: AGE_UP[2].time, age: 1, landmarkFor: 2,
  },
  kingsPalace: {
    name: 'Palácio Real', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[3].cost, time: AGE_UP[3].time, age: 2, landmarkFor: 3,
  },
  whiteTower: {
    name: 'Torre Branca', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[3].cost, time: AGE_UP[3].time, age: 2, landmarkFor: 3,
  },
  berkshirePalace: {
    name: 'Palácio de Berkshire', w: 3, h: 3, hp: 6500, sight: 7, cost: AGE_UP[4].cost, time: AGE_UP[4].time, age: 3, landmarkFor: 4,
  },
  wynguardPalace: {
    name: 'Palácio de Wynguard', w: 3, h: 3, hp: 5000, sight: 7, cost: AGE_UP[4].cost, time: AGE_UP[4].time, age: 3, landmarkFor: 4,
  },
  // Muro de pedra: 25 pedra, 16 s, 3000 de vida (aoe4.club e aoe4world); idade 2 só no aoe4world.
  // Footprint 1x1 e visão 3 são provisórios: a SPEC não tem esses números.
  stoneWall: {
    name: 'Muro de pedra', w: 1, h: 1, hp: 3000, sight: 3, cost: { stone: 25 }, time: 16, age: 2,
  },
  // Catedral de São Tomás (maravilha inglesa). Custo, tempo e vida: aoe4world (5000 de cada, 600 s, 5000 de vida).
  // Footprint 4x4 e visão 9 são provisórios.
  cathedral: {
    name: 'Catedral de São Tomás', w: 4, h: 4, hp: 5000, sight: 9,
    cost: { food: 5000, wood: 5000, stone: 5000, gold: 5000 }, time: 600, age: 4,
  },
  // Oficina de cerco: treina aríetes. Custo, vida e tempo batem em aoe4.club e aoe4world; idade 3 só no aoe4world.
  siegeWorkshop: {
    name: 'Oficina de cerco', w: 3, h: 3, hp: 2100, sight: 7, cost: { wood: 250 }, time: 45, age: 3,
    trains: ['ram'],
  },
  // Campo de tiro: treina arqueiros (SPEC §2.1). Custo, vida e tempo vêm da fonte única da SPEC (linha 73).
  archeryRange: {
    name: 'Campo de tiro', w: 3, h: 3, hp: 1500, sight: 7, cost: { wood: 150 }, time: 30, age: 1,
    trains: ['archer'],
  },
  stable: {
    name: 'Estábulo', w: 3, h: 3, hp: 1500, sight: 7, cost: { wood: 150 }, time: 30, age: 2,
    trains: ['scout', 'knight'],
  },
  blacksmith: {
    name: 'Ferreiro', w: 3, h: 3, hp: 700, sight: 7, cost: { wood: 150 }, time: 40, age: 2,
    techs: ['forge1', 'forge2'],
  },
  // Keep: treina todas as unidades militares (SPEC §2.1). Custo, vida e tempo: fonte aoe4.club e aoe4world (ambas).
  // Idade 3 vem só do aoe4world; footprint e visão não estão na SPEC, então 3x3 e visão 7 são provisórios.
  keep: {
    name: 'Keep', w: 3, h: 3, hp: 5000, sight: 7, cost: { stone: 900 }, time: 180, age: 3,
    trains: ['swordsman', 'archer', 'spearman', 'crossbow', 'scout', 'knight', 'ram'],
  },
  tower: {
    name: 'Torre', w: 2, h: 2, hp: 3000, sight: 9, cost: { stone: 250 }, time: 90, age: 2,
    attack: 60, range: 9, cooldown: 3.875,
  },
};

// Recursos naturais.
export const NODES: Record<NodeType, NodeDef> = {
  tree: { name: 'Árvore', resource: 'wood', amount: 100, gatherTime: 1.0, w: 1, h: 1 },
  berry: { name: 'Frutas silvestres', resource: 'food', amount: 200, gatherTime: 0.9, w: 1, h: 1 },
  gold: { name: 'Mina de ouro', resource: 'gold', amount: 800, gatherTime: 1.2, w: 2, h: 2 },
  stone: { name: 'Mina de pedra', resource: 'stone', amount: 800, gatherTime: 1.3, w: 2, h: 2 },
};

// Técnicas. `effect.gather` soma ao multiplicador de coleta; `effect.attack` soma ao ataque.
export const TECHS: Record<TechId, TechDef> = {
  horticulture: {
    name: 'Horticultura', building: 'mill', age: 2, cost: { wood: 50, gold: 100 }, time: 45,
    effect: { gather: { food: 0.10 } },
  },
  fertilization: {
    name: 'Fertilização', building: 'mill', age: 3, cost: { wood: 100, gold: 150 }, time: 60,
    effect: { gather: { food: 0.10 } }, req: 'horticulture',
  },
  lumber: {
    name: 'Machados de ferro', building: 'lumberCamp', age: 1, cost: { wood: 100 }, time: 40,
    effect: { gather: { wood: 0.15 } },
  },
  lumber2: {
    name: 'Serras', building: 'lumberCamp', age: 2, cost: { wood: 200, gold: 100 }, time: 50,
    effect: { gather: { wood: 0.15 } }, req: 'lumber',
  },
  mining: {
    name: 'Picaretas', building: 'miningCamp', age: 1, cost: { wood: 120 }, time: 40,
    effect: { gather: { gold: 0.15, stone: 0.15 } },
  },
  mining2: {
    name: 'Carrinhos de mina', building: 'miningCamp', age: 2, cost: { wood: 150, gold: 150 }, time: 50,
    effect: { gather: { gold: 0.15, stone: 0.15 } }, req: 'mining',
  },
  forge1: {
    name: 'Forja de armas', building: 'blacksmith', age: 2, cost: { food: 200, gold: 100 }, time: 40,
    effect: { attack: 0.15 },
  },
  forge2: {
    name: 'Armaduras', building: 'blacksmith', age: 3, cost: { food: 300, gold: 200 }, time: 55,
    effect: { attack: 0.15 }, req: 'forge1',
  },
};

export const BUILD_MENU: readonly BuildingType[] = [
  'house', 'storehouse', 'farm', 'mill', 'lumberCamp', 'miningCamp',
  'barracks', 'archeryRange', 'stable', 'blacksmith', 'tower', 'keep', 'siegeWorkshop', 'stoneWall', 'cathedral',
];

// Teclas de atalho (exibidas nos botões e na ajuda).
export const UNIT_KEYS: Record<UnitType, string> = {
  villager: 'v', swordsman: 'z', vanguard: 'n', archer: 'x', longbowman: 'l', spearman: 'g', crossbow: 'd', scout: 'c', knight: 'r', ram: 'j', royalKnight: 'r',
};
// O Centro da Vila não é construído pelo menu, então não tem tecla aqui.
export const BUILD_KEYS: Partial<Record<BuildingType, string>> = {
  house: 'h', storehouse: 'm', farm: 'f', mill: 'n', lumberCamp: 'l', miningCamp: 'o',
  barracks: 'b', archeryRange: 'c', stable: 't', blacksmith: 'k', tower: 'y', keep: 'p', siegeWorkshop: 'g', stoneWall: 'w', cathedral: 'z', notreDame: 'z',
};
// Marcos que avançam para cada idade (a primeira opção de cada idade é a da Inglaterra).
export const LANDMARKS: Record<NextAge, readonly BuildingType[]> = {
  2: ['councilHall', 'abbeyOfKings'],
  3: ['kingsPalace', 'whiteTower'],
  4: ['berkshirePalace', 'wynguardPalace'],
};
// Locais sagrados (SPEC §8, fonte única: post de fórum; números incertos). Provisórios: 4 locais; captura com
// presença exclusiva de unidades por 10 s; quem tem todos vence após 10 min sem inimigo dentro de um local;
// cada local dá 100 de ouro por minuto ao dono. Posições são frações do mapa (centro e meio dos lados).
export const SACRED = {
  fractions: [[0.5, 0.5], [0.5, 0.25], [0.25, 0.5], [0.75, 0.5]] as const,
  radius: 3,
  captureTime: 10,
  countdown: 600,
  goldPerMinute: 100,
} as const;

// Marcos de cada civilização, por idade que avançam (a primeira opção é a usada pelo bot).
export const LANDMARKS_BY_CIV: Record<Civ, Record<NextAge, readonly BuildingType[]>> = {
  english: LANDMARKS,
  french: {
    2: ['chamberOfCommerce', 'schoolOfCavalry'],
    3: ['guildHall', 'royalInstitute'],
    4: ['redPalace', 'collegeOfArtillery'],
  },
};
// Maravilha de cada civilização (vitória por maravilha).
export const WONDER_BY_CIV: Record<Civ, BuildingType> = { english: 'cathedral', french: 'notreDame' };
// Nome de cada condição de vitória, mostrado na tela final.
export const VICTORY_NAMES: Record<VictoryReason, string> = {
  conquest: 'Conquista',
  landmarks: 'Marcos',
  wonder: 'Maravilha',
  sacred: 'Locais sagrados',
};
// Custo de construção que muda por civilização. Fazendas inglesas custam 50% menos madeira (SPEC §6.1: 37 no aoe4world).
// Custo que muda por civilização. Inglaterra: fazendas 50% mais baratas (37 de madeira, duas fontes). França: keep 810 de pedra
// (duas fontes, SPEC anexo C); moinho, serraria e acampamento de mineração 25 de madeira (uma fonte: SPEC §2.1).
export const CIV_BUILDING_COST: Partial<Record<Civ, Partial<Record<BuildingType, Cost>>>> = {
  english: { farm: { wood: 37 } },
  french: {
    keep: { stone: 810 },
    mill: { wood: 25 },
    lumberCamp: { wood: 25 },
    miningCamp: { wood: 25 },
  },
};
// Unidades que cada edifício treina por civilização: o estábulo francês treina o Cavaleiro Real em vez do Cavaleiro.
export const CIV_TRAINS: Partial<Record<Civ, Partial<Record<BuildingType, readonly UnitType[]>>>> = {
  english: {
    archeryRange: ['archer', 'longbowman'],
    barracks: ['vanguard', 'swordsman', 'spearman', 'crossbow'],
  },
  french: {
    stable: ['scout', 'royalKnight'],
    keep: ['swordsman', 'archer', 'spearman', 'crossbow', 'scout', 'ram'],
  },
};
// Teclas dos marcos no menu de construção (até duas opções por idade).
export const LANDMARK_KEYS: readonly string[] = ['v', 'x'];
export const TECH_KEYS: readonly string[] = ['j', 'i'];
export const AGE_KEY = 'u';
