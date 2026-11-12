// Lo último de la NASA: lo último que la NASA publicó de cada cámara, pedido en el momento
// a su servicio público de imágenes crudas de Mars 2020.
//
// Las fotos de photos.js están escogidas a mano; estas no las ha mirado nadie. Solo pasan un
// filtro por sus datos (a color, tamaño completo y apuntando al suelo, no al cielo), así que
// alguna puede salir rara: por eso el visor las marca como «lo último de la NASA», sin revisar.
const API = 'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2&num=100&page=0&order=sol+desc&search=';
const MAX = 8;

const dims = (img) => (/\((\d+),(\d+)\)/.exec(img.extended?.dimension ?? '') ?? []).slice(1).map(Number);
const elevation = (img) => Number(img.extended?.mastEl);

// Qué pide cada cámara y qué se descarta, aprendido mirando ~250 fotos de octubre de 2026.
const RULES = {
  mastcam: {
    search: 'MCZ_LEFT',
    // 1648×1200 es el cuadro completo: las tarjetas de calibración (1264) y el cielo (1600) vienen recortados.
    ok: (img, [w, h]) => /RGB/.test(img.camera?.filter_name ?? '') && w === 1648 && h === 1200 && elevation(img) < 0,
  },
  navcam: {
    search: 'NAVCAM_LEFT',
    // NLF: izquierda, a color. Con el mástil hacia arriba solo hay cielo o el sol.
    ok: (img, [w, h]) => img.imageid.startsWith('NLF') && w >= 1200 && h >= 900 && elevation(img) < 0,
  },
  hazcam: {
    search: 'FRONT_HAZCAM_LEFT_A',
    ok: (img, [w, h]) => img.imageid.startsWith('FLF') && w >= 1200 && h >= 900,
  },
  watson: {
    search: 'SHERLOC_WATSON',
    // Mirando casi recto hacia abajo está sobre una roca; más levantada, mira al propio rover.
    ok: (img, [w, h]) => img.imageid.startsWith('SIF') && w >= 1584 && h >= 1184 && elevation(img) < -50,
  },
};

const toPhoto = (img) => ({
  id: img.imageid,
  instrument: img.camera?.instrument,
  sol: img.sol,
  takenUtc: `${String(img.date_taken_utc).replace(/Z$/, '')}Z`,
  url: img.image_files.large,
  link: img.link,
  credit: img.credit,
  site: Number(img.site),
  drive: Number(img.drive),
  live: true,
  note: 'De lo último que publicó la NASA. Selección automática: nadie la ha revisado todavía.',
});

const cache = new Map();

// Hasta 8 fotos nuevas de esa cámara, de la más reciente a la más antigua, sin repetir las que
// ya están (`known`) ni tomas casi iguales. Si la NASA no responde, devuelve una lista vacía.
export function latestPhotos(cameraKey, known = []) {
  if (cache.has(cameraKey)) return cache.get(cameraKey);
  const rule = RULES[cameraKey];
  if (!rule) return Promise.resolve([]);
  const skip = new Set(known);
  const promise = fetch(`${API}%7C${rule.search}%7C`, { signal: AbortSignal.timeout(9000) })
    .then((r) => {
      if (!r.ok) throw new Error(`la NASA respondió ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const seen = new Set();
      const out = [];
      for (const img of data.images ?? []) {
        if (out.length >= MAX) break;
        if (img.sample_type !== 'Full' || skip.has(img.imageid) || !img.image_files?.large) continue;
        if (!rule.ok(img, dims(img))) continue;
        // Una por secuencia y dirección: las ráfagas y los pares de mosaico se parecen demasiado.
        const seq = /(ZCAM|NCAM|FHAZ|SRLC|SCAM)\d+/.exec(img.imageid)?.[0] ?? img.imageid;
        const shot = `${img.sol}|${seq}|${Math.round(Number(img.extended?.mastAz) / 5)}`;
        if (seen.has(shot)) continue;
        seen.add(shot);
        out.push(toPhoto(img));
      }
      return out;
    })
    .catch((err) => {
      console.info(`[cámaras] Sin fotos recién llegadas de ${cameraKey}: ${err.message}`);
      cache.delete(cameraKey); // que se pueda volver a intentar al abrir la cámara otra vez
      return [];
    });
  cache.set(cameraKey, promise);
  return promise;
}
