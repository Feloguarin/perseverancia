import { telemetryObject } from './telemetry.js';
import { lightTimeSeconds, missionSol, solToMs } from './marsTime.js';

const WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';

// Historial de manejos de la NASA: una localización por punto del recorrido.
// Solo usamos las de fin de manejo ("final: y"); las intermedias reinician la distancia.
export function waypointsProvider() {
  const FIELDS = {
    distance: (p) => p.dist_total_m / 1000,
    elevation: (p) => p.elev_geoid,
    tilt: (p) => p.tilt,
  };
  let drives;
  const load = () =>
    (drives ??= fetch(WAYPOINTS_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`NASA respondió ${r.status}`);
        return r.json();
      })
      .then((json) => json.features.map((f) => f.properties).filter((p) => p.final === 'y')));

  return {
    name: 'NASA/JPL, registro de manejos',
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
