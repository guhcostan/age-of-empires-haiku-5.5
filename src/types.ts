// Tipos de domínio do núcleo da simulação (src/core).
// Derivados dos dados de config.ts e dos campos que a simulação realmente lê e escreve.
// Os identificadores (ex.: 'towncenter', 'lumberCamp') são os mesmos do JS original,
// porque aparecem nas tabelas de dados, nos atalhos e na interface.

// ---------- Identificadores (uniões literais) ----------

export type ResourceName = 'food' | 'wood' | 'gold' | 'stone';

export type UnitType = 'villager' | 'swordsman' | 'archer' | 'spearman' | 'crossbow' | 'scout' | 'knight' | 'ram';

export type BuildingType =
  | 'towncenter' | 'house' | 'storehouse' | 'farm' | 'mill' | 'lumberCamp' | 'miningCamp'
  | 'barracks' | 'archeryRange' | 'stable' | 'blacksmith' | 'tower' | 'keep' | 'siegeWorkshop' | 'stoneWall' | 'cathedral'
  // Marcos de idade (SPEC §4): o primeiro de cada idade é o da Inglaterra.
  | 'councilHall' | 'abbeyOfKings' | 'kingsPalace' | 'whiteTower' | 'berkshirePalace' | 'wynguardPalace'
  // Marcos e maravilha franceses (aoe4world e SPEC §6.2).
  | 'chamberOfCommerce' | 'schoolOfCavalry' | 'guildHall' | 'royalInstitute' | 'redPalace' | 'collegeOfArtillery'
  | 'notreDame';

export type NodeType = 'tree' | 'berry' | 'gold' | 'stone';

export type TechId =
  | 'horticulture' | 'fertilization' | 'lumber' | 'lumber2' | 'mining' | 'mining2' | 'forge1' | 'forge2';

// 1 Idade das Trevas, 2 Feudal, 3 dos Castelos, 4 Imperial.
export type AgeNumber = 1 | 2 | 3 | 4;

// Idade que se alcança ao avançar (a partir da Feudal).
export type NextAge = Exclude<AgeNumber, 1>;

export type DifficultyKey = 'facil' | 'normal' | 'dificil';

export type MapSizeKey = 'pequeno' | 'medio' | 'grande';

// Civilizações jogáveis (SPEC §6): Inglaterra e França.
export type Civ = 'english' | 'french';

export type EntityKind = 'unit' | 'building' | 'node';

// Ordem atual de uma unidade. `attackmove` anda e ataca o inimigo que encontrar pelo caminho.
export type Order = 'idle' | 'move' | 'attackmove' | 'attack' | 'gather' | 'build';

// Etapa de um aldeão coletando: indo ao recurso, coletando (chop) ou levando para entregar.
export type Phase = 'toRes' | 'chop' | 'toDrop';

// Nível das mensagens da simulação (cor e som na interface).
export type MessageLevel = 'info' | 'good' | 'warn' | 'bad';

// ---------- Geometria ----------

export interface Point {
  x: number;
  y: number;
}

// Retângulo ocupado por um edifício ou recurso (x, y = canto superior esquerdo).
export interface Rect extends Point {
  w: number;
  h: number;
}

// Destino de caminho: um tile exato ou um retângulo (chega a um tile encostado nele).
export interface TileGoal {
  type: 'tile';
  x: number;
  y: number;
}

export interface RectGoal extends Rect {
  type: 'rect';
}

export type Goal = TileGoal | RectGoal;

// ---------- Recursos e custos ----------

export type Resources = Record<ResourceName, number>;

// Quantidades por recurso (custos e bônus de coleta). Chaves ausentes valem "nada".
export type PerResource = Partial<Record<ResourceName, number>>;

export type Cost = PerResource;

// ---------- Definições (dados de config.ts) ----------

