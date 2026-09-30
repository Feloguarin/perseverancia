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
const camX = 0, camZ = 26;
camera.position.set(camX, heightAt(camX, camZ) + 2.6, camZ);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, heightAt(0, -40) + 5, -40);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.53;
controls.minDistance = 5;
controls.maxDistance = 200;

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
sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90;
sc.near = 1; sc.far = 600;
sun.target.position.set(0, 0, -20);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 300);
scene.add(sun, sun.target);

scene.add(createTerrain());
scene.add(createRocks());

const moons = createMoons();
scene.add(moons);

const dust = createDust();
scene.add(dust);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.7, 0.92));
composer.addPass(new OutputPass());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update();
  sky.position.copy(camera.position);
  moons.position.copy(camera.position);
  moons.userData.phobos.rotation.y += dt * 0.02;
  dust.userData.update(dt, camera);
  composer.render();
});
