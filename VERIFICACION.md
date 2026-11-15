# GeoTwin v24 · verificación de la entrega

Fecha de revisión: 14 de noviembre de 2026.

## Comprobado automáticamente

`npm test`: **47 pruebas aprobadas, 0 fallos**, ejecutadas en Windows con Node.js 22.23.2.

- Respaldo por rasgo: evidencia local, regional y pendiente; el catálogo ya no devuelve cobertura completa para todos los candidatos.
- Equivalencias estables, requisitos de cobertura, exclusión de controles y falta de evidencia cartográfica en la huella.
- Observación pendiente, observación igual a cero, porcentajes fuera de rango e invalidación de la observación al cambiar métrica, unidad o protocolo.
- Tres casos calculados con acceso externo bloqueado: Andahua–Ulysses, Marius–Hawaiʻi y Ulysses–Hawaiʻi.
- Exportaciones con geometrías cerradas, fuentes, parámetros, umbral actual, equivalencias y limitaciones.
- Correspondencia entre el ejemplo JSON empaquetado y el resultado recalculado desde los datos locales.
- Servidor HTTP: HTML, módulos JavaScript, ejemplos y datos comprimidos; métodos permitidos, rutas y errores.
- Lanzador `.bat`: detección de Node.js y ejecución de su ayuda en Windows.
- Identificadores de interfaz, destinos de enlaces, referencias de módulos, sintaxis y 164 archivos de elevación declarados en el índice.
- Inicio de la aplicación completa en un DOM aislado, cálculo del caso peruano y actualización del plan con una medición regional.
- Edición del plan, invalidación de medición al cambiar la métrica, conservación de cero, cambio de candidato y recuperación de los valores del sitio correcto.
- Medición de un polígono con los datos locales, guardado del análisis, nueva instancia de la aplicación y recuperación de referencia, geometría y planes.
- Descargas generadas desde los eventos de la interfaz: plan JSON, geometría terrestre y ficha; notas con comillas, saltos de línea y etiquetas conservadas como texto.
- Exportación desde la interfaz de sensibilidad con escala, pendiente, margen y justificación elegidos por el usuario.
- Cono sintético de diámetro, altura y cráter conocidos, con terreno de base inclinado: diámetros, altura y profundidad dentro de la tolerancia numérica de muestreo.
- Omisión de altura, profundidad y pendiente con DEM grueso, cobertura nula o cráter pequeño; rechazo de cráter fuera de la base o en otro mundo.
- Cartografía oficial peruana: 902 entidades, hash SHA-256, escala y atributos originales. Cobertura de Andahua y Huambo calculada sin conexión. Respeto de huecos y unión de polígonos solapados sin duplicar cobertura.
- Descargas desde la interfaz de morfometría e intersección geológica, con sus fuentes y geometrías.
- Proyecto portable abierto en una instancia vacía de la aplicación: recupera referencia, polígonos, fuentes, caso calculado, planes con observación cero, sensibilidad, mediciones individuales e intersecciones geológicas.
- Recuperación de un contorno sin medir. Rechazo de archivo incompatible, coordenadas inválidas y fuentes inseguras antes de reemplazar la sesión de trabajo.
- El delimitador espera una selección explícita y después carga el relieve sin depender de pulsar su enlace ni de modificar el fragmento de navegación. Se comprueba que las celdas llegan al código de dibujo.
- Si falla la carga del mapa, aparece un mensaje visible y un botón de reintento. Una nueva carga recupera el relieve sin borrar el contorno en edición.
- Ampliación del globo con el mismo canvas y selector planetario; cambio de mundo, controles, cierre con Esc y devolución del foco al botón de apertura.
- Ampliación del visor de relieve conservando perfil, cotas, realce y modo de imagen. Ajuste del búfer de dibujo a una dimensión de prueba de 1 200 × 600; no se sustituyen los datos del DEM.
- Recorrido del foco dentro de la vista ampliada, bloqueo y restauración de la página de fondo, cierre antes de navegar y ausencia de canvas duplicados.
- Inicio en la vista conjunta de Tierra, Luna y Marte, Tierra al centro y ausencia de un área seleccionada. La inspección de un planeta, selección de puntos, giro y zoom mantienen las tres esferas en la misma escena y los mismos canvas, sin abrir el panel individual ni un diálogo.
- Giro por teclado, selección del globo activo, zoom compartido, restablecimiento individual y persistencia de las cámaras desde la vista conjunta.
- Introducción animada con texturas planetarias y referencias, navegación por teclado, cierre, bloqueo/restauración del desplazamiento y preferencia de movimiento reducido en CSS.
- Restablecimiento de cámaras sin salir del atlas y persistencia de la vista, el mundo y las cámaras en proyectos.
- Ráster esférico con textura sintética: esquinas transparentes, borde circular, iluminación y cambio de superficie al variar longitud o latitud. El tamaño CSS depende del contenedor, con pruebas de 50 a 196 píxeles y zoom; los búferes se reutilizan entre fotogramas.
- Giro de las tres superficies calculado mediante fotogramas controlados: cambian sus píxeles, se pausa con puntero o foco y admite giro manual por teclado. La preferencia de animación se conserva al exportar y abrir proyectos, sin seleccionar un área al inicio.
- Catálogo actualizado de 20 zonas, en el orden solicitado, con país y aplicación principal. Las ocho zonas peruanas están presentes; los 20 marcadores tienen coordenadas y las asociaciones de perfiles remiten al catálogo vigente.
- Conversión de las coordenadas aportadas de Isabella–Chotén y Sucre desde grados, minutos y segundos; cotas de 3664 m y 3189 m conservadas como datos aportados. Se mantienen los avisos de origen por verificar, sin asignarles brechas de impacto ni similitud temática sin evidencia.
- Selección y exportación de los dos sitios aportados, recuperación del aviso de verificación al reabrir un proyecto y conservación de ubicaciones de sitios retirados como puntos del proyecto anterior. Las coordenadas ausentes no se interpretan como cero ni generan cálculos de relieve.

