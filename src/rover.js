import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { heightAt, duneAmount } from './terrain.js';
import { groundAt, obstacleAt, rockHeightAt } from './ground.js';
import { buildRig } from './roverRig.js';

const MODEL_URL = '/models/perseverance.glb';
// Perseverance real: ~3 m de largo, 2,7 m de ancho, 2,2 m de alto. El modelo no es exactamente
// proporcional, así que escalamos por el ancho entre ruedas (lo que toca el suelo y marca las huellas).
const REAL_WHEEL_WIDTH = 2.7;
const CAMERA_NAME = /cam/i;
const NOT_A_CAMERA = /cover|bracket|wiring/i;

// Movilidad del Perseverance real (NASA/JPL).
export const TOP_SPEED = 0.042; // m/s: 4,2 cm/s en suelo plano y firme
export const TIME_WARP = 60; // el reloj del rover corre 60 veces más rápido, para poder jugar
const MIN_TURN_RADIUS = 3; // m, arco más cerrado medido desde el centro
const CLIMB_MAX = 0.525; // m: el rocker-bogie supera obstáculos de hasta un diámetro de rueda
const STEER_RATE = 2.2; // rad/s: los motores de dirección orientan las ruedas antes de avanzar
const STEER_READY = THREE.MathUtils.degToRad(4);

// Suelo: fricción y resistencia a la rodadura, de firme (roca, regolito compacto) a arena suelta.
const FIRM = { mu: 0.9, roll: 0.05 };
const SAND = { mu: 0.55, roll: 0.15 };

