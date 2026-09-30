import './driveHud.css';
import { TIME_WARP } from './rover.js';

const nf = (d) => new Intl.NumberFormat('es', { minimumFractionDigits: d, maximumFractionDigits: d });

// Tablero de manejo: lo que el rover siente mientras lo manejas.
export function createDriveHud(rover) {
  const el = document.createElement('aside');
  el.className = 'drive';
  el.setAttribute('aria-label', 'Manejo del rover');
  el.innerHTML = `
    <p class="drive-speed"><span class="drive-big">0,0</span> cm/s</p>
    <p class="drive-note">Velocidad real. El tiempo corre ×${TIME_WARP}.</p>
    <dl>
      <div><dt>Patinaje</dt><dd data-k="slip">0 %</dd></div>
      <div><dt>Inclinación</dt><dd data-k="tilt">0°</dd></div>
      <div><dt>Recorrido</dt><dd data-k="odo">0 m</dd></div>
    </dl>
    <p class="drive-status" role="status"></p>
    <p class="drive-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> manejar</p>`;
  document.body.append(el);

  const big = el.querySelector('.drive-big');
  const dd = Object.fromEntries([...el.querySelectorAll('dd')].map((d) => [d.dataset.k, d]));
  const status = el.querySelector('.drive-status');

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat) el.classList.toggle('is-hidden');
  });

  let last = 0;
  return function update(now) {
    if (now - last < 100) return;
    last = now;
    const t = rover.telemetry;
    big.textContent = nf(1).format(t.speed * 100);
    dd.slip.textContent = `${Math.round(t.slip * 100)} %`;
    dd.slip.classList.toggle('is-warn', t.slip > 0.4);
    dd.tilt.textContent = `${nf(1).format(t.tilt)}°`;
    dd.odo.textContent = `${nf(1).format(t.odometer)} m`;
    let msg = '';
    if (t.blocked) msg = `Roca de ${nf(2).format(t.blocked)} m: más alta de lo que puede subir. Retrocede o rodéala.`;
    else if (t.slip > 0.85) msg = 'Las ruedas giran pero casi no avanza: la pendiente es demasiado empinada para esta arena.';
    else if (t.slip > 0.4) msg = `Patina en ${t.sand > 0.5 ? 'arena suelta' : 'la pendiente'}: avanza más lento de lo que giran las ruedas.`;
    else if (t.aligning) msg = 'Orientando las ruedas antes de moverse.';
    status.textContent = msg;
    status.classList.toggle('is-warn', Boolean(t.blocked) || t.slip > 0.4);
    Object.assign(el.dataset, {
      speed: String(t.speed),
      slip: String(t.slip),
      odometer: String(t.odometer),
      spin: String(t.spin),
      rocker: String(t.rocker),
      tilt: String(t.tilt),
    });
  };
}
