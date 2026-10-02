import { PHOTOS } from '../cameras/photos.js';

// Rocas reales que marcaron la misión de astrobiología de Perseverance en el cráter Jezero.
// Fuentes: NASA/JPL (comunicados de prensa de 2021 a 2025), Nature (10 sep 2025) y Planetary Society.
//   Roubion: primer intento de muestra (ago 2021); la roca se hizo polvo y el tubo guardó aire de Marte.
//   Rochette: basalto con sales; de ella salieron las primeras muestras (Montdenier y Montagnac, sep 2021).
//   Wildcat Ridge: lodolita de un lago salado; SHERLOC detectó los orgánicos más abundantes hasta 2022.
//   Bunsen Peak: ~75 % granos de carbonato cementados con sílice; muestra n.º 24 (mar 2024).
//   Cheyava Falls: "manchas de leopardo" con carbono orgánico, hierro, fósforo y azufre; muestra
//   n.º 25, "Sapphire Canyon" (jul 2024). En sep 2025 la NASA la presentó como posible biofirma.

// look: cómo se pinta la roca. value: puntos científicos si su muestra llega a la Tierra.
export const TARGETS = [
  {
    key: 'roubion',
    name: 'Roubion',
    where: 'Suelo del cráter',
    look: 'crumbly',
    size: [1.25, 0.62, 0.95],
    value: 5,
    supercam: {
      type: 'Roca muy gastada',
      text: 'Una roca del suelo del cráter, muy gastada y quebradiza.',
    },
    contact: {
      text: 'El raspado deja ver una roca blanda y muy alterada: se desmorona bajo la broca.',
      hint: 'Ojo: una roca tan blanda puede romperse al perforarla.',
    },
    sample: {
      crumbles: true,
      text: 'La roca se hizo polvo y no quedó en el tubo. El tubo guardó aire de Marte. Le pasó lo mismo al rover real en su primer intento, en agosto de 2021.',
    },
  },
  {
    key: 'rochette',
    name: 'Rochette',
    where: 'Suelo del cráter',
    look: 'basalt',
    size: [1.2, 0.7, 1.0],
    value: 40,
    supercam: {
      type: 'Basalto',
      text: 'Roca volcánica: viene de antiguos flujos de lava que llenaron el cráter.',
    },
    contact: {
      text: 'Hay minerales de sal dentro de la roca: el agua pasó por aquí y pudo dejar burbujas de agua antigua atrapadas.',
      hint: 'Buena muestra para saber cuánto tiempo hubo agua.',
    },
    sample: {
      text: 'Muestra sellada. De esta roca salieron las primeras muestras de la misión, en septiembre de 2021.',
    },
  },
  {
    key: 'wildcat',
    name: 'Wildcat Ridge',
    where: 'Delta del antiguo río',
    look: 'layered',
    size: [1.1, 0.66, 0.9],
    value: 75,
    supercam: {
      type: 'Lodolita',
      text: 'Roca de grano muy fino: lodo y arena que se asentaron en el fondo de un lago.',
    },
    contact: {
      text: 'SHERLOC detecta muchas moléculas orgánicas, las más abundantes de la misión hasta 2022, junto a sales de sulfato: el lago era salado y se fue secando.',
      hint: 'Los orgánicos son ingredientes de la vida, aunque no prueban que la hubo.',
    },
    sample: {
      text: 'Muestra sellada. Estas capas de lodo se formaron donde la vida pudo haber prosperado.',
    },
  },
  {
    key: 'bunsen',
    name: 'Bunsen Peak',
    where: 'Antigua orilla del lago',
    look: 'carbonate',
    size: [1.05, 0.72, 0.95],
    value: 80,
    supercam: {
      type: 'Carbonato',
      text: 'Rica en carbonatos: minerales que se forman dentro del agua.',
    },
    contact: {
      text: 'Cerca del 75 % son granos de carbonato pegados con sílice casi pura. Estos minerales son excelentes para guardar huellas de vida microscópica.',
      hint: 'Una de las mejores rocas para buscar biofirmas en la Tierra.',
    },
    sample: {
      text: 'Muestra sellada. El rover real la tomó en marzo de 2024: fue su muestra número 24.',
    },
  },
  {
    key: 'cheyava',
    name: 'Cheyava Falls',
    where: 'Cauce del valle Neretva',
    look: 'leopard',
    size: [1.3, 0.62, 0.8],
    value: 120,
    biosignature: true,
    supercam: {
      type: 'Lodolita con vetas',
      text: 'Roca rojiza con vetas blancas de sulfato de calcio: el agua corrió por sus grietas.',
    },
    contact: {
      text: 'SHERLOC encuentra carbono orgánico. PIXL ve "manchas de leopardo": anillos de hierro y fosfato. En la Tierra, patrones así suelen dejarlos microbios que se alimentan de materia orgánica.',
      hint: 'Es una posible biofirma: también podría explicarse sin vida. Por eso hay que traerla a la Tierra.',
    },
    sample: {
      text: 'Muestra sellada: "Sapphire Canyon", la número 25 del rover real (julio de 2024). En 2025 la NASA la presentó como la señal más clara de posible vida antigua hasta ahora.',
    },
  },
];

export const TUBES = 4; // el rover real lleva 43 tubos; aquí tienes 4 y hay que escoger

// Puntos: cada muestra vale más si antes la documentaste, como hace el equipo real.
export function scoreOf(t, s) {
  if (!s.sampled) return 0;
  if (s.crumbled) return t.value;
  return Math.round(t.value * (1 + (s.analyzed ? 0.25 : 0) + (s.abraded ? 0.25 : 0)));
}
export const MAX_SCORE = [...TARGETS]
  .sort((a, b) => b.value - a.value)
  .slice(0, TUBES)
  .reduce((sum, t) => sum + scoreOf(t, { sampled: true, analyzed: true, abraded: true }), 0);

// Fotos reales de WATSON (del visor de cámaras) para mostrar qué deja cada paso en una roca de verdad.
const watson = (sol) => PHOTOS.watson.find((p) => p.sol === sol).url;
export const REAL_PATCH = { url: watson(1970), caption: 'Un parche raspado real, de 5 cm (WATSON, sol 1970)' };
export const REAL_CORE = { url: watson(1977), caption: 'El agujero real que deja una muestra (WATSON, sol 1977)' };
