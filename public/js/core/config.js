// Dados e balanceamento do jogo. Todo o resto do código lê daqui.

export const RESOURCES = ['food', 'wood', 'gold', 'stone'];

export const RESOURCE_INFO = {
  food: { name: 'Comida', color: '#e7a53b' },
  wood: { name: 'Madeira', color: '#a06d3a' },
  gold: { name: 'Ouro', color: '#f2c94c' },
  stone: { name: 'Pedra', color: '#aeb8c2' },
};

export const START_RESOURCES = { food: 200, wood: 200, gold: 100, stone: 0 };
export const START_VILLAGERS = 4;
export const CARRY_CAPACITY = 10;
export const MAX_POP = 200;
export const MAX_QUEUE = 6;

export const PLAYER_COLORS = ['#2f7de1', '#e04848', '#e8c23a', '#9b59d0'];
export const PLAYER_NAMES = ['Você', 'Vermelhos', 'Amarelos', 'Roxos'];

export const MAP_SIZES = {
  pequeno: { name: 'Pequeno (64×64)', size: 64 },
  medio: { name: 'Médio (96×96)', size: 96 },
  grande: { name: 'Grande (128×128)', size: 128 },
};

export const DIFFICULTY = {
  facil: { name: 'Fácil', think: 2.5, villagers: 14, attackArmy: 10, gather: 0.8 },
  normal: { name: 'Normal', think: 1.5, villagers: 22, attackArmy: 14, gather: 1.0 },
  dificil: { name: 'Difícil', think: 0.8, villagers: 30, attackArmy: 18, gather: 1.2 },
};

// Unidades. `civil` = pode coletar e construir. `ranged` = dispara à distância.
export const UNITS = {
  villager: {
    name: 'Aldeão', civil: true, hp: 25, attack: 2, cooldown: 1.5, range: 1.0,
    speed: 1.8, sight: 7, cost: { food: 50 }, time: 8,
  },
  swordsman: {
    name: 'Espadachim', hp: 110, attack: 9, cooldown: 1.2, range: 1.1,
    speed: 1.9, sight: 7, cost: { food: 60, gold: 20 }, time: 14,
  },
  archer: {
    name: 'Arqueiro', hp: 45, attack: 6, cooldown: 1.6, range: 5.5, ranged: true,
    speed: 2.0, sight: 8, cost: { food: 40, wood: 50 }, time: 12,
  },
  scout: {
    name: 'Batedor', hp: 80, attack: 6, cooldown: 1.0, range: 1.2,
    speed: 3.4, sight: 10, cost: { food: 80, wood: 30 }, time: 16,
  },
};

// Edifícios. `dropoff` = recursos que podem ser entregues aqui.
// `gather` = recurso coletável diretamente no edifício (fazenda).
export const BUILDINGS = {
  towncenter: {
    name: 'Centro da Vila', w: 4, h: 4, hp: 2000, sight: 11, pop: 15, cost: {}, time: 0,
    trains: ['villager'], dropoff: ['food', 'wood', 'gold', 'stone'],
  },
  house: { name: 'Casa', w: 2, h: 2, hp: 300, sight: 6, pop: 5, cost: { wood: 50 }, time: 20 },
  storehouse: {
    name: 'Armazém', w: 2, h: 2, hp: 400, sight: 6, cost: { wood: 80 }, time: 20,
    dropoff: ['wood', 'gold', 'stone'],
  },
  farm: {
    name: 'Fazenda', w: 2, h: 2, hp: 300, sight: 5, cost: { wood: 60 }, time: 20,
    dropoff: ['food'], gather: 'food', gatherTime: 1.1, maxGatherers: 5,
  },
  barracks: {
    name: 'Quartel', w: 3, h: 3, hp: 900, sight: 7, cost: { wood: 175 }, time: 40,
    trains: ['swordsman', 'archer'],
  },
  stable: {
    name: 'Estábulo', w: 3, h: 3, hp: 800, sight: 7, cost: { wood: 175 }, time: 40,
    trains: ['scout'],
  },
};

// Recursos naturais.
export const NODES = {
  tree: { name: 'Árvore', resource: 'wood', amount: 100, gatherTime: 1.0, w: 1, h: 1 },
  berry: { name: 'Frutas silvestres', resource: 'food', amount: 200, gatherTime: 0.9, w: 1, h: 1 },
  gold: { name: 'Mina de ouro', resource: 'gold', amount: 800, gatherTime: 1.2, w: 2, h: 2 },
  stone: { name: 'Mina de pedra', resource: 'stone', amount: 800, gatherTime: 1.3, w: 2, h: 2 },
};

export const BUILD_MENU = ['house', 'storehouse', 'farm', 'barracks', 'stable'];
