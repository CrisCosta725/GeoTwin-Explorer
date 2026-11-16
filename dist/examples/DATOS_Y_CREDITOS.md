# Datos, procedencia y créditos

## Datos integrados

El contexto terrestre muestra una imagen NASA local de 10 × 10 km y, por separado, Google Maps en modo satélite, centrado en la coordenada del catálogo y con acercamiento inicial aproximado de 1 km de ancho. La imagen NASA permanece visible si Google no carga y puede utilizarse sin conexión; su fecha y resolución se indican en la ficha. Google se presenta como un mapa incrustado, con sus controles y atribuciones, sin descargar ni almacenar sus teselas, y requiere conexión. Las fechas, resolución y cobertura dependen del lugar; ninguna de las imágenes determina dimensiones ni precisión de los perfiles. El encuadre del mapa varía con el ancho del visor y el nivel de zoom. [Google Maps: mapas incrustados](https://developers.google.com/maps/faq#mapswithoutapi).

Las imágenes NASA de la tabla se mantienen como respaldo local de 10 × 10 km dentro del desplegable «Imagen NASA sin conexión».

| Recurso | Uso en GeoTwin | Fuente |
| --- | --- | --- |
| NASA JPL · NASADEM HGT v001 | Dos perfiles locales de 10 km para cada uno de 16 sitios terrestres, incluidos los ocho de Perú. Malla nominal ~30 m, referencia vertical EGM96, remuestreo bilineal a 31,25 m. | [NASA Earthdata / DOI](https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001) |
| PGC · ArcticDEM mosaico v3.0 | Perfiles de Haughton, Askja y Utqiaġvik. Malla de 32 m; alturas respecto al elipsoide WGS84. | [ArcticDEM](https://www.pgc.umn.edu/data/arcticdem/), [DOI v3](https://doi.org/10.7910/DVN/OHHUKH) |
| PGC · REMA mosaico v2.0 | Perfiles de McMurdo. Malla de 32 m; alturas respecto al elipsoide WGS84. | [REMA](https://www.pgc.umn.edu/data/rema/), [DOI v2](https://doi.org/10.7910/DVN/EBW8UC) |
| NASA GIBS · Landsat WELD | Imágenes históricas en color natural, encuadre de 10 × 10 km para 19 sitios. Capa anual solicitada con fecha GIBS 2000-12-01; no corresponde a una fotografía actual ni a una sola adquisición. | [NASA Worldview](https://worldview.earthdata.nasa.gov/?l=Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual), [guía GWELD](https://lpdaac.usgs.gov/documents/2014/GWELD_User_Guide_V31.pdf) |
| NASA GIBS · MODIS Terra | Imagen de contexto de McMurdo solicitada para 2024-01-15. Resolución regional; las nubes pueden ocultar el terreno. | [NASA GIBS](https://www.earthdata.nasa.gov/data/tools/gibs) |
| NASA LRO · LOLA LDEM_16 | Transectos lunares regionales. Paso nominal ~1,9 km y radio lunar de referencia 1737,4 km. No resuelve bloques ni paredes de cráteres pequeños. | [NASA PDS · LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) |
| NASA MGS · MOLA | Relieve global y perfiles regionales de Marte; consultar la resolución indicada en el visor. | [NASA PDS · MOLA](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) |
| NOAA ETOPO, derivado local | Textura hipsométrica y batimétrica global terrestre, paso 5 minutos de arco (~9,3 km norte–sur). La versión original exacta requiere trazabilidad adicional; no se presenta como ETOPO 2022 de 15 segundos. | [Procedencia original](https://www.ncei.noaa.gov/products/etopo-global-relief-model) |
| NASA Blue Marble, NASA SVS/LRO y NASA/JPL Viking | Imágenes de presentación y textura lunar. | [Blue Marble](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/), [LRO/SVS](https://svs.gsfc.nasa.gov/4720/), [Marte](https://science.nasa.gov/3d-resources/mars/) |

## Recurso de consulta

[NASA Earthdata Search](https://search.earthdata.nasa.gov/search?lat=9.483263807983967&long=-36.80023005098189&zoom=2.6038155321900227) permite descubrir y seleccionar conjuntos por región, fecha y variable.

Los recortes NASADEM se obtuvieron de la [copia pública de Planetary Computer](https://planetarycomputer.microsoft.com/dataset/nasadem). Los identificadores, URL y SHA-256 de los recortes se conservan en assets/earth-profiles.js. Las imágenes incluyen capa, fecha solicitada, extensión geográfica, URL y SHA-256 en assets/earth-imagery.js. El registro assets/earth-relief-provenance.json describe la textura global terrestre.

Las cotas del catálogo corresponden a la coordenada del marcador, no necesariamente a la cima, fondo o altitud representativa de toda la zona. Se mantienen por separado las dos cotas aportadas con referencia vertical por confirmar. Las demás cotas terrestres se interpolan en el centro de los transectos NASADEM, ArcticDEM o REMA; conservan las referencias verticales indicadas en la tabla. Las lunares se interpolaron bilinealmente a partir de [LOLA LDEM_16 V3.1](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.lbl), malla de 16 píxeles por grado, centrada en píxeles y referida a un radio de 1737,4 km. El archivo LDEM_16.IMG usado tiene SHA-256 `a511e40d7a3ea3275945b4da2a1df377133264fab0be94b7434b1cf8907254cb`. Las cotas marcianas se muestrean de la malla MOLA incluida, referida al areoide. Son aproximaciones de modelos con distintas resoluciones y referencias; no son directamente comparables ni sustituyen levantamientos de campo.

NASADEM no cubre McMurdo, Haughton, Askja ni Utqiaġvik: sus perfiles utilizan REMA o ArcticDEM en su lugar. Los identificadores y URL de las teselas empleadas están en `assets/polar-profiles.js`. Se consultó el catálogo STAC oficial y se leyeron las ventanas necesarias de los GeoTIFF, proyectadas a EPSG:3031 o EPSG:3413 e interpoladas bilinealmente, incluso entre teselas. Son dos transectos de 10 km, con 320 muestras cada uno, aproximados mediante latitud y longitud. Los modelos estereoscópicos representan la superficie, que puede incluir nieve, hielo y otros objetos; la malla no indica precisión vertical y las alturas elipsoidales no son equivalentes a EGM96. Los perfiles se distribuyen localmente para uso sin conexión.

Los perfiles y fotografías complementan el estudio; no certifican origen de impacto, mineralogía, hielo subsuperficial, seguridad de aterrizaje ni idoneidad de una base. El sombreado y los colores del globo son representaciones visuales, sin desplazamiento geométrico de la esfera.

## Estudio y catálogo

Las ubicaciones, dimensiones y clasificaciones de la matriz lunar, las prioridades marcianas y las justificaciones comparativas proceden de la información aportada por el usuario, incluido el documento «Cuadro comparativo de los análogos terrestres». No se presentan como verificación independiente. Las fuentes regionales se conservan en los registros del catálogo y en ZONAS_Y_UBICACIONES.md. Las cotas aportadas pueden usar una referencia vertical distinta de NASADEM.

## Licencias

- ArcticDEM v3.0 y REMA v2.0: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) según el catálogo STAC de PGC. DEM creados por Polar Geospatial Center a partir de imágenes de Vantor. ArcticDEM: DEM proporcionados por Polar Geospatial Center con apoyo NSF-OPP 1043681, 1559691, 1542736, 1810976 y 2129685. REMA: DEM proporcionados por Byrd Polar and Climate Research Center y Polar Geospatial Center con apoyo NSF-OPP 1043681, 1542736, 1543501, 1559691, 1810976 y 2129685. Apoyo geoespacial de Polar Geospatial Center bajo NSF-OPP 1043681, 1559691, 2129685 y 2434541. Véase la [política de reconocimiento](https://www.pgc.umn.edu/guides/user-services/acknowledgement-policy/).
- DM Sans y Space Grotesk: SIL Open Font License. Avisos en assets/dm-sans-OFL.txt y assets/space-grotesk-OFL.txt.
- Three.js: MIT. Aviso en assets/three.LICENSE.txt.
- Las dependencias del generador NASADEM y sus licencias se registran en `scripts/package-lock.json` y en sus paquetes. No se incluyen en la carga del navegador.
- Los datos y publicaciones conservan sus condiciones de origen; esta documentación no concede derechos adicionales sobre fuentes ajenas.
