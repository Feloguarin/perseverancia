import * as THREE from 'three';

// El modelo trae el brazo robótico animado: se despliega, queda extendido con la torreta en alto y se
// vuelve a plegar (~24 s). Reproducimos tramos de esa animación y, con el brazo extendido, lo doblamos
// para que la torreta baje hasta la roca: giro del hombro hacia la roca y flexión de hombro y codo.

const CLIPS = [
  'arm.003Action', 'arm.002Action', 'armAction', 'arm.004Action', 'turret_objAction',
  'turret_cam_cover_01', 'turret.001Action.001', 'hingeAction', 'Empty.002Action',
];
// Tramos del clip (s), medidos muestreando la punta del taladro cada 0,25 s:
// 0–4 plegado · 4–6,5 se despliega · 6,5–17 extendido y quieto · 17–20,5 se pliega · después, plegado.
const UNFOLD = [3.9, 6.6];
const FOLD = [16.9, 20.6];
const UNFOLD_TIME = 2.5; // s de juego para desplegar o plegar
const REACH_TIME = 1.4; // s para bajar la torreta hasta la roca o volver a subirla
const STANDOFF = 0.12; // m entre el origen del taladro y la superficie: la broca queda apoyada
const MAX_YAW = THREE.MathUtils.degToRad(60);

const ease = (k) => k * k * (3 - 2 * k);
const _q = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

// Mete un grupo vacío entre `node` y su padre, en su pivote: lo giramos sin tocar lo que escribe la animación.
function insertPivot(node) {
  const g = new THREE.Group();
  g.name = `${node.name}_ajuste`;
  node.parent.add(g);
  g.position.copy(node.position);
  node.position.set(0, 0, 0);
  g.add(node);
  return g;
}

