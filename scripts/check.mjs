// Abre la escena en un Chrome invisible (el Chrome instalado, sin descargar navegadores),
// guarda una captura y lista los errores de consola. Sale con código 1 si hay errores.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const URL = process.env.CHECK_URL ?? 'http://localhost:5173';
const OUT = 'screenshots/check.png';
const OUT_START = 'screenshots/check-start.png';
const OUT_HIDDEN = 'screenshots/check-sin-panel.png';
const OUT_PHOTO = 'screenshots/check-foto.png';
const OUT_PHOTO_ZOOM = 'screenshots/check-foto-ampliada.png';
const WAIT_MS = Number(process.env.CHECK_WAIT ?? 4000);

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const warnings = [];
const logs = [];
const telemetry = [];
const roverChecks = [];
const photoChecks = [];

// Rangos plausibles: si el número cae fuera, no es un dato real de Percy.
const EXPECTED = {
  distance: { min: 1, max: 200 },
  elevation: { min: -5000, max: 0 },
  tilt: { min: 0, max: 45 },
  lightTime: { min: 180, max: 1400 },
};
const readTelemetry = () =>
  page.$$eval('[data-telemetry]', (els) =>
    els.map((el) => ({
      key: el.dataset.telemetry,
      name: el.querySelector('h3')?.textContent,
      status: el.dataset.status,
      value: Number(el.dataset.value),
      unit: el.dataset.unit,
      provider: el.dataset.provider,
      points: Number(el.dataset.points),
      shown: el.querySelector('.mc-num')?.textContent,
    })),
  );
const panelHidden = () =>
  page.$eval('.mc', (el) => el.dataset.hidden === 'true' && getComputedStyle(el).opacity === '0');