`npm run examples` regenera JSON, CSV, Markdown y GeoJSON terrestre desde los datos incluidos.

`npm run catalog` regenera `dist/examples/ZONAS_Y_UBICACIONES.md` desde el catálogo activo, con sus fuentes, coordenadas y limitaciones.

## Resultado científico que se conserva

En el escenario de 20 × 20 km, paso de 500 m y límite de 12°, el candidato Andahua presenta aproximadamente 60,625 % de celdas bajo el umbral. No alcanza el mínimo demostrativo de 75 %. La aplicación conserva este resultado y permite examinar otros escenarios; no fuerza una selección favorable.

La analogía peruana es una hipótesis regional de GeoTwin. No se ha realizado verificación de campo, comparación mineralógica ni propagación de incertidumbre vertical o cartográfica. Los márgenes de decisión no son intervalos de confianza.

La capa INGEMMET incluida es de 1:100 000 y contiene contexto litológico, no contornos individuales de conos. En las ventanas de 20 km, la cobertura cartográfica es aproximadamente 99,995 % en Andahua y 99,971 % en Huambo; Qp-an ocupa aproximadamente 37,209 % y 19,794 % de la huella, respectivamente. Estos porcentajes describen la intersección con el mapa; no son confianza científica ni equivalencia con Ulysses. El caso JSON y la ficha científica incluyen el resultado y su procedencia.

La herramienta de conos requiere contornos interpretados por el usuario. El criterio de seis pasos por diámetro, nueve celdas y 80 % de cobertura es un control de demostración. El RMS del plano de borde no representa error vertical del DEM. No se han incorporado conos individuales con validación de campo ni se atribuyen las mediciones sintéticas de las pruebas a lugares reales.

## Revisión visual pendiente

La inspección dentro de la vista conjunta está cubierta por pruebas de eventos, estado y conservación de los canvas. Queda pendiente revisar visualmente su composición y nitidez en escritorio y móvil; Computer Use sigue devolviendo un inventario vacío de navegadores. Las pruebas DOM no verifican la distribución CSS.

La actualización del catálogo y de sus marcadores se comprobó con pruebas DOM, datos geográficos y respuestas HTTP. Queda pendiente su revisión visual: la sesión de Computer Use devolvió un inventario vacío de navegadores y rechazó la apertura con «Browser is not available: iab».

Se inspeccionó la portada animada en escritorio y móvil; cargaron las tres texturas y sus referencias, los botones de entrada funcionan y el navegador desactiva animaciones con movimiento reducido. La vista conjunta previa conserva Tierra al centro, texturas, sitios destacados y conectores conceptuales.

Queda pendiente comprobar el foco con un teclado físico y revisar el diálogo modal nativo de ampliación, sus cambios de tamaño y nitidez.

Las pruebas de ampliación usan la alternativa de diálogo del DOM de pruebas. Queda pendiente comprobar visualmente el diálogo modal nativo, los cambios de tamaño y la nitidez en un navegador real, tanto en escritorio como en móvil.

Las pruebas DOM usan módulos ESM en un contexto VM aislado. Node.js los señala como una función experimental; la opción correspondiente se limita al comando de pruebas y no afecta al lanzador ni al navegador del usuario.

La guía `dist/examples/GUIA_DEMO.md` contiene el recorrido manual para revisar escritorio, pantalla estrecha, teclado, polígonos, planes, guardado y descargas. Los requisitos finales y la pestaña Resources del reto deben comprobarse en la página oficial vigente; el acceso automatizado a esa página no estuvo disponible.
