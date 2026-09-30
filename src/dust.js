import * as THREE from 'three';
import { mulberry32 } from './noise.js';

function softDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BOX = new THREE.Vector3(140, 30, 140);
const WIND = new THREE.Vector3(1.6, 0.05, 0.6);

export function createDust() {
  const rand = mulberry32(7);
  const tex = softDotTexture();
  const group = new THREE.Group();

  // Motas finas flotando cerca de la cámara.
  const COUNT = 5000;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (rand() - 0.5) * BOX.x;
    positions[i * 3 + 1] = rand() * BOX.y;
    positions[i * 3 + 2] = (rand() - 0.5) * BOX.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: tex,
      color: '#f0b989',
      size: 0.18,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  points.frustumCulled = false;
  group.add(points);

  // Nubes de polvo grandes y tenues, a media distancia.
  const clouds = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, color: '#e7a674', transparent: true, opacity: 0.07 + rand() * 0.06, depthWrite: false }),
    );
    const size = 40 + rand() * 70;
    s.scale.set(size * 2.2, size * 0.6, 1);
    s.position.set((rand() - 0.5) * 500, 2 + rand() * 12, -40 - rand() * 350);
    group.add(s);
    clouds.push(s);
  }

  const center = new THREE.Vector3();
  group.userData.update = (dt, camera) => {
    center.copy(camera.position);
    const p = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3;
      p[j] += WIND.x * dt * (0.7 + (i % 7) * 0.08);
      p[j + 1] += Math.sin((p[j] + i) * 0.05) * 0.02 * dt * 10;
      p[j + 2] += WIND.z * dt;
      // Reenvuelve las motas en una caja alrededor de la cámara.
      for (let k = 0; k < 3; k++) {
        const size = BOX.getComponent(k);
        const lo = center.getComponent(k) - (k === 1 ? 8 : size / 2);
        p[j + k] = lo + ((((p[j + k] - lo) % size) + size) % size);
      }
    }
    geo.attributes.position.needsUpdate = true;
    for (const s of clouds) {
      s.position.x += WIND.x * dt * 1.5;
      if (s.position.x > 260) s.position.x -= 520;
    }
  };
  return group;
}
