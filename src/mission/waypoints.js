// Registro de manejos de Perseverance (NASA/JPL): un punto por cada localización del recorrido.
// Lo usan el control de misión (distancia, altura, inclinación) y el mapa de «¿Dónde se tomó?».
//
// Primero se pide a la NASA en vivo. Si no responde (sin conexión, caída, o un navegador
// automático: su servidor rechaza los Chrome sin ventana), se usa la copia que se guarda al
// publicar la página, y quien lo muestra dice de qué día es.
const LIVE_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';
const COPY_URL = `${import.meta.env.BASE_URL}data/waypoints.json`;

const json = (url, ms) =>
  fetch(url, { signal: AbortSignal.timeout(ms) }).then((r) => {
    if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
    return r.json();
  });

const fromLive = (data) => ({
  source: 'live',
  updated: null,
  points: data.features
    .map((f) => f.properties)
    .map((p) => ({
      sol: p.sol,
      dist_total_m: p.dist_total_m,
      elev_geoid: p.elev_geoid,
      tilt: p.tilt,
      lon: p.lon,
      lat: p.lat,
      site: p.site,
      drive: p.drive,
      final: p.final === 'y',
    })),
});

const fromCopy = (copy) => ({
  source: 'copy',
  updated: copy.updated,
  points: copy.points.map((row) => {
    const p = Object.fromEntries(copy.fields.map((k, i) => [k, row[i]]));
    p.final = Boolean(p.final);
    return p;
  }),
});

// Las localizaciones a mitad de manejo traen la distancia total en 0: a cada punto se le anota
// `odo`, lo recorrido hasta ahí según el último fin de manejo (el error es de pocos metros).
function withOdometer(data) {
  let odo = 0;
  for (const p of data.points) {
    if (p.dist_total_m > odo) odo = p.dist_total_m;
    p.odo = odo;
  }
  return data;
}

let pending;
// { source: 'live' | 'copy', updated: 'AAAA-MM-DD' | null, points: [...] } en orden cronológico.
export function loadWaypoints() {
  return (pending ??= json(LIVE_URL, 8000)
    .then(fromLive)
    .catch(() => json(COPY_URL, 15000).then(fromCopy))
    .then(withOdometer));
}

// Dónde estaba el rover para un sitio y manejo dados (los que trae cada foto de la NASA).
export function locate(points, site, drive) {
  const here = points.filter((p) => p.site === site);
  if (!here.length) return null;
  const exact = here.find((p) => p.drive === drive);
  if (exact) return { point: exact, exact: true };
  // Sin ese manejo en el registro: la última localización conocida del sitio antes de él.
  const before = here.filter((p) => p.drive <= drive);
  return { point: before.length ? before[before.length - 1] : here[0], exact: false };
}

export const copyDate = (updated) => {
  const [y, m, d] = updated.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
