import './panel.css';
import { TelemetryAPI } from './telemetry.js';
import { waypointsProvider, lightTimeProvider } from './providers.js';
import { missionSol } from './marsTime.js';

const nf = (digits) => new Intl.NumberFormat('es', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const minus = (s) => s.replace('-', '−');

// Cómo se escribe cada formato declarado en los metadatos.
const FORMATS = {
  km: (v) => nf(2).format(v),
  m: (v) => minus(nf(0).format(v)),
  deg: (v) => nf(1).format(v),
  duration: (s) => `${Math.floor(s / 60)} min ${nf(1).format(s % 60)} s`,
};

// Qué significa cada dato, en una frase, a partir de toda la serie.
const MEANING = {
  distance: (series, last) =>
    `Todo lo que ha rodado desde que aterrizó en 2021; equivale a ${nf(1).format(last.value / 42.195)} maratones.`,
  elevation: (series, last) => {
    const climbed = last.value - series[0].value;
    return `Metros bajo el “nivel del mar” de Marte. Ha subido ${nf(0).format(climbed)} m desde el fondo del cráter Jezero.`;
  },
  tilt: (series) => {
    const max = Math.max(...series.map((d) => d.value));
    return `Cuánto quedó ladeado al terminar su último manejo (0° es suelo plano). El máximo de la misión: ${nf(1).format(max)}°.`;
  },
  lightTime: () =>
    'Lo que tarda ahora una orden en llegar desde la Tierra. Por eso nadie puede manejar a Percy en tiempo real.',
};

// Colores de las líneas: ocre para lo que reporta la NASA, azul (el halo del
// atardecer marciano) para lo que se calcula en vivo en el navegador.
const SCALE_GUTTER = 40;

const ACCENT = { distance: '#eb9a58', elevation: '#eb9a58', tilt: '#eb9a58', lightTime: '#9dbbe0' };

export function createMissionControl() {
  const api = new TelemetryAPI();
  api.addProvider(waypointsProvider());
  api.addProvider(lightTimeProvider());

  const root = document.createElement('section');
  root.className = 'mc';
  root.setAttribute('aria-label', 'Control de misión');
  root.innerHTML = `
    <header class="mc-bar">
      <h2>Control de misión</h2>
      <p class="mc-clock"></p>
      <p class="mc-key"><kbd>T</kbd> oculta el panel</p>
    </header>
    <div class="mc-grid"></div>`;
  const tab = document.createElement('button');
  tab.className = 'mc-tab';
  tab.type = 'button';
  tab.innerHTML = '<kbd>T</kbd> Control de misión';
  document.body.append(root, tab);

  const clock = root.querySelector('.mc-clock');
  const grid = root.querySelector('.mc-grid');
  const view = { solMax: missionSol(), scrub: null };
  const cells = api.getObjects().map((obj) => createCell(api, obj, view, grid));
  const redrawAll = () => cells.forEach((c) => c.draw());

  const tick = () => {
    const sol = missionSol();
    const h = (sol % 1) * 24;
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
    clock.textContent = `Sol ${Math.floor(sol)}, ${hh}:${mm} en Jezero`;
    view.solMax = sol;
  };
  tick();
  setInterval(tick, 1000);

  // Recorrer la misión: el mismo sol se marca en las cuatro gráficas a la vez.
  grid.addEventListener('pointermove', (e) => {
    const canvas = e.target.closest('canvas');
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    view.scrub = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width - SCALE_GUTTER))) * view.solMax;
    redrawAll();
  });
  grid.addEventListener('pointerout', (e) => {
    if (!e.target.closest?.('canvas') || e.relatedTarget?.closest?.('canvas')) return;
    view.scrub = null;
    redrawAll();
  });

  const toggle = () => {
    const hidden = root.dataset.hidden !== 'true';
    root.dataset.hidden = String(hidden);
    root.inert = hidden;
    tab.dataset.visible = String(hidden);
  };
  root.dataset.hidden = 'false';
  tab.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 't' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (e.target.closest?.('input, textarea, [contenteditable]')) return;
    toggle();
  });
  new ResizeObserver(redrawAll).observe(grid);

  return { api, toggle };
}

