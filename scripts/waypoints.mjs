// Renueva la copia del registro de manejos de Perseverance (public/data/waypoints.json).
//
// La página pide primero el archivo a la NASA en vivo. Esta copia es su respaldo para cuando la
// NASA no responde o rechaza al navegador (lo hace con los Chrome sin ventana de las pruebas), y
// trae solo lo que se usa: sol, distancia total, altura, inclinación, coordenadas, sitio y manejo
// de cada localización. Conviene correrlo antes de publicar: npm run waypoints.
//
// Si la NASA no responde o el archivo llega raro, NO falla ni toca la copia que ya hay: la página
// sigue mostrando la anterior, con su fecha a la vista.
//
// Uso: node scripts/waypoints.mjs [carpeta-destino=public/data]
import fs from 'node:fs';
import path from 'node:path';

const FUENTE = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';
const destino = path.join(process.argv[2] || 'public/data', 'waypoints.json');
const r1 = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

function actual() {
  try {
    return JSON.parse(fs.readFileSync(destino, 'utf8'));
  } catch {
    return null;
  }
}

// Hasta 3 intentos con espera: la red del servidor de despliegue a veces falla a la primera.
async function descargar() {
  let error;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const res = await fetch(FUENTE, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'perseverancia' } });
      if (res.ok) return res;
      error = new Error(`la NASA respondió ${res.status}`);
    } catch (e) {
      error = new Error(e.cause?.code ?? e.message);
    }
    if (intento < 3) await new Promise((r) => setTimeout(r, 4000 * intento));
  }
  throw error;
}

try {
  const res = await descargar();
  const json = await res.json();
  // Todas las localizaciones, en orden: las de fin de manejo alimentan el control de misión y las
  // intermedias sirven para ubicar fotos en el mapa.
  const points = (json.features ?? [])
    .map((f) => f.properties)
    .map((p) => [p.sol, r1(p.dist_total_m, 1), r1(p.elev_geoid, 1), r1(p.tilt, 2), r1(p.lon, 6), r1(p.lat, 6), p.site, p.drive, p.final === 'y' ? 1 : 0])
    .filter((d) => d.every(Number.isFinite));
  const drives = points.filter((d) => d[8] === 1);

  const antes = actual();
  const ultimo = drives.at(-1);
  // Cordura: el recorrido solo crece y un rover no retrocede de sol. Si no cuadra, se conserva lo que hay.
  if (drives.length < 500) throw new Error(`solo ${drives.length} fines de manejo (se esperaban más de 500)`);
  if (antes?.points && points.length < antes.points.length) throw new Error(`llegaron ${points.length} puntos y la copia tiene ${antes.points.length}`);
  if (!(ultimo[1] > 40000 && ultimo[1] < 500000)) throw new Error(`distancia total fuera de rango: ${ultimo[1]} m`);

  // Fecha del archivo según la NASA; si no la manda, hoy.
  const lm = new Date(res.headers.get('last-modified') ?? Date.now());
  const updated = (Number.isNaN(lm.getTime()) ? new Date() : lm).toISOString().slice(0, 10);
  if (antes?.points && antes.updated === updated && antes.points.length === points.length) {
    console.log(`waypoints: sin cambios (${drives.length} manejos, sol ${ultimo[0]}, copia del ${updated}).`);
  } else {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, JSON.stringify({ source: FUENTE, updated, fields: ['sol', 'dist_total_m', 'elev_geoid', 'tilt', 'lon', 'lat', 'site', 'drive', 'final'], points }));
    console.log(`waypoints: ${drives.length} manejos, hasta el sol ${ultimo[0]} (${(ultimo[1] / 1000).toFixed(2)} km). Copia del ${updated}.`);
  }
} catch (e) {
  const antes = actual();
  console.warn(`waypoints: no se renovó (${e.message}). ${antes ? `Se conserva la copia del ${antes.updated}.` : 'No hay copia previa: el control de misión mostrará «Sin señal».'}`);
}