// Cámaras de Percy: cada punto abre una foto real de la NASA.
async function checkPhotos() {
  const fail = (msg) => errors.push(`cámaras: ${msg}`);
  const shot = () =>
    page.evaluate(() => {
      const s = document.querySelector('.shot');
      const img = s.querySelector('img');
      return {
        state: s.dataset.state,
        loaded: s.dataset.loaded,
        photo: s.dataset.photo,
        width: img.naturalWidth,
        src: img.currentSrc,
        cam: s.querySelector('.shot-cam').textContent,
        when: s.querySelector('.shot-when').textContent,
      };
    });
  const waitShown = (previous) =>
    page
      .waitForFunction(
        (prev) => {
          const s = document.querySelector('.shot');
          return (s.dataset.state === 'shown' && s.dataset.photo !== prev) || s.dataset.loaded === 'error';
        },
        previous,
        { timeout: 25000 },
      )
      .catch(() => {});

  // Rover al inicio y cámara como al cargar; paneles ocultos para ver los puntos.
  await page.evaluate(() => {
    const { rover, camera, controls } = window.__percy;
    rover.setPosition(0, 10, 0);
    const p = rover.object.position;
    controls.target.set(p.x, p.y + 1.3, p.z);
    camera.position.set(p.x + 2.5, p.y + 3.4, p.z + 9);
    controls.update();
  });
  await page.keyboard.press('t');
  await page.waitForTimeout(800);

  for (const key of ['mastcam', 'navcam', 'hazcam', 'watson']) {
    try {
      await page.click(`.cam-spot[data-camera=${key}]`, { timeout: 5000 });
    } catch (e) {
      fail(`no se pudo hacer clic en ${key} (${e.message.split('\n')[0]})`);
      continue;
    }
    await waitShown(null);
    const info = await shot();
    const pass = info.loaded === 'true' && info.width >= 800 && /mars\.nasa\.gov\/mars2020-raw-images\//.test(info.src) && /^Sol \d+, (hoy|ayer|hace \d+ días)$/.test(info.when);
    photoChecks.push({ key, pass, info });
    if (!pass) fail(`${key} no mostró una foto real (${info.loaded}, ${info.width}px, ${info.src})`);

    if (key === 'mastcam') {
      await page.mouse.move(640, 40);
      await page.screenshot({ path: OUT_PHOTO });
      // Clic para ampliar.
      await page.click('.shot-frame');
      await page.waitForTimeout(450);
      if ((await shot()).state !== 'zoomed') fail('el clic no amplió la foto');
      await page.screenshot({ path: OUT_PHOTO_ZOOM });
      // Flechas: otra foto de la misma cámara.
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction((prev) => document.querySelector('.shot').dataset.photo !== prev && document.querySelector('.shot').dataset.loaded === 'true', info.photo, { timeout: 20000 }).catch(() => {});
      const next = await shot();
      if (next.photo === info.photo || next.cam !== info.cam) fail('la flecha no mostró otra foto de la misma cámara');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if ((await shot()).state !== 'idle') fail(`Esc no cerró la foto de ${key}`);
  }
  await page.keyboard.press('t');
}

// Física del rover: prueba cada comportamiento en un lugar del mapa elegido a propósito.
async function checkRover() {
  const ok = (name, pass, detail) => {
    roverChecks.push({ name, pass, detail });
    if (!pass) errors.push(`rover: ${name} (${detail})`);
  };
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };
  const state = () =>
    page.evaluate(() => {
      const r = window.__percy.rover;
      const t = r.telemetry;
      const bogie = Math.max(...['L', 'R'].map((s) => Math.abs(r.rig.sides[s].bogie.rotation.x)));
      return { odo: t.odometer, wheel: t.spin * r.wheelRadius, slip: t.slip, blocked: t.blocked, bogie: (bogie * 180) / Math.PI };
    });

  // 1. Ruedas: en línea recta, cada metro recorrido corresponde a giro de rueda (o más, si patina).
  await page.evaluate(() => window.__percy.rover.setPosition(0, 10, 0));
  let s = await state();
  await hold('w', 1500);
  let e = await state();
  const run = e.odo - s.odo, roll = e.wheel - s.wheel;
  ok('las ruedas giran al avanzar', run > 1 && roll >= run * 0.98, `${run.toFixed(2)} m recorridos, ${roll.toFixed(2)} m de giro de rueda`);

  // 2. Rocker-bogie: pasa con las ruedas izquierdas sobre una roca mediana.
  const rock = await page.evaluate(() => {
    const { rover, ground } = window.__percy;
    for (let x = -60; x <= 60; x += 0.25)
      for (let z = -60; z <= 20; z += 0.25) {
        const o = ground.obstacleAt(x, z);
        if (o < 0.28 || o > 0.48) continue;
        let clear = true;
        for (let dx = -2.5; dx <= 2.5 && clear; dx += 0.5)
          for (let dz = -5; dz <= 5 && clear; dz += 0.5) if (ground.obstacleAt(x + dx, z + dz) > 0.5) clear = false;
        if (!clear) continue;
        const half = (rover.sides.R.mid.at.x - rover.sides.L.mid.at.x) / 2;
        rover.setPosition(x + half, z + 4, 0);
        return { x, z, height: o };
      }
    return null;
  });
  let maxBogie = 0;
  if (rock) {
    await page.keyboard.down('w');
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      maxBogie = Math.max(maxBogie, (await state()).bogie);
    }
    await page.keyboard.up('w');
  }
  ok('el rocker-bogie se articula sobre una roca', maxBogie > 5, rock ? `roca de ${rock.height.toFixed(2)} m, bogie hasta ${maxBogie.toFixed(1)}°` : 'no se encontró roca de prueba');

  // 3. Un peñasco más alto que una rueda lo detiene.
  await page.evaluate(() => window.__percy.rover.setPosition(-9, 11, 0));
  await hold('w', 3500);
  s = await state();
  ok('un peñasco lo detiene', s.blocked > 0.525, `roca de ${s.blocked.toFixed(2)} m`);

  // 4. En una duna empinada de arena las ruedas patinan.
  const dune = await page.evaluate(async () => {
    const { rover, ground } = window.__percy;
    let best = null;
    for (let x = -120; x <= 120; x += 2)
      for (let z = -200; z <= 40; z += 2)
        for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const fx = -Math.sin(h), fz = -Math.cos(h);
          const rise = ground.groundAt(x + fx * 1.5, z + fz * 1.5) - ground.groundAt(x - fx * 1.5, z - fz * 1.5);
          if (Math.atan(rise / 3) < 0.26 || ground.obstacleAt(x, z) > 0) continue;
          let clear = true;
          for (let d = -3; d <= 6 && clear; d += 0.5)
            for (const l of [-1.5, 0, 1.5]) if (ground.obstacleAt(x + fx * d - fz * l, z + fz * d + fx * l) > 0.2) clear = false;
          if (!clear) continue;
          rover.setPosition(x, z, h);
          const onRock = rover.wheels.some((w) => {
            const q = rover._toWorld(w.at);
            return ground.obstacleAt(q.x, q.z) > 0;
          });
          // Dunas de 18° a 30°: la arena llega a su límite, sin caras verticales.
          if (onRock || rover.pitch < 0.31 || rover.pitch > 0.52) continue;
          if (!best || rover.pitch > best.pitch) best = { x, z, h, pitch: rover.pitch };
        }
    if (best) rover.setPosition(best.x, best.z, best.h);
    return best && { pitch: (best.pitch * 180) / Math.PI };
  });
  const before = await state();
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  const during = await state();
  await page.keyboard.up('w');
  const moved = during.odo - before.odo, turned = during.wheel - before.wheel;
  ok('patina subiendo una duna empinada', Boolean(dune) && during.slip > 0.3 && moved < turned * 0.7,
    dune ? `pendiente ${dune.pitch.toFixed(0)}°, patinaje ${Math.round(during.slip * 100)} %, avanzó ${moved.toFixed(2)} m con ${turned.toFixed(2)} m de giro` : 'no se encontró duna');
}

