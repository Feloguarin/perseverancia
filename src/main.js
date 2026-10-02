import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createTerrain, heightAt } from './terrain.js';
import { createRocks } from './rocks.js';
import { createSky, HORIZON } from './sky.js';
import { createMoons } from './moons.js';
import { createDust } from './dust.js';
import { createMissionControl } from './mission/panel.js';
import { Rover } from './rover.js';
import { Tracks } from './tracks.js';
import { createDriveHud } from './driveHud.js';
import * as ground from './ground.js';
import { createCameraSpots } from './cameras/cameraSpots.js';
import { createPhotoViewer } from './cameras/photoViewer.js';
import { createScienceMission } from './science/scienceMission.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = HORIZON.clone();
scene.fog = new THREE.FogExp2(HORIZON.clone(), 0.0042);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 3000);
const ROVER_START = { x: 0, z: 10 };
const TARGET_LIFT = 1.3; // la cámara mira al cuerpo del rover, no a sus ruedas
const startY = heightAt(ROVER_START.x, ROVER_START.z);
camera.position.set(ROVER_START.x + 2.5, startY + 3.4, ROVER_START.z + 9);

// Órbita libre con el ratón alrededor del rover; al manejar, la cámara vuelve detrás de él.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(ROVER_START.x, startY + TARGET_LIFT, ROVER_START.z);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.52;
controls.minDistance = 4;
controls.maxDistance = 60;

// Sol de tarde: bajo sobre el horizonte, delante de la cámara (contraluz cinematográfico).
const sunDir = new THREE.Vector3(-0.38, 0.13, -1).normalize();

const sky = createSky(sunDir);
scene.add(sky);

scene.add(new THREE.HemisphereLight(new THREE.Color('#f2b784'), new THREE.Color('#5a2a17'), 0.75));

const sun = new THREE.DirectionalLight(new THREE.Color('#ffc58a'), 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.radius = 4;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.06;
const sc = sun.shadow.camera;
sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
sc.near = 1; sc.far = 600;
// La sombra sigue al rover para mantener detalle donde está la acción.
const placeSun = (x, z) => {
  sun.target.position.set(x, 0, z - 15);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 300);
};
placeSun(ROVER_START.x, ROVER_START.z);
scene.add(sun, sun.target);

scene.add(createTerrain());
scene.add(createRocks());

const moons = createMoons();
scene.add(moons);

const dust = createDust();
scene.add(dust);

const tracks = new Tracks();
scene.add(tracks.mesh);

// Mapa de entorno a partir del cielo, para que los metales del rover tengan qué reflejar.
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(createSky(sunDir));
const envMap = pmrem.fromScene(envScene, 0.02).texture;
pmrem.dispose();

const rover = new Rover();
let cameraSpots = null;
let mission = null;
scene.add(rover.object);
// En pantalla mientras Percy carga; si falla, muestra el error en vez de dejar el paisaje vacío.
const loadStatus = document.createElement('p');
loadStatus.className = 'load-status';
loadStatus.setAttribute('role', 'status');
loadStatus.textContent = 'Cargando a Percy…';
document.body.append(loadStatus);
const onModelProgress = (e) => {
  if (!e.total) return;
  const pct = Math.round((e.loaded / e.total) * 100);
  loadStatus.textContent = pct < 100 ? `Cargando a Percy… ${pct} %` : 'Armando a Percy…';
};
// Si un paso de la carga se cuelga (como el worker de Draco en el navegador de Cursor), no hay error:
// pasado un rato, decimos en pantalla en qué paso va y qué soporta este navegador.
const loadStarted = performance.now();
const loadWatchdog = setTimeout(() => {
  if (rover.ready || loadStatus.dataset.error) return;
  const info = {
    paso: loadStatus.textContent,
    segundos: Math.round((performance.now() - loadStarted) / 1000),
    webassembly: typeof WebAssembly === 'object',
    workers: typeof Worker === 'function',
    webgl2: renderer.capabilities.isWebGL2,
    navegador: navigator.userAgent,
  };
  console.error('[Rover] La carga del modelo no termina:', info);
  loadStatus.dataset.error = 'true';
  loadStatus.textContent = `Percy no termina de cargar (${info.paso.replace('…', '')}, ${info.segundos} s). WebAssembly: ${info.webassembly ? 'sí' : 'no'} · Workers: ${info.workers ? 'sí' : 'no'} · ${info.navegador}`;
}, 20000);

