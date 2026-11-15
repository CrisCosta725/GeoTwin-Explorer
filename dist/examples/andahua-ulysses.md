# Andahua–Orcopampa ↔ Ulysses Colles

Evaluar si el relieve regional de un campo volcánico peruano ofrece un terreno útil para practicar cartografía de paisajes con conos y coladas, con Ulysses Colles como referencia marciana.

La analogía propuesta estudia formas asociadas al volcanismo y su relación espacial con las coladas. Las fuentes no establecen que la composición o la historia eruptiva de los dos campos sean iguales.

Comparación geomorfológica regional. El centro terrestre representa el campo volcánico; la ventana cuadrada no es el contorno de un cono ni una ruta de campo validada.

Método: geotwin-sensibilidad-2. Ventana: 20 km. Paso común: 500 m.
Las pendientes están en grados; el relieve y la rugosidad, en metros. La fracción bajo el umbral está en porcentaje.

| Sitio | Pendiente mediana | P90 | Relieve P90−P10 | Rugosidad | Bajo umbral (%) | DEM (m) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ulysses Colles | 2.030 | 4.484 | 182.005 | 13.443 | 99.563 | 200 |
| Andahua–Orcopampa | 9.334 | 23.506 | 1194.477 | 64.407 | 60.625 | 90 |
| Huambo · Cerro Keyocc | 10.542 | 26.433 | 1288.956 | 69.940 | 57.313 | 90 |
| Mauna Kea · conos documentados | 11.457 | 17.518 | 1639.927 | 83.736 | 53.750 | 100 |
| Atacama · control de procedimiento | 2.821 | 9.865 | 291.488 | 20.470 | 94.313 | 90 |

Ningún candidato cumple los mínimos de cobertura, pendiente y evidencia exigidos en este escenario.

## Protocolo y resultado

Comparar una ventana de 20 × 20 km en cada mundo a paso común. Revisar cobertura, pendiente mediana, P90 y relieve; contrastar el candidato con Huambo y dos controles. Cambiar escala y umbral antes de elegir.

Fracción de celdas con pendiente ≤ 12°: 60.625 %. No cumple los mínimos del escenario regional.
Los umbrales de 80 % de cobertura y 75 % bajo la pendiente límite son supuestos de demostración; no requisitos validados de un vehículo.

Resultado del DEM regional; no es una prueba de conducción ni un ensayo de campo.

## Cartografía geológica peruana

- Andahua–Orcopampa: 100.00 % cartografiado; 148.836 km² del Grupo Andagua (Qp-an).
- Huambo · Cerro Keyocc: 99.97 % cartografiado; 79.175 km² del Grupo Andagua (Qp-an).
Mapa regional de unidades litológicas. No son contornos individuales de conos ni el mapa 1:50 000 de Mariño y Zavala (2010). La fecha de consulta no es la fecha de publicación de cada hoja.
La cobertura usa unión e intersección de polígonos. La clasificación regional no delimita conos; no interviene en el orden por pendiente.

## Límites y comprobaciones pendientes

- Falta comprobar el rasgo en una parcela concreta, documentar su escala y distinguir la evidencia regional de las mediciones locales.
- La gravedad y la presión atmosférica marcianas difieren de las terrestres. Cambian la dinámica de vehículos, partículas y procesos volcánicos.
- El clima terrestre no reproduce conjuntamente la atmósfera tenue, la temperatura y la radiación de Marte. La aridez o el permafrost son analogías de rasgos concretos.
- Una forma semejante no confirma composición, edad, agua disponible ni habitabilidad. Las bioseñales y los recursos requieren evidencia independiente.
- Delimitar e interpretar cada cono y su cráter con imágenes; medirlos en el comparador individual a resolución suficiente
- Composición y mineralogía comparables
- Edad, erosión y secuencia de emplazamiento
- Temperatura, polvo, iluminación y condiciones del subsuelo
- Acceso y comprobación de campo para un ensayo real

La resolución nominal y el paso de muestreo delimitan la escala del resultado. La incertidumbre vertical y cartográfica no se ha propagado; diferencias pequeñas pueden no ser significativas.

## Fuentes

- [INGEMMET · Mariño y Zavala (2010), cartografiado de Andahua–Orcopampa](https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf). Conos de ceniza y escoria, coladas y composición variable en el campo terrestre. El mapa publicado es 1:50 000; sus polígonos no están digitalizados en esta comparación.
- [INGEMMET · GEOCATMIN, Geología 100K empalmados](https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_MAPAS_GEOLOGICOS/MapServer/11). Polígonos oficiales regionales, códigos de unidad, litología y hojas. Recortes incluidos para Andahua y Huambo a 1:100 000, distintos del mapa 1:50 000 de la publicación de 2010.
- [Smithsonian GVP · Andahua–Orcopampa, 354004](https://volcano.si.edu/volcano.cfm?vn=354004). Coordenada regional de referencia del campo terrestre.
- [NASA Earth Observatory · Scoria Cones on Earth and Mars (2026)](https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/). Contexto e interpretación volcánica de Ulysses Colles. Su comparación terrestre publicada es con Arizona; el par peruano es una hipótesis de GeoTwin.
- DEM planetario: https://fdp.astrogeology.usgs.gov/fdp/mars/
- DEM terrestre: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- DEM terrestre: https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer

Recalcular: npm run examples. Verificación de referencias científicas: 2026-11-14.
