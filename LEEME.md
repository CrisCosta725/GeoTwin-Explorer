# GeoTwin Explorer v24 · uso local

Atlas de Tierra, Luna y Marte para proponer y caracterizar analogías de rasgos concretos. Incluye el catálogo actualizado de 20 zonas terrestres, con 8 de Perú, país y aplicación principal, comparación topográfica, polígonos, transectos, morfometría de conos, geología peruana, planes de ensayo, sensibilidad y proyectos portables.

## Abrir en Windows

1. Extrae todo el ZIP y conserva juntos el lanzador y la carpeta `dist`.
2. Haz doble clic en **Iniciar_GeoTwin.bat**. El lanzador utiliza **Node.js 18+** si está instalado, o **Python 3.10+** como alternativa. No necesita descargar paquetes.
3. Se abre **http://127.0.0.1:8000/**. Mantén la consola abierta; Ctrl+C cierra el servidor.

Si el puerto está ocupado por GeoTwin, utiliza el enlace existente. Para otro puerto ejecuta `Iniciar_GeoTwin.bat --puerto 8001`. El guardado del navegador depende de la dirección y el puerto. Para trasladar el trabajo utiliza **Descargar proyecto completo** y **Abrir proyecto GeoTwin**.

Desde una terminal también puedes ejecutar:

```text
node iniciar_geotwin.mjs
node iniciar_geotwin.mjs --puerto 8001 --sin-abrir
python iniciar_geotwin.py
```

En macOS/Linux puedes usar Node.js o `python3 iniciar_geotwin.py`. Abre la aplicación por HTTP con un navegador actualizado compatible con WebGL y módulos JavaScript, como Chrome o Edge.

## Demostración preparada

Al iniciar aparece una portada animada de **GeoTwin Explorer** con Tierra, Luna y Marte al fondo, una descripción breve y referencias de las texturas de NASA/JPL. **Explorar el atlas**, **Omitir introducción** o **Esc** abren la aplicación; la portada no vuelve a mostrarse en esa pestaña después de cerrarla. Respeta la preferencia del sistema para reducir movimiento.

El atlas abre en la vista conjunta de **Tierra, Luna y Marte**, con la Tierra como eje central de comparación. La exploración ocurre directamente en esta escena: pulsa un planeta para acercarlo dentro del mismo visor, conservando los otros dos visibles. Arrastra su esfera para girarla, pulsa la superficie para seleccionar un punto o elige una región del catálogo. Los puntos se muestran en la cara visible; la selección libre también tiene un marcador. Al inspeccionar, el giro automático se pausa. **Activar giro** permite reanudarlo y **Vista conjunta** recupera el encuadre general. Las flechas, **+**, **−** e **Inicio** actúan sobre el mundo activo; **Restablecer vistas** afecta a las tres cámaras. Se respeta la preferencia de reducir movimiento. El giro es ilustrativo y no representa períodos astronómicos. No hay un área de estudio seleccionada al inicio.

Pulsa **Ampliar** para ver el globo activo en una ventana grande. El **visor de relieve** conserva su propio botón **Ampliar**, con cotas, perfil, realce vertical y cambio a imagen. Cierra con **Cerrar**, **Reducir** o **Esc**. Los proyectos conservan el mundo, las cámaras, la preferencia de giro, las regiones y los planes. Ampliar una imagen no cambia la resolución del DEM.

En **Comparar → Caso Perú**, pulsa **Calcular caso con datos incluidos**. Se contrasta Andahua–Orcopampa con Ulysses Colles, Huambo y dos controles. Se muestran fuentes, indicadores, escala y limitaciones. Las fichas JSON, CSV y Markdown están disponibles para descargar antes y después de recalcular.

En **Sensibilidad de la elección** hay tres casos: Perú–Marte, Marius Hills–Hawaiʻi y Ulysses Colles–Hawaiʻi. Se prueban ventanas de 5, 10 y 20 km y pendientes límite de 5°, 12° y 20°. Los márgenes de decisión permiten declarar equivalencias. No representan incertidumbre instrumental ni confianza estadística.

Consulta **[la guía de demostración](dist/examples/GUIA_DEMO.md)**, **[las 20 zonas y sus ubicaciones](dist/examples/ZONAS_Y_UBICACIONES.md)** y **[el inventario de datos y créditos](dist/examples/DATOS_Y_CREDITOS.md)**.

## Conos individuales y geología peruana

El delimitador carga el mapa de relieve al seleccionar un área, aunque accedas desplazándote por la página. Mientras se carga, muestra un mensaje sobre el mapa. Si la carga falla, **Volver a cargar mapa** permite reintentarlo sin borrar los vértices dibujados. La capa inicial es elevación calculada a partir del DEM.

En **Comparar → Comparar conos individuales**, selecciona los polígonos de base y cráter que hayas dibujado y medido en el atlas. Usa **Nuevo polígono** para conservar cada contorno por separado y asígnale un nombre. El cráter es opcional y debe quedar dentro de su base. Puedes medir una sola forma o comparar Tierra con Luna/Marte.

