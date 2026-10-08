// Modelos 3D procedurais: tudo é montado com primitivas do three.js, sem arquivos externos.
// Convenção: a frente de cada modelo aponta para +Z; os pés ficam em y = 0.
import * as THREE from 'three';
import type { BuildingType, NodeType, UnitType } from '../types.ts';

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<number, THREE.MeshLambertMaterial>();

export type Vec3 = [number, number, number];

export function mat(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
}

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

const box = (w: number, h: number, d: number) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt: number, rb: number, h: number, seg = 8) =>
  cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const sph = (r: number, seg = 8) =>
  cached(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(5, seg - 2)));
const cone = (r: number, h: number, seg = 8) => cached(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const dodeca = (r: number) => cached(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const ico = (r: number) => cached(`i${r}`, () => new THREE.IcosahedronGeometry(r, 0));
const arc = (r: number, tube: number) =>
  cached(`a${r},${tube}`, () => new THREE.TorusGeometry(r, tube, 4, 12, Math.PI));

export const G = { box, cyl, sph, cone, dodeca, ico, arc };

// Adiciona uma peça ao pai.
export function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  rot: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function pivot(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- Unidades ----------

const SKIN = 0xe0b48c;
const PANTS = 0x6b4f2a;
const STEEL = 0xaab3bf;
const STEEL_DARK = 0x5b6470;
const WOOD = 0x8b5a2b;
const GOLD = 0xe6b93a;

// Articulações de uma unidade: o corpo balança, as pernas andam e os braços trabalham/atacam.
export interface UnitRig {
  body: THREE.Group;
  legs: THREE.Group[];
  armL: THREE.Group;
  armR: THREE.Group;
}

// Cavalos têm a articulação do cavalo além das do cavaleiro.
export interface HorseRig extends UnitRig {
  horse: THREE.Group;
}

function buildVillager(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.1, 0.42, 0);
  const legR = pivot(body, 0.1, 0.42, 0);
  part(legL, box(0.13, 0.42, 0.15), PANTS, 0, -0.21, 0);
  part(legR, box(0.13, 0.42, 0.15), PANTS, 0, -0.21, 0);
  part(body, box(0.36, 0.42, 0.24), team, 0, 0.64, 0);
  part(body, box(0.36, 0.07, 0.26), 0x4a3320, 0, 0.47, 0);
  part(body, sph(0.13), SKIN, 0, 0.96, 0);
  part(body, cyl(0.24, 0.24, 0.035, 10), 0xd9b96a, 0, 1.06, 0);
  part(body, cone(0.15, 0.14, 8), 0xd9b96a, 0, 1.13, 0);
  const armL = pivot(body, -0.25, 0.84, 0);
  part(armL, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  const armR = pivot(body, 0.25, 0.84, 0);
  part(armR, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  // Ferramenta na mão direita (picareta/machado simples).
  part(armR, box(0.04, 0.42, 0.04), WOOD, 0.07, -0.42, 0.06, [0.4, 0, 0]);
  part(armR, box(0.16, 0.06, 0.05), STEEL_DARK, 0.07, -0.62, 0.22, [0.4, 0, 0]);
  return { body, legs: [legL, legR], armL, armR };
}

function buildSwordsman(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.11, 0.44, 0);
  const legR = pivot(body, 0.11, 0.44, 0);
  part(legL, box(0.14, 0.44, 0.16), STEEL_DARK, 0, -0.22, 0);
  part(legR, box(0.14, 0.44, 0.16), STEEL_DARK, 0, -0.22, 0);
  part(body, box(0.44, 0.48, 0.28), STEEL, 0, 0.7, 0);
  part(body, box(0.3, 0.38, 0.04), team, 0, 0.66, 0.16);
  part(body, sph(0.15, 8), STEEL, 0, 1.06, 0);
  part(body, box(0.04, 0.14, 0.2), team, 0, 1.2, 0);
  part(body, box(0.2, 0.05, 0.05), 0x2a2a2a, 0, 1.03, 0.12);
  const armL = pivot(body, -0.3, 0.92, 0);
  part(armL, box(0.13, 0.42, 0.13), STEEL, 0, -0.21, 0);
  part(armL, box(0.08, 0.5, 0.42), WOOD, -0.12, -0.18, 0.12);
  part(armL, box(0.1, 0.16, 0.1), team, -0.12, -0.18, 0.12);
  const armR = pivot(body, 0.3, 0.92, 0);
  part(armR, box(0.13, 0.42, 0.13), STEEL, 0, -0.21, 0);
  part(armR, box(0.06, 0.6, 0.12), 0xd9e1ea, 0.04, -0.6, 0.08);
  part(armR, box(0.18, 0.06, 0.08), GOLD, 0.04, -0.3, 0.08);
  return { body, legs: [legL, legR], armL, armR };
}

function buildArcher(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.1, 0.42, 0);
  const legR = pivot(body, 0.1, 0.42, 0);
  part(legL, box(0.13, 0.42, 0.14), PANTS, 0, -0.21, 0);
  part(legR, box(0.13, 0.42, 0.14), PANTS, 0, -0.21, 0);
  part(body, box(0.36, 0.44, 0.22), 0x7b5a36, 0, 0.66, 0);
  part(body, box(0.42, 0.5, 0.05), team, 0, 0.62, -0.14);
  part(body, sph(0.13), SKIN, 0, 0.98, 0);
  part(body, cone(0.17, 0.26, 8), 0x3c5a2a, 0, 1.12, -0.02);
  part(body, cyl(0.05, 0.05, 0.42, 6), 0x5a3b1f, 0.12, 0.8, -0.2, [0, 0, 0.25]);
  const armL = pivot(body, -0.24, 0.86, 0);
  part(armL, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  const bow = pivot(armL, 0, -0.2, 0.22);
  bow.rotation.y = Math.PI / 2;
  part(bow, arc(0.36, 0.025), WOOD, 0, 0, 0, [0, 0, Math.PI / 2]);
  const armR = pivot(body, 0.24, 0.86, 0);
  part(armR, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  return { body, legs: [legL, legR], armL, armR };
}

function buildScout(root: THREE.Group, team: number): HorseRig {
  const body = pivot(root, 0, 0, 0);
  const horse = pivot(body, 0, 0, 0);
  part(horse, box(0.52, 0.42, 1.0), WOOD, 0, 0.72, 0);
  part(horse, box(0.22, 0.5, 0.24), WOOD, 0, 1.0, 0.5, [-0.35, 0, 0]);
  part(horse, box(0.22, 0.22, 0.38), 0x6b4420, 0, 1.22, 0.78);
  part(horse, box(0.06, 0.3, 0.06), 0x3a2414, 0, 0.82, -0.6, [0.5, 0, 0]);
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-0.17, 0.36], [0.17, 0.36], [-0.17, -0.36], [0.17, -0.36]]) {
    const leg = pivot(horse, x, 0.5, z);
    part(leg, box(0.09, 0.5, 0.09), 0x6d4420, 0, -0.25, 0);
    legs.push(leg);
  }
  // Cavaleiro.
  part(horse, box(0.3, 0.36, 0.2), team, 0, 1.26, -0.05);
  part(horse, sph(0.12), SKIN, 0, 1.56, -0.05);
  part(horse, sph(0.14, 6), STEEL, 0, 1.64, -0.05);
  const armR = pivot(horse, 0.22, 1.36, 0);
  part(armR, box(0.1, 0.3, 0.1), SKIN, 0, -0.15, 0, [-0.8, 0, 0]);
  part(armR, box(0.04, 0.04, 1.3), 0x9a8a6a, 0.05, -0.05, 0.6, [-1.2, 0, 0]);
  part(armR, box(0.06, 0.06, 0.06), team, 0.05, -0.05, 1.2, [-1.2, 0, 0]);
  return { body, legs, armL: armR, armR, horse };
}

export interface CreatedUnit {
  root: THREE.Group;
  rig: UnitRig;
}

export function createUnit(type: UnitType, teamColor: string): CreatedUnit {
  const root = new THREE.Group();
  const team = new THREE.Color(teamColor).getHex();
  let rig: UnitRig;
  if (type === 'villager') rig = buildVillager(root, team);
  else if (type === 'swordsman' || type === 'vanguard') rig = buildSwordsman(root, team);
  else if (type === 'archer' || type === 'longbowman') rig = buildArcher(root, team);
  else if (type === 'scout') rig = buildScout(root, team);
  else rig = buildAdvancedUnit(type, root, team);
  return { root, rig };
}

// Animação: andar (pernas), trabalhar/atacar (braço direito) e balanço do corpo.
export function animateUnit(rig: UnitRig, type: UnitType, t: number, moving: boolean, acting: boolean): void {
  const horse = isHorse(type);
  const ph = t * (horse ? 14 : 9);
  const k = moving ? 1 : 0;
  rig.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0)) * (horse ? 0.25 : 0.7) * k;
  });
  rig.body.position.y = k * Math.abs(Math.sin(ph)) * (horse ? 0.05 : 0.035);
  if (acting) {
    rig.armR.rotation.x = -1.1 + Math.sin(t * 10) * 0.8;
  } else {
    rig.armR.rotation.x = moving && !horse ? Math.sin(ph + Math.PI) * 0.5 : 0;
  }
  if (!horse) rig.armL.rotation.x = moving ? Math.sin(ph) * 0.4 : 0;
}

