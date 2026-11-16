# Datos, procedencia y créditos

## Inventario de datos incluidos

| Conjunto | Uso y alcance | Referencia |
| --- | --- | --- |
| NASA JPL · NASADEM HGT v001 | Perfiles de elevación locales integrados en 16 sitios terrestres, incluidos los ocho de Perú. Malla nominal ~30 m; referencia vertical EGM96. | [NASA Earthdata / DOI](https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001) |
| Copernicus GLO-90/GLO-30 | Recortes terrestres; el lector elige el recorte que cubre toda la ventana. Es un modelo de superficie y puede incluir vegetación e infraestructura. | [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) |
| NASA LOLA y MOLA; USGS HRSC–MOLA y CTX | Altimetría lunar y marciana global y regional. El índice registra proyección, resolución nominal y recortes. | [LOLA](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/), [MOLA](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html), [USGS Marte](https://fdp.astrogeology.usgs.gov/fdp/mars/) |
| NASA Earthdata Search | Recurso de consulta para descubrir y seleccionar observaciones terrestres por región, fecha y variable. El enlace abre el buscador; no selecciona una colección ni descarga un modelo de elevación. | [NASA Earthdata Search](https://search.earthdata.nasa.gov/search?lat=9.483263807983967&long=-36.80023005098189&zoom=2.6038155321900227) |
| USGS 3DEP | Recorte de Hawaiʻi remuestreado a 100 m para los casos preparados. | [Servicio 3DEP](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) |
| USGS OFR 2007-1089 | Polígonos geológicos de Hawaiʻi, escala 1:250 000. No cubren Perú. | [Publicación](https://doi.org/10.3133/ofr20071089), [capa](https://geodata.hawaii.gov/arcgis/rest/services/Terrestrial/MapServer/28) |
| INGEMMET · GEOCATMIN, Geología 100K empalmados | 902 entidades recortadas a Andahua y Huambo, escala 1:100 000, EPSG:4326. Incluye identificadores, códigos, unidades, litologías y hojas originales. | [Servicio oficial, capa 11](https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_MAPAS_GEOLOGICOS/MapServer/11) |
| Natural Earth | Máscara de tierra y lagos a 1:50 millones. Limita el cribado regional, no sustituye un levantamiento local. | [Natural Earth](https://www.naturalearthdata.com/downloads/50m-physical-vectors/) |
| Smithsonian GVP | Registros georreferenciados de volcanes; un punto no representa toda la extensión de un depósito. | [GVP](https://volcano.si.edu/) |
| Köppen–Geiger, Beck et al. | Clasificación terrestre 1980–2016, derivado a 0,083°. | [Publicación](https://doi.org/10.1038/sdata.2018.214) |
| NSIDC/ILAMB | Clasificación circunártica de permafrost, derivado de aproximadamente 0,25°. No mide directamente hielo somero. | [NSIDC](https://nsidc.org/data/ggd318/versions/2), [ILAMB](https://www.ilamb.org/datasets.html) |
| Texturas planetarias | Mosaicos para orientar la exploración visual; su iluminación es ilustrativa. | [NASA Blue Marble](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/), [LRO/SVS](https://svs.gsfc.nasa.gov/4720/), [Marte/Viking](https://science.nasa.gov/3d-resources/mars/) |

El manifiesto `assets/relief-data/index.json` enumera 164 archivos de elevación global y local. El recorte adicional `hawaii-3dep.json` declara su propio archivo. Las resoluciones nominales no equivalen al error vertical ni a la resolución de una fotografía. La aplicación usa interpolación y registra el paso efectivo de comparación.

## Referencias del caso peruano

El [inventario de las 20 zonas y ubicaciones](ZONAS_Y_UBICACIONES.md) registra países, aplicaciones principales, coordenadas, fuentes y alcance de cada marcador. Isabella–San Juan y Sucre usan coordenadas y cotas aportadas por el usuario, conservando su origen geológico por verificar. Las nuevas referencias de La Joya, Coropuna, Cumbemayo, Nasca–Palpa, Ries y Meteor Crater se enlazan allí. Incorporar una zona al catálogo no añade automáticamente un recorte DEM de alta resolución ni valida su analogía.

- [Mariño y Zavala, INGEMMET, 2010](https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf): publicación regional. Sus polígonos a 1:50 000 no están digitalizados en el caso de GeoTwin.
- [Cartografía INGEMMET a 1:100 000](https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_MAPAS_GEOLOGICOS/MapServer/11): capa digital distinta de la publicación a 1:50 000. Consulta del 14 de noviembre de 2026. `assets/peru-geology-provenance.json` registra ventanas, consultas completas, hojas y hash SHA-256. La fecha de descarga no es una fecha de publicación de cada hoja. Se solicitó generalización máxima de 0,00001 grados al servicio y se recortaron geometrías, sin reclasificar unidades. El código Qp-an mantiene la descripción original de lavas andesíticas y basálticas; no representa contornos de conos.
- [Smithsonian GVP 354004](https://volcano.si.edu/volcano.cfm?vn=354004): referencia regional de Andahua–Orcopampa.
- [NASA, Scoria Cones on Earth and Mars, 2026](https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/): contexto de Ulysses Colles y diferencias de proceso. No constituye una validación del par peruano.

Fuentes científicas del caso revisadas el 14 de noviembre de 2026. Las fichas individuales conservan referencias adicionales. Se distingue publicación, observación regional y propuesta de GeoTwin.

## Servicios externos opcionales

La imagen detallada puede proceder de Esri World Imagery o NASA Trek. Las elevaciones terrestres adicionales pueden proceder de [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/). Estos servicios requieren conexión y mantienen sus propias condiciones de uso. Los casos preparados se calculan con los archivos locales.

## Atribuciones de Copernicus

Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.

Produced using Copernicus WorldDEM-90 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.

## Componentes y licencias

- DM Sans y Space Grotesk: SIL Open Font License; los textos están en `assets/dm-sans-OFL.txt` y `assets/space-grotesk-OFL.txt`.
- polygon-clipping: licencia MIT. Se incluye su aviso en `assets/vendor/polygon-clipping-LICENSE.md`. [Proyecto y licencia](https://github.com/mfogel/polygon-clipping).
- Entorno de pruebas: jsdom 26.1.0, licencia MIT, con versiones fijadas en `package-lock.json`. Se usa solo en Node.js para las pruebas DOM; no se carga en la aplicación del navegador. [Proyecto](https://github.com/jsdom/jsdom).
- Los datos y publicaciones mantienen sus condiciones de origen. Este inventario y los avisos no conceden una licencia nueva sobre fuentes ajenas. Conserva las atribuciones y consulta la referencia original al reutilizar cada conjunto.

## Relieve principal de la Tierra

Los perfiles locales NASADEM se encuentran en `assets/earth-profiles.js` y se muestran en las observaciones de cada sitio terrestre. Se generaron con `scripts/build-earth-profiles.mjs` mediante recortes GeoTIFF de la copia pública de NASADEM en Planetary Computer, remuestreo bilineal y máscara de validez. Para regenerarlos desde la raíz del repositorio, instala las dependencias con `npm ci --prefix scripts` y ejecuta `node scripts/build-earth-profiles.mjs` con Node.js 18 o posterior. Se conservan el identificador de tesela, URL y SHA-256 de cada recorte. Las teselas contiguas se combinan cuando el transecto cruza sus límites. Los perfiles no sustituyen la textura global ni incorporan batimetría. La resolución nominal no certifica precisión vertical, detección de bloques o seguridad operacional.

Fuente: NASA JPL (2020), NASADEM Merged DEM Global 1 arc second V001, NASA LP DAAC. [DOI](https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001), [distribución pública](https://planetarycomputer.microsoft.com/dataset/nasadem). Dos transectos de 10 km por sitio, malla nominal de 1 segundo de arco (~30 m), muestreo de 31,25 m y alturas EGM96. Dieciséis sitios cubiertos; McMurdo, Haughton, Askja y Utqiaġvik están fuera de cobertura.

El globo terrestre usa por defecto una representación de elevación y batimetría derivada de una malla NOAA ETOPO incluida previamente, con paso de 5 minutos de arco (aproximadamente 9,3 km en dirección norte-sur). El color hipsométrico y el sombreado son una visualización sobre la esfera; no hay desplazamiento geométrico ni resolución de ingeniería. No se atribuye a esta malla la resolución de ETOPO 2022 de 15 segundos.

Recurso de consulta: [NASA Earthdata Search](https://search.earthdata.nasa.gov/search?lat=9.483263807983967&long=-36.80023005098189&zoom=2.6038155321900227). Este portal sustituye al enlace de NOAA en la lista de recursos. NASADEM HGT v001 está integrado en los perfiles locales; la textura global conserva la procedencia descrita a continuación.

Procedencia técnica del relieve instalado: [NOAA NCEI · ETOPO Global Relief Model](https://www.ncei.noaa.gov/products/etopo-global-relief-model). El registro local `assets/earth-relief-provenance.json` conserva las dimensiones, paso y procedencia de la malla utilizada. La versión exacta del producto original del derivado local requiere trazabilidad adicional antes de asignar un DOI de versión concreto.