Se calculan diámetro equivalente y máximo, altura sobre un plano de base, profundidad bajo un plano del borde del cráter, cociente altura/diámetro y pendientes mediana y P90 de los flancos. Se registra el paso común, la cobertura y la fuente del DEM. Si el tamaño o la cobertura no alcanzan los mínimos, altura, profundidad y pendiente quedan sin datos. Los contornos no identifican automáticamente un cono; requieren interpretación de imágenes y geología. El JSON conserva geometrías, definiciones y límites.

En **Comparar → Cartografía geológica de Perú**, calcula las unidades de una ventana preparada o de un polígono terrestre guardado. La capa oficial de **INGEMMET, Geología 100K empalmados** incluye 902 entidades recortadas a Andahua y Huambo, con códigos, litologías, hojas y procedencia. **Ver capa en el atlas** muestra las unidades; **Descargar intersección GeoJSON** exporta los polígonos recortados y sus atributos originales. La cobertura usa la unión de polígonos y respeta huecos. La presencia de Grupo Andagua no demuestra conos ni equivalencia mineralógica con Marte.

## Interpretar los resultados

- El índice temático cuenta coincidencias de etiquetas por grupo. El respaldo cuenta rasgos solicitados con evidencia local o regional. Un rasgo sin registro queda pendiente: no se afirma su ausencia.
- La pendiente, el relieve y la rugosidad dependen del modelo y del paso de muestreo. La comparación regional no permite aprobar una ruta, un alunizaje o el acceso a una cavidad.
- El caso peruano propone una hipótesis geomorfológica. Las fuentes documentan los campos volcánicos, pero no validan de forma independiente el par Andahua–Ulysses. Su composición, historia y condiciones físicas requieren comparación específica.
- Los planes de ensayo distinguen medición pendiente, dato regional calculado y observación aportada por el usuario. Un criterio numérico alcanzado no valida por sí solo el ensayo ni la analogía.
- Isabella–Chotén y Sucre tienen marcadores con las coordenadas aportadas por el usuario y cotas de 3664 m y 3189 m, respectivamente. Se mantienen el datum, la referencia vertical, los contornos y los orígenes geológicos por verificar. No se les atribuyen materiales de impacto ni puntuaciones de similitud sin evidencia. Las cotas aportadas no sustituyen el DEM.
- Al abrir un proyecto de un sitio retirado del catálogo, se conserva su ubicación como punto del proyecto anterior. No se vuelve a incorporar el sitio al catálogo activo ni a la selección de pilotos.

## Guardado y conectividad

En **Área piloto → Guardar y exportar** puedes guardar en el navegador o descargar un proyecto `.geotwin.json`. Para trasladarlo, abre GeoTwin en otro navegador y selecciona el archivo en **Abrir proyecto GeoTwin**. El proyecto recupera referencia, selección y pilotos, biblioteca de polígonos, transectos, contornos en edición, fuentes aportadas, resultados, sensibilidad, conos, intersecciones geológicas y planes de ensayo. También conserva el caso calculado. Abrir reemplaza la sesión de trabajo; descarga primero el proyecto actual si quieres conservar ambos. Los archivos incompatibles o inválidos se rechazan; el límite es 24 MB. El proyecto requiere la misma distribución de GeoTwin con sus datos incluidos.

Los tres casos preparados, la cartografía peruana y las mediciones dentro de los recortes DEM usan datos incluidos. El servidor local debe seguir activo. La imagen satelital detallada y algunas elevaciones terrestres fuera de los recortes requieren Internet. La cartografía digital cubre Hawaiʻi y dos recortes de Perú; no implica cobertura geológica mundial.

## Comprobaciones reproducibles

Con Node.js 18+ instalado:

```text
npm ci --ignore-scripts
npm test
npm run examples
npm run catalog
```

La instalación de dependencias se necesita solo para desarrollar y ejecutar las pruebas de integración; el lanzador y la aplicación siguen funcionando sin paquetes adicionales. Las versiones de prueba quedan fijadas en `package-lock.json`.

Las pruebas cubren evidencia, equivalencias, criterios de misión, cálculo sin conexión, exportaciones, servidor, lanzador y archivos referenciados. Incluyen conos sintéticos de geometría conocida, pendientes de base, falta de resolución, topología de cráteres, cobertura geológica sin duplicación y verificación del hash de las entidades oficiales. El recorrido DOM abre un proyecto en un navegador vacío y recupera geometrías, fuentes, resultados y planes; también rechaza archivos inválidos sin perder el trabajo. Las pruebas de las esferas comprueban píxeles calculados con una textura sintética: silueta, iluminación, giro, ajuste al contenedor y pausa interactiva. El DOM no verifica la apariencia ni el dibujo nativo del navegador. `npm run examples` regenera los ejemplos desde los datos empaquetados.

Para actualizar los datos oficiales con conexión: `node scripts/build-peru-geology.mjs`. Si Node no reconoce la cadena de certificados de Windows, Node 22.19+ permite `node --use-system-ca scripts/build-peru-geology.mjs`. El proceso comprueba los identificadores de cada consulta y genera el recorte, las consultas originales y el hash SHA-256 en `dist/assets/peru-geology-provenance.json`. Una actualización de la fuente puede cambiar los resultados: regenera los ejemplos y ejecuta las pruebas.

El servidor escucha solo en `127.0.0.1` y sirve únicamente `dist`. El archivo `VERIFICACION.md` describe el alcance de las comprobaciones y lo que necesita revisión visual o científica adicional.
