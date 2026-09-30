import * as THREE from 'three';

// El modelo trae las 6 ruedas en una sola malla y toda la suspensión en otra.
// Aquí las separamos en piezas móviles con la jerarquía del rocker-bogie real:
//   cuerpo → rocker (rueda delantera) → bogie (rueda media y trasera)
// y cada rueda con dos articulaciones: dirección (eje vertical) y giro (eje).

// Pivotes medidos en el modelo (coordenadas locales de "suspension", lado x > 0).
const ROCKER_PIVOT = new THREE.Vector3(0.69, 0.183, 0.249);
const BOGIE_PIVOT = new THREE.Vector3(0.914, -0.047, -0.505);

// Lado del rover: en el modelo, x > 0 es la izquierda (el frente mira a +z).
const sideOf = (x) => (x > 0 ? 'L' : 'R');

function suspensionPart(c) {
  if (Math.abs(c.x) < 0.6 || c.y > 0.35) return 'body'; // diferencial y soportes del cuerpo
  if (c.z < -0.45 || (c.z < 0.05 && c.y < -0.05)) return `bogie${sideOf(c.x)}`;
  return `rocker${sideOf(c.x)}`;
}

function wheelPart(c) {
  const pos = c.z > 0.5 ? 'front' : c.z < -0.5 ? 'rear' : 'mid';
  return `${pos}${sideOf(c.x)}`;
}

// Parte una geometría por piezas conectadas (triángulos que comparten vértices)
// y agrupa cada pieza según `label(centro de la pieza)`.
function splitGeometry(geometry, label) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const triCount = pos.count / 3;

  const ids = new Map();
  const parent = [];
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const vid = (i) => {
    const k = `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`;
    if (!ids.has(k)) {
      ids.set(k, parent.length);
      parent.push(parent.length);
    }
    return ids.get(k);
  };
  const triVertex = new Int32Array(triCount);
  for (let t = 0; t < triCount; t++) {
    const a = vid(t * 3), b = vid(t * 3 + 1), c = vid(t * 3 + 2);
    parent[find(b)] = find(a);
    parent[find(c)] = find(a);
    triVertex[t] = a;
  }

  const boxes = new Map();
  const v = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    const root = find(triVertex[t]);
    if (!boxes.has(root)) boxes.set(root, new THREE.Box3());
    for (let k = 0; k < 3; k++) boxes.get(root).expandByPoint(v.fromBufferAttribute(pos, t * 3 + k));
  }
  const labels = new Map([...boxes].map(([root, box]) => [root, label(box.getCenter(new THREE.Vector3()))]));

  const byLabel = new Map();
  for (let t = 0; t < triCount; t++) {
    const l = labels.get(find(triVertex[t]));
    if (!byLabel.has(l)) byLabel.set(l, []);
    byLabel.get(l).push(t);
  }

  const out = new Map();
  for (const [l, tris] of byLabel) {
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes)) {
      const n = attr.itemSize;
      const arr = new Float32Array(tris.length * 3 * n);
      let o = 0;
      for (const t of tris) for (let k = 0; k < 3; k++) for (let c = 0; c < n; c++) arr[o++] = attr.getComponent(t * 3 + k, c);
      part.setAttribute(name, new THREE.BufferAttribute(arr, n));
    }
    out.set(l, part);
  }
  return out;
}

// Reemplaza las mallas de `node` por piezas en coordenadas del modelo, agrupadas por etiqueta.
function extractParts(model, node, label) {
  const parts = new Map(); // etiqueta → [{ geometry, material }]
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const meshes = [];
  node.traverse((o) => o.isMesh && meshes.push(o));
  for (const mesh of meshes) {
    const rel = toModel.clone().multiply(mesh.matrixWorld);
    for (const [l, geo] of splitGeometry(mesh.geometry, label)) {
      geo.applyMatrix4(rel);
      if (!parts.has(l)) parts.set(l, []);
      parts.get(l).push({ geometry: geo, material: mesh.material });
    }
    mesh.removeFromParent();
  }
  return parts;
}

// Agrega las piezas a `group`, con el origen del grupo en `origin` (coordenadas del modelo).
function attach(group, pieces, origin) {
  for (const { geometry, material } of pieces ?? []) {
    geometry.translate(-origin.x, -origin.y, -origin.z);
    group.add(new THREE.Mesh(geometry, material));
  }
}

export function buildRig(model) {
  model.updateMatrixWorld(true);
  const suspension = model.getObjectByName('suspension');
  const wheelsNode = model.getObjectByName('Wheels_objs');
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const suspToModel = toModel.clone().multiply(suspension.matrixWorld);

  const susp = extractParts(model, suspension, suspensionPart);
  const wheelParts = extractParts(model, wheelsNode, wheelPart);
  const body = new THREE.Group();
  attach(body, susp.get('body'), new THREE.Vector3());
  model.add(body);

  const rig = { sides: {}, wheels: [] };
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    const rockerPivot = ROCKER_PIVOT.clone().setX(ROCKER_PIVOT.x * sign).applyMatrix4(suspToModel);
    const bogiePivot = BOGIE_PIVOT.clone().setX(BOGIE_PIVOT.x * sign).applyMatrix4(suspToModel);

    const rocker = new THREE.Group();
    rocker.position.copy(rockerPivot);
    attach(rocker, susp.get(`rocker${side}`), rockerPivot);
    const bogie = new THREE.Group();
    bogie.position.subVectors(bogiePivot, rockerPivot);
    attach(bogie, susp.get(`bogie${side}`), bogiePivot);
    rocker.add(bogie);
    model.add(rocker);
    rig.sides[side] = { rocker, bogie, rockerPivot, bogiePivot };

    for (const pos of ['front', 'mid', 'rear']) {
      const pieces = wheelParts.get(`${pos}${side}`);
      const box = new THREE.Box3();
      for (const { geometry } of pieces) {
        geometry.computeBoundingBox();
        box.union(geometry.boundingBox);
      }
      const center = box.getCenter(new THREE.Vector3());
      const [parent, parentPivot] = pos === 'front' ? [rocker, rockerPivot] : [bogie, bogiePivot];
      const steer = new THREE.Group();
      steer.position.subVectors(center, parentPivot);
      const spin = new THREE.Group();
      attach(spin, pieces, center);
      steer.add(spin);
      parent.add(steer);
      rig.wheels.push({ side, pos, steer, spin, center, radius: box.getSize(new THREE.Vector3()).y / 2 });
    }
  }
  return rig;
}
