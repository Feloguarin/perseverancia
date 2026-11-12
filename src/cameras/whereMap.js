import { loadWaypoints, locate } from '../mission/waypoints.js';

// «¿Dónde se tomó?»: el recorrido real de Perseverance desde el aterrizaje y, sobre él, el punto
// donde estaba el rover cuando tomó la foto. Cada foto de la NASA trae el sitio y el manejo
// (site, drive); el registro de manejos dice en qué coordenadas quedó cada uno.
const W = 240, H = 150, PAD = 12;
const MARS_RADIUS_M = 3389500;
const nf = (d) => new Intl.NumberFormat('es', { minimumFractionDigits: d, maximumFractionDigits: d });
const SVG = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

export function createWhereMap() {
  const root = document.createElement('div');
  root.className = 'shot-where';
  root.hidden = true;
  root.innerHTML = `
    <p class="shot-where-t">¿Dónde se tomó?</p>
    <button type="button" class="shot-where-map" aria-pressed="false">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Recorrido de Perseverance en Marte"></svg>
      <span class="shot-where-zoom"></span>
    </button>
    <p class="shot-where-key"><span><i class="k-start"></i>Aterrizaje, 2021</span><span><i class="k-here"></i>La foto</span><span><i class="k-now"></i>Percy hoy</span></p>
    <p class="shot-where-text"></p>`;
  const svg = root.querySelector('svg');
  const button = root.querySelector('.shot-where-map');
  const text = root.querySelector('.shot-where-text');
  const zoomLabel = root.querySelector('.shot-where-zoom');

  let track = null; // { points, xy, metersPerUnit }
  let current = null;
  let zoomed = false;
  let token = 0;

  // Proyección plana: a esta escala (unos 20 km) basta con corregir la longitud por la latitud.
  function build(points) {
    const lat0 = (points[0].lat * Math.PI) / 180;
    const raw = points.map((p) => ({ x: p.lon * Math.cos(lat0), y: -p.lat }));
    const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
    const offX = (W - (maxX - minX) * scale) / 2, offY = (H - (maxY - minY) * scale) / 2;
    const xy = raw.map((p) => ({ x: offX + (p.x - minX) * scale, y: offY + (p.y - minY) * scale }));
    const metersPerDegree = (Math.PI / 180) * MARS_RADIUS_M;
    return { points, xy, metersPerUnit: metersPerDegree / scale };
  }
  const line = (xy) => xy.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

  function draw() {
    const { points, xy, metersPerUnit } = track;
    const i = points.indexOf(current.point);
    const here = xy[i];
    // Acercado: 600 m alrededor del punto. Los trazos no engordan (vector-effect en el CSS) y
    // los puntos se achican en la misma proporción para verse del mismo tamaño en pantalla.
    const half = 600 / metersPerUnit;
    const k = zoomed ? (half * 2) / W : 1;
    svg.setAttribute('viewBox', zoomed ? `${here.x - half} ${here.y - (half * H) / W} ${half * 2} ${(half * 2 * H) / W}` : `0 0 ${W} ${H}`);
    svg.replaceChildren(
      el('polyline', { class: 'where-rest', points: line(xy.slice(i)) }),
      el('polyline', { class: 'where-done', points: line(xy.slice(0, i + 1)) }),
      el('circle', { class: 'where-start', cx: xy[0].x, cy: xy[0].y, r: 2.6 * k }),
      el('circle', { class: 'where-now', cx: xy[xy.length - 1].x, cy: xy[xy.length - 1].y, r: 2.6 * k }),
      el('circle', { class: 'where-pulse', cx: here.x, cy: here.y, r: 9 * k }),
      el('circle', { class: 'where-here', cx: here.x, cy: here.y, r: 4 * k }),
    );
    zoomLabel.textContent = zoomed ? 'Ver todo el recorrido' : 'Acercar';
    button.setAttribute('aria-pressed', String(zoomed));
    button.setAttribute('aria-label', zoomed ? 'Ver todo el recorrido' : 'Acercar el mapa a donde se tomó la foto');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!track || !current) return;
    zoomed = !zoomed;
    draw();
  });

  // Muestra dónde estaba el rover para esa foto. Si no se puede saber, el bloque no aparece.
  async function show(photo) {
    const my = ++token;
    root.hidden = true;
    root.dataset.state = 'loading';
    if (!Number.isFinite(photo.site) || !Number.isFinite(photo.drive)) return;
    let data;
    try {
      data = await loadWaypoints();
    } catch {
      return;
    }
    if (my !== token) return;
    track ??= build(data.points);
    const found = locate(track.points, photo.site, photo.drive);
    if (!found) return;
    current = found;
    zoomed = false;
    draw();
    const p = found.point;
    const last = track.points[track.points.length - 1];
    const behind = last.odo - p.odo;
    const where = `En el kilómetro ${nf(2).format(p.odo / 1000)} de su recorrido, a ${nf(0).format(Math.abs(p.elev_geoid))} m bajo el nivel de referencia de Marte.`;
    const since = behind < 1 ? 'Percy sigue en ese mismo lugar.' : `Desde entonces ha avanzado ${nf(0).format(behind)} m.`;
    text.textContent = `${where} ${since}`;
    Object.assign(root.dataset, { state: 'ok', site: String(p.site), drive: String(p.drive), km: (p.odo / 1000).toFixed(2), exact: String(found.exact), source: data.source });
    root.hidden = false;
  }

  return { root, show };
}
