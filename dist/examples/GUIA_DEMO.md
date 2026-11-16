# GeoTwin · demostración guiada

## 1. Abrir y presentar la pregunta

Abre [GeoTwin Explorer en GitHub Pages](https://criscosta725.github.io/GeoTwin-Explorer/). La introducción presenta GeoTwin Explorer con Tierra, Luna y Marte al fondo y enlaza las fuentes de sus texturas. Entra con **Explorar el atlas** o **Esc**. Después, el atlas muestra los tres mundos juntos, con la Tierra como eje central de comparación. No hay un área seleccionada al inicio. En un navegador compatible, instala la app desde **Instalar app** en el panel lateral.

La interfaz inicia en inglés. El botón **ES** de la barra superior cambia a español; al iniciar la app de nuevo, vuelve a mostrarse en inglés.

Al seleccionar una ubicación aparece el guía astronauta articulado, con una explicación en tres pasos adaptada al lugar y al idioma. Arrástralo para moverlo, usa la rueda para girarlo y púlsalo para avanzar en la explicación. Si WebGL no está disponible, se utiliza una representación simplificada.

Las tres superficies son esferas con sombreado y puntos geográficos en la cara visible. Pulsa el nombre de un planeta para acercarlo suavemente en la misma escena: los otros dos siguen visibles y el giro continúa. Arrastra para girar, pulsa una superficie para seleccionar un punto o elige una región del catálogo. La selección libre también aparece como un punto destacado. Al seleccionar una ubicación terrestre, líneas curvas enlazan el punto con sus análogos disponibles en la Luna y Marte; los demás marcadores se atenúan. Puedes seleccionar otro marcador para cambiar el análisis. Las flechas, **+**, **−** e **Inicio** controlan la esfera activa; **Restablecer orientación de las esferas** recupera las tres cámaras. **Vista conjunta** vuelve al encuadre general. La inspección, la selección y el zoom permanecen en el mismo visor. El relieve espera una región explícita.

El catálogo muestra las 20 zonas con su país y aplicación principal. Selecciona Isabella–San Juan y Sucre para revisar sus coordenadas y cotas aportadas: 3664 m y 3189 m. Ambas fichas deben indicar que el origen geológico sigue por verificar. No se deben interpretar como cráteres de impacto confirmados ni como pilotos validados.

En cada ficha terrestre, abre **Ver observaciones, fuentes y datos** para consultar el cuadro aportado de ubicación, morfometría, topografía, iluminación, temperatura, recursos, operaciones y geología. Los datos se presentan como aportados y pendientes de verificación, sin sustituir las mediciones anteriores. Para Andahua se señalan las dimensiones diferentes de los dos cuadros.
Los campos sin datos o pendientes de medición se ocultan en las fichas; los valores disponibles y sus avisos de verificación permanecen visibles.

En la sección **Comparar**, abre **Caso Perú**. La pregunta es qué rasgos del paisaje volcánico de Andahua–Orcopampa pueden servir para practicar reconocimiento cartográfico con Ulysses Colles como referencia.

Los botones **Ampliar** del globo y del visor de relieve abren una vista grande conservando sus controles. Prueba rotación, zoom, cambio de mundo y perfil. **Cerrar**, **Reducir** o **Esc** devuelven el visor a su posición; el área y los ajustes se conservan. Ampliar la imagen no aumenta la resolución del DEM.

## 2. Explicar la evidencia

Abre **Fundamento, procesos y diferencias**. Distingue tres niveles: publicación geológica regional, coordenada de referencia y medición topográfica calculada. El par peruano es una hipótesis de GeoTwin. Los datos incluidos no permiten afirmar igualdad de composición, edad ni condiciones ambientales.

## 3. Calcular y comparar

Pulsa **Calcular caso con datos incluidos**. El cálculo usa una ventana de 20 × 20 km y paso común de 500 m. Compara pendiente mediana, P90, relieve y rugosidad de Andahua, Huambo y dos controles con el destino. Los controles no compiten en la selección.

Con el escenario de 12°, Andahua presenta aproximadamente 60,625 % de celdas bajo el umbral y queda por debajo del mínimo demostrativo de 75 %. Este resultado limita la elección a esa escala y con esos supuestos; no invalida todos los usos geológicos posibles.

## 4. Examinar la sensibilidad

En **Sensibilidad de la elección**, calcula el caso Perú. Revisa las ventanas de 5, 10 y 20 km y los límites de 5°, 12° y 20°. Cambia el margen de pendiente y observa si hay un candidato único, equivalencia o ninguno que cumpla. Una frecuencia entre escenarios no es una probabilidad de validez.

Los umbrales y márgenes son supuestos de demostración. Antes de un ensayo real deben fijarse a partir del objetivo, el instrumento o el vehículo.

## 5. Registrar un ensayo medible

En **Plan y resultado del ensayo**, comprueba que el contexto sea Andahua ↔ Ulysses Colles. Pulsa **Usar la medición regional del caso Perú** para incorporar el valor calculado. El origen debe indicar DEM regional, no ensayo de campo.

También puedes escribir un objetivo, instrumento, procedimiento, métrica, unidad, umbral y observación propios. Un resultado vacío debe permanecer pendiente. Guarda y descarga el plan. Antes de informar un ensayo de campo, documenta la medición en las notas y revisa los límites indicados.

## 6. Explorar y exportar

Pulsa **Explorar el candidato en el atlas**. En el delimitador, dibuja y mide un contorno; compara polígonos o transectos a escala común. En **Guardar y exportar**, usa **Descargar proyecto completo**. Abre otra sesión de GeoTwin y carga ese `.geotwin.json` en **Abrir proyecto GeoTwin**: debe recuperar también planes, parámetros y resultados. El guardado en el navegador continúa disponible.

Descarga el caso JSON, las mediciones CSV y la ficha científica. El JSON terrestre usa WGS 84; los vértices planetarios están separados e identifican su cuerpo. Conserva parámetros, resoluciones, fuentes, decisión, límites y justificación.

## 7. Examinar la cartografía peruana

En **Cartografía geológica de Perú**, elige Andahua o Huambo y pulsa **Calcular cobertura y unidades**. Revisa cobertura, área del Grupo Andagua, códigos, descripción litológica y hojas. La escala es 1:100 000 y es distinta del mapa de la publicación de 2010. También puedes seleccionar un polígono terrestre propio. **Ver capa en el atlas** muestra Qp-an en naranja y otras unidades en azul. Exporta la intersección GeoJSON y conserva su procedencia. Fuera de los recortes debe indicar falta de cobertura.

## 8. Medir un cono individual

En el atlas, localiza una forma interpretada como cono con imágenes de detalle. Acerca el mapa, dibuja su base, mídela y nómbrala. Pulsa **Nuevo polígono** para dibujar y medir el borde del cráter, si está definido. Repite en el mundo de referencia. En **Comparar conos individuales**, selecciona bases y cráteres separados y pulsa **Medir y comparar conos**. Revisa diámetros, altura, profundidad, H/D, flancos, cobertura y resolución. No uses el cuadrado regional de 20 km como si fuera un cono. Si el DEM o el paso común no resuelven una forma, sus métricas deben quedar sin datos. Descarga la morfometría JSON.

No se incluyen contornos científicos validados de conos individuales: la herramienta permite medir los contornos interpretados por el usuario y deja explícita esa procedencia.

## 9. Probar los otros escenarios

Recalcula Marius Hills y Ulysses Colles frente a Hawaiʻi. La cartografía digital de Hawaiʻi mide coladas o conos cartografiados; las coladas no prueban por sí solas la presencia de un tubo de lava.

## Comprobación visual antes de presentar

- Probar la introducción animada, sus créditos NASA/JPL y las opciones de entrar, omitir y cerrar con Esc; confirmar movimiento reducido y pantalla estrecha.
- Revisar el globo, etiquetas y tablas en escritorio y pantalla estrecha.
- Comprobar el borde completo de las tres esferas, su sombreado y el desplazamiento continuo de la superficie al girar. Al elegir un planeta, confirmar que el acercamiento sea suave y la esfera completa quede dentro del marco. Probar arrastre, teclado, zoom y selección de puntos durante el giro. Con movimiento reducido, el giro automático debe comenzar desactivado.
- Inspeccionar Tierra, Luna y Marte desde sus esferas dentro de la vista conjunta; verificar que el acercamiento, la selección de puntos y los marcadores permanecen en la misma escena.
- Revisar las 20 zonas terrestres en el orden de la lista, sus aplicaciones y los dos marcadores aportados de Cajamarca. Comprobar sus avisos y la recuperación al abrir un proyecto.
- Ampliar el globo y el relieve, cambiar el tamaño de la ventana y cerrar con Esc. Comprobar nitidez, selección de puntos, perfil y devolución del foco al botón de apertura.
- Recorrer los controles con teclado y comprobar el foco visible.
- Calcular los tres casos y cambiar un parámetro sin perder su referencia.
- Editar un plan, cambiar de sitio, volver, guardar y recuperar.
- Descargar un proyecto y abrirlo en una sesión vacía; comprobar borradores, fuentes, sensibilidad, conos, geología y planes.
- Revisar unidades geológicas, huecos de polígonos y leyenda en la capa de INGEMMET.
- Medir bases y cráteres individuales y comprobar el mensaje de resolución insuficiente para contornos pequeños.
- Descargar y abrir los archivos en un editor y en un SIG o una hoja de cálculo.
- Comprobar los ejemplos con la conexión externa desactivada y el servidor local activo.
- Revisar los requisitos de entrega y recursos oficiales del reto en su página vigente.

Los últimos pasos son una guía de revisión manual; su inclusión no afirma que la revisión visual se haya completado.
