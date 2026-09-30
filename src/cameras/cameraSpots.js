import * as THREE from 'three';

// Las 4 cámaras que se pueden usar, con la pieza del modelo donde están.
export const CAMERAS = [
  { key: 'mastcam', part: 'Mastcam_Z_cams', name: 'Mastcam-Z', where: 'En lo alto del mástil, con zoom' },
  { key: 'navcam', part: 'NavCams', name: 'NavCam', where: 'En el mástil, mira el camino' },
  { key: 'hazcam', part: 'hazcams_front', name: 'Hazcam delantera', where: 'Abajo al frente, vigila obstáculos' },
  { key: 'watson', part: 'WATSON', name: 'WATSON', where: 'En la punta del brazo, ve de muy cerca' },
];

const MIN_GAP = 30; // px entre puntos: si dos cámaras quedan juntas en pantalla, se separan
const _v = new THREE.Vector3();

// Puntos que brillan sobre cada cámara del rover. Llamar update() en cada frame.
export function createCameraSpots(rover, camera, { onPick, onHover }) {
  const layer = document.createElement('div');
  layer.className = 'cam-layer';
  layer.innerHTML = '<svg class="cam-leaders" aria-hidden="true"></svg>';
  document.body.append(layer);
  const svg = layer.querySelector('svg');

  rover.object.updateMatrixWorld(true); // medir con la pose actual del rover
  const spots = CAMERAS.map((cam) => {
    const part = rover.model.getObjectByName(cam.part);
    // Centro de la pieza en su propio marco, para seguirla aunque el rover se mueva e incline.
    const center = new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
    const local = part.worldToLocal(center.clone());
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cam-spot';
    el.dataset.camera = cam.key;
    el.setAttribute('aria-label', `${cam.name}: tomar una foto`);
    el.innerHTML = `<span class="cam-dot"></span><span class="cam-label"><b>${cam.name}</b><small>${cam.where}</small></span>`;
    el.addEventListener('click', () => onPick(cam));
    el.addEventListener('pointerenter', () => onHover?.(cam));
    el.addEventListener('focus', () => onHover?.(cam));
    layer.append(el);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    svg.append(line);
    return { cam, part, local, el, line, occluded: false, anchor: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, visible: false };
  });

  // Oclusión: ¿hay otra pieza del rover entre la cámara del juego y la cámara de Percy?
  const raycaster = new THREE.Raycaster();
  const meshes = [];
  rover.model.traverse((o) => o.isMesh && meshes.push(o));
  let lastOcclusion = 0;

  function update(now) {
    const w = window.innerWidth, h = window.innerHeight;
    for (const s of spots) {
      s.part.localToWorld(_v.copy(s.local));
      const world = _v.clone();
      _v.project(camera);
      s.visible = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05;
      s.anchor.x = s.pos.x = ((_v.x + 1) / 2) * w;
      s.anchor.y = s.pos.y = ((1 - _v.y) / 2) * h;
      if (now - lastOcclusion > 250) {
        const dir = world.clone().sub(camera.position);
        const dist = dir.length();
        raycaster.set(camera.position, dir.normalize());
        raycaster.far = dist;
        const hit = raycaster.intersectObjects(meshes, false)[0];
        s.occluded = Boolean(hit && hit.distance < dist - 0.06 && !isPartOf(hit.object, s.part));
      }
    }
    if (now - lastOcclusion > 250) lastOcclusion = now;

    // Separa los puntos que se enciman (Mastcam-Z y NavCam comparten la cabeza del mástil).
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < spots.length; i++) {
        for (let j = i + 1; j < spots.length; j++) {
          const a = spots[i].pos, b = spots[j].pos;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d >= MIN_GAP) continue;
          // Empuja en vertical, conservando cuál está arriba.
          const push = (MIN_GAP - d) / 2;
          const sy = dy === 0 ? (i < j ? 1 : -1) : Math.sign(dy);
          a.y -= push * sy;
          b.y += push * sy;
        }
      }
    }

    for (const s of spots) {
      s.el.hidden = !s.visible;
      s.el.style.transform = `translate(${s.pos.x}px, ${s.pos.y}px)`;
      s.el.classList.toggle('is-occluded', s.occluded);
      const moved = Math.hypot(s.pos.x - s.anchor.x, s.pos.y - s.anchor.y) > 2;
      s.line.setAttribute('x1', s.anchor.x);
      s.line.setAttribute('y1', s.anchor.y);
      s.line.setAttribute('x2', s.pos.x);
      s.line.setAttribute('y2', s.pos.y);
      s.line.style.display = s.visible && moved ? '' : 'none';
    }
  }

  return { update, layer };
}

function isPartOf(obj, part) {
  for (let o = obj; o; o = o.parent) if (o === part) return true;
  return false;
}
