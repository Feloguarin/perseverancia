import * as THREE from 'three';
import { heightAt } from './terrain.js';

const MAX = 8000;
const STEP = 0.3; // metros entre segmentos de huella
const WIDTH = 0.42; // ancho de la rueda de Perseverance

// Textura del dibujo de la rueda: surcos transversales con bordes difuminados.
function treadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16) {
    // Surcos ligeramente curvos (los grousers de la rueda).
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(4, y + 4);
    g.quadraticCurveTo(32, y + 10, 60, y + 4);
    g.lineTo(60, y + 10);
    g.quadraticCurveTo(32, y + 16, 4, y + 10);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(4, y, 56, 16);
  }
  // Difumina los bordes laterales.
  const grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(0.12, 'rgba(0,0,0,0)');
  grd.addColorStop(0.88, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export class Tracks {
  constructor() {
    const geo = new THREE.PlaneGeometry(WIDTH, STEP * 1.05);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: '#4a200f',
      roughness: 1,
      transparent: true,
      opacity: 0.75,
      alphaMap: treadTexture(),
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.next = 0;
    this.last = null; // última posición donde se estampó [izq, der]
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._qy = new THREE.Quaternion();
    this._n = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._up = new THREE.Vector3(0, 1, 0);
  }

  // Llamar cada frame con los centros de las huellas y el rumbo del rover.
  update(points, heading) {
    if (!this.last) {
      this.last = points.map((p) => p.clone());
      return;
    }
    points.forEach((p, i) => {
      const prev = this.last[i];
      let d = Math.hypot(p.x - prev.x, p.z - prev.z);
      while (d >= STEP) {
        const t = STEP / d;
        prev.x += (p.x - prev.x) * t;
        prev.z += (p.z - prev.z) * t;
        this._stamp(prev.x, prev.z, heading);
        d -= STEP;
      }
    });
  }

  _stamp(x, z, heading) {
    const e = 0.2;
    const y = heightAt(x, z);
    this._n.set(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
    this._q.setFromUnitVectors(this._up, this._n);
    this._qy.setFromAxisAngle(this._up, heading);
    this._q.multiply(this._qy);
    this._m.compose(new THREE.Vector3(x, y + 0.015, z), this._q, this._s);
    this.mesh.setMatrixAt(this.next, this._m);
    this.next = (this.next + 1) % MAX;
    this.mesh.count = Math.min(this.mesh.count + 1, MAX);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
