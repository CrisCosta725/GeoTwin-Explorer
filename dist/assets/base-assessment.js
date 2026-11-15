const groundIce = 'https://nsidc.org/data/nsidc-0529/versions/1';
const haughton = {
  scope:'Relieve en un entorno polar',
  detail:'El Haughton Mars Project ha ensayado hábitats, equipos y recorridos en el Ártico canadiense. Selecciona transectos comparables. Comprueba las diferencias de pendiente y el papel del hielo y del clima en la formación del terreno.',
  source:'https://science.nasa.gov/solar-system/planetary-analogs/10-things-to-know-about-planetary-analogs/',
  sourceLabel:'NASA · Haughton Mars Project'
};
const lanzarote = {
  scope:'Tránsito y muestreo sobre terreno rocoso',
  detail:'PANGAEA documenta entrenamiento geológico en terreno volcánico. Sirve para ensayar identificación de obstáculos y protocolos de muestreo. El clima y la iluminación del polo lunar requieren ensayos específicos.',
  source:'https://www.esa.int/Newsroom/Press_Releases/Media_Invitation_PANGAEA_astronaut_training_in_Lanzarote',
  sourceLabel:'ESA · entrenamiento PANGAEA'
};
const cinder = {
  scope:'Navegación entre cráteres y obstáculos',
  detail:'El USGS dispone de modelos de elevación del campo de entrenamiento Apollo. Permite medir geometría, profundidad y pendientes de cráteres artificiales. Compara esos rasgos a la misma escala con el relieve lunar.',
  source:'https://www.usgs.gov/data/cinder-lake-crater-field-uncrewed-aerial-system-derived-digital-elevation-models-2023-and-2024',
  sourceLabel:'USGS · topografía del campo de entrenamiento'
};
const mcmurdo = {
  scope:'Detección y muestreo de hielo somero en suelo seco',
  detail:'Los sondeos de subsectores de los Valles Secos permiten contrastar la detección de hielo con observaciones de campo. El marcador McMurdo es regional: usa las coordenadas de cada sondeo y verifica profundidad y recuperación de muestra. El relieve y la atmósfera difieren de la planicie marciana.',
  source:groundIce,sourceLabel:'NSIDC · mediciones de hielo terrestre'
};
const barrow = {
  scope:'Detección de hielo y muestreo en suelo poligonal',
  detail:'Los testigos publicados de centros, bordes y depresiones permiten ensayar la detección de hielo en una planicie poligonal. El deshielo estacional y la humedad de la tundra cambian la respuesta del suelo.',
  source:'https://www.osti.gov/servlets/purl/1185515',sourceLabel:'DOE OSTI · testigos de suelo congelado'
};
const atacama = {
  scope:'Ensayo de perforación en terreno árido',
  detail:'El proyecto ARADS de NASA probó un taladro y protocolos de muestreo con rover en Atacama. Sirve para medir recuperación de muestra y operación remota. Para ensayar hielo se necesita un sitio con hielo medido.',
  source:'https://www.nasa.gov/universe/atacama-rover-astrobiology-drilling-studies-arads/',
  sourceLabel:'NASA · ensayos ARADS'
};
const coropuna = {
  scope:'Detección de permafrost en alta montaña',
  detail:'Las investigaciones de Coropuna permiten proponer ensayos térmicos y geofísicos para localizar permafrost. El punto del atlas es regional y no garantiza hielo en toda la zona. Delimita el transecto y contrasta profundidad, contenido de hielo y efectos de la topografía.',
  source:'https://cryoperu.pe/wp-content/uploads/2014/12/informe-sobre-permafrost-coropuna-chachani-cryoperu-8-4-20141.pdf',sourceLabel:'CRYOPERU · permafrost de Coropuna'
};

export const baseAssessments = {
  malapert:{
    status:'Región candidata documentada',
    summary:'El relieve de Malapert incluye crestas y pendientes estudiadas por NASA cerca del polo sur lunar.',
    pairs:{haughton,lanzarote,'cinder-lake':cinder}
  },
  'mons-mouton':{
    status:'Región candidata documentada',
    summary:'La meseta de Mons Mouton y su borde sur se han estudiado para operaciones lunares y acceso a cráteres en sombra. El punto del atlas es el centro geográfico de la meseta.',
    pairs:{'cinder-lake':cinder,haughton,lanzarote}
  },
  'connecting-ridge':{
    status:'Región candidata documentada',
    summary:'Connecting Ridge es un corredor entre cráteres polares. El ancho de la cresta y la topografía influyen en la iluminación.',
    pairs:{haughton,lanzarote}
  },
  'arcadia-ap1':{
    status:'Región candidata documentada',
    summary:'AP-1 es una planicie con polígonos e indicios orbitales de hielo somero. La profundidad y continuidad del hielo requieren comprobación local.',
    pairs:{mcmurdo,barrow,coropuna,atacama}
  },
  'arcadia-ap8':{
    status:'Región candidata documentada',
    summary:'AP-8 combina un sector local de bajo relieve con indicios orbitales de hielo. Las condiciones varían fuera del área próxima al punto.',
    pairs:{barrow,mcmurdo,coropuna,atacama}
  },
  'arcadia-ap9':{
    status:'Región candidata documentada',
    summary:'AP-9 presenta bajo relieve en la huella estudiada y el mayor índice SWIM de consistencia con hielo entre AP-1, AP-8 y AP-9. El índice combina indicios orbitales.',
    pairs:{mcmurdo,barrow,coropuna,atacama}
  },
  deuteronilus:{
    status:'Región de prospección',
    summary:'NASA identifica Deuteronilus Mensae como región con indicios de hielo enterrado. Conviene contrastar la geometría de los depósitos con la profundidad y continuidad del hielo.',
    pairs:{coropuna,mcmurdo,barrow}
  }
};
