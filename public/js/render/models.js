// Modelos 3D procedurais: tudo é montado com primitivas do three.js, sem arquivos externos.
// Convenção: a frente de cada modelo aponta para +Z; os pés ficam em y = 0.
import * as THREE from 'three';

const geoCache = new Map();
const matCache = new Map();

export function mat(color) {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color });
    matCache.set(color, m);
  }
  return m;
}

function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

const box = (w, h, d) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, seg = 8) => cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const sph = (r, seg = 8) => cached(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(5, seg - 2)));
const cone = (r, h, seg = 8) => cached(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const dodeca = (r) => cached(`d${r}`, () => new THREE.DodecahedronGeometry(r, 0));
const ico = (r) => cached(`i${r}`, () => new THREE.IcosahedronGeometry(r, 0));
const arc = (r, tube) => cached(`a${r},${tube}`, () => new THREE.TorusGeometry(r, tube, 4, 12, Math.PI));

export const G = { box, cyl, sph, cone, dodeca, ico, arc };

// Adiciona uma peça ao pai.
export function part(parent, geometry, color, x = 0, y = 0, z = 0, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, mat(color));
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function pivot(parent, x, y, z) {
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

function buildVillager(root, team) {
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

function buildSwordsman(root, team) {
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

function buildArcher(root, team) {
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

function buildScout(root, team) {
  const body = pivot(root, 0, 0, 0);
  const horse = pivot(body, 0, 0, 0);
  part(horse, box(0.52, 0.42, 1.0), WOOD, 0, 0.72, 0);
  part(horse, box(0.22, 0.5, 0.24), WOOD, 0, 1.0, 0.5, [-0.35, 0, 0]);
  part(horse, box(0.22, 0.22, 0.38), 0x6b4420, 0, 1.22, 0.78);
  part(horse, box(0.06, 0.3, 0.06), 0x3a2414, 0, 0.82, -0.6, [0.5, 0, 0]);
  const legs = [];
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

export function createUnit(type, teamColor) {
  const root = new THREE.Group();
  const team = new THREE.Color(teamColor).getHex();
  let rig;
  if (type === 'villager') rig = buildVillager(root, team);
  else if (type === 'swordsman') rig = buildSwordsman(root, team);
  else if (type === 'archer') rig = buildArcher(root, team);
  else rig = buildScout(root, team);
  return { root, rig, type };
}

// Animação: andar (pernas), trabalhar/atacar (braço direito) e balanço do corpo.
export function animateUnit(view, t, moving, acting) {
  const rig = view.rig;
  const ph = t * (view.type === 'scout' ? 14 : 9);
  const k = moving ? 1 : 0;
  rig.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0)) * (view.type === 'scout' ? 0.25 : 0.7) * k;
  });
  if (view.type === 'scout') {
    rig.body.position.y = k * Math.abs(Math.sin(ph)) * 0.05;
  } else {
    rig.body.position.y = k * Math.abs(Math.sin(ph)) * 0.035;
  }
  if (acting) {
    rig.armR.rotation.x = -1.1 + Math.sin(t * 10) * 0.8;
  } else {
    rig.armR.rotation.x = moving && view.type !== 'scout' ? Math.sin(ph + Math.PI) * 0.5 : 0;
  }
  if (view.type !== 'scout') rig.armL.rotation.x = moving ? Math.sin(ph) * 0.4 : 0;
}

// ---------- Edifícios (origem no centro da área ocupada) ----------

export function createBuilding(type, teamColor) {
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
      break;
  }
  return root;
}

// ---------- Recursos naturais ----------

export function createBerry() {
  const root = new THREE.Group();
  part(root, sph(0.32, 8), 0x4f8f3a, 0, 0.22, 0).scale.set(1, 0.7, 1);
  for (const [x, z] of [[0.15, 0.1], [-0.12, 0.14], [0.05, -0.16], [-0.2, -0.05]]) {
    part(root, sph(0.06, 6), 0xd83c4a, x, 0.4, z);
  }
  return root;
}

export function createMine(type) {
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

// Geometrias de árvores prontas para instancing: pinheiro e árvore redonda.
export function treeGeometries() {
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
function mergeTree(parts) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
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

export function makeGhost(object, opacity = 0.5) {
  object.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = opacity;
      o.material.depthWrite = false;
      o.castShadow = false;
    }
  });
  return object;
}