// ---------- Edifícios (origem no centro da área ocupada) ----------

export function createBuilding(type: BuildingType, teamColor: string): THREE.Group {
  const root = new THREE.Group();
  const team = new THREE.Color(teamColor).getHex();
  const g = root;
  switch (type) {
    case 'towncenter': {
      part(g, box(3.8, 0.5, 3.8), 0xbdb197, 0, 0.25, 0);
      part(g, box(3.0, 1.9, 3.0), 0xa9825a, 0, 1.45, 0);
      part(g, box(0.8, 1.0, 0.06), 0x3b2a1a, 0, 0.75, 1.52);
      part(g, box(3.3, 0.14, 3.3), 0x7a5a3a, 0, 2.5, 0);
      part(g, cone(2.1, 1.3, 4), team, 0, 3.2, 0, [0, Math.PI / 4, 0]);
      for (const [x, z] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
        part(g, cyl(0.36, 0.42, 2.8, 8), 0xc9b99a, x, 1.4, z);
        part(g, cone(0.5, 0.7, 8), team, x, 3.1, z);
      }
      part(g, cyl(0.03, 0.03, 1.6, 6), 0x4a3a2a, 0, 4.2, 0);
      part(g, box(0.6, 0.36, 0.03), team, 0.31, 4.45, 0);
      break;
    }
    case 'house': {
      part(g, box(1.6, 0.9, 1.6), 0xd9c7a3, 0, 0.45, 0);
      part(g, cone(1.3, 0.85, 4), team, 0, 1.32, 0, [0, Math.PI / 4, 0]);
      part(g, box(0.36, 0.55, 0.05), 0x5a3b25, 0, 0.28, 0.82);
      part(g, box(0.2, 0.45, 0.2), 0x7a6a5a, 0.45, 1.25, -0.45);
      break;
    }
    case 'storehouse': {
      part(g, box(1.8, 0.9, 1.8), 0x8c5f35, 0, 0.45, 0);
      part(g, box(2.0, 0.12, 2.0), 0x5e4026, 0, 0.96, 0);
      for (let i = 0; i < 3; i++) part(g, cyl(0.12, 0.12, 1.1, 6), 0xb07a44, 0.2, 0.2 + i * 0.22, 1.05, [0, 0, Math.PI / 2]);
      part(g, box(0.9, 0.22, 0.05), team, 0, 1.2, 0.9);
      break;
    }
    case 'farm': {
      part(g, box(1.9, 0.12, 1.9), 0x6b4a26, 0, 0.06, 0);
      for (const x of [-0.6, -0.2, 0.2, 0.6]) {
        part(g, box(0.14, 0.26, 1.7), 0x7aa64a, x, 0.25, 0);
      }
      part(g, cyl(0.04, 0.04, 1.1, 6), 0x5a3b1f, 0.7, 0.55, -0.7);
      part(g, box(0.6, 0.12, 0.06), 0x5a3b1f, 0.7, 0.8, -0.7);
      part(g, cone(0.2, 0.25, 6), 0xd9b96a, 0.7, 1.15, -0.7);
      part(g, box(0.1, 0.22, 0.1), team, -0.92, 0.3, -0.92);
      break;
    }
    case 'barracks': {
      part(g, box(2.8, 0.6, 2.8), 0x7d7f88, 0, 0.3, 0);
      part(g, box(2.6, 1.3, 2.6), 0xa7a9b4, 0, 1.25, 0);
      part(g, box(0.8, 0.9, 0.05), 0x3a3a40, 0, 0.5, 1.32);
      part(g, cone(1.85, 1.0, 4), 0x6b3d2a, 0, 2.4, 0, [0, Math.PI / 4, 0]);
      part(g, cyl(0.03, 0.03, 1.6, 6), 0x3a2a1a, 1.0, 2.8, 1.0);
      part(g, box(0.5, 0.36, 0.03), team, 1.27, 3.2, 1.0);
      break;
    }
    case 'stable': {
      part(g, box(2.8, 1.2, 2.4), 0x8d5a3b, 0, 0.6, 0);
      part(g, box(2.95, 0.12, 1.7), 0x5a3b1f, 0, 1.55, 0.5, [0.55, 0, 0]);
      part(g, box(2.95, 0.12, 1.7), 0x5a3b1f, 0, 1.55, -0.5, [-0.55, 0, 0]);
      part(g, box(0.9, 0.9, 0.05), 0x3b2a1a, 0, 0.45, 1.22);
      for (const x of [-1.3, 1.3]) part(g, box(0.1, 0.5, 0.1), 0x6b4a2a, x, 0.25, 1.9);
      part(g, box(2.6, 0.06, 0.06), 0x6b4a2a, 0, 0.45, 1.9);
      part(g, box(0.5, 0.3, 0.04), team, 0, 1.9, 1.22);
      break;
    }
    default:
      buildAdvancedBuilding(type, g, team);
      break;
  }
  return root;
}