const _v = new THREE.Vector3();
const NO_KEYS = new Set();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class Rover {
  constructor() {
    this.object = new THREE.Group();
    this.heading = 0; // 0 = mirando hacia -Z
    this.speed = 0; // m/s en pantalla (velocidad real × TIME_WARP)
    this.throttle = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.ready = false;
    this.wheelTrack = 2.7; // separación entre ruedas izquierda/derecha (se recalcula al cargar)
    this.wheelBase = 2.7;
    // Estado que se muestra en pantalla.
    this.telemetry = { speed: 0, slip: 0, tilt: 0, odometer: 0, spin: 0, rocker: 0, blocked: 0, aligning: false };

    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  async load(envMap, onProgress) {
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const gltf = await loader.loadAsync(MODEL_URL, onProgress);
    const model = gltf.scene;

    // Escala a tamaño real y apoya las ruedas en y = 0, centrado en XZ.
    const wheelsNode = model.getObjectByName('Wheels_objs') ?? model;
    const wheelWidth = new THREE.Box3().setFromObject(wheelsNode).getSize(new THREE.Vector3()).x;
    const scale = REAL_WHEEL_WIDTH / wheelWidth;
    model.scale.setScalar(scale);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);

    // El frente del modelo (hazcams delanteras) apunta a +Z; lo giramos para que avance hacia -Z.
    const pivot = new THREE.Group();
    pivot.rotation.y = Math.PI;
    pivot.add(model);
    this.object.add(pivot);

    const wb = new THREE.Box3().setFromObject(wheelsNode).getSize(new THREE.Vector3());
    this.wheelTrack = wb.x - 0.4; // de centro a centro de rueda
    this.wheelBase = wb.z;

    this.rig = buildRig(model);
    this._measure(model, pivot);

    const cameraParts = [];
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // Sin entorno, los metales se ven negros: reflejan el cielo marciano.
        if (envMap) {
          for (const m of [o.material].flat()) {
            m.envMap = envMap;
            m.envMapIntensity = 0.9;
          }
        }
      }
      if (CAMERA_NAME.test(o.name) && !NOT_A_CAMERA.test(o.name)) cameraParts.push(o.name);
    });

    const final = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    console.log(
      `[Rover] Modelo cargado. Escala ${scale.toFixed(3)} → ${final.x.toFixed(2)} × ${final.y.toFixed(2)} × ${final.z.toFixed(2)} m (ancho × alto × largo)`,
    );
    console.log(`[Rover] Piezas que son cámaras (${cameraParts.length}):\n  - ${cameraParts.join('\n  - ')}`);
    console.log(
      `[Rover] Rocker-bogie armado: 6 ruedas de ${(this.wheelRadius * 200).toFixed(1)} cm, 4 con dirección, ${(this.clearance * 100).toFixed(0)} cm de altura libre.`,
    );

    this.model = model;
    this.cameraParts = cameraParts;
    this.ready = true;
    return this;
  }

  // Posiciones de ruedas y pivotes en el marco del rover (metros, frente = -Z).
  _measure(model, pivot) {
    this.object.updateMatrixWorld(true);
    const toRover = new THREE.Matrix4().copy(this.object.matrixWorld).invert().multiply(model.matrixWorld);
    const inRover = (p) => p.clone().applyMatrix4(toRover);
    const s = model.scale.x;

    this.wheels = this.rig.wheels.map((w) => ({ ...w, at: inRover(w.center), angle: 0, spinAngle: 0 }));
    this.wheelRadius = this.wheels[0].radius * s;
    this.sides = {};
    for (const side of ['L', 'R']) {
      const { rockerPivot, bogiePivot } = this.rig.sides[side];
      const wheel = (pos) => this.wheels.find((w) => w.side === side && w.pos === pos);
      this.sides[side] = {
        rocker: inRover(rockerPivot),
        bogie: inRover(bogiePivot),
        front: wheel('front'),
        mid: wheel('mid'),
        rear: wheel('rear'),
      };
    }
    // Centro de giro sobre el eje de las ruedas medias (las que no tienen dirección).
    this.turnCenter = this.sides.L.mid.at.clone().add(this.sides.R.mid.at).multiplyScalar(0.5);
    this.turnCenter.y = 0;
    // Altura libre bajo el cuerpo.
    const body = model.getObjectByName('Body');
    this.clearance = body ? new THREE.Box3().setFromObject(body).min.y - pivot.getWorldPosition(_v).y : 0.6;
  }

  setPosition(x, z, heading = 0) {
    this.object.position.set(x, heightAt(x, z), z);
    this.heading = heading;
    this._settle();
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.heading), 0, -Math.cos(this.heading));
  }

  // Punto del marco del rover → mundo (solo rumbo, sin inclinación): para muestrear el suelo.
  _toWorld(p, x = this.object.position.x, z = this.object.position.z, h = this.heading) {
    const c = Math.cos(h), s = Math.sin(h);
    return { x: x + p.x * c + p.z * s, z: z - p.x * s + p.z * c };
  }

  // Altura del centro de una rueda: la rueda es un círculo que se apoya en el punto más alto bajo ella.
  _wheelCenterHeight(p, fx, fz) {
    const r = this.wheelRadius;
    let best = -Infinity;
    for (const d of [-1, -0.5, 0, 0.5, 1]) {
      const h = groundAt(p.x + fx * d * r, p.z + fz * d * r) + r * Math.sqrt(1 - d * d);
      if (h > best) best = h;
    }
    return best;
  }

  // Devuelve la distancia recorrida en este frame (con signo).
  update(dt) {
    // Mientras el brazo o los instrumentos trabajan, el rover no se mueve (como el real).
    const k = this.locked ? NO_KEYS : this.keys;
    const drive = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const steer = (k.has('a') || k.has('arrowleft') ? 1 : 0) - (k.has('d') || k.has('arrowright') ? 1 : 0);
    this.throttle += THREE.MathUtils.clamp(drive - this.throttle, -3 * dt, 3 * dt);

    // Orden de manejo como la del rover real: avance v y giro ω alrededor del eje medio.
    // Con avance y giro a la vez describe un arco; solo con giro, gira sobre sí mismo.
    const v = this.throttle * TOP_SPEED;
    let omega = 0;
    // En reversa el giro se invierte, como en un auto.
    if (steer && Math.abs(drive) > 0) omega = (steer * v) / MIN_TURN_RADIUS;
    else if (steer) omega = (steer * TOP_SPEED) / this.sides.L.front.at.distanceTo(this.turnCenter);
    const commanded = Math.abs(v) > 1e-4 || omega !== 0;

    // Cada rueda de esquina apunta perpendicular a la línea que la une con el centro de giro.
    let worst = 0;
    for (const w of this.wheels) {
      const rx = w.at.x - this.turnCenter.x, rz = w.at.z - this.turnCenter.z;
      // Velocidad de la rueda en el marco del rover (frente = -Z, giro positivo = izquierda).
      const vx = omega * rz, vz = -v - omega * rx;
      const fwd = -vz;
      w.speed = Math.hypot(vx, vz) * (fwd < 0 ? -1 : 1);
      let target = w.angle;
      if (commanded && w.pos !== 'mid' && Math.abs(w.speed) > 1e-6) target = Math.atan2(-vx * Math.sign(fwd || 1), Math.abs(fwd));
      if (w.pos !== 'mid') {
        w.angle += THREE.MathUtils.clamp(target - w.angle, -STEER_RATE * dt, STEER_RATE * dt);
        worst = Math.max(worst, Math.abs(target - w.angle));
      }
    }
    // Como el real, no avanza hasta que las ruedas están orientadas.
    const gate = commanded ? THREE.MathUtils.clamp(1 - (worst - STEER_READY) / STEER_READY, 0, 1) : 0;

    // Patinaje: fuerza que pide la pendiente frente a la tracción que da el suelo.
    const p = this.object.position;
    const sand = THREE.MathUtils.clamp(duneAmount(p.x, p.z) * 1.5, 0, 1);
    const mu = THREE.MathUtils.lerp(FIRM.mu, SAND.mu, sand);
    const roll = THREE.MathUtils.lerp(FIRM.roll, SAND.roll, sand);
    const uphill = this.pitch * Math.sign(v || 1) * (Math.abs(v) > 1e-4 ? 1 : 0);
    const demand = (Math.sin(uphill) + roll * Math.cos(uphill)) / (mu * Math.cos(uphill));
    const slip = commanded ? THREE.MathUtils.clamp(demand, 0, 1) ** 3 : 0;

    // Integración en el tiempo del rover.
    const simDt = dt * TIME_WARP;
    const vg = v * gate * (1 - slip);
    const wg = omega * gate * (1 - slip);
    const h1 = this.heading + wg * simDt;
    const hMid = (this.heading + h1) / 2;
    const tc0 = this._toWorld(this.turnCenter);
    const tcx = tc0.x - Math.sin(hMid) * vg * simDt;
    const tcz = tc0.z - Math.cos(hMid) * vg * simDt;
    const c = Math.cos(h1), s = Math.sin(h1);
    const nx = tcx - (this.turnCenter.x * c + this.turnCenter.z * s);
    const nz = tcz - (-this.turnCenter.x * s + this.turnCenter.z * c);

    const blocked = vg !== 0 || wg !== 0 ? this._blockedBy(nx, nz, h1, Math.sign(vg)) : 0;
    let dist = 0;
    if (!blocked) {
      dist = vg * simDt;
      p.x = nx;
      p.z = nz;
      this.heading = h1;
    }

    // Las ruedas giran con la velocidad que les ordenan los motores (aunque patinen).
    for (const w of this.wheels) {
      if (!blocked) w.spinAngle += ((w.speed * gate) / this.wheelRadius) * simDt;
      w.steer.rotation.y = w.angle;
      w.spin.rotation.x = w.spinAngle;
    }
    this._settle();

    this.speed = blocked ? 0 : vg * TIME_WARP;
    this.turning = steer !== 0;
    const t = this.telemetry;
    t.speed = blocked ? 0 : Math.abs(vg);
    t.slip = blocked ? 0 : slip;
    t.odometer += Math.abs(dist);
    t.spin = this.wheels.reduce((sum, w) => sum + w.spinAngle, 0) / this.wheels.length;
    t.blocked = blocked;
    t.aligning = commanded && gate < 1;
    t.sand = sand;
    return dist;
  }

  // Altura del obstáculo que impide moverse a (x, z, h), o 0 si el camino está libre.
  _blockedBy(x, z, h, dir) {
    const r = this.wheelRadius;
    const f = { x: -Math.sin(h) * (dir || 1), z: -Math.cos(h) * (dir || 1) };
    for (const w of this.wheels) {
      const a = this._toWorld(w.at, x, z, h);
      const was = this._toWorld(w.at);
      // Solo frena si se mete en algo más alto de lo que el rocker-bogie puede subir
      // (delante de la rueda, o bajo ella cuando gira de costado sobre sí mismo).
      for (const d of [r, 0]) {
        const ahead = obstacleAt(a.x + f.x * d, a.z + f.z * d);
        if (ahead > CLIMB_MAX && ahead > obstacleAt(was.x + f.x * d, was.z + f.z * d) + 0.01)
          return rockHeightAt(a.x + f.x * d, a.z + f.z * d);
      }
    }
    // El cuerpo (y el brazo delante) tampoco pasa sobre una roca más alta que su altura libre.
    for (const px of [-0.8, 0, 0.8]) {
      for (const pz of [-1.6, -0.9, 0, 0.9, 1.5]) {
        const a = this._toWorld({ x: px, z: pz }, x, z, h);
        const was = this._toWorld({ x: px, z: pz });
        const under = obstacleAt(a.x, a.z);
        if (under > this.clearance && under > obstacleAt(was.x, was.z) + 0.01) return rockHeightAt(a.x, a.z);
      }
    }
    return 0;
  }

  // Resuelve la suspensión rocker-bogie para que las 6 ruedas toquen el suelo.
  _settle() {
    const f = this.forward;
    const solved = {};
    for (const side of ['L', 'R']) {
      const S = this.sides[side];
      const g = (w) => this._wheelCenterHeight(this._toWorld(w.at), f.x, f.z);
      const gF = g(S.front), gM = g(S.mid), gR = g(S.rear);
      // Coordenada longitudinal: u = -z (hacia el frente).
      const u = (p) => -p.z;
      // Bogie: se inclina para apoyar la rueda media y la trasera.
      const bu = u(S.mid.at) - u(S.rear.at), by = S.mid.at.y - S.rear.at.y;
      const bogie = Math.asin(THREE.MathUtils.clamp((gM - gR) / Math.hypot(bu, by), -1, 1)) - Math.atan2(by, bu);
      const dMu = u(S.mid.at) - u(S.bogie), dMy = S.mid.at.y - S.bogie.y;
      const bogieY = gM - (dMy * Math.cos(bogie) + dMu * Math.sin(bogie));
      // Rocker: une la rueda delantera con el pivote del bogie.
      const wu = u(S.front.at) - u(S.bogie), wy = S.front.at.y - S.bogie.y;
      const rocker = Math.asin(THREE.MathUtils.clamp((gF - bogieY) / Math.hypot(wu, wy), -1, 1)) - Math.atan2(wy, wu);
      const dRu = u(S.rocker) - u(S.bogie), dRy = S.rocker.y - S.bogie.y;
      const pivotY = bogieY + dRy * Math.cos(rocker) + dRu * Math.sin(rocker);
      solved[side] = { bogie, rocker, pivotY };
    }

    // Diferencial: el cuerpo se inclina el promedio de los dos rockers.
    const { L, R } = solved;
    this.pitch = (L.rocker + R.rocker) / 2;
    const roll = Math.atan2(R.pivotY - L.pivotY, this.sides.R.rocker.x - this.sides.L.rocker.x);
    _euler.set(this.pitch, this.heading, roll);
    this.object.quaternion.setFromEuler(_euler);
    let y = 0;
    for (const side of ['L', 'R']) y += solved[side].pivotY - _v.copy(this.sides[side].rocker).applyQuaternion(this.object.quaternion).y;
    this.object.position.y = y / 2;

    // Ángulos relativos de cada brazo (en el modelo, rotation.x negativa levanta el frente).
    for (const side of ['L', 'R']) {
      const { rocker, bogie } = this.rig.sides[side];
      rocker.rotation.x = -(solved[side].rocker - this.pitch);
      bogie.rotation.x = -(solved[side].bogie - solved[side].rocker);
    }
    this.telemetry.rocker = THREE.MathUtils.radToDeg(L.rocker - this.pitch);
    this.telemetry.tilt = THREE.MathUtils.radToDeg(Math.acos(_v.set(0, 1, 0).applyQuaternion(this.object.quaternion).y));
  }

  // Posiciones (mundo) de los centros de las huellas izquierda y derecha.
  trackPoints() {
    const p = this.object.position;
    const f = this.forward;
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const hw = this.wheelTrack / 2;
    return [
      new THREE.Vector3(p.x - r.x * hw, 0, p.z - r.z * hw),
      new THREE.Vector3(p.x + r.x * hw, 0, p.z + r.z * hw),
    ];
  }
}
