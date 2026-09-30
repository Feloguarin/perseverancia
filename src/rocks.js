import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm3, mulberry32 } from './noise.js';
import { heightAt } from './terrain.js';
import { registerRock, heightGrid } from './ground.js';

// Roca irregular: icosaedro suavizado + ruido, aplastado y con base plana.
export function rockGeometry(seed, detail = 4, roughness = 0.45) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm3(v.x * 1.3 + seed, v.y * 1.3 - seed, v.z * 1.3 + seed * 0.5, 4);
    // Componente "cresta" para dar aristas de roca fracturada.
    const r = 1 - Math.abs(fbm3(v.x * 2.4 - seed, v.y * 2.4, v.z * 2.4 + seed, 2));
    v.multiplyScalar(1 + roughness * n + 0.12 * r);
    v.y *= 0.85;
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.5;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function createRocks() {
  const group = new THREE.Group();
  const rand = mulberry32(42);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0 });
  const tints = ['#6e3f2a', '#7d4a33', '#5a3325', '#8a5a40', '#4b2c20'].map((h) => new THREE.Color(h));

  const dummy = new THREE.Object3D();
  // Registra la roca como obstáculo sólido, con la forma real de su geometría.
  const shapes = new Map();
  const collide = (o, geometry) => {
    if (!shapes.has(geometry)) shapes.set(geometry, heightGrid(geometry));
    registerRock({
      x: o.position.x, y: o.position.y, z: o.position.z,
      sx: o.scale.x, sy: o.scale.y, sz: o.scale.z,
      rot: o.rotation.y,
      shape: shapes.get(geometry),
    });
  };
  const tmp = new THREE.Color();

  const place = (mesh, count, { minS, maxS, radius, center, power, sink }) => {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.7) * radius;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      const s = minS + Math.pow(rand(), power) * (maxS - minS);
      dummy.position.set(x, heightAt(x, z) - s * sink, z);
      dummy.rotation.set((rand() - 0.5) * 0.4, rand() * Math.PI * 2, (rand() - 0.5) * 0.4);
      dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.7 + rand() * 0.5), s * (0.8 + rand() * 0.5));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      collide(dummy, mesh.geometry);
      tmp.copy(tints[Math.floor(rand() * tints.length)]).multiplyScalar(0.85 + rand() * 0.3);
      mesh.setColorAt(i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  };

  // Rocas medianas y grandes (proyectan sombra).
  for (let k = 0; k < 4; k++) {
    const mesh = new THREE.InstancedMesh(rockGeometry(k * 17.3 + 3), mat, 110);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    place(mesh, 110, { minS: 0.25, maxS: 3.2, radius: 260, center: { x: 0, z: -60 }, power: 4, sink: 0.25 });
    group.add(mesh);
  }

  // Un par de peñascos protagonistas en primer plano.
  const heroData = [
    { x: -9, z: 4, s: 2.6 },
    { x: 11, z: -8, s: 3.8 },
    { x: -24, z: -30, s: 5.5 },
  ];
  heroData.forEach((h, i) => {
    const m = new THREE.Mesh(rockGeometry(100 + i * 7, 5, 0.5), mat.clone());
    m.material.color.copy(tints[i % tints.length]);
    m.position.set(h.x, heightAt(h.x, h.z) - h.s * 0.2, h.z);
    m.scale.set(h.s * 1.2, h.s, h.s);
    m.rotation.y = i * 1.7;
    m.castShadow = m.receiveShadow = true;
    collide(m, m.geometry);
    group.add(m);
  });

  // Guijarros cercanos (sin sombra, por rendimiento).
  const pebbles = new THREE.InstancedMesh(rockGeometry(7.7, 2, 0.35), mat, 2500);
  pebbles.receiveShadow = true;
  place(pebbles, 2500, { minS: 0.04, maxS: 0.28, radius: 70, center: { x: 0, z: -10 }, power: 2, sink: 0.3 });
  group.add(pebbles);

  return group;
}