// Control de misión: los 4 datos cargan con números reales y la T oculta el panel.
async function checkMissionControl() {
  await page
    .waitForFunction(() => {
      const els = [...document.querySelectorAll('[data-telemetry]')];
      return els.length === 4 && els.every((el) => el.dataset.status !== 'loading');
    }, null, { timeout: 25000 })
    .catch(() => {});
  const first = await readTelemetry();
  telemetry.push(...first);
  if (first.length !== 4) errors.push(`control de misión: se esperaban 4 datos y hay ${first.length}`);
  for (const t of first) {
    const range = EXPECTED[t.key];
    if (t.status !== 'ok') errors.push(`control de misión: «${t.name}» no cargó (estado: ${t.status})`);
    else if (!range || !(t.value >= range.min && t.value <= range.max) || !(t.points > 1))
      errors.push(`control de misión: «${t.name}» = ${t.value} ${t.unit} con ${t.points} puntos, fuera de lo esperado`);
    if (!t.unit || !t.provider) errors.push(`control de misión: «${t.name}» sin unidad o proveedor`);
  }
  // El tiempo de luz se recalcula cada segundo.
  const before = first.find((t) => t.key === 'lightTime')?.value;
  await page.waitForTimeout(2200);
  const after = (await readTelemetry()).find((t) => t.key === 'lightTime')?.value;
  if (!(before !== after && Number.isFinite(after))) errors.push('control de misión: el tiempo de luz no se actualiza en vivo');

  await page.keyboard.press('t');
  await page.waitForTimeout(600);
  if (!(await panelHidden())) errors.push('control de misión: la tecla T no ocultó el panel');
  await page.screenshot({ path: OUT_HIDDEN });
  await page.keyboard.press('t');
  await page.waitForTimeout(600);
  if (await panelHidden()) errors.push('control de misión: la tecla T no volvió a mostrar el panel');
}
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
  else if (msg.type() === 'warning') warnings.push(msg.text());
  else if (msg.text().startsWith('[')) logs.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText})`));

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await checkMissionControl();
  await page.waitForTimeout(WAIT_MS);
  await page.screenshot({ path: OUT_START });
  // Maneja el rover: recto, luego girando a la izquierda, para ver huellas y cámara que sigue.
  await page.mouse.click(640, 360);
  await page.keyboard.down('w');
  await page.waitForTimeout(2500);
  await page.keyboard.down('a');
  await page.waitForTimeout(1800);
  await page.keyboard.up('a');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT });
  await checkRover();
  await checkPhotos();
} catch (e) {
  errors.push(`check: ${e.message}`);
}
await browser.close();

if (logs.length) {
  console.log('Consola:');
  for (const l of logs) console.log(`  ${l.replace(/\n/g, '\n  ')}`);
}
if (telemetry.length) {
  console.log('Control de misión:');
  for (const t of telemetry)
    console.log(`  ${t.status === 'ok' ? '✓' : '✗'} ${t.name}: ${t.shown} [${t.unit}, ${t.points} puntos] · ${t.provider}`);
}
if (roverChecks.length) {
  console.log('Rover:');
  for (const c of roverChecks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`);
}
if (photoChecks.length) {
  console.log('Cámaras:');
  for (const c of photoChecks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.info.cam}: ${c.info.when}, ${c.info.width} px · ${c.info.photo}`);
}
console.log(`\nCapturas: ${OUT_START} (inicio), ${OUT} (tras manejar), ${OUT_HIDDEN} (panel oculto con T), ${OUT_PHOTO} (foto abierta), ${OUT_PHOTO_ZOOM} (foto ampliada)`);
if (warnings.length) {
  console.log(`\nAvisos (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log(`\nErrores de consola (${errors.length}):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nSin errores de consola ✓');