export interface UnitDef {
  name: string;
  // Aldeões: coletam e constroem.
  civil?: boolean;
  hp: number;
  attack: number;
  cooldown: number;
  range: number;
  // Arqueiros e besteiros disparam projéteis (evento 'shot' em vez de 'hit').
  ranged?: boolean;
  speed: number;
  sight: number;
  cost: Cost;
  time: number;
  age: AgeNumber;
  // Edifício que treina esta unidade.
  from: BuildingType;
  // Multiplicador de dano contra classes específicas.
  bonus?: Partial<Record<UnitType, number>>;
  // Aríete: só ataca edifícios e causa dano de cerco, sem a redução de 0,5 contra prédios.
  siege?: boolean;
}

export interface BuildingDef {
  name: string;
  w: number;
  h: number;
  hp: number;
  sight: number;
  // População que o edifício adiciona ao limite (só casas e centros).
  pop?: number;
  cost: Cost;
  time: number;
  age: AgeNumber;
  trains?: UnitType[];
  // Recursos que este edifício aceita na entrega.
  dropoff?: ResourceName[];
  // Recurso coletável no próprio edifício (fazendas).
  gather?: ResourceName;
  gatherTime?: number;
  maxGatherers?: number;
  // Técnicas que este edifício pesquisa.
  techs?: TechId[];
  // Marco: ao ser concluído, avança o jogador para esta idade.
  landmarkFor?: NextAge;
  // Torres: atacam sozinhas.
  attack?: number;
  range?: number;
  cooldown?: number;
}

export interface NodeDef {
  name: string;
  resource: ResourceName;
  amount: number;
  gatherTime: number;
  w: number;
  h: number;
}

export interface TechDef {
  name: string;
  building: BuildingType;
  age: AgeNumber;
  cost: Cost;
  time: number;
  effect: {
    // Soma ao multiplicador de coleta do recurso.
    gather?: PerResource;
    // Soma ao multiplicador de ataque.
    attack?: number;
  };
  req?: TechId;
}

export interface AgeUpDef {
  cost: Cost;
  time: number;
}

export interface DifficultyDef {
  name: string;
  // Segundos entre cada decisão do bot.
  think: number;
  // Meta de aldeões.
  villagers: number;
  // Tamanho do exército para atacar.
  attackArmy: number;
  // Multiplicador de coleta do bot.
  gather: number;
}

// ---------- Entidades ----------

// Campos comuns. `id` é atribuído pelo World ao adicionar; `dead` é marcado ao remover.
interface EntityBase {
  id: number;
  // Índice do jogador dono; -1 = neutro (recursos naturais).
  owner: number;
  x: number;
  y: number;
  dead?: boolean;
}

// Carga de um aldeão (recurso coletado e ainda não entregue).
export interface Carry {
  res: ResourceName;
  amt: number;
}

// Ordem de retomada: depois de atacar um alvo, a unidade volta a andar até `dest`.
export interface Resume {
  order: 'attackmove';
  dest: Point;
}

export interface UnitEntity extends EntityBase {
  kind: 'unit';
  type: UnitType;
  hp: number;
  maxHp: number;
  lastHitBy: number;
  order: Order;
  path: Point[] | null;
  // Índice do próximo waypoint em `path`.
  pi: number;
  // Id da entidade alvo (ataque, coleta ou construção).
  target: number | null;
  dest: Point | null;
  resume: Resume | null;
  cooldown: number;
  // Tempo até recalcular o caminho de ataque.
  repath: number;
  // Tempo até a próxima varredura de inimigos.
  scanT: number;
  // Progresso de coleta (segundos acumulados no recurso).
  gt: number;
  phase: Phase | null;
  resKind: ResourceName | null;
  carry: Carry | null;
  // Construtor já está encostado na obra.
  inSite: boolean;
  // Se a unidade andou neste tick (usado para não separar quem está em movimento).
  moved: boolean;
  // Deslocamento acumulado da separação entre unidades paradas.
  sx: number;
  sy: number;
  // Última posição do alvo em movimento.
  gx: number;
  gy: number;
  // Alvo inalcançável a ignorar até `skipUntil` (evita recalcular a cada tick).
  skipId: number;
  skipUntil: number;
}

export interface TrainingItem {
  type: UnitType;
  time: number;
  elapsed: number;
}

export interface Rally {
  x: number;
  y: number;
  // Recurso ou edifício para onde as unidades novas vão coletar (ou null).
  target: number | null;
}

