import { telemetryObject } from './telemetry.js';
import { lightTimeSeconds, missionSol, solToMs } from './marsTime.js';
import { copyDate, loadWaypoints } from './waypoints.js';

const WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';

// Historial de manejos de la NASA: una localización por punto del recorrido.
// Solo usamos las de fin de manejo; las intermedias reinician la distancia.
export function waypointsProvider() {
  const FIELDS = {
    distance: (p) => p.dist_total_m / 1000,
    elevation: (p) => p.elev_geoid,
    tilt: (p) => p.tilt,
  };
  let drives;
  let name = 'NASA/JPL, registro de manejos';
  const load = () =>
    (drives ??= loadWaypoints().then((data) => {
      name = data.source === 'live' ? 'NASA/JPL, registro de manejos (en vivo)' : `NASA/JPL, registro de manejos (copia del ${copyDate(data.updated)})`;
      return data.points.filter((p) => p.final);
    }));

  return {
    get name() {
      return name;
    },
    url: WAYPOINTS_URL,
    objects: [
      telemetryObject('percy', 'distance', 'Distancia recorrida', 'km', 'km'),
      telemetryObject('percy', 'elevation', 'Altura del terreno', 'm', 'm'),
      telemetryObject('percy', 'tilt', 'Inclinación', '°', 'deg'),
    ],
    supportsRequest: (obj) => obj.identifier.key in FIELDS,
    async request(obj) {
      const pick = FIELDS[obj.identifier.key];
      return (await load()).map((p) => ({ sol: p.sol, value: pick(p) }));
    },
  };
}

// Distancia Tierra–Marte a la velocidad de la luz, calculada con las órbitas.
export function lightTimeProvider() {
  const obj = telemetryObject('percy', 'lightTime', 'Tiempo de luz Tierra–Marte', 's', 'duration');
  const sample = (ms) => ({ sol: missionSol(ms), value: lightTimeSeconds(ms) });
  return {
    name: 'Cálculo en vivo con las órbitas de JPL',
    objects: [obj],
    supportsRequest: (o) => o === obj,
    supportsSubscribe: (o) => o === obj,
    async request() {
      // Un punto por sol desde el aterrizaje, más el instante actual.
      const now = Date.now();
      const series = [];
      for (let sol = 0; solToMs(sol) < now; sol++) series.push(sample(solToMs(sol)));
      series.push(sample(now));
      return series;
    },
    subscribe(o, callback) {
      const id = setInterval(() => callback(sample(Date.now())), 1000);
      return () => clearInterval(id);
    },
  };
}