// ---------- Recursos naturais ----------

export function createBerry(): THREE.Group {
  const root = new THREE.Group();
  part(root, sph(0.32, 8), 0x4f8f3a, 0, 0.22, 0).scale.set(1, 0.7, 1);
  for (const [x, z] of [[0.15, 0.1], [-0.12, 0.14], [0.05, -0.16], [-0.2, -0.05]]) {
    part(root, sph(0.06, 6), 0xd83c4a, x, 0.4, z);
  }
  return root;
}

export function createMine(type: NodeType): THREE.Group {
  const root = new THREE.Group();
  if (type === 'gold') {
    part(root, dodeca(0.9), 0x8a8580, 0, 0.35, 0).scale.set(1.2, 0.7, 1.1);
    for (const [x, z] of [[-0.5, 0.3], [0.4, 0.5], [0.1, -0.5], [-0.3, -0.3]]) {
      part(root, dodeca(0.17), GOLD, x, 0.66, z);
    }
  } else {
    part(root, ico(0.5), 0x9aa3ac, 0, 0.42, 0);
    part(root, ico(0.36), 0x7f8891, 0.55, 0.3, 0.35);
    part(root, ico(0.3), 0x8e97a0, -0.5, 0.26, -0.3);
  }
  return root;
}

// Peça de árvore: geometria, cor, posição.
type TreePart = [THREE.BufferGeometry, number, number, number, number];