rover
  .load(envMap, onModelProgress)
  .then(() => {
    clearTimeout(loadWatchdog);
    rover.setPosition(ROVER_START.x, ROVER_START.z, 0);
    loadStatus.remove();
    // Lo que va encima del rover no debe poder dejarlo sin aparecer si falla.
    try {
      // Las cámaras de Percy toman fotos reales de Marte.
      const viewer = createPhotoViewer();
      cameraSpots = createCameraSpots(rover, camera, { onPick: viewer.open, onHover: viewer.preload });
      // La misión de astrobiología: estudiar rocas y guardar muestras para la Tierra.
      mission = createScienceMission({ scene, rover, isBusyElsewhere: viewer.isOpen });
      if (import.meta.env.DEV) window.__percy.mission = mission;
    } catch (e) {
      console.error('[Misión] No se pudieron iniciar las cámaras o la misión de rocas:', e);
    }
  })
  .catch((e) => {
    clearTimeout(loadWatchdog);
    console.error('[Rover] No se pudo cargar el modelo:', e);
    loadStatus.dataset.error = 'true';
    loadStatus.textContent = `No se pudo cargar a Percy: ${e?.message ?? e}. Recarga la página; si sigue, revisa que npm run dev esté corriendo.`;
  });

const _delta = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _desired = new THREE.Vector3();
function followRover(dt) {
  const p = rover.object.position;
  _delta.set(p.x, p.y + TARGET_LIFT, p.z).sub(controls.target);
  controls.target.add(_delta);
  camera.position.add(_delta);

  if (Math.abs(rover.speed) > 0.1 || rover.turning) {
    // Mantiene distancia y altura actuales, pero gira suavemente hasta quedar detrás del rover.
    _offset.subVectors(camera.position, controls.target);
    const horiz = THREE.MathUtils.clamp(Math.hypot(_offset.x, _offset.z), 7, 30);
    const f = rover.forward;
    // Altura baja y fija: plano de persecución que deja ver el horizonte y el cielo.
    _desired.set(-f.x * horiz, 0.9 + horiz * 0.07, -f.z * horiz);
    _offset.lerp(_desired, 1 - Math.exp(-dt * 1.8));
    camera.position.copy(controls.target).add(_offset);
  }
  const minY = heightAt(camera.position.x, camera.position.z) + 0.8;
  if (camera.position.y < minY) camera.position.y = minY;
}

createMissionControl();
const updateDriveHud = createDriveHud(rover);

// Encuadre: el control de misión tapa la parte de abajo de la pantalla, así que corremos la imagen
// hacia arriba para que Percy quede en el espacio libre y no detrás del panel.
const missionPanel = document.querySelector('.mc');
let panelTop = window.innerHeight;
const measurePanel = () => (panelTop = missionPanel?.offsetTop ?? window.innerHeight);
if (missionPanel) new ResizeObserver(measurePanel).observe(missionPanel);
let frameShift = 0;
function frameRover(dt) {
  const w = window.innerWidth, h = window.innerHeight;
  const free = missionPanel?.dataset.hidden === 'true' ? h : panelTop;
  const want = Math.max(0, h / 2 - free * 0.6);
  frameShift += (want - frameShift) * (1 - Math.exp(-dt * 6));
  if (frameShift > 0.5) camera.setViewOffset(w, h, 0, frameShift, w, h);
  else if (camera.view?.enabled) camera.clearViewOffset();
}
// Solo en desarrollo: acceso para pruebas automáticas (npm run check).
if (import.meta.env.DEV) window.__percy = { rover, camera, controls, ground };

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.7, 0.92));
composer.addPass(new OutputPass());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  measurePanel();
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (rover.ready) {
    rover.update(dt);
    tracks.update(rover.trackPoints(), rover.heading);
    followRover(dt);
    placeSun(rover.object.position.x, rover.object.position.z);
    updateDriveHud(performance.now());
  }
  controls.update();
  frameRover(dt);
  cameraSpots?.update(performance.now());
  mission?.update(performance.now(), camera);
  sky.position.copy(camera.position);
  moons.position.copy(camera.position);
  moons.userData.phobos.rotation.y += dt * 0.02;
  dust.userData.update(dt, camera);
  composer.render();
});
