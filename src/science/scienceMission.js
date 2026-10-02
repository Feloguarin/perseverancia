import * as THREE from 'three';
import { TARGETS, TUBES, scoreOf, MAX_SCORE } from './targets.js';
import { createTargetRocks, addMark } from './targetRocks.js';
import { createSciencePanel } from './sciencePanel.js';

// Alcances del rover real.
const SUPERCAM_RANGE = 7; // m: el láser de SuperCam analiza rocas hasta 7 m de distancia
const ARM_REACH = 2.4; // m desde el centro del rover hasta el borde de la roca
const ARM_ANGLE = THREE.MathUtils.degToRad(40); // la roca tiene que quedar delante del brazo
const STOPPED = 0.05; // m/s en pantalla
const DURATION = { supercam: 1800, abrade: 3200, sample: 4200 }; // ms de animación

const SAVE_KEY = 'perseverancia.mision.v1';

export function createScienceMission({ scene, rover, isBusyElsewhere }) {
  const { group, placed } = createTargetRocks(TARGETS);
  scene.add(group);

  const state = load();
  let busy = null; // acción en curso
  let lastFinding = null;

  // Efectos: láser de SuperCam y chispas de plasma en la roca.
  // Haz: un cilindro de 1 m a lo largo de +Y que se estira entre el mástil y la roca.
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1, 6, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: '#ff8a60', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  );
  beam.frustumCulled = false;
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffe2c0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  spark.renderOrder = 10;
  scene.add(beam, spark);
  const head = rover.model.getObjectByName('head');

  const panel = createSciencePanel({
    targets: placed,
    state,
    tubes: TUBES,
    onAction: (a) => act(a),
    onReport: () => finish(),
    onRestart: () => restart(),
  });

  // Qué tan lejos está cada roca y si el brazo la alcanza.
  function measure(t) {
    const p = rover.object.position;
    const dx = t.x - p.x, dz = t.z - p.z;
    const dist = Math.max(0, Math.hypot(dx, dz) - t.radius);
    const f = rover.forward;
    const angle = Math.acos(THREE.MathUtils.clamp((dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1), -1, 1));
    return { dist, angle };
  }

  function nearest() {
    let best = null;
    for (const t of placed) {
      const m = measure(t);
      if (!best || m.dist < best.m.dist) best = { t, m };
    }
    return best;
  }

  // Qué acciones se pueden hacer ahora con la roca más cercana, y por qué no las otras.
  function options() {
    const n = nearest();
    if (!n) return null;
    const { t, m } = n;
    const s = state.targets[t.key];
    const stopped = Math.abs(rover.speed) < STOPPED;
    const reach = m.dist <= ARM_REACH && m.angle <= ARM_ANGLE;
    const why = (ok, reason) => (ok ? null : reason);
    const tubesLeft = TUBES - state.tubes.length;
    return {
      target: t,
      dist: m.dist,
      supercam: s.analyzed ? 'Ya la analizaste' : why(m.dist <= SUPERCAM_RANGE, `Acércate a menos de ${SUPERCAM_RANGE} m`) ?? why(stopped, 'Detén el rover'),
      abrade: s.sampled ? 'Ya tiene muestra' : s.abraded ? 'Ya la raspaste' : why(reach, 'Ponla al alcance del brazo, de frente') ?? why(stopped, 'Detén el rover'),
      sample: s.sampled ? 'Ya tiene muestra' : why(tubesLeft > 0, 'No quedan tubos') ?? why(reach, 'Ponla al alcance del brazo, de frente') ?? why(stopped, 'Detén el rover'),
    };
  }

  function act(action) {
    if (busy || isBusyElsewhere()) return;
    const o = options();
    if (!o || o[action] !== null) return;
    const t = o.target;
    const s = state.targets[t.key];
    busy = { action, target: t, start: performance.now() };
    rover.locked = true;
    panel.setBusy(action, t);

    setTimeout(() => {
      const from = rover.object.position.clone().setY(rover.object.position.y + 0.9).addScaledVector(rover.forward, 1.2);
      if (action === 'supercam') {
        s.analyzed = true;
        lastFinding = { kind: 'supercam', target: t };
      } else if (action === 'abrade') {
        s.abraded = true;
        addMark(t, from, 'patch', scene);
        lastFinding = { kind: 'abrade', target: t };
      } else if (action === 'sample') {
        s.sampled = true;
        s.crumbled = Boolean(t.sample.crumbles);
        if (!s.crumbled) addMark(t, from, 'core', scene);
        state.tubes.push(t.key);
        lastFinding = { kind: 'sample', target: t };
      }
      busy = null;
      rover.locked = false;
      save();
      panel.showFinding(lastFinding, state);
      if (state.tubes.length >= TUBES) setTimeout(finish, 2500);
    }, DURATION[action]);
  }

  // Se puede enviar el informe cuando quieras (desde la primera muestra) y seguir jugando después.
  function finish() {
    if (busy || state.tubes.length === 0) return;
    state.finished = true;
    save();
    const samples = state.tubes.map((key) => {
      const t = placed.find((p) => p.key === key);
      return { target: t, state: state.targets[key], points: scoreOf(t, state.targets[key]) };
    });
    const score = samples.reduce((sum, s) => sum + s.points, 0);
    panel.showReport({ samples, score, max: MAX_SCORE });
  }

  function restart() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    location.reload();
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {}
  }
  // Partida guardada en este navegador. Si las rocas cambiaron, se ignora lo que ya no existe.
  function load() {
    const fresh = { targets: Object.fromEntries(TARGETS.map((t) => [t.key, {}])), tubes: [], finished: false };
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!s || typeof s.targets !== 'object' || !Array.isArray(s.tubes)) return fresh;
      for (const t of TARGETS) Object.assign(fresh.targets[t.key], s.targets[t.key]);
      fresh.tubes = s.tubes.filter((k) => k in fresh.targets && fresh.targets[k].sampled).slice(0, TUBES);
      fresh.finished = Boolean(s.finished);
      return fresh;
    } catch {
      return fresh;
    }
  }

  // Animación del láser: pulsos rápidos desde la cabeza del mástil hasta la roca.
  function updateEffects(now) {
    const on = busy?.action === 'supercam';
    if (!on) {
      beam.material.opacity = spark.material.opacity = 0;
      return;
    }
    const t = busy.target;
    const from = head.getWorldPosition(new THREE.Vector3());
    const to = new THREE.Vector3(t.x, t.mesh.position.y + t.mesh.scale.y * 0.55, t.z);
    to.add(from.clone().sub(to).setY(0).normalize().multiplyScalar(t.radius * 0.8));
    const span = to.clone().sub(from);
    beam.position.copy(from);
    beam.scale.set(1, span.length(), 1);
    beam.quaternion.setFromUnitVectors(UP, span.normalize());
    // SuperCam dispara en ráfagas: el haz parpadea y la roca destella con plasma.
    const pulse = Math.sin((now - busy.start) / 40) > -0.4 ? 1 : 0.15;
    beam.material.opacity = 0.75 * pulse;
    spark.position.copy(to);
    spark.material.opacity = pulse;
    spark.scale.setScalar(0.7 + Math.random() * 0.5);
  }

  return {
    update(now, camera) {
      updateEffects(now);
      panel.update({ options: busy ? null : options(), camera, rover, busy, now, durations: DURATION });
    },
    act,
    finish,
    state,
    targets: placed,
    reach: ARM_REACH,
  };
}

const UP = new THREE.Vector3(0, 1, 0);

function glowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,220,180,0.6)');
  grd.addColorStop(1, 'rgba(255,160,100,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
