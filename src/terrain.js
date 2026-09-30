import * as THREE from 'three';
import { simplex, fbm2 } from './noise.js';

const SIZE = 900;
const SEGMENTS = 360;

const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Perfil de duna asimétrico: ladera larga a barlovento y cara empinada a sotavento.
function duneProfile(phase) {
  const t = phase - Math.floor(phase);
  return t < 0.78 ? smoothstep(0, 0.78, t) : 1 - smoothstep(0.78, 1, t);
}

function dunes(x, z) {
  const warp = fbm2(x * 0.006 + 13.1, z * 0.006 - 4.2, 3) * 40;
  const u = x * 0.82 + z * 0.57 + warp;
  const amp = 0.55 + 0.45 * fbm2(x * 0.004 - 7.7, z * 0.004 + 2.3, 2);
  return duneProfile(u / 38) * 4.2 * Math.max(amp, 0);
}

export function heightAt(x, z) {
  const hills = fbm2(x * 0.0022, z * 0.0022, 4) * 26;
  const detail = fbm2(x * 0.05, z * 0.05, 3) * 0.35;
  // Aplana un poco la zona cercana a la cámara para que haya un primer plano legible.
  const near = smoothstep(40, 140, Math.hypot(x, z + 30));
  return hills * (0.35 + 0.65 * near) + dunes(x, z) + detail;
}

export function duneAmount(x, z) {
  return dunes(x, z) / 4.2;
}

// Textura de grano "tileable" (ruido 4D sobre un toro) para bump y variación de albedo.
function grainTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = x / size, t = y / size;
      const nx = Math.cos(s * TAU), ny = Math.sin(s * TAU);
      const nz = Math.cos(t * TAU), nw = Math.sin(t * TAU);
      let v = 0, amp = 1, freq = 1.2, norm = 0;
      for (let o = 0; o < 5; o++) {
        v += amp * simplex.noise4d(nx * freq, ny * freq, nz * freq, nw * freq);
        norm += amp;
        amp *= 0.55;
        freq *= 2.1;
      }
      const c = Math.round((v / norm * 0.5 + 0.5) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  const crest = new THREE.Color('#d98f5c');
  const base = new THREE.Color('#b35a30');
  const trough = new THREE.Color('#7d3a1f');
  const dark = new THREE.Color('#5e2c19');
  const normals = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = duneAmount(x, z);
    const slope = 1 - normals.getY(i);
    const n = fbm2(x * 0.03, z * 0.03, 3);
    c.copy(trough).lerp(base, smoothstep(0.0, 0.45, d + n * 0.15));
    c.lerp(crest, smoothstep(0.55, 1.0, d) * 0.7);
    c.lerp(dark, smoothstep(0.05, 0.35, slope) * 0.45 + Math.max(0, -n) * 0.2);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // UVs repetidas para el grano fino.
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 160, uv.getY(i) * 160);

  const grain = grainTexture();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    bumpMap: grain,
    bumpScale: 1.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
