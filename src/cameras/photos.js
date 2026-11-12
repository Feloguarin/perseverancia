// Fotos reales de Perseverance, escogidas a mano del feed de imágenes crudas de la NASA:
// https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2
// Criterio: a color, tamaño completo y que se sienta Marte (horizonte, el brazo sobre
// el suelo, rocas de cerca). Sin cielo vacío, sol, calibración ni miniaturas.
// Revisadas el 11 nov 2026: lo más reciente del feed era el sol 2024 (30 oct 2026).
// La primera de cada cámara es la que se revela al hacer clic.
// site y drive dicen dónde estaba el rover (ver mission/waypoints.js): con eso se dibuja «¿Dónde se tomó?».
export const PHOTOS = {
  "mastcam": [
    {
      "id": "ZL0_2022_0846443512_035EBY_N0920000ZCAM10056_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T07:37:56.151Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/zcam/ZL0_2022_0846443512_035EBY_N0920000ZCAM10056_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2022_0846443512_035EBY_N0920000ZCAM10056_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 92,
      "drive": 0,
      "note": "Una roca oscura frente a peñascos claros, sobre arena ondulada."
    },
    {
      "id": "ZL0_2023_0846534114_973EBY_N0930000ZCAM04499_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 2023,
      "takenUtc": "2026-10-29T08:47:15.869Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/zcam/ZL0_2023_0846534114_973EBY_N0930000ZCAM04499_1100LMJ02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2023_0846534114_973EBY_N0930000ZCAM04499_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 93,
      "drive": 0,
      "note": "Un peñasco claro y agrietado, con su sombra sobre la arena."
    },
    {
      "id": "ZL0_2022_0846443668_928EBY_N0920000ZCAM04497_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T07:39:49.151Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/zcam/ZL0_2022_0846443668_928EBY_N0920000ZCAM04497_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2022_0846443668_928EBY_N0920000ZCAM04497_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 92,
      "drive": 0,
      "note": "El agujero de una perforación y el polvo claro que dejó sobre la roca."
    },
    {
      "id": "ZL0_2023_0846533066_473EBY_N0930000ZCAM10057_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 2023,
      "takenUtc": "2026-10-29T08:30:28.870Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/zcam/ZL0_2023_0846533066_473EBY_N0930000ZCAM10057_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2023_0846533066_473EBY_N0930000ZCAM10057_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 93,
      "drive": 0,
      "note": "Rocas claras y oscuras repartidas por la arena."
    },
    {
      "id": "ZL0_2021_0846355945_724EBY_N0920000ZCAM10055_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 2021,
      "takenUtc": "2026-10-27T07:17:43.451Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02021/ids/edr/browse/zcam/ZL0_2021_0846355945_724EBY_N0920000ZCAM10055_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_2021_0846355945_724EBY_N0920000ZCAM10055_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 92,
      "drive": 0,
      "note": "Un parche circular que Percy raspó en la roca."
    },
    {
      "id": "ZR0_2020_0846263474_193EBY_N0920000ZCAM10053_0480LMJ",
      "instrument": "MCZ_RIGHT",
      "sol": 2020,
      "takenUtc": "2026-10-26T05:36:43.726Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02020/ids/edr/browse/zcam/ZR0_2020_0846263474_193EBY_N0920000ZCAM10053_0480LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZR0_2020_0846263474_193EBY_N0920000ZCAM10053_0480LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "site": 92,
      "drive": 0,
      "note": "Un campo de piedras sueltas sobre la arena rojiza."
    }
  ],
  "navcam": [
    {
      "id": "NLF_2023_0846548592_316ECM_N0930000NCAM00347_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2023,
      "takenUtc": "2026-10-29T12:48:30.042Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/ncam/NLF_2023_0846548592_316ECM_N0930000NCAM00347_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2023_0846548592_316ECM_N0930000NCAM00347_01_195J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "El brazo robótico extendido sobre el suelo de Marte."
    },
    {
      "id": "NLF_2022_0846456110_237ECM_N0930000NCAM02022_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T11:07:05.389Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846456110_237ECM_N0930000NCAM02022_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846456110_237ECM_N0930000NCAM02022_01_195J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "La cubierta del rover y, al fondo, una colina."
    },
    {
      "id": "NLF_2022_0846455714_722ECM_N0930000NCAM13022_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T11:00:30.791Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846455714_722ECM_N0930000NCAM13022_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846455714_722ECM_N0930000NCAM13022_01_195J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Una colina pedregosa contra el cielo polvoriento."
    },
    {
      "id": "NLF_2023_0846548592_316ECM_N0930000NCAM00347_04_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2023,
      "takenUtc": "2026-10-29T12:48:30.042Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/ncam/NLF_2023_0846548592_316ECM_N0930000NCAM00347_04_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2023_0846548592_316ECM_N0930000NCAM00347_04_195J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "La sombra de Percy, con el mástil y su cabeza, sobre el suelo."
    },
    {
      "id": "NLF_2022_0846446041_223ECM_N0920130NCAM00301_01_295J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T08:19:16.843Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846446041_223ECM_N0920130NCAM00301_01_295J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846446041_223ECM_N0920130NCAM00301_01_295J",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 130,
      "note": "Una loma cercana; abajo asoma parte del rover."
    },
    {
      "id": "NLF_2022_0846447080_692ECM_N0930000NCAM00709_01_090J",
      "instrument": "NAVCAM_LEFT",
      "sol": 2022,
      "takenUtc": "2026-10-28T08:36:35.783Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/ncam/NLF_2022_0846447080_692ECM_N0930000NCAM00709_01_090J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_2022_0846447080_692ECM_N0930000NCAM00709_01_090J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Rocas claras sobre arena oscura."
    }
  ],
  "hazcam": [
    {
      "id": "FLF_2019_0846185639_601ECM_N0920000FHAZ00206_01_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2019,
      "takenUtc": "2026-10-25T07:59:12.971Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02019/ids/edr/browse/fcam/FLF_2019_0846185639_601ECM_N0920000FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2019_0846185639_601ECM_N0920000FHAZ00206_01_295J",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "La torreta del brazo sobre una roca clara, con una colina al fondo."
    },
    {
      "id": "FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2023,
      "takenUtc": "2026-10-29T13:07:42.945Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/fcam/FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2023_0846549745_302ECM_N0930000FHAZ00206_01_295J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "El brazo en alto, una rueda a la izquierda y una colina en el horizonte."
    },
    {
      "id": "FLF_2022_0846447347_237ECM_N0930000FHAZ02008_01_090J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2022,
      "takenUtc": "2026-10-28T08:41:02.463Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02022/ids/edr/browse/fcam/FLF_2022_0846447347_237ECM_N0930000FHAZ02008_01_090J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2022_0846447347_237ECM_N0930000FHAZ02008_01_090J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Una roca clara y porosa sobre la arena."
    },
    {
      "id": "FLF_2018_0846088540_363ECM_N0920000FHAZ00203_19_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2018,
      "takenUtc": "2026-10-24T05:00:52.879Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02018/ids/edr/browse/fcam/FLF_2018_0846088540_363ECM_N0920000FHAZ00203_19_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2018_0846088540_363ECM_N0920000FHAZ00203_19_295J",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "El brazo trabajando sobre el suelo, con una colina al fondo."
    },
    {
      "id": "FLF_2017_0846008357_363ECM_N0920000FHAZ00215_04_075J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2017,
      "takenUtc": "2026-10-23T06:44:29.186Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02017/ids/edr/browse/fcam/FLF_2017_0846008357_363ECM_N0920000FHAZ00215_04_075J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2017_0846008357_363ECM_N0920000FHAZ00215_04_075J",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "El brazo de cerca, sobre una laja de roca clara."
    },
    {
      "id": "FLF_2023_0846549166_489ECM_N0930000FHAZ02008_01_095J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 2023,
      "takenUtc": "2026-10-29T12:58:03.886Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/fcam/FLF_2023_0846549166_489ECM_N0930000FHAZ02008_01_095J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_2023_0846549166_489ECM_N0930000FHAZ02008_01_095J",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Una roca llena de huecos, a la sombra del rover."
    }
  ],
  "watson": [
    {
      "id": "SIF_2023_0846549693_785EBY_N0930000SRLC02503_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2023,
      "takenUtc": "2026-10-29T13:06:52.005Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/shrlc/SIF_2023_0846549693_785EBY_N0930000SRLC02503_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2023_0846549693_785EBY_N0930000SRLC02503_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Una roca clara llena de poros, vista desde arriba."
    },
    {
      "id": "SIF_2023_0846549834_703EBY_N0930000SRLC00630_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2023,
      "takenUtc": "2026-10-29T13:09:13.992Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02023/ids/edr/browse/shrlc/SIF_2023_0846549834_703EBY_N0930000SRLC00630_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2023_0846549834_703EBY_N0930000SRLC00630_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 93,
      "drive": 0,
      "note": "Los poros de esa roca, como con lupa."
    },
    {
      "id": "SIF_2019_0846185735_851EBY_N0920000SRLC00878_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2019,
      "takenUtc": "2026-10-25T08:00:51.112Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02019/ids/edr/browse/shrlc/SIF_2019_0846185735_851EBY_N0920000SRLC00878_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2019_0846185735_851EBY_N0920000SRLC00878_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "El agujero que dejó el taladro de Percy en la roca."
    },
    {
      "id": "SIF_2019_0846185600_945EBY_N0920000SRLC02500_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2019,
      "takenUtc": "2026-10-25T07:58:37.103Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02019/ids/edr/browse/shrlc/SIF_2019_0846185600_945EBY_N0920000SRLC02500_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2019_0846185600_945EBY_N0920000SRLC02500_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "El agujero del taladro y el polvo claro alrededor."
    },
    {
      "id": "SIF_2014_0845771635_980EBY_N0920000SRLC08060_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2014,
      "takenUtc": "2026-10-20T12:59:08.819Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02014/ids/edr/browse/shrlc/SIF_2014_0845771635_980EBY_N0920000SRLC08060_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2014_0845771635_980EBY_N0920000SRLC08060_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "Un parche raspado: se ven los granos minerales de la roca."
    },
    {
      "id": "SIF_2014_0845734133_789EBY_N0920000SRLC04001_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 2014,
      "takenUtc": "2026-10-20T02:34:06.507Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/02014/ids/edr/browse/shrlc/SIF_2014_0845734133_789EBY_N0920000SRLC04001_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_2014_0845734133_789EBY_N0920000SRLC04001_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "site": 92,
      "drive": 0,
      "note": "La superficie de una roca anaranjada, de muy cerca."
    }
  ]
};
