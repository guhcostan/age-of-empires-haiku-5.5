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

export const AGE_UP: Record<NextAge, AgeUpDef> = {
  2: { cost: { food: 500, gold: 200 }, time: 60 },
  3: { cost: { food: 800, gold: 400 }, time: 75 },
  4: { cost: { food: 1000, gold: 700, stone: 300 }, time: 90 },
};

// Unidades. `civil` = coleta e constrói. `ranged` = dispara. `bonus` = multiplicador de dano
// contra classes específicas. `age` = idade mínima. `from` = edifício que treina.
export const UNITS: Record<UnitType, UnitDef> = {
  villager: {
    name: 'Aldeão', civil: true, hp: 25, attack: 2, cooldown: 1.5, range: 1.0,
    speed: 1.8, sight: 7, cost: { food: 50 }, time: 8, age: 1, from: 'towncenter',
  },
  swordsman: {
    name: 'Espadachim', hp: 110, attack: 9, cooldown: 1.2, range: 1.1,
    speed: 1.9, sight: 7, cost: { food: 60, gold: 20 }, time: 14, age: 1, from: 'barracks',
  },
  archer: {
    name: 'Arqueiro', hp: 45, attack: 6, cooldown: 1.6, range: 5.5, ranged: true,
    speed: 2.0, sight: 8, cost: { food: 40, wood: 50 }, time: 12, age: 1, from: 'barracks',
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
};

// Edifícios. `dropoff` = recursos aceitos aqui. `gather` = recurso coletável no próprio prédio.
// `attack`/`range`/`cooldown` = torres que atiram sozinhas. `age` = idade mínima.
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  towncenter: {
    name: 'Centro da Vila', w: 4, h: 4, hp: 2000, sight: 11, pop: 20, cost: {}, time: 0, age: 1,
    trains: ['villager'], dropoff: ['food', 'wood', 'gold', 'stone'],
  },
  house: { name: 'Casa', w: 2, h: 2, hp: 300, sight: 6, pop: 10, cost: { wood: 60 }, time: 25, age: 1 },
  storehouse: {
    name: 'Armazém', w: 2, h: 2, hp: 400, sight: 6, cost: { wood: 100 }, time: 20, age: 1,
    dropoff: ['wood', 'gold', 'stone'],
  },
  farm: {
    name: 'Fazenda', w: 2, h: 2, hp: 300, sight: 5, cost: { wood: 60 }, time: 20, age: 1,
    dropoff: ['food'], gather: 'food', gatherTime: 1.1, maxGatherers: 5,
  },
  mill: {
    name: 'Moinho', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 100 }, time: 25, age: 1,
    dropoff: ['food'], techs: ['horticulture', 'fertilization'],
  },
  lumberCamp: {
    name: 'Serraria', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 100 }, time: 25, age: 1,
    dropoff: ['wood'], techs: ['lumber', 'lumber2'],
  },
  miningCamp: {
    name: 'Acampamento de Mineração', w: 2, h: 2, hp: 350, sight: 6, cost: { wood: 100 }, time: 25, age: 1,
    dropoff: ['gold', 'stone'], techs: ['mining', 'mining2'],
  },
  barracks: {
    name: 'Quartel', w: 3, h: 3, hp: 900, sight: 7, cost: { wood: 175 }, time: 40, age: 1,
    trains: ['swordsman', 'archer', 'spearman', 'crossbow'],
  },
  stable: {
    name: 'Estábulo', w: 3, h: 3, hp: 800, sight: 7, cost: { wood: 175 }, time: 40, age: 2,
    trains: ['scout', 'knight'],
  },
  blacksmith: {
    name: 'Ferreiro', w: 3, h: 3, hp: 700, sight: 7, cost: { wood: 150 }, time: 40, age: 2,
    techs: ['forge1', 'forge2'],
  },
  tower: {
    name: 'Torre', w: 2, h: 2, hp: 600, sight: 9, cost: { wood: 100, stone: 100 }, time: 40, age: 2,
    attack: 7, range: 7, cooldown: 2.2,
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
  'barracks', 'stable', 'blacksmith', 'tower',
];

// Teclas de atalho (exibidas nos botões e na ajuda).
export const UNIT_KEYS: Record<UnitType, string> = {
  villager: 'v', swordsman: 'z', archer: 'x', spearman: 'g', crossbow: 'd', scout: 'c', knight: 'r',
};
// O Centro da Vila não é construído pelo menu, então não tem tecla aqui.
export const BUILD_KEYS: Partial<Record<BuildingType, string>> = {
  house: 'h', storehouse: 'm', farm: 'f', mill: 'n', lumberCamp: 'l', miningCamp: 'o',
  barracks: 'b', stable: 't', blacksmith: 'k', tower: 'y',
};
export const TECH_KEYS: readonly string[] = ['j', 'i'];
export const AGE_KEY = 'u';
