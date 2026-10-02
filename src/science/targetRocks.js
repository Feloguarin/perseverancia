import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt } from '../terrain.js';
import { registerRock, heightGrid, obstacleAt } from '../ground.js';
import { fbm3, mulberry32 } from '../noise.js';

// Dónde buscar sitio para cada roca: en abanico delante del punto de partida, en el orden
// en que el rover real las visitó (de 2021 a 2024), cada una un poco más lejos.
const ANCHORS = {
  roubion: [6, -6],
  rochette: [-14, -16],
  wildcat: [16, -30],
  bunsen: [-8, -42],
  cheyava: [10, -62],
};

const c = (hex) => new THREE.Color(hex);
const PALETTE = {
  crumbly: [c('#b08460'), c('#cfae8a'), c('#7a5640')],
  basalt: [c('#463831'), c('#5e4c42'), c('#86705f')],
  layered: [c('#8a5a40'), c('#c9976b'), c('#4a2c1f')],
  carbonate: [c('#c4b49b'), c('#e3d8c5'), c('#9f9a87')],
  leopard: [c('#8a3f25'), c('#a8552f'), c('#efe6d8'), c('#d8c1a2'), c('#2a1810')],
};

// Canto rodado suave: forma de baja frecuencia con mucha resolución para pintar detalles.
function boulderGeometry(seed, detail) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm3(v.x * 1.1 + seed, v.y * 1.1 - seed, v.z * 1.1 + seed * 0.5, 3);
    const fine = fbm3(v.x * 4 - seed, v.y * 4, v.z * 4 + seed, 2);
    v.multiplyScalar(1 + 0.28 * n + 0.04 * fine);
    v.y *= 0.85;
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.4; // base plana, apoyada en el suelo
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Colores por vértice según el tipo de roca (todo procedural, sin texturas).
function paint(geometry, look, seed) {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const v = new THREE.Vector3();
  const P = PALETTE[look];
  const rand = mulberry32(seed);
  // Manchas de leopardo: centros al azar sobre la superficie.
  const spots = Array.from({ length: 130 }, () => ({
    d: new THREE.Vector3(rand() - 0.5, rand() * 0.9 - 0.2, rand() - 0.5).normalize(),
    r: 0.035 + rand() * 0.035,
  }));
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = fbm3(v.x * 2.2 + seed, v.y * 2.2, v.z * 2.2 - seed, 3);
    if (look === 'layered') {
      // Capas de lodo: franjas claras y oscuras, un poco onduladas.
      const band = Math.sin((v.y + v.x * 0.25) * 24 + n * 0.8);
      col.copy(P[0]).lerp(band > 0 ? P[1] : P[2], Math.min(1, Math.abs(band) * 1.3));
    } else if (look === 'leopard') {
      col.copy(P[0]).lerp(P[1], n * 0.5 + 0.5);
      const dir = v.clone().normalize();
      for (const s of spots) {
        const d = Math.acos(Math.min(1, dir.dot(s.d)));
        if (d < s.r * 0.65) col.copy(P[3]);
        else if (d < s.r) col.copy(P[4]);
      }
      // Vetas blancas de sulfato de calcio.
      if (Math.abs(fbm3(v.x * 1.8 - seed, v.y * 0.9, v.z * 1.8, 2)) < 0.028) col.copy(P[2]);
      // "Semillas de amapola": puntos oscuros diminutos.
      if (fbm3(v.x * 40, v.y * 40, v.z * 40, 1) > 0.78) col.copy(P[4]);
    } else {
      col.copy(P[0]).lerp(P[1], THREE.MathUtils.clamp(n * 0.9 + 0.5, 0, 1));
      if (fbm3(v.x * 9, v.y * 9, v.z * 9, 2) > 0.45) col.lerp(P[2], 0.7);
    }
    col.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Busca cerca de un punto un sitio plano y sin rocas grandes alrededor.
function findSpot(ax, az) {
  for (let r = 0; r <= 16; r += 1) {
    const steps = Math.max(1, Math.round(r * 2));
    for (let k = 0; k < steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
      const rise = Math.max(
        Math.abs(heightAt(x + 3, z) - heightAt(x - 3, z)),
        Math.abs(heightAt(x, z + 3) - heightAt(x, z - 3)),
      );
      if (rise / 6 > 0.18) continue; // más de ~10° de pendiente
      let clear = true;
      for (let dx = -5; dx <= 5 && clear; dx += 1)
        for (let dz = -5; dz <= 5 && clear; dz += 1) if (dx * dx + dz * dz <= 25 && obstacleAt(x + dx, z + dz) > 0.15) clear = false;
      if (clear) return { x, z };
    }
  }
  return { x: ax, z: az };
}

export function createTargetRocks(targets) {
  const group = new THREE.Group();
  const placed = targets.map((t, i) => {
    const seed = 300 + i * 37;
    // En three.js el detalle del icosaedro subdivide en forma lineal: 30 da ~18.000 caras,
    // suficientes para pintar capas, vetas y manchas pequeñas.
    const geometry = boulderGeometry(seed, 30);
    paint(geometry, t.look, seed);
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 });
    const mesh = new THREE.Mesh(geometry, material);
    const { x, z } = findSpot(...ANCHORS[t.key]);
    const [sx, sy, sz] = t.size.map((s) => s / 2);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = i * 1.3;
    mesh.position.set(x, heightAt(x, z) - sy * 0.25, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    registerRock({ x, y: mesh.position.y, z, sx, sy, sz, rot: mesh.rotation.y, shape: heightGrid(geometry) });
    // Radio de la planta (para medir distancias desde el borde de la roca).
    return { ...t, mesh, x, z, radius: Math.max(sx, sz) };
  });
  return { group, placed };
}

// Marca sobre la roca: el parche raspado (5 cm) o el agujero de la muestra.
export function addMark(rock, from, kind, scene) {
  const raycaster = new THREE.Raycaster();
  const target = rock.mesh.position.clone().setY(rock.mesh.position.y + rock.mesh.scale.y * 0.45);
  raycaster.set(from, target.clone().sub(from).normalize());
  const hit = raycaster.intersectObject(rock.mesh, false)[0];
  if (!hit) return null;
  const normal = hit.face.normal.clone().transformDirection(rock.mesh.matrixWorld);
  const radius = kind === 'patch' ? 0.025 : 0.007;
  const color = kind === 'patch' ? '#e9dcc8' : '#1a0f0a';
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  // El agujero va al lado del parche, como en el rover real.
  const side = kind === 'core' ? new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(0.05) : new THREE.Vector3();
  disc.position.copy(hit.point).addScaledVector(normal, 0.003).add(side);
  disc.lookAt(disc.position.clone().add(normal));
  scene.add(disc);
  return disc;
}
