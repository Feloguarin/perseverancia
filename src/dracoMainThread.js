import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// DRACOLoader decodifica en Web Workers. En algunos navegadores integrados (el de Cursor, por ejemplo)
// el worker nunca responde y la carga se queda colgada sin error. Este cargador hace lo mismo que el
// worker de three.js, pero en la página: tarda un poco más en armar el modelo, y funciona en todos lados.
export class MainThreadDRACOLoader extends DRACOLoader {
  decodeGeometry(buffer, taskConfig) {
    return this._mainThreadDecoder().then((draco) => {
      const decoder = new draco.Decoder();
      try {
        return this._createGeometry(decodeGeometry(draco, decoder, new Int8Array(buffer), taskConfig));
      } finally {
        draco.destroy(decoder);
      }
    });
  }

  _mainThreadDecoder() {
    this._decoderPending ??= Promise.all([
      this._loadLibrary('draco_wasm_wrapper.js', 'text'),
      this._loadLibrary('draco_decoder.wasm', 'arraybuffer'),
    ]).then(
      ([wrapper, wasmBinary]) =>
        new Promise((resolve) => {
          // El envoltorio de Emscripten declara DracoDecoderModule; lo evaluamos aislado para no ensuciar window.
          const DracoDecoderModule = new Function(`${wrapper}\nreturn DracoDecoderModule;`)();
          // El módulo es "thenable": lo envolvemos para que la promesa no intente resolverlo de nuevo.
          DracoDecoderModule({ wasmBinary, onModuleLoaded: (draco) => resolve({ draco }) });
        }),
    );
    return this._decoderPending.then(({ draco }) => draco);
  }

  dispose() {
    this._decoderPending = null;
    return super.dispose();
  }
}

// Lo que sigue es la decodificación del worker de three.js (DRACOLoader.js, MIT), igual pero en la página.
function decodeGeometry(draco, decoder, array, taskConfig) {
  const { attributeIDs, attributeTypes } = taskConfig;
  const geometryType = decoder.GetEncodedGeometryType(array);
  let dracoGeometry, status;
  if (geometryType === draco.TRIANGULAR_MESH) {
    dracoGeometry = new draco.Mesh();
    status = decoder.DecodeArrayToMesh(array, array.byteLength, dracoGeometry);
  } else if (geometryType === draco.POINT_CLOUD) {
    dracoGeometry = new draco.PointCloud();
    status = decoder.DecodeArrayToPointCloud(array, array.byteLength, dracoGeometry);
  } else {
    throw new Error('Draco: tipo de geometría inesperado.');
  }
  if (!status.ok() || dracoGeometry.ptr === 0) throw new Error(`Draco: no se pudo decodificar: ${status.error_msg()}`);

  const geometry = { index: null, attributes: [] };
  for (const name in attributeIDs) {
    const type = globalThis[attributeTypes[name]];
    let attribute;
    if (taskConfig.useUniqueIDs) {
      attribute = decoder.GetAttributeByUniqueId(dracoGeometry, attributeIDs[name]);
    } else {
      const id = decoder.GetAttributeId(dracoGeometry, draco[attributeIDs[name]]);
      if (id === -1) continue;
      attribute = decoder.GetAttribute(dracoGeometry, id);
    }
    const result = decodeAttribute(draco, decoder, dracoGeometry, name, type, attribute);
    if (name === 'color') result.vertexColorSpace = taskConfig.vertexColorSpace;
    geometry.attributes.push(result);
  }
  if (geometryType === draco.TRIANGULAR_MESH) geometry.index = decodeIndex(draco, decoder, dracoGeometry);
  draco.destroy(dracoGeometry);
  return geometry;
}

function decodeIndex(draco, decoder, dracoGeometry) {
  const count = dracoGeometry.num_faces() * 3;
  const byteLength = count * 4;
  const ptr = draco._malloc(byteLength);
  decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
  const array = new Uint32Array(draco.HEAPF32.buffer, ptr, count).slice();
  draco._free(ptr);
  return { array, itemSize: 1 };
}

function decodeAttribute(draco, decoder, dracoGeometry, name, type, attribute) {
  const itemSize = attribute.num_components();
  const count = dracoGeometry.num_points() * itemSize;
  const byteLength = count * type.BYTES_PER_ELEMENT;
  const ptr = draco._malloc(byteLength);
  decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dracoType(draco, type), byteLength, ptr);
  const array = new type(draco.HEAPF32.buffer, ptr, count).slice();
  draco._free(ptr);
  return { name, array, itemSize };
}

function dracoType(draco, type) {
  switch (type) {
    case Float32Array: return draco.DT_FLOAT32;
    case Int8Array: return draco.DT_INT8;
    case Int16Array: return draco.DT_INT16;
    case Int32Array: return draco.DT_INT32;
    case Uint8Array: return draco.DT_UINT8;
    case Uint16Array: return draco.DT_UINT16;
    case Uint32Array: return draco.DT_UINT32;
  }
}
