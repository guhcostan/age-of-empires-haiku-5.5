// Terreno (malha com cor por vértice) e a camada de névoa de guerra.
import * as THREE from 'three';
import { WATER } from '../core/mapgen.js';

const GRASS_A = new THREE.Color(0x5f8f3d);
const GRASS_B = new THREE.Color(0x8fb35a);
const DIRT = new THREE.Color(0x9b7a4e);
const WATER_DEEP = new THREE.Color(0x1f5f9e);
const WATER_SHALLOW = new THREE.Color(0x3a86c4);

export function heightAt(map, x, z) {
  const vs = map.size + 1;
  const cx = Math.min(Math.max(x, 0), map.size - 0.001);
  const cz = Math.min(Math.max(z, 0), map.size - 0.001);
  const x0 = Math.floor(cx);
  const z0 = Math.floor(cz);
  const tx = cx - x0;
  const tz = cz - z0;
  const h = map.heights;
  const a = h[z0 * vs + x0];
  const b = h[z0 * vs + x0 + 1];
  const c = h[(z0 + 1) * vs + x0];
  const d = h[(z0 + 1) * vs + x0 + 1];
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

// Cor de cada tile: grama com variação, terra perto das bases, água.
function tileColors(map, baseCenters) {
  const { size, terrain, tint } = map;
  const out = new Array(size * size);
  const c = new THREE.Color();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (terrain[i] === WATER) {
        out[i] = WATER_DEEP.clone().lerp(WATER_SHALLOW, tint[i]);
        continue;
      }
      c.copy(GRASS_A).lerp(GRASS_B, tint[i]);
      let near = Infinity;
      for (const b of baseCenters) near = Math.min(near, Math.hypot(x - b.x, y - b.y));
      if (near < 7) c.lerp(DIRT, (7 - near) / 9);
      out[i] = c.clone();
    }
  }
  return out;
}

// Malha de terreno: (size+1)² vértices com cor média dos tiles vizinhos.
function gridGeometry(map, lift, colors) {
  const { size, heights } = map;
  const vs = size + 1;
  const positions = new Float32Array(vs * vs * 3);
  const uvs = new Float32Array(vs * vs * 2);
  const vcol = colors ? new Float32Array(vs * vs * 3) : null;
  for (let j = 0; j < vs; j++) {
    for (let i = 0; i < vs; i++) {
      const v = j * vs + i;
      positions[v * 3] = i;
      positions[v * 3 + 1] = heights[v] + lift;
      positions[v * 3 + 2] = j;
      uvs[v * 2] = i / size;
      uvs[v * 2 + 1] = j / size;
      if (vcol) {
        const acc = new THREE.Color(0, 0, 0);
        let n = 0;
        for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
          if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
          acc.add(colors[ty * size + tx]);
          n++;
        }
        acc.multiplyScalar(1 / n);
        vcol[v * 3] = acc.r;
        vcol[v * 3 + 1] = acc.g;
        vcol[v * 3 + 2] = acc.b;
      }
    }
  }
  const indices = [];
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const a = j * vs + i;
      const b = a + 1;
      const c = a + vs;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (vcol) geo.setAttribute('color', new THREE.BufferAttribute(vcol, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildTerrain(map, baseCenters) {
  const colors = tileColors(map, baseCenters);
  const mesh = new THREE.Mesh(
    gridGeometry(map, 0, colors),
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Névoa: textura RGBA preta com alfa por tile (2 = visível, 1 = explorado, 0 = inexplorado).
export function buildFog(map) {
  const size = map.size;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) data[i * 4 + 3] = 255;
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const mesh = new THREE.Mesh(
    gridGeometry(map, 0.06, null),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.renderOrder = 2;
  mesh.name = 'fog';
  return { mesh, tex, data };
}

const ALPHA = [255, 110, 0];

export function updateFog(fog, visibility) {
  const { data, tex } = fog;
  for (let i = 0; i < visibility.length; i++) data[i * 4 + 3] = ALPHA[visibility[i]];
  tex.needsUpdate = true;
}