function createCell(api, obj, view, grid) {
  const key = obj.identifier.key;
  const { range } = api.getMetadata(obj);
  const provider = api.getProvider(obj);
  const format = FORMATS[range.format];

  const el = document.createElement('article');
  el.className = 'mc-cell';
  el.style.setProperty('--accent', ACCENT[key]);
  Object.assign(el.dataset, { telemetry: key, status: 'loading', unit: range.unit, provider: provider.name });
  el.innerHTML = `
    <h3>${obj.name}</h3>
    <p class="mc-value"><span class="mc-num">—</span><span class="mc-unit">${range.format === 'duration' ? '' : range.unit}</span><span class="mc-at"></span></p>
    <canvas role="img" aria-label="${obj.name} durante toda la misión"></canvas>
    <p class="mc-axis"><span>Aterrizaje</span><span>Hoy</span></p>
    <p class="mc-say">Recibiendo datos…</p>
    <p class="mc-src">Fuente: ${provider.name}</p>`;
  grid.append(el);

  const num = el.querySelector('.mc-num');
  const at = el.querySelector('.mc-at');
  const say = el.querySelector('.mc-say');
  const canvas = el.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const live = Boolean(provider.supportsSubscribe?.(obj));
  let series = [];

  const latest = () => series[series.length - 1];
  // El dato vigente en un sol: el último punto registrado hasta ese momento.
  const valueAt = (sol) => {
    let lo = 0, hi = series.length - 1;
    if (sol < series[0].sol) return series[0];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (series[mid].sol <= sol) lo = mid;
      else hi = mid - 1;
    }
    return series[lo];
  };

  const show = () => {
    const d = view.scrub == null ? latest() : valueAt(view.scrub);
    num.textContent = format(d.value);
    if (view.scrub != null) at.textContent = `sol ${Math.floor(view.scrub)}`;
    else at.textContent = live ? 'en vivo' : `sol ${d.sol}`;
  };

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!series.length) return;

    const accent = ACCENT[key];
    let min = Infinity, max = -Infinity;
    for (const d of series) {
      if (d.value < min) min = d.value;
      if (d.value > max) max = d.value;
    }
    const pad = (max - min) * 0.12 || 1;
    const y0 = min - pad, y1 = max + pad;
    // A la derecha queda un margen para la escala, fuera de la línea.
    const plotW = w - SCALE_GUTTER;
    const X = (sol) => (sol / view.solMax) * plotW;
    const Y = (v) => h - ((v - y0) / (y1 - y0)) * h;

    const line = new Path2D();
    series.forEach((d, i) => (i ? line.lineTo(X(d.sol), Y(d.value)) : line.moveTo(X(d.sol), Y(d.value))));
    const area = new Path2D(line);
    area.lineTo(X(latest().sol), h);
    area.lineTo(X(series[0].sol), h);
    area.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, `${accent}44`);
    fill.addColorStop(1, `${accent}00`);
    ctx.fillStyle = fill;
    ctx.fill(area);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke(line);

    // Escala: máximo y mínimo de la misión en las esquinas.
    ctx.font = '500 10.5px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillStyle = 'rgba(243, 220, 196, 0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(format(max), w, 0);
    ctx.textBaseline = 'bottom';
    ctx.fillText(format(min), w, h);

    const mark = view.scrub == null ? latest() : valueAt(view.scrub);
    if (view.scrub != null) {
      ctx.fillStyle = 'rgba(255, 244, 230, 0.7)';
      ctx.fillRect(Math.round(X(view.scrub)) - 0.5, 0, 1, h);
    }
    ctx.beginPath();
    ctx.arc(X(view.scrub ?? mark.sol), Y(mark.value), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4e6';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();
    show();
  }

  api
    .request(obj)
    .then((data) => {
      series = data;
      const last = latest();
      Object.assign(el.dataset, { status: 'ok', value: String(last.value), points: String(series.length), sol: String(last.sol) });
      say.textContent = MEANING[key](series, last);
      draw();
      api.subscribe(obj, (d) => {
        // El punto "ahora" se reemplaza; solo se agrega uno nuevo al cambiar de sol.
        if (series.length > 1 && d.sol - series[series.length - 2].sol < 1) series[series.length - 1] = d;
        else series.push(d);
        el.dataset.value = String(d.value);
        el.dataset.sol = String(d.sol);
        draw();
      });
    })
    .catch((err) => {
      el.dataset.status = 'error';
      num.textContent = 'Sin señal';
      say.textContent = 'No llegaron los datos de la NASA. Revisa tu conexión y recarga la página.';
      console.error(`[control de misión] ${obj.name}:`, err);
    });

  return { draw };
}
