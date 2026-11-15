# GeoTwin Explorer · atlas sin GIS

La aplicación principal contiene las tres esferas interactivas, catálogo terrestre y planetario, fichas de semejanzas, matriz lunar y criterios operativos de Marte. El motor GIS, el delimitador, DEM, capas y exportaciones espaciales se retiraron de esta versión.

Abre `Iniciar_GeoTwin.bat`, o ejecuta `npm start`. Se sirve únicamente `dist` en http://127.0.0.1:8000/.

La carpeta `C:\Users\ccost\Downloads\GIS` conserva una copia ejecutable con las funciones anteriores y sus datos. Para abrirla por separado: `node C:\Users\ccost\Downloads\GIS\iniciar_geotwin.mjs --puerto 8001`. No se incluye en la publicación ni en el ZIP de la app principal.

Las fichas distinguen datos aportados, evidencia regional y variables sin medir. Las comparaciones no certifican equivalencia científica ni seguridad operativa. Los datos, texturas y publicaciones conservan sus atribuciones originales.

Validación principal: `npm test`. La suite histórica y sus funciones GIS se conservan en la carpeta separada. Los proyectos GIS anteriores deben abrirse allí; el atlas principal ya no ofrece importación de proyectos ni medición.
