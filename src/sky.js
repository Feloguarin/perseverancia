import * as THREE from 'three';

// Colores en espacio lineal (el mismo que usa la niebla, para que el horizonte se funda).
export const HORIZON = new THREE.Color().setRGB(0.72, 0.37, 0.16);
export const ZENITH = new THREE.Color().setRGB(0.3, 0.12, 0.045);

export function createSky(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sunDir: { value: sunDir.clone().normalize() },
      horizon: { value: HORIZON },
      zenith: { value: ZENITH },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // siempre en el plano lejano
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      uniform vec3 horizon;
      uniform vec3 zenith;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.45));
        // Banda de polvo más densa y clara justo sobre el horizonte.
        col = mix(col, horizon * 1.08, exp(-abs(h) * 18.0) * 0.6);
        if (h < 0.0) col = mix(horizon, horizon * 0.8, clamp(-h * 6.0, 0.0, 1.0));

        float s = max(dot(d, sunDir), 0.0);
        // Resplandor cálido amplio por dispersión en el polvo.
        col += vec3(1.0, 0.5, 0.2) * pow(s, 6.0) * 0.4;
        // Halo azulado cercano al sol (típico del atardecer marciano).
        col = mix(col, vec3(0.55, 0.66, 0.82), pow(s, 110.0) * 0.5);
        col += vec3(1.0, 0.9, 0.75) * pow(s, 800.0) * 1.2;
        // Disco solar (más pequeño que en la Tierra).
        col += vec3(1.0, 0.96, 0.88) * smoothstep(0.99985, 0.99992, s) * 8.0;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 32), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