// Geometrias de árvores prontas para instancing: pinheiro e árvore redonda.
export function treeGeometries(): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const pine = mergeTree([
    [cyl(0.08, 0.12, 0.5, 6), 0x6b4423, 0, 0.25, 0],
    [cone(0.45, 0.55, 7), 0x2f6b2f, 0, 0.7, 0],
    [cone(0.34, 0.5, 7), 0x347a34, 0, 0.98, 0],
    [cone(0.22, 0.42, 7), 0x3d8a3d, 0, 1.22, 0],
  ]);
  const round = mergeTree([
    [cyl(0.09, 0.12, 0.55, 6), 0x6b4423, 0, 0.27, 0],
    [sph(0.42, 7), 0x3c8a3c, 0, 0.9, 0],
    [sph(0.3, 6), 0x46943f, 0.2, 1.2, 0.1],
  ]);
  return [pine, round];
}

// Junta peças em uma só geometria com cor por vértice (para instancing).
function mergeTree(parts: TreePart[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const [g, color, x, y, z] of parts) {
    const c = new THREE.Color(color);
    const src = g.clone();
    src.translate(x, y, z);
    const pos = src.attributes.position;
    const nor = src.attributes.normal;
    const idx = src.index;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    offset += pos.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.setIndex(indices);
  return out;
}

// Prévia translúcida: troca os materiais por cópias transparentes.
export function makeGhost(object: THREE.Object3D, opacity = 0.5): THREE.Object3D {
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const m = (o.material as THREE.Material).clone();
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
      o.material = m;
      o.castShadow = false;
    }
  });
  return object;
}

