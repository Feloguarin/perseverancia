import './cameras.css';
import { PHOTOS } from './photos.js';

const STAY_MS = 8000; // cuánto se queda la foto antes de volver sola al juego
const REVEAL_MS = 2600; // la foto llega línea a línea, como baja desde Marte
const REVEAL_NEXT_MS = 900;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function daysAgo(utc) {
  const days = Math.floor((Date.now() - Date.parse(utc)) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

// Visor de fotos: obturador y flash, revelado, foto grande unos segundos,
// clic para ampliar, Esc para volver al juego, flechas para más fotos.
export function createPhotoViewer() {
  const root = document.createElement('div');
  root.className = 'shot';
  root.dataset.state = 'idle';
  root.innerHTML = `
    <div class="shot-shutter" aria-hidden="true"><i></i><i></i></div>
    <div class="shot-flash" aria-hidden="true"></div>
    <div class="shot-backdrop"></div>
    <figure class="shot-photo" role="dialog" aria-modal="false" aria-label="Foto de Perseverance">
      <button type="button" class="shot-frame" aria-label="Ampliar la foto">
        <img alt="" decoding="async" />
        <span class="shot-scan" aria-hidden="true"></span>
        <span class="shot-downlink" aria-hidden="true">Recibiendo desde Marte…</span>
      </button>
      <figcaption>
        <p class="shot-cam"></p>
        <p class="shot-when"></p>
        <p class="shot-note"></p>
        <p class="shot-count"></p>
        <p class="shot-keys"><span class="shot-zoom-hint">Clic para ampliar</span><span><kbd>←</kbd><kbd>→</kbd> más fotos</span><span><kbd>Esc</kbd> volver al juego</span></p>
        <p class="shot-credit"></p>
      </figcaption>
      <span class="shot-timer" aria-hidden="true"></span>
    </figure>`;
  document.body.append(root);

  const $ = (sel) => root.querySelector(sel);
  const img = $('img'), frame = $('.shot-frame'), scan = $('.shot-scan'), timer = $('.shot-timer');
  const figure = $('.shot-photo');
  let cam = null, index = 0, token = 0, stayTimer = null, timerAnim = null;

  const setState = (s) => {
    root.dataset.state = s;
    $('.shot-zoom-hint').textContent = s === 'zoomed' ? 'Clic para reducir' : 'Clic para ampliar';
    frame.setAttribute('aria-label', s === 'zoomed' ? 'Reducir la foto' : 'Ampliar la foto');
  };
  const isOpen = () => root.dataset.state !== 'idle';

  function preload(camera) {
    const first = PHOTOS[camera.key]?.[0];
    if (first) new Image().src = first.url;
  }

  // Obturador: las hojas se cierran y abren, y un destello blanco.
  async function shutter() {
    if (reducedMotion()) return;
    const blades = [...root.querySelectorAll('.shot-shutter i')];
    const close = blades.map((b) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 90, easing: 'ease-in', fill: 'forwards' }));
    await Promise.all(close.map((a) => a.finished));
    $('.shot-flash').animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
    await new Promise((r) => setTimeout(r, 40));
    const open = blades.map((b) => b.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 140, easing: 'ease-out', fill: 'forwards' }));
    await Promise.all(open.map((a) => a.finished));
  }

  async function show(i, { first = false } = {}) {
    const list = PHOTOS[cam.key];
    index = (i + list.length) % list.length;
    const photo = list[index];
    const my = ++token;
    clearStay();

    $('.shot-cam').textContent = cam.name;
    $('.shot-when').textContent = `Sol ${photo.sol}, ${daysAgo(photo.takenUtc)}`;
    $('.shot-note').textContent = photo.note;
    $('.shot-count').textContent = `Foto ${index + 1} de ${list.length}`;
    $('.shot-credit').innerHTML = `Imagen cruda: ${photo.credit}. <a href="${photo.link}" target="_blank" rel="noopener">Ver en la NASA</a>`;
    img.alt = `${cam.name}, sol ${photo.sol}: ${photo.note}`;
    Object.assign(root.dataset, { camera: cam.key, photo: photo.id, loaded: 'false' });

    if (root.dataset.state !== 'zoomed') setState('revealing');
    img.style.clipPath = 'inset(0 0 100% 0)';
    img.src = photo.url;
    try {
      await img.decode();
    } catch (err) {
      if (my !== token) return;
      root.dataset.loaded = 'error';
      $('.shot-note').textContent = 'No llegó la foto desde la NASA. Revisa tu conexión y vuelve a intentar.';
      console.error(`[cámaras] No se pudo cargar ${photo.url}`, err);
      return;
    }
    if (my !== token) return;
    root.dataset.loaded = 'true';

    // Revelado: la imagen baja de arriba abajo, con una línea de lectura brillante.
    const duration = reducedMotion() ? 0 : first ? REVEAL_MS : REVEAL_NEXT_MS;
    const reveal = img.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    scan.animate([{ top: '0%', opacity: 1 }, { top: '100%', opacity: 1 }, { top: '100%', opacity: 0 }], { duration: duration + 200, easing: 'cubic-bezier(.3,.1,.3,1)' });
    await reveal.finished.catch(() => {});
    if (my !== token) return;
    img.style.clipPath = 'none';
    reveal.cancel();
    if (root.dataset.state === 'revealing') setState('shown');
    startStay();
  }

  // Se queda quieta unos segundos y vuelve sola al juego (salvo que la estés mirando).
  function startStay() {
    clearStay();
    if (root.dataset.state !== 'shown') return;
    timerAnim = timer.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: STAY_MS, fill: 'forwards' });
    if (figure.matches(':hover')) timerAnim.pause();
    stayTimer = setInterval(() => {
      if (timerAnim?.playState === 'finished') close();
    }, 200);
  }
  function clearStay() {
    clearInterval(stayTimer);
    timerAnim?.cancel();
    timerAnim = null;
  }
  figure.addEventListener('pointerenter', () => timerAnim?.pause());
  figure.addEventListener('pointerleave', () => timerAnim?.play());

  async function open(camera) {
    cam = camera;
    token++;
    clearStay();
    setState('capturing');
    root.dataset.loaded = 'false';
    img.removeAttribute('src');
    await shutter();
    await show(0, { first: true });
  }

  function close() {
    token++;
    clearStay();
    setState('idle');
    img.getAnimations().forEach((a) => a.cancel());
  }

  frame.addEventListener('click', () => {
    if (root.dataset.state === 'shown' || root.dataset.state === 'revealing') {
      clearStay();
      setState('zoomed');
    } else if (root.dataset.state === 'zoomed') {
      setState('shown');
      startStay();
    }
  });
  $('.shot-backdrop').addEventListener('click', close);

  // Mientras hay una foto abierta, las flechas son del visor (no manejan el rover).
  window.addEventListener(
    'keydown',
    (e) => {
      if (!isOpen()) return;
      const k = e.key;
      const zoomed = root.dataset.state === 'zoomed';
      if (k === 'Escape') close();
      else if (k === 'ArrowRight') show(index + 1);
      else if (k === 'ArrowLeft') show(index - 1);
      else if (!(k === 'ArrowUp' || k === 'ArrowDown' || (zoomed && 'wasd'.includes(k.toLowerCase())))) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  return { open, close, preload, isOpen };
}
