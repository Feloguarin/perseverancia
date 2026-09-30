// Fotos reales de Perseverance, escogidas a mano del feed de imágenes crudas de la NASA:
// https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2
// Criterio: a color, tamaño completo y que se sienta Marte (horizonte, el brazo sobre
// el suelo, rocas de cerca). Sin cielo vacío, sol, calibración ni miniaturas.
// Revisadas el 30 sep 2026 (sol 1995). La primera de cada cámara es la que se revela al hacer clic.
export const PHOTOS = {
  "mastcam": [
    {
      "id": "ZL0_1987_0843336271_943EBY_N0910970ZCAM04474_0340LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 1987,
      "takenUtc": "2026-09-22T08:29:27.450Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01987/ids/edr/browse/zcam/ZL0_1987_0843336271_943EBY_N0910970ZCAM04474_0340LMJ02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_1987_0843336271_943EBY_N0910970ZCAM04474_0340LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "Una loma cubierta de piedras sueltas, hasta el horizonte."
    },
    {
      "id": "ZL0_1982_0842891165_943EBY_N0910970ZCAM04471_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 1982,
      "takenUtc": "2026-09-17T04:51:44.914Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01982/ids/edr/browse/zcam/ZL0_1982_0842891165_943EBY_N0910970ZCAM04471_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_1982_0842891165_943EBY_N0910970ZCAM04471_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "Rocas gastadas por el viento, medio enterradas en la arena."
    },
    {
      "id": "ZL0_1994_0843971312_184EBY_N0910970ZCAM05066_0340LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 1994,
      "takenUtc": "2026-09-29T16:54:02.494Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01994/ids/edr/browse/zcam/ZL0_1994_0843971312_184EBY_N0910970ZCAM05066_0340LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_1994_0843971312_184EBY_N0910970ZCAM05066_0340LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "La torreta del brazo, con sus brocas, sobre el suelo marciano."
    },
    {
      "id": "ZL0_1990_0843603729_303EBY_N0910970ZCAM10024_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 1990,
      "takenUtc": "2026-09-25T10:47:12.579Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01990/ids/edr/browse/zcam/ZL0_1990_0843603729_303EBY_N0910970ZCAM10024_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_1990_0843603729_303EBY_N0910970ZCAM10024_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "Las huellas de las ruedas de Percy en la arena."
    },
    {
      "id": "ZL0_1990_0843604547_303EBY_N0910970ZCAM10024_1100LMJ",
      "instrument": "MCZ_LEFT",
      "sol": 1990,
      "takenUtc": "2026-09-25T11:00:55.584Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01990/ids/edr/browse/zcam/ZL0_1990_0843604547_303EBY_N0910970ZCAM10024_1100LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZL0_1990_0843604547_303EBY_N0910970ZCAM10024_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "Una roca partida, rodeada de piedras pequeñas."
    },
    {
      "id": "ZR0_1990_0843603903_303EBY_N0910970ZCAM10024_1100LMJ",
      "instrument": "MCZ_RIGHT",
      "sol": 1990,
      "takenUtc": "2026-09-25T10:50:06.576Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01990/ids/edr/browse/zcam/ZR0_1990_0843603903_303EBY_N0910970ZCAM10024_1100LMJ03_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/ZR0_1990_0843603903_303EBY_N0910970ZCAM10024_1100LMJ",
      "credit": "NASA/JPL-Caltech/ASU",
      "note": "Rocas quebradizas junto a las huellas del rover."
    }
  ],
  "navcam": [
    {
      "id": "NLF_1982_0842893617_566ECM_N0910970NCAM00347_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1982,
      "takenUtc": "2026-09-17T05:31:44.704Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01982/ids/edr/browse/ncam/NLF_1982_0842893617_566ECM_N0910970NCAM00347_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1982_0842893617_566ECM_N0910970NCAM00347_01_195J",
      "credit": "NASA/JPL-Caltech",
      "note": "El brazo robótico extendido sobre el terreno."
    },
    {
      "id": "NLF_1980_0842717874_659ECM_N0910970NCAM15980_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1980,
      "takenUtc": "2026-09-15T04:42:40.322Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01980/ids/edr/browse/ncam/NLF_1980_0842717874_659ECM_N0910970NCAM15980_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1980_0842717874_659ECM_N0910970NCAM15980_01_195J",
      "credit": "NASA/JPL-Caltech",
      "note": "Un cerro en el horizonte y rocas sueltas en la llanura."
    },
    {
      "id": "NLF_1980_0842717790_784ECM_N0910970NCAM15980_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1980,
      "takenUtc": "2026-09-15T04:41:16.145Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01980/ids/edr/browse/ncam/NLF_1980_0842717790_784ECM_N0910970NCAM15980_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1980_0842717790_784ECM_N0910970NCAM15980_01_195J",
      "credit": "NASA/JPL-Caltech",
      "note": "Colinas lejanas bajo el cielo polvoriento."
    },
    {
      "id": "NLF_1982_0842894223_441ECM_N0910970NCAM00709_03_095J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1982,
      "takenUtc": "2026-09-17T05:41:50.670Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01982/ids/edr/browse/ncam/NLF_1982_0842894223_441ECM_N0910970NCAM00709_03_095J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1982_0842894223_441ECM_N0910970NCAM00709_03_095J",
      "credit": "NASA/JPL-Caltech",
      "note": "Una rueda de Percy y la sombra del brazo sobre el suelo."
    },
    {
      "id": "NLF_1980_0842716746_566ECM_N0910970NCAM03980_01_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1980,
      "takenUtc": "2026-09-15T04:23:51.718Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01980/ids/edr/browse/ncam/NLF_1980_0842716746_566ECM_N0910970NCAM03980_01_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1980_0842716746_566ECM_N0910970NCAM03980_01_195J",
      "credit": "NASA/JPL-Caltech",
      "note": "La cubierta del rover frente a una loma rocosa."
    },
    {
      "id": "NLF_1980_0842717010_566ECM_N0910970NCAM03980_07_195J",
      "instrument": "NAVCAM_LEFT",
      "sol": 1980,
      "takenUtc": "2026-09-15T04:28:16.314Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01980/ids/edr/browse/ncam/NLF_1980_0842717010_566ECM_N0910970NCAM03980_07_195J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/NLF_1980_0842717010_566ECM_N0910970NCAM03980_07_195J",
      "credit": "NASA/JPL-Caltech",
      "note": "Las huellas de Percy cruzando la llanura."
    }
  ],
  "hazcam": [
    {
      "id": "FLF_1994_0843973092_505ECM_N0910970FHAZ00206_01_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 1994,
      "takenUtc": "2026-09-29T17:23:09.350Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01994/ids/edr/browse/fcam/FLF_1994_0843973092_505ECM_N0910970FHAZ00206_01_295J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_1994_0843973092_505ECM_N0910970FHAZ00206_01_295J",
      "credit": "NASA/JPL-Caltech",
      "note": "El brazo trabajando sobre el suelo, con la rueda delantera a un lado."
    },
    {
      "id": "FLF_1975_0842282218_351ECM_N0910806FHAZ00215_04_075J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 1975,
      "takenUtc": "2026-09-10T03:41:41.381Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01975/ids/edr/browse/fcam/FLF_1975_0842282218_351ECM_N0910806FHAZ00215_04_075J01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_1975_0842282218_351ECM_N0910806FHAZ00215_04_075J",
      "credit": "NASA/JPL-Caltech",
      "note": "La punta del brazo apoyada sobre una roca grande."
    },
    {
      "id": "FLF_1992_0843777143_895ECM_N0910970FHAZ00206_01_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 1992,
      "takenUtc": "2026-09-27T10:57:18.062Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01992/ids/edr/browse/fcam/FLF_1992_0843777143_895ECM_N0910970FHAZ00206_01_295J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_1992_0843777143_895ECM_N0910970FHAZ00206_01_295J",
      "credit": "NASA/JPL-Caltech",
      "note": "El brazo y su sombra sobre un suelo lleno de huellas."
    },
    {
      "id": "FLF_1976_0842367348_066ECM_N0910806FHAZ02008_06_095J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 1976,
      "takenUtc": "2026-09-11T03:20:34.522Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01976/ids/edr/browse/fcam/FLF_1976_0842367348_066ECM_N0910806FHAZ02008_06_095J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_1976_0842367348_066ECM_N0910806FHAZ02008_06_095J",
      "credit": "NASA/JPL-Caltech",
      "note": "Una rueda de aluminio de Percy, de cerca."
    },
    {
      "id": "FLF_1989_0843522234_729ECM_N0910970FHAZ00206_01_295J",
      "instrument": "FRONT_HAZCAM_LEFT_A",
      "sol": 1989,
      "takenUtc": "2026-09-24T12:08:47.226Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01989/ids/edr/browse/fcam/FLF_1989_0843522234_729ECM_N0910970FHAZ00206_01_295J02_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/FLF_1989_0843522234_729ECM_N0910970FHAZ00206_01_295J",
      "credit": "NASA/JPL-Caltech",
      "note": "El brazo sobre el suelo, con colinas al fondo."
    }
  ],
  "watson": [
    {
      "id": "SIF_1970_0841849084_578EBY_N0910806SRLC01024_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1970,
      "takenUtc": "2026-09-05T03:22:59.630Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01970/ids/edr/browse/shrlc/SIF_1970_0841849084_578EBY_N0910806SRLC01024_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1970_0841849084_578EBY_N0910806SRLC01024_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "Un parche que Percy raspó en una roca para ver sus minerales."
    },
    {
      "id": "SIF_1977_0842463302_558EBY_N0910806SRLC02503_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1977,
      "takenUtc": "2026-09-12T05:59:49.507Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01977/ids/edr/browse/shrlc/SIF_1977_0842463302_558EBY_N0910806SRLC02503_0000LMJ03_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1977_0842463302_558EBY_N0910806SRLC02503_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "El agujero de una muestra perforada y, al lado, un parche raspado."
    },
    {
      "id": "SIF_1991_0843706154_644EBY_N0910970SRLC00345_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1991,
      "takenUtc": "2026-09-26T15:14:30.392Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01991/ids/edr/browse/shrlc/SIF_1991_0843706154_644EBY_N0910970SRLC00345_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1991_0843706154_644EBY_N0910970SRLC00345_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "Roca porosa con granos oscuros, vista como con lupa."
    },
    {
      "id": "SIF_1994_0843987360_898EBY_N0910970SRLC08060_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1994,
      "takenUtc": "2026-09-29T21:21:00.632Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01994/ids/edr/browse/shrlc/SIF_1994_0843987360_898EBY_N0910970SRLC08060_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1994_0843987360_898EBY_N0910970SRLC08060_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "Roca agrietada, vista de muy cerca."
    },
    {
      "id": "SIF_1982_0842922071_679EBY_N0910970SRLC08060_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1982,
      "takenUtc": "2026-09-17T13:26:03.160Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01982/ids/edr/browse/shrlc/SIF_1982_0842922071_679EBY_N0910970SRLC08060_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1982_0842922071_679EBY_N0910970SRLC08060_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "Granos oscuros incrustados en una roca clara."
    },
    {
      "id": "SIF_1989_0843523287_765EBY_N0910970SRLC04004_0000LMJ",
      "instrument": "SHERLOC_WATSON",
      "sol": 1989,
      "takenUtc": "2026-09-24T12:26:22.938Z",
      "url": "https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/01989/ids/edr/browse/shrlc/SIF_1989_0843523287_765EBY_N0910970SRLC04004_0000LMJ01_1200.jpg",
      "link": "https://mars.nasa.gov/mars2020/multimedia/raw-images/SIF_1989_0843523287_765EBY_N0910970SRLC04004_0000LMJ",
      "credit": "NASA/JPL-Caltech",
      "note": "El borde de una laja de roca sobre la arena."
    }
  ]
};
