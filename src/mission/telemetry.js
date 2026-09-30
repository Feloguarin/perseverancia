// Mini versión del patrón de telemetría de Open MCT.
// Cada dato es un objeto de dominio que describe sus valores (nombre, unidad y
// cuál es el eje de tiempo); un proveedor aparte sabe traer el historial
// (request) y, si puede, avisar de valores nuevos (subscribe). La vista solo
// habla con esta API, nunca con la fuente directamente.
export class TelemetryAPI {
  #objects = [];
  #providers = [];

  addProvider(provider) {
    this.#providers.push(provider);
    for (const obj of provider.objects ?? []) this.#objects.push(obj);
  }

  getObjects() {
    return [...this.#objects];
  }

  getProvider(obj) {
    return this.#providers.find((p) => p.supportsRequest(obj));
  }

  // Metadatos del valor con hint "domain" (tiempo) y del valor con hint "range" (el dato).
  getMetadata(obj) {
    const values = obj.telemetry.values;
    return {
      domain: values.find((v) => v.hints?.domain),
      range: values.find((v) => v.hints?.range),
    };
  }

  request(obj, options = {}) {
    const provider = this.getProvider(obj);
    if (!provider) return Promise.reject(new Error(`Sin proveedor para ${obj.identifier.key}`));
    return provider.request(obj, options);
  }

  subscribe(obj, callback) {
    const provider = this.#providers.find((p) => p.supportsSubscribe?.(obj));
    return provider ? provider.subscribe(obj, callback) : () => {};
  }
}

// Atajo para declarar un dato con dominio "sol" y un rango con su unidad.
export function telemetryObject(namespace, key, name, unit, format) {
  return {
    identifier: { namespace, key },
    name,
    type: 'percy.telemetry',
    telemetry: {
      values: [
        { key: 'sol', name: 'Sol de la misión', format: 'sol', hints: { domain: 1 } },
        { key: 'value', name, unit, format, hints: { range: 1 } },
      ],
    },
  };
}
