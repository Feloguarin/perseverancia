import * as THREE from 'three';
import { rockGeometry } from './rocks.js';
import { mulberry32 } from './noise.js';

// Hunde cuencos con borde elevado en la superficie (cráteres; el mayor imita a Stickney en Fobos).
function addCraters(geo, seed, count) {
  const rand = mulberry32(seed);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  const craters = [];
  for (let i = 0; i < count; i++) {
    const c = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    craters.push({ c, r: i === 0 ? 0.55 : 0.12 + rand() * 0.25 });
  }
  craters[0].c.set(0.3, 0.2, 1).normalize(); // cráter grande hacia la cámara
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const len = v.length();
    const dir = v.clone().divideScalar(len);
    let k = 1;
    for (const { c, r } of craters) {
      const d = Math.acos(Math.min(1, dir.dot(c))) / r;
      if (d < 1) k -= 0.14 * r * (1 - d * d);
      else if (d < 1.4) k += 0.05 * r * Math.sin(((d - 1) / 0.4) * Math.PI);
    }
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// Fobos y Deimos: cuerpos irregulares, lejanos, iluminados por el mismo sol.
export function createMoons() {
  const group = new THREE.Group();
  const make = (seed, color, scale, dir, dist, craters) => {
    const geo = addCraters(rockGeometry(seed, 5, 0.14), seed * 3, craters);
    // Emisivo tenue: la luz del cielo dispersada delante de la luna. El lado iluminado queda como medialuna brillante.
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      emissive: new THREE.Color('#a8704a'),
      emissiveIntensity: 0.4,
      fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(...scale);
    m.position.copy(dir.clone().normalize().multiplyScalar(dist));
    m.lookAt(0, 0, 0);
    group.add(m);
    return m;
  };
  const phobos = make(11.1, '#fff0de', [26, 21, 19], new THREE.Vector3(0.3, 0.22, -1), 800, 10);
  const deimos = make(23.7, '#fff4e6', [10, 9, 8.5], new THREE.Vector3(0.6, 0.34, -1), 800, 6);
  group.userData = { phobos, deimos };
  return group;
}