// ---------- Unidades e edifícios da Idade Feudal em diante ----------

export function isHorse(type: UnitType): boolean {
  return type === 'scout' || type === 'knight' || type === 'royalKnight' || type === 'horseman' || type === 'king';
}

function buildSpearman(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.11, 0.44, 0);
  const legR = pivot(body, 0.11, 0.44, 0);
  part(legL, box(0.14, 0.44, 0.16), STEEL_DARK, 0, -0.22, 0);
  part(legR, box(0.14, 0.44, 0.16), STEEL_DARK, 0, -0.22, 0);
  part(body, box(0.42, 0.46, 0.26), 0x9aa3ad, 0, 0.7, 0);
  part(body, box(0.3, 0.36, 0.04), team, 0, 0.66, 0.15);
  part(body, sph(0.14, 8), STEEL, 0, 1.04, 0);
  part(body, cone(0.16, 0.2, 8), STEEL, 0, 1.14, 0);
  part(body, box(0.04, 0.14, 0.2), team, 0, 1.28, 0);
  const armL = pivot(body, -0.3, 0.92, 0);
  part(armL, box(0.13, 0.42, 0.13), 0x9aa3ad, 0, -0.21, 0);
  const armR = pivot(body, 0.3, 0.92, 0);
  part(armR, box(0.13, 0.42, 0.13), 0x9aa3ad, 0, -0.21, 0);
  part(armR, box(0.05, 1.9, 0.05), WOOD, 0.04, -0.9, 0.1);
  part(armR, box(0.12, 0.32, 0.03), 0xd9e1ea, 0.04, -1.9, 0.1);
  return { body, legs: [legL, legR], armL, armR };
}

