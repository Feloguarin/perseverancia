// Tiempo en Marte y posición de los planetas, sin librerías.
// Referencias: Allison & McEwen (2000) para el tiempo marciano y los elementos
// orbitales aproximados de JPL (Standish, válidos 1800–2050) para las órbitas.

const MS_PER_DAY = 86400000;
const TT_MINUS_UTC_S = 69.184; // 37 s intercalares + 32.184 s
const JEZERO_LON_E = 77.45;
// Sol 0 de Perseverance: día marciano del aterrizaje (18 feb 2021) en Jezero.
const SOL0_MSD = 52304;

const julianTT = (ms) => ms / MS_PER_DAY + 2440587.5 + TT_MINUS_UTC_S / 86400;

// Sol de la misión con decimales: la parte entera es el sol, la fracción la hora local.
export function missionSol(ms = Date.now()) {
  const msd = (julianTT(ms) - 2405522.0028779) / 1.0274912517;
  return msd + JEZERO_LON_E / 360 - SOL0_MSD;
}

export function solToMs(sol) {
  const msd = sol - JEZERO_LON_E / 360 + SOL0_MSD;
  const jdTT = msd * 1.0274912517 + 2405522.0028779;
  return (jdTT - 2440587.5 - TT_MINUS_UTC_S / 86400) * MS_PER_DAY;
}

// [a (UA), e, I, L, ϖ, Ω] y su cambio por siglo.
const ELEMENTS = {
  earth: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ],
};

const RAD = Math.PI / 180;

function heliocentric(planet, T) {
  const [base, rate] = ELEMENTS[planet];
  const [a, e, I, L, wBar, node] = base.map((v, i) => v + rate[i] * T);
  const w = (wBar - node) * RAD, O = node * RAD, inc = I * RAD;
  let M = ((L - wBar) % 360) * RAD;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x1 = a * (Math.cos(E) - e);
  const y1 = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(inc), si = Math.sin(inc);
  return [
    (cw * cO - sw * sO * ci) * x1 + (-sw * cO - cw * sO * ci) * y1,
    (cw * sO + sw * cO * ci) * x1 + (-sw * sO + cw * cO * ci) * y1,
    sw * si * x1 + cw * si * y1,
  ];
}

const AU_KM = 149597870.7;
const C_KM_S = 299792.458;

// Segundos que tarda la luz (o una orden por radio) en ir de la Tierra a Marte.
export function lightTimeSeconds(ms = Date.now()) {
  const T = (julianTT(ms) - 2451545) / 36525;
  const e = heliocentric('earth', T);
  const m = heliocentric('mars', T);
  return (Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]) * AU_KM) / C_KM_S;
}