export function createRoverArm(model, clips) {
  // Al cargar, three.js quita los puntos de los nombres: "arm.003" queda "arm003".
  const shoulder = model.getObjectByName('arm003');
  const upper = model.getObjectByName('arm002');
  const fore = model.getObjectByName('arm');
  const drill = model.getObjectByName('corring_drill') ?? model.getObjectByName('turret_obj');
  if (!shoulder || !upper || !fore || !drill) throw new Error('El modelo no trae las piezas del brazo.');

  const mixer = new THREE.AnimationMixer(model);
  for (const name of CLIPS) {
    const clip = clips.find((c) => c.name === name);
    if (clip) mixer.clipAction(clip).play();
  }
  const yawPivot = insertPivot(shoulder);
  const pitchPivot = insertPivot(upper);
  const elbowPivot = insertPivot(fore);

  let clipTime = 0;
  let shown = -1;
  const bend = { yaw: 0, pitch: 0, elbow: 0 };
  let axes = null; // ejes de flexión en el marco de cada padre, calculados al apuntar
  let tween = null;

  function pose() {
    if (clipTime !== shown) {
      mixer.setTime(clipTime);
      shown = clipTime;
    }
    yawPivot.quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, bend.yaw);
    if (axes) {
      pitchPivot.quaternion.setFromAxisAngle(axes.pitch, bend.pitch);
      elbowPivot.quaternion.setFromAxisAngle(axes.elbow, bend.elbow);
    } else {
      pitchPivot.quaternion.identity();
      elbowPivot.quaternion.identity();
    }
  }

  function animate(duration, step) {
    return new Promise((done) => {
      tween = { k: 0, duration, step, done };
    });
  }

  const tip = (out = new THREE.Vector3()) => drill.getWorldPosition(out);

  // Busca el giro de hombro y la flexión de hombro y codo que llevan la punta del taladro a `target`.
  // El brazo se dobla en un plano vertical, así que basta una búsqueda en dos ángulos.
  function solve(target) {
    clipTime = UNFOLD[1];
    Object.assign(bend, { yaw: 0, pitch: 0, elbow: 0 });
    axes = null;
    pose();
    model.updateWorldMatrix(true, true);

    // 1. Giro del hombro: que la punta quede en la misma dirección que la roca, vista desde arriba.
    const s = yawPivot.parent.worldToLocal(yawPivot.getWorldPosition(new THREE.Vector3()));
    const t0 = yawPivot.parent.worldToLocal(tip());
    const t1 = yawPivot.parent.worldToLocal(target.clone());
    let yaw = Math.atan2(t1.x - s.x, t1.z - s.z) - Math.atan2(t0.x - s.x, t0.z - s.z);
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
    bend.yaw = THREE.MathUtils.clamp(yaw, -MAX_YAW, MAX_YAW);
    pose();
    model.updateWorldMatrix(true, true);

    // 2. Eje de flexión: horizontal y perpendicular al brazo. Girar hombro y codo sobre ejes paralelos
    // mantiene el brazo en su plano, así que el eje no cambia en el marco de cada padre al doblar.
    const reach = tip().sub(pitchPivot.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
    const axis = new THREE.Vector3().crossVectors(reach, THREE.Object3D.DEFAULT_UP).normalize();
    const local = (node) => axis.clone().applyQuaternion(node.getWorldQuaternion(_q).invert());
    axes = { pitch: local(pitchPivot.parent), elbow: local(elbowPivot.parent) };

    const cost = (pitch, elbow) => {
      bend.pitch = pitch;
      bend.elbow = elbow;
      pose();
      pitchPivot.updateWorldMatrix(false, true);
      const d = tip(_a).distanceTo(target);
      // Codo arriba, como el real: el antebrazo baja hacia la roca en vez de atravesarla desde abajo.
      const elbowY = elbowPivot.getWorldPosition(_b).y;
      return d + Math.max(0, target.y + 0.3 - elbowY) * 2;
    };
    const deg = THREE.MathUtils.degToRad;
    let best = { c: Infinity, pitch: 0, elbow: 0 };
    const search = (p0, p1, e0, e1, step) => {
      for (let p = p0; p <= p1 + 1e-9; p += step)
        for (let e = e0; e <= e1 + 1e-9; e += step) {
          const c = cost(p, e);
          if (c < best.c) best = { c, pitch: p, elbow: e };
        }
    };
    search(deg(-90), deg(90), deg(-180), deg(180), deg(6));
    const { pitch, elbow } = best;
    search(pitch - deg(6), pitch + deg(6), elbow - deg(6), elbow + deg(6), deg(1));

    cost(best.pitch, best.elbow);
    const error = tip(_a).distanceTo(target);
    const solution = { yaw: bend.yaw, pitch: best.pitch, elbow: best.elbow, error };
    // Vuelve al brazo plegado: la animación arranca desde ahí.
    clipTime = 0;
    Object.assign(bend, { yaw: 0, pitch: 0, elbow: 0 });
    pose();
    return solution;
  }

  return {
    // Tiempos de cada tramo, para la barra de progreso.
    outTime: UNFOLD_TIME + REACH_TIME,
    backTime: REACH_TIME + UNFOLD_TIME,
    tip,
    get busy() {
      return tween !== null;
    },

    // Despliega el brazo y apoya la torreta en `target` (punto del mundo). Devuelve el error final (m).
    async reachTo(target) {
      const goal = solve(target.clone().addScaledVector(THREE.Object3D.DEFAULT_UP, STANDOFF));
      await animate(UNFOLD_TIME, (k) => (clipTime = THREE.MathUtils.lerp(0, UNFOLD[1], ease(k))));
      await animate(REACH_TIME, (k) => {
        const e = ease(k);
        bend.yaw = goal.yaw * e;
        bend.pitch = goal.pitch * e;
        bend.elbow = goal.elbow * e;
      });
      return goal.error;
    },

    // Levanta la torreta y pliega el brazo.
    async stow() {
      const from = { ...bend };
      await animate(REACH_TIME, (k) => {
        const e = 1 - ease(k);
        bend.yaw = from.yaw * e;
        bend.pitch = from.pitch * e;
        bend.elbow = from.elbow * e;
      });
      await animate(UNFOLD_TIME, (k) => (clipTime = THREE.MathUtils.lerp(FOLD[0], FOLD[1], ease(k))));
      clipTime = 0;
    },

    update(dt) {
      if (tween) {
        tween.k = Math.min(1, tween.k + dt / tween.duration);
        tween.step(tween.k);
        if (tween.k === 1) {
          const { done } = tween;
          tween = null;
          done();
        }
      }
      pose();
    },
  };
}
