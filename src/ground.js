import { heightAt } from './terrain.js';

// Rocas como obstáculos sólidos. Cada geometría de roca se resume en un mapa de
// alturas (la cima de la roca en cada punto de su planta), y cada instancia lo
// usa con su posición, escala y giro. Se guardan en una grilla para buscarlas rápido.
const CELL = 4;
const grid = new Map();
const cellKey = (i, j) => `${i},${j}`;

// Mapa de alturas de una geometría: y máxima de sus vértices en una grilla n×n sobre x, z.
export function heightGrid(geometry, n = 24) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const size = Math.max(max.x - min.x, max.z - min.z) * 1.02;
  const h = new Float32Array(n * n).fill(-Infinity);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const cx = Math.min(n - 1, Math.floor(((pos.getX(i) - min.x) / size) * n));
    const cz = Math.min(n - 1, Math.floor(((pos.getZ(i) - min.z) / size) * n));
    const k = cz * n + cx;
    h[k] = Math.max(h[k], pos.getY(i));
  }
  const radius = Math.max(-min.x, max.x, -min.z, max.z);
  return { minX: min.x, minZ: min.z, size, n, h, radius, top: max.y };
}

export function registerRock({ x, y, z, sx, sy, sz, rot, shape }) {
  const rock = { x, y, z, sx, sy, sz, cos: Math.cos(rot), sin: Math.sin(rot), shape };
  const r = shape.radius * Math.max(sx, sz);
  for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) {
    for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
      const k = cellKey(i, j);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(rock);
    }
  }
}

// Cima de una roca en (x, z) según su mapa de alturas, o -Infinity si el punto cae fuera.
function topOf(r, x, z) {
  const dx = x - r.x, dz = z - r.z;
  // Del mundo al marco de la roca (sin escala): deshace el giro y la escala.
  const lx = (dx * r.cos - dz * r.sin) / r.sx;
  const lz = (dx * r.sin + dz * r.cos) / r.sz;
  const s = r.shape;
  const fx = ((lx - s.minX) / s.size) * s.n - 0.5;
  const fz = ((lz - s.minZ) / s.size) * s.n - 0.5;
  const ix = Math.floor(fx), iz = Math.floor(fz);
  if (ix < -1 || iz < -1 || ix >= s.n || iz >= s.n) return -Infinity;
  // Interpolación bilineal entre las celdas que tienen roca.
  let sum = 0, wsum = 0, peak = -Infinity;
  for (const [cx, cz, w] of [
    [ix, iz, (1 - (fx - ix)) * (1 - (fz - iz))],
    [ix + 1, iz, (fx - ix) * (1 - (fz - iz))],
    [ix, iz + 1, (1 - (fx - ix)) * (fz - iz)],
    [ix + 1, iz + 1, (fx - ix) * (fz - iz)],
  ]) {
    if (cx < 0 || cz < 0 || cx >= s.n || cz >= s.n) continue;
    const v = s.h[cz * s.n + cx];
    if (v === -Infinity) continue;
    sum += v * w;
    wsum += w;
    peak = Math.max(peak, v);
  }
  if (wsum < 0.35) return -Infinity; // borde de la roca
  return r.y + (sum / wsum) * r.sy;
}

function rocksNear(x, z) {
  return grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? [];
}

// Altura de la cima de roca más alta en (x, z), o -Infinity si no hay roca.
export function rockTopAt(x, z) {
  let top = -Infinity;
  for (const r of rocksNear(x, z)) top = Math.max(top, topOf(r, x, z));
  return top;
}

// Suelo que pisan las ruedas: el terreno o la roca que esté encima.
export function groundAt(x, z) {
  return Math.max(heightAt(x, z), rockTopAt(x, z));
}

// Cuánto sobresale una roca del terreno en (x, z).
export function obstacleAt(x, z) {
  return Math.max(0, rockTopAt(x, z) - heightAt(x, z));
}

// Altura total (sobre el terreno) de la roca más alta que ocupa (x, z), o 0.
export function rockHeightAt(x, z) {
  let tallest = 0;
  for (const r of rocksNear(x, z)) {
    if (topOf(r, x, z) === -Infinity) continue;
    tallest = Math.max(tallest, r.y + r.shape.top * r.sy - heightAt(r.x, r.z));
  }
  return tallest;
}
