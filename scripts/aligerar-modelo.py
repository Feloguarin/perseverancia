"""Quita del .glb las texturas de respaldo (JPEG/PNG) y deja solo las WebP.

El modelo original trae cada textura dos veces: en WebP (extensión EXT_texture_webp) y una copia
JPEG/PNG para navegadores sin WebP. Hoy todos los navegadores con WebGL 2 leen WebP, así que las
copias solo pesan: unos 2,9 MB de 5 MB. No cambia geometría, nombres de piezas ni materiales.

Uso: python scripts/aligerar-modelo.py entrada.glb salida.glb
"""
import json
import struct
import sys

EXT = "EXT_texture_webp"
src, dst = sys.argv[1], sys.argv[2]
data = open(src, "rb").read()
magic, version, _ = struct.unpack("<4sII", data[:12])
assert magic == b"glTF" and version == 2, "no es un GLB 2.0"
json_len, json_type = struct.unpack("<I4s", data[12:20])
assert json_type == b"JSON"
gltf = json.loads(data[20 : 20 + json_len])
bin_start = 20 + json_len
bin_len, bin_type = struct.unpack("<I4s", data[bin_start : bin_start + 8])
assert bin_type == b"BIN\x00"
blob = data[bin_start + 8 : bin_start + 8 + bin_len]

textures, images, views = gltf["textures"], gltf["images"], gltf["bufferViews"]
webp = {t["extensions"][EXT]["source"] for t in textures if EXT in t.get("extensions", {})}
fallback = {t["source"] for t in textures if EXT in t.get("extensions", {}) and "source" in t}
needed_plain = {t["source"] for t in textures if EXT not in t.get("extensions", {}) and "source" in t}
drop_images = fallback - webp - needed_plain
assert drop_images, "este modelo no tiene texturas de respaldo que quitar"
drop_views = {images[i]["bufferView"] for i in drop_images}

# Reconstruye el binario solo con lo que queda, alineado a 4 bytes.
out = bytearray()
view_map = {}
new_views = []
for old, v in enumerate(views):
    if old in drop_views:
        continue
    while len(out) % 4:
        out.append(0)
    start = v.get("byteOffset", 0)
    nv = dict(v, byteOffset=len(out))
    out += blob[start : start + v["byteLength"]]
    view_map[old] = len(new_views)
    new_views.append(nv)
while len(out) % 4:
    out.append(0)

image_map = {}
new_images = []
for old, im in enumerate(images):
    if old in drop_images:
        continue
    image_map[old] = len(new_images)
    new_images.append(dict(im, bufferView=view_map[im["bufferView"]]))
for t in textures:
    if EXT in t.get("extensions", {}):
        t["extensions"][EXT]["source"] = image_map[t["extensions"][EXT]["source"]]
        t.pop("source", None)  # sin respaldo: la extensión pasa a ser obligatoria
    elif "source" in t:
        t["source"] = image_map[t["source"]]
for a in gltf.get("accessors", []):
    if "bufferView" in a:
        a["bufferView"] = view_map[a["bufferView"]]
    for part in ("indices", "values"):
        if "sparse" in a:
            a["sparse"][part]["bufferView"] = view_map[a["sparse"][part]["bufferView"]]
for m in gltf["meshes"]:
    for p in m["primitives"]:
        d = p.get("extensions", {}).get("KHR_draco_mesh_compression")
        if d:
            d["bufferView"] = view_map[d["bufferView"]]

gltf["images"], gltf["bufferViews"] = new_images, new_views
gltf["buffers"][0]["byteLength"] = len(out)
required = gltf.setdefault("extensionsRequired", [])
if EXT not in required:
    required.append(EXT)

js = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
js += b" " * (-len(js) % 4)
total = 12 + 8 + len(js) + 8 + len(out)
with open(dst, "wb") as f:
    f.write(struct.pack("<4sII", b"glTF", 2, total))
    f.write(struct.pack("<I4s", len(js), b"JSON"))
    f.write(js)
    f.write(struct.pack("<I4s", len(out), b"BIN\x00"))
    f.write(out)
print(f"{len(data) / 1e6:.2f} MB -> {total / 1e6:.2f} MB ({len(drop_images)} texturas de respaldo menos, quedan {len(new_images)} WebP)")
