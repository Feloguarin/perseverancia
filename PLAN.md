# Plan: Paisaje de Marte con Vite + Three.js

## Context
Carpeta vacía. Queremos un paisaje marciano cinematográfico (dunas, rocas, cielo caramelo con polvo, sol de tarde cálido con sombras suaves, Fobos y Deimos), visible en vivo en el navegador de Cursor lo antes posible, y un `npm run check` para autoverificación con capturas.

## Paso 0 — Guardar este plan
- Copiar este plan tal cual a `/Users/felipeguarin/Desktop/perseverancia/PLAN.md` (primera acción tras aprobar).

## Paso 1 — Algo visible en <2 min
- `package.json` a mano (sin scaffolder interactivo): deps `three`, devDeps `vite`, `playwright-core` (no descarga navegadores).
- `index.html` + `src/main.js` mínimo: terreno con ruido, luz direccional cálida, fog color caramelo, cielo de color.
- `npm install` y `npx vite --host --port 5173` en background → decir la URL `http://localhost:5173`.

## Paso 2 — Mejoras (archivos en `src/`)
- `terrain.js`: PlaneGeometry grande, dunas con simplex noise (fBm + crestas direccionales), colores por vértice óxido/ocre.
- `rocks.js`: InstancedMesh de Icosaedros deformados con ruido, dispersos, sombras.
- `sky.js`: esfera con shader: gradiente caramelo→rosado al horizonte, halo azulado alrededor del sol (atardecer marciano real), disco solar.
- `moons.js`: Fobos (más grande, irregular) y Deimos (pequeño) como esferas deformadas, iluminadas, en el cielo.
- `dust.js`: partículas de polvo flotando + `FogExp2` caramelo.
- Iluminación: DirectionalLight baja y cálida con PCFSoftShadowMap, HemisphereLight tenue, ACESFilmic tone mapping, sRGB.
- OrbitControls con cámara baja tipo cine; leve animación.

## Paso 3 — `npm run check`
- `scripts/check.mjs` con `playwright-core`: `chromium.launch({ channel: 'chrome', headless: true, args:['--use-angle=metal','--enable-webgl'] })`.
- Abre `http://localhost:5173`, recolecta `console` errors + `pageerror`, espera ~3 s, guarda `screenshots/check.png`, imprime errores y sale con código ≠0 si hay.

## Verificación
Tras cada mejora grande: `npm run check`, leer `screenshots/check.png` con Read, corregir. Máximo 3 rondas. Listo cuando 0 errores y la captura muestra dunas, rocas, cielo caramelo con polvo, sol cálido con sombras y las dos lunas.