function buildCrossbow(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const legL = pivot(body, -0.1, 0.42, 0);
  const legR = pivot(body, 0.1, 0.42, 0);
  part(legL, box(0.13, 0.42, 0.14), PANTS, 0, -0.21, 0);
  part(legR, box(0.13, 0.42, 0.14), PANTS, 0, -0.21, 0);
  part(body, box(0.36, 0.44, 0.22), 0x5f6b4a, 0, 0.66, 0);
  part(body, box(0.42, 0.5, 0.05), team, 0, 0.62, -0.14);
  part(body, sph(0.13), SKIN, 0, 0.98, 0);
  part(body, cone(0.17, 0.24, 8), 0x6b5a3a, 0, 1.12, -0.02);
  const armL = pivot(body, -0.24, 0.86, 0);
  part(armL, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  part(armL, box(0.1, 0.12, 0.7), 0x5a3b1f, 0.02, -0.28, 0.3);
  part(armL, box(0.56, 0.06, 0.08), 0x3a2a1a, 0.02, -0.28, 0.62);
  const armR = pivot(body, 0.24, 0.86, 0);
  part(armR, box(0.11, 0.38, 0.11), SKIN, 0, -0.19, 0);
  return { body, legs: [legL, legR], armL, armR };
}

function buildKnight(root: THREE.Group, team: number): HorseRig {
  const rig = buildScout(root, team);
  // Armadura de placas sobre o cavalo e o cavaleiro.
  part(rig.horse, box(0.6, 0.5, 1.12), STEEL, 0, 0.72, 0);
  part(rig.horse, box(0.36, 0.4, 0.26), STEEL, 0, 1.26, -0.05);
  part(rig.horse, sph(0.15, 8), STEEL_DARK, 0, 1.64, -0.05);
  part(rig.horse, box(0.05, 0.16, 0.2), team, 0, 1.78, -0.05);
  return rig;
}

// Aríete: chassi com tronco e duas rodas (as rodas são as "pernas" da animação).
function buildRam(root: THREE.Group, team: number): UnitRig {
  const body = pivot(root, 0, 0, 0);
  const wheelL = pivot(body, -0.45, 0.3, 0.1);
  const wheelR = pivot(body, 0.45, 0.3, 0.1);
  part(wheelL, cyl(0.3, 0.3, 0.12, 10), 0x4a3320, 0, 0, 0, [0, 0, Math.PI / 2]);
  part(wheelR, cyl(0.3, 0.3, 0.12, 10), 0x4a3320, 0, 0, 0, [0, 0, Math.PI / 2]);
  part(body, box(1.0, 0.25, 1.1), 0x8b5a2b, 0, 0.45, 0);
  part(body, cyl(0.12, 0.12, 1.5, 8), 0x6b4423, 0, 0.7, 0.2, [Math.PI / 2, 0, 0]);
  part(body, box(0.9, 0.5, 0.1), team, 0, 0.75, -0.55);
  const armL = pivot(body, -0.4, 0.8, 0);
  const armR = pivot(body, 0.4, 0.8, 0);
  return { body, legs: [wheelL, wheelR], armL, armR };
}

// Monta unidades desta fase; chamado por createUnit.
export function buildAdvancedUnit(type: UnitType, root: THREE.Group, team: number): UnitRig {
  if (type === 'ram') return buildRam(root, team);
  if (type === 'spearman' || type === 'hardenedSpearman') return buildSpearman(root, team);
  if (type === 'crossbow' || type === 'arbalestrier') return buildCrossbow(root, team);
  return buildKnight(root, team);
}

// Marco de idade: base de pedra, corpo alto e telhado na cor do time.
function buildLandmark(g: THREE.Group, team: number, stone: number, height: number): void {
  part(g, box(3.0, 0.5, 3.0), 0xbdb197, 0, 0.25, 0);
  part(g, box(2.6, height, 2.6), stone, 0, 0.5 + height / 2, 0);
  part(g, cone(1.9, 1.2, 4), team, 0, 0.5 + height + 0.6, 0, [0, Math.PI / 4, 0]);
  part(g, box(0.5, 0.36, 0.03), team, 0, 0.5 + height + 1.5, 1.32);
}

// Monta edifícios desta fase; chamado por createBuilding.
export function buildAdvancedBuilding(type: BuildingType, g: THREE.Group, team: number): void {
  switch (type) {
    case 'mill': {
      part(g, box(1.8, 1.2, 1.8), 0xb89a6a, 0, 0.6, 0);
      part(g, box(2.0, 0.14, 2.0), 0x6b4a26, 0, 1.27, 0);
      part(g, cone(1.4, 0.8, 4), team, 0, 1.8, 0, [0, Math.PI / 4, 0]);
      const wheel = part(g, cyl(0.7, 0.7, 0.12, 12), 0x7a5a30, 0.92, 0.85, 0, [0, 0, Math.PI / 2]);
      wheel.castShadow = true;
      part(g, box(1.4, 0.08, 0.1), 0x5a3b1f, 0.95, 0.85, 0, [0, 0, Math.PI / 2]);
      break;
    }
    case 'lumberCamp': {
      part(g, box(1.8, 0.9, 1.8), 0x7a5234, 0, 0.45, 0);
      part(g, box(2.0, 0.12, 2.0), 0x4a3018, 0, 0.96, 0);
      for (let i = 0; i < 3; i++) part(g, cyl(0.14, 0.14, 1.0, 6), 0xb07a44, -0.5, 0.18 + i * 0.25, 1.1, [0, 0, Math.PI / 2]);
      part(g, cyl(0.04, 0.04, 1.2, 6), 0x5a3b1f, 0.8, 0.6, 0.6);
      part(g, box(0.5, 0.06, 0.08), 0xc8c8c8, 0.8, 1.1, 0.6);
      part(g, box(0.5, 0.3, 0.04), team, 0, 1.2, 0.92);
      break;
    }
    case 'miningCamp': {
      part(g, box(1.8, 0.8, 1.8), 0x8a8f96, 0, 0.4, 0);
      part(g, box(2.0, 0.12, 2.0), 0x5a5f66, 0, 0.86, 0);
      part(g, box(0.7, 0.4, 0.5), 0x6a6e76, 0.9, 0.22, 1.2);
      part(g, dodeca(0.22), GOLD, -0.6, 0.95, 0.8);
      part(g, ico(0.25), 0xaeb8c2, -0.2, 0.95, 1.1);
      part(g, box(0.5, 0.3, 0.04), team, 0, 1.2, 0.92);
      break;
    }
    case 'blacksmith': {
      part(g, box(2.8, 1.2, 2.6), 0x6e6a64, 0, 0.6, 0);
      part(g, cyl(0.2, 0.25, 1.6, 6), 0x4a4a4a, 0.8, 2.0, -0.7);
      part(g, box(3.0, 0.12, 2.8), 0x3a3328, 0, 1.25, 0);
      part(g, box(0.5, 0.4, 0.3), 0x3a3a40, -0.8, 0.2, 1.6);
      part(g, box(0.5, 0.3, 0.03), team, 0, 1.8, 1.32);
      break;
    }
    case 'tower': {
      part(g, cyl(0.9, 1.0, 3.4, 8), 0x9c9a92, 0, 1.7, 0);
      part(g, cyl(1.1, 1.1, 0.4, 8), 0x8a8880, 0, 3.5, 0);
      part(g, cone(1.2, 1.0, 8), team, 0, 4.2, 0);
      part(g, cyl(0.03, 0.03, 1.0, 5), 0x3a2a1a, 0, 5.1, 0);
      part(g, box(0.4, 0.26, 0.03), team, 0.2, 5.3, 0);
      part(g, box(0.2, 0.5, 0.05), 0x2a2a2a, 0, 1.3, 0.95);
      break;
    }
    case 'keep': {
      part(g, box(3.0, 0.5, 3.0), 0x7d7f88, 0, 0.25, 0);
      part(g, box(2.6, 2.6, 2.6), 0xa7a9b4, 0, 1.8, 0);
      part(g, box(0.9, 1.2, 0.06), 0x3a3a40, 0, 1.0, 1.33);
      part(g, box(3.0, 0.3, 3.0), 0x8a8f96, 0, 3.25, 0);
      part(g, box(0.5, 0.36, 0.03), team, 0, 3.6, 1.52);
      break;
    }
    case 'chamberOfCommerce':
      buildLandmark(g, team, 0xb89a6a, 2.2);
      break;
    case 'schoolOfCavalry':
      buildLandmark(g, team, 0x8d5a3b, 2.4);
      break;
    case 'guildHall':
      buildLandmark(g, team, 0x9c9a92, 2.6);
      break;
    case 'royalInstitute':
      buildLandmark(g, team, 0xc9b99a, 2.8);
      break;
    case 'redPalace':
      buildLandmark(g, team, 0xa83a3a, 3.0);
      break;
    case 'collegeOfArtillery':
      buildLandmark(g, team, 0x7d7f88, 3.0);
      break;
    case 'councilHall':
      buildLandmark(g, team, 0xa9825a, 2.2);
      break;
    case 'abbeyOfKings':
      buildLandmark(g, team, 0x9c9a92, 2.4);
      break;
    case 'kingsPalace':
      buildLandmark(g, team, 0xc9b99a, 2.8);
      break;
    case 'whiteTower':
      buildLandmark(g, team, 0xe6e6e0, 3.0);
      break;
    case 'berkshirePalace':
      buildLandmark(g, team, 0x8a8f96, 3.2);
      break;
    case 'wynguardPalace':
      buildLandmark(g, team, 0x7d7f88, 3.2);
      break;
    case 'cathedral':
    case 'notreDame': {
      part(g, box(3.6, 0.6, 3.6), 0xbdb197, 0, 0.3, 0);
      part(g, box(3.2, 2.6, 3.2), 0xc9b99a, 0, 1.9, 0);
      part(g, box(0.9, 2.0, 0.9), 0xb0a48a, -1.1, 3.6, -1.1);
      part(g, box(0.9, 2.0, 0.9), 0xb0a48a, 1.1, 3.6, -1.1);
      part(g, cone(0.7, 1.4, 6), team, -1.1, 5.3, -1.1);
      part(g, cone(0.7, 1.4, 6), team, 1.1, 5.3, -1.1);
      part(g, box(0.9, 1.4, 0.06), 0x3a2a1a, 0, 1.0, 1.62);
      break;
    }
    case 'stoneWall': {
      part(g, box(0.9, 1.2, 0.9), 0xa9a9a0, 0, 0.6, 0);
      part(g, box(0.95, 0.25, 0.95), 0x8a8a80, 0, 1.32, 0);
      break;
    }
    case 'siegeWorkshop': {
      part(g, box(2.8, 0.6, 2.8), 0x6e6a64, 0, 0.3, 0);
      part(g, box(2.6, 1.4, 2.6), 0x8a6a46, 0, 1.3, 0);
      part(g, box(1.2, 0.9, 0.06), 0x3a2a1a, 0, 0.8, 1.32);
      part(g, cyl(0.12, 0.12, 1.6, 6), 0x5a4a3a, 1.0, 2.6, 0.8);
      part(g, box(0.5, 0.3, 0.03), team, 0.0, 2.2, 1.32);
      break;
    }
    case 'archeryRange': {
      part(g, box(2.8, 0.6, 2.8), 0x7d7f88, 0, 0.3, 0);
      part(g, box(2.4, 0.9, 2.4), 0x9c7a50, 0, 1.05, 0);
      part(g, box(0.1, 1.9, 0.1), 0x5a3b1f, 1.1, 1.55, 1.1);
      part(g, cyl(0.5, 0.5, 0.08, 12), 0xf2f2f2, -0.9, 1.5, 1.22, [Math.PI / 2, 0, 0]);
      part(g, cyl(0.28, 0.28, 0.09, 12), team, -0.9, 1.5, 1.24, [Math.PI / 2, 0, 0]);
      part(g, box(0.5, 0.3, 0.03), team, 0.0, 2.2, 1.22);
      break;
    }
    default:
      break;
  }
}
