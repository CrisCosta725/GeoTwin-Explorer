# Verificación de GeoTwin Explorer

Ejecutar: npm ci y npm test.

La suite comprueba los perfiles NASADEM, las imágenes satelitales y sus registros SHA-256, los archivos del caché sin conexión, el arranque, la selección de sitios, el catálogo, ambos idiomas y la introducción accesible.

Las imágenes de contexto se guardan localmente. Landsat WELD es un compuesto histórico; McMurdo usa MODIS Terra de 2024-01-15.

Se inspeccionaron imágenes descargadas de Isabella–Chotén, Coropuna y McMurdo. Las pruebas DOM no sustituyen la revisión visual del diseño final en un navegador con WebGL.

Optimización de carga: las texturas de relieve terrestre y marciano se distribuyen en WebP con sus dimensiones nativas (4320 × 2161 y 2880 × 1440). Peso conjunto: 1.777.176 bytes. Se precargan desde el HTML, usan caché local y un primer renderizado progresivo; las mallas se reutilizan entre esferas. La suite comprueba dimensiones, formato, presupuesto de descarga y lectura de texturas desde caché sin consultar la red.

Revisión final de entrega: 11 pruebas aprobadas. Todos los módulos del navegador están conectados a atlas-app.js o pwa.js. Retirados el SVG transitorio del astronauta, 14 reglas de animación obsoletas, métodos sin llamadas, comentarios del código propio y metadatos duplicados. Las pruebas MOLA están integradas en npm test. El empaquetado rechaza dependencias instaladas y cachés anidadas; se conservan licencias, créditos y procedencia científica.