export interface ResearchJob {
  id: TechId;
  elapsed: number;
  time: number;
}

export interface BuildingEntity extends EntityBase {
  kind: 'building';
  type: BuildingType;
  hp: number;
  maxHp: number;
  lastHitBy: number;
  // Fundação: `built` vira true ao terminar a obra.
  built: boolean;
  progress: number;
  builders: number;
  queue: TrainingItem[];
  rally: Rally | null;
  research: ResearchJob | null;
  // Recarga de torre.
  cooldown: number;
}

// Recurso natural (árvore, fruta, mina). Não tem vida nem footprint de unidade.
export interface NodeEntity extends EntityBase {
  kind: 'node';
  type: NodeType;
  amount: number;
  lastHitBy: number;
}

export type Entity = UnitEntity | BuildingEntity | NodeEntity;

// ---------- Jogadores e partida ----------

// Entrada de jogador ao criar a simulação (vem da tela de partida).
export interface PlayerConfig {
  name: string;
  color: string;
  isBot?: boolean;
  difficulty?: DifficultyKey;
  civ?: Civ;
}

export interface PlayerStats {
  kills: number;
  lost: number;
  destroyed: number;
  built: number;
  trained: number;
  researched: number;
  gathered: Resources;
}

export interface Player {
  index: number;
  name: string;
  color: string;
  isBot: boolean;
  difficulty: DifficultyKey;
  civ: Civ;
  res: Resources;
  defeated: boolean;
  age: AgeNumber;
  techs: Partial<Record<TechId, boolean>>;
  stats: PlayerStats;
}

// Mapa gerado por mapgen.ts.
export interface MapNodeSpawn {
  type: NodeType;
  x: number;
  y: number;
}

export interface GameMap {
  size: number;
  seed: number;
  // 0 = grama, 1 = água (ver mapgen.ts).
  terrain: Uint8Array;
  tint: Float32Array;
  heights: Float32Array;
  nodes: MapNodeSpawn[];
  // Canto superior esquerdo da base de cada jogador.
  starts: Point[];
}

export interface GameOver {
  result: 'defeat' | 'victory';
  time: number;
}

// Configuração da partida escolhida na tela inicial.
export interface Settings {
  size: MapSizeKey;
  bots: number;
  difficulty: DifficultyKey;
  // Texto digitado pelo jogador ou número já convertido.
  seed: string | number;
  // Condição de vitória por maravilha (além da conquista, que está sempre ativa).
  wonderVictory?: boolean;
  civ?: Civ;
}

// ---------- Comandos ----------

// Ordens para um grupo de unidades (ver Simulation.command).
export type Command =
  | { type: 'move'; x: number; y: number }
  | { type: 'attackmove'; x: number; y: number }
  | { type: 'stop' }
  | { type: 'attack'; target: number }
  | { type: 'gather'; target: number }
  | { type: 'build'; target: number };

// Clique direito. A interface manda entidade sem coordenadas (inimigo, fazenda, construção),
// ou só um ponto do chão. Com entidade sem ação própria, o fallback anda até o ponto, se houver.
export type SmartTarget =
  | { entity: Entity; x?: number; y?: number }
  | { entity?: undefined; x: number; y: number };

// Resultado de um comando. `reason` explica a recusa; os demais campos só existem em caso de sucesso.
export type Outcome =
  | { ok: true; reason?: undefined; building?: undefined }
  | { ok: false; reason: string; building?: undefined };

export type PlaceOutcome =
  | { ok: true; reason?: undefined; building: BuildingEntity }
  | { ok: false; reason: string; building?: undefined };

// ---------- Eventos (drenados pela interface a cada quadro) ----------

export interface CombatEvent {
  type: 'shot' | 'hit';
  from: Point;
  to: Point;
  owner: number;
}

export interface DeathEvent {
  type: 'death';
  kind: EntityKind;
  x: number;
  y: number;
  owner: number;
}

export interface MessageEvent {
  type: 'msg';
  text: string;
  level: MessageLevel;
}

export type GameEvent = CombatEvent | DeathEvent | MessageEvent;
