import {hasCoordinates} from './coordinates.js';
import {lunarMatrix} from './lunar-matrix.js';

export const worldMaps = {
  Earth:{label:'NASA Worldview',url:'https://worldview.earthdata.nasa.gov/'},
  Moon:{label:'NASA Moon Trek',url:'https://trek.nasa.gov/moon/'},
  Mars:{label:'NASA Mars Trek',url:'https://trek.nasa.gov/mars/'}
};

export const planetaryAreas = {
  Moon:[
    {id:'shackleton',profile:'south',name:'Shackleton · Polo sur',lat:-89.9,lon:129.8,range:155,
      type:'Cráter y terreno polar',caption:'Mosaico polar de Shackleton · NASA/KARI/ASU, equipos LROC y ShadowCam.',
      source:'https://www.nasa.gov/missions/lro/nasa-moon-camera-mosaic-sheds-light-on-lunar-south-pole/',
      reference:'https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/', referenceLabel:'NASA · iluminación polar',
      features:[
        ['Sombra permanente','El interior queda en sombra y algunas cumbres del borde reciben iluminación prolongada. El contraste permite plantear ensayos distintos de detección de volátiles y generación solar.'],
        ['Bordes y laderas','El contraste entre el borde y el interior del cráter permite evaluar iluminación, pendientes y rutas.']
      ], limit:'Verifica iluminación estacional, visibilidad de comunicaciones, pendientes de detalle y presencia local de hielo. El cráter es una referencia del entorno polar lunar.'},
    {id:'apollo',profile:'mare',name:'Mar de la Tranquilidad',lat:.674,lon:23.473,range:310,
      type:'Llanura basáltica · Apollo 11',caption:'Lugar de alunizaje del Apollo 11 · NASA/GSFC/Arizona State University.',
      source:'https://science.nasa.gov/resource/apollo-11-landing-site/',
      features:[
        ['Coladas basálticas','Las llanuras de lava sirven para comparar basaltos, material superficial y unidades volcánicas en la Tierra.'],
        ['Regolito y cráteres pequeños','La superficie ofrece una referencia para muestreo, navegación y detección de obstáculos.']
      ], limit:'Mide la profundidad del regolito, la rugosidad y la distribución de bloques a escala del ensayo.'},
    {id:'tycho',profile:'impact',name:'Cráter Tycho',lat:-43,lon:-11,range:210,
      type:'Cráter de impacto',caption:'Compuestos UV y visible del cráter y su pico central · NASA.',
      source:'https://science.nasa.gov/resource/uvvisible-composite-images-of-tycho-crater-on-the-moon/',
      features:[
        ['Pico central y paredes','El relieve permite comparar formas de impacto y exposición de materiales.'],
        ['Materiales de impacto','El cráter ofrece un contexto para comparar brechas y diseñar transectos de cartografía.']
      ], limit:'Verifica las unidades geológicas y la movilidad en laderas. La similitud de forma por sí sola no caracteriza la composición.'},
    {id:'marius',profile:'marius',name:'Marius Hills · abertura volcánica',lat:14.10,lon:-56.74,range:45,
      type:'Campo volcánico · posible tubo de lava',
      caption:'Abertura de Marius Hills, imagen LROC NAC · NASA/GSFC/Arizona State University.',
      source:'https://science.nasa.gov/photojournal/marius-hills-pit-lava-tube-skylight/',
      reference:'https://science.nasa.gov/solar-system/planetary-analogs/',referenceLabel:'NASA · ensayos en Lava Beds',
      features:[
        ['Coladas y abertura','La cámara LROC NAC muestra una abertura en una región basáltica. Su relación con una cavidad subterránea permite plantear ensayos de detección y cartografía.'],
        ['Comparación terrestre','Los tubos de Lanzarote y Lava Beds permiten ensayar cómo localizar entradas, medir su geometría y explorar cavidades.']
      ], limit:'Consulta la imagen NAC para observar la abertura. El DEM regional de LOLA muestra el entorno y carece de resolución para representar la abertura o el interior. La continuidad de la cavidad requiere verificación.'},
    {id:'cabeus',profile:'cabeus',name:'Cráter Cabeus · impacto LCROSS',lat:-84.675,lon:-48.700,range:55,
      type:'Cráter polar · hielo detectado',
      caption:'Topografía del sector de impacto de LCROSS, derivada de LOLA · NASA.',
      source:'https://science.nasa.gov/mission/lcross/',
      reference:'https://science.nasa.gov/image-detail/20110615lcross/',referenceLabel:'NASA · imagen del lugar de impacto',
      features:[
        ['Hielo en sombra permanente','LCROSS detectó agua en el material expulsado por su impacto en Cabeus. El marcador señala el impacto de la etapa Centaur.'],
        ['Comparación terrestre','Los Valles Secos de McMurdo permiten ensayar detección y muestreo de hielo en suelos fríos.']
      ], limit:'La comparación con McMurdo es metodológica. Evalúa la distribución del hielo, la iluminación y el acceso al punto lunar con datos locales.'},
    {id:'malapert',profile:'malapert',name:'Macizo Malapert',lat:-85.99,lon:-2.93,range:30,
      type:'Relieve polar · horizonte y comunicaciones',
      caption:'Mapa LOLA de la región de Malapert · NASA.',
      source:'https://science.nasa.gov/image-detail/20100618/',
      reference:'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/',referenceLabel:'NASA PGDA · topografía LOLA de 5 m',
      features:[
        ['Pendiente y horizonte','La topografía permite distinguir crestas y laderas y plantear un análisis de visibilidad. NASA identifica sectores con buena visibilidad hacia la Tierra.'],
        ['Comparación terrestre','Haughton permite ensayar movilidad y comunicaciones en relieve polar accidentado.']
      ], limit:'Calcula iluminación y línea de vista para las coordenadas y fechas de misión. El relieve de Haughton sirve para probar el método de campo.'},
    {id:'mons-mouton',profile:'mons-mouton',name:'Mons Mouton',lat:-84.60,lon:31,range:45,
      type:'Meseta polar · región estudiada',
      source:'https://planetarynames.wr.usgs.gov/Feature/16070',
      reference:'https://doi.org/10.3847/psj/ae061a',referenceLabel:'VIPER · análisis del área de misión',
      features:[
        ['Meseta y borde sur','Los estudios de VIPER describen una montaña de cima plana y examinan rutas hacia cráteres en sombra.'],
        ['Punto de referencia','El marcador señala el centro geográfico de Mons Mouton en el nomenclátor de la IAU y el USGS.']
      ],limit:'Delimita una parcela y comprueba su pendiente, bloques, iluminación y accesos antes de evaluar un alunizaje.'},
    {id:'connecting-ridge',profile:'connecting-ridge',name:'Connecting Ridge',lat:-89.4632,lon:-137.49,range:22,
      type:'Cresta polar · región de referencia',
      source:'https://ntrs.nasa.gov/citations/20250002845',
      reference:'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/',referenceLabel:'NASA PGDA · topografía de Site01',
      features:[
        ['Cresta entre cráteres','NASA incluye esta cresta en sus referencias de superficie lunar. Su geometría permite estudiar el horizonte y la movilidad por un corredor estrecho.'],
        ['Iluminación y sombras','Los modelos de relieve permiten evaluar cuánto tiempo queda iluminado cada punto y planear rutas hacia sectores en sombra.']
      ],limit:'La utilidad de una cresta para energía y tránsito depende de la fecha, la altura de los equipos y el ancho de la ruta.'}
  ],
  Mars:[
    {id:'arcadia-ap1',profile:'arcadia-ap1',name:'Arcadia–Amazonis · AP-1',lat:39.8,lon:-157.9,range:45,
      type:'Planicie de latitud media · candidato estudiado',
      source:'https://pubs.usgs.gov/publication/70266466',
      reference:'https://doi.org/10.1029/2024JE008724',referenceLabel:'Luzzi et al. · coordenadas y cartografía',
      features:[
        ['Planicie de poco relieve','AP-1 se estudió como candidato a aterrizaje. El desnivel máximo dentro de la huella HiRISE analizada fue de 31 m.'],
        ['Polígonos e indicios de hielo somero','La cartografía orbital documenta polígonos y otras formas compatibles con hielo próximo a la superficie. University Valley permite estudiar esos rasgos y ensayar el muestreo.']
      ], limit:'La coordenada representa el sitio candidato publicado. La parcela del hábitat, el aterrizaje para un vehículo concreto y la disponibilidad local de agua requieren evaluación.'},
    {id:'arcadia-ap8',profile:'arcadia-ap8',name:'Arcadia–Amazonis · AP-8',lat:40.75,lon:-158.7,range:28,
      type:'Planicie de latitud media · candidato estudiado',
      source:'https://pubs.usgs.gov/publication/70266466',
      reference:'https://doi.org/10.1029/2024JE008724',referenceLabel:'Luzzi et al. · cartografía de AP-8',
      features:[
        ['Superficie local de poco relieve','El estudio reporta 8 m de desnivel máximo en los 2,5 km² próximos al punto y 140 m en la huella HiRISE completa.'],
        ['Indicios de hielo','Los polígonos y el índice SWIM justifican una verificación del hielo somero.']
      ],limit:'La parcela y la elipse de aterrizaje requieren cartografía de mayor detalle y verificación del subsuelo.'},
    {id:'arcadia-ap9',profile:'arcadia-ap9',name:'Arcadia–Amazonis · AP-9',lat:40.02,lon:-156.65,range:28,
      type:'Planicie de latitud media · candidato estudiado',
      source:'https://pubs.usgs.gov/publication/70266466',
      reference:'https://doi.org/10.1029/2024JE008724',referenceLabel:'Luzzi et al. · cartografía de AP-9',
      features:[
        ['Relieve de la zona estudiada','El estudio reporta 10 m de desnivel máximo en la huella HiRISE de AP-9.'],
        ['Indicios de hielo','El estudio recoge para AP-9 el mayor índice de consistencia SWIM de los tres candidatos AP; la profundidad y concentración locales requieren verificación.']
      ],limit:'Confirma la rugosidad, la capacidad portante y la continuidad del hielo en la zona operativa.'},
    {id:'deuteronilus',profile:'deuteronilus',name:'Deuteronilus Mensae',lat:43.56,lon:22.60,range:145,
      type:'Valles y mesetas · prospección regional',
      source:'https://www.nasa.gov/centers-and-facilities/jpl/where-should-future-astronauts-land-on-mars-follow-the-water/',
      reference:'https://planetarynames.wr.usgs.gov/Feature/1509',referenceLabel:'IAU / USGS · coordenadas regionales',
      features:[
        ['Hielo cubierto por detritos','El radar SHARAD respalda la interpretación de depósitos ricos en hielo en lóbulos de la región.'],
        ['Selección de terreno','El centro regional orienta la exploración. Se requiere localizar una planicie operativa y estudiar sus rutas hacia el recurso.']
      ],limit:'La región es de interés para prospección. Su evaluación de aterrizaje y base empieza por delimitar un sector local.'},
    {id:'jezero',profile:'jezero',name:'Cráter Jezero',lat:18.44,lon:77.45,range:160,
      type:'Antiguo lago y delta',caption:'Sector noreste de Jezero, imagen orbital THEMIS · NASA/JPL-Caltech/ASU.',
      source:'https://www.jpl.nasa.gov/images/pia25350-jezero-crater/',
      features:[
        ['Delta y sedimentos','El antiguo ingreso de agua depositó sedimentos. Su arquitectura permite diseñar recorridos y planes de muestreo.'],
        ['Carbonatos y antiguas orillas','Las unidades lacustres permiten preparar la búsqueda de bioseñales. El catálogo terrestre actual no incluye un equivalente mineralógico de sus carbonatos; la comparación sedimentaria requiere evidencia específica.']
      ], limit:'Distingue las unidades del delta, del borde y del fondo del cráter. Verifica mineralogía y pendientes en el área concreta.'},
    {id:'meridiani',profile:'arid',name:'Meridiani Planum · cráter Eagle',lat:-1.9483,lon:-5.52583,range:320,
      type:'Llanura sedimentaria',caption:'Materiales de Meridiani Planum · NASA/JPL-Caltech.',
      source:'https://science.nasa.gov/resource/meridiani-planum-2/',
      features:[
        ['Hematita y jarosita','Opportunity identificó ambos minerales en rocas sedimentarias del cráter Eagle. Los depósitos conservan evidencia de procesos relacionados con agua antigua.'],
        ['Planicies con material suelto','El relieve permite comparar movilidad y cartografía de suelos áridos y sedimentos.']
      ], limit:'Verifica mineralogía y escala de los depósitos. Un salar terrestre permite ensayar procesos concretos con diferencias ambientales.'},
    {id:'phoenix',profile:'polar',name:'Planicie polar · Phoenix',lat:68.22,lon:-125.75,range:240,
      type:'Planicie de altas latitudes',caption:'Panorama del lugar de aterrizaje de Phoenix · NASA/JPL-Caltech/University of Arizona/Texas A&M University.',
      source:'https://www.jpl.nasa.gov/images/pia13804-mars-panorama-of-phoenix-landing-site-and-lander-deck/',
      features:[
        ['Hielo somero','Las excavaciones de Phoenix permiten orientar ensayos de detección y muestreo de hielo en el subsuelo.'],
        ['Terreno poligonal','Los patrones superficiales y el ambiente frío favorecen la comparación con desiertos polares terrestres.']
      ], limit:'Comprueba profundidad y continuidad del hielo, pendiente y condiciones térmicas de la zona de ensayo.'},
    {id:'olympus',profile:'volcanic',name:'Olympus Mons',lat:18.65,lon:-133.8,range:500,
      type:'Volcán en escudo',caption:'Mosaico orbital de Viking 1 · NASA/JPL/USGS.',
      source:'https://science.nasa.gov/photojournal/olympus-mons/',
      features:[
        ['Edificio volcánico','El escudo, la caldera y las coladas permiten comparar formas volcánicas con terrenos basálticos terrestres.'],
        ['Relieve heterogéneo','Los flancos y las superficies circundantes ofrecen contrastes útiles para cartografía orbital y planificación de rutas.']
      ], limit:'Selecciona un flanco o una unidad concreta. Comprueba pendientes y escala antes de transferir conclusiones desde un volcán terrestre.'},
    {id:'ulysses',profile:'ulysses',name:'Ulysses Colles',lat:6.14,lon:-123.09,range:85,
      type:'Campo volcánico · conos y coladas',
      caption:'Conos y coladas en una imagen CTX · NASA Earth Observatory/Lauren Dauphin, con datos de NASA MRO.',
      source:'https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/',
      reference:'https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf',referenceLabel:'INGEMMET · Andahua–Orcopampa',
      features:[
        ['Conos y cráteres de cima','El campo permite cartografiar cráteres de cima, flancos y su relación con las coladas. Su morfología es compatible con conos de escoria.'],
        ['Comparación terrestre','Andahua–Orcopampa, en Arequipa, permite comparar la forma de los conos y preparar transectos de cartografía.']
      ], limit:'Compara la geometría con el mismo método y escala. La composición de los materiales marcianos requiere evidencia independiente.'},
    {id:'gale',profile:'gale',name:'Cráter Gale · sector de Curiosity',lat:-4.59,lon:137.44,range:85,
      type:'Cuenca de impacto · abanicos aluviales',
      caption:'Mapa en falso color del sector de aterrizaje de Curiosity y del abanico aluvial · NASA/JPL-Caltech/ASU.',
      source:'https://science.nasa.gov/photojournal/downslope-of-the-fan/',
      reference:'https://science.nasa.gov/resource/river-fans-on-earth-and-mars/',referenceLabel:'NASA · abanicos en la Tierra y Marte',
      features:[
        ['Abanicos y canales fósiles','Los depósitos y canales próximos al aterrizaje de Curiosity permiten reconstruir el transporte de sedimentos y orientar transectos.'],
        ['Comparación terrestre','Nasca–Palpa se propone para explorar geomorfología desértica y sedimentología. Falta delimitar depósitos concretos y documentar su relación con las formas observadas en Gale.']
      ], limit:'Delimita el abanico concreto y diferencia sus unidades del fondo del cráter. La similitud geométrica debe evaluarse a una escala comparable.'},
    {id:'firsoff',profile:'firsoff',name:'Cráter Firsoff',lat:2.73,lon:-9.37,range:55,
      type:'Cráter · depósitos estratificados',
      caption:'Estratos expuestos en el fondo de Firsoff, imagen THEMIS VIS · NASA/JPL-Caltech/ASU.',
      source:'https://science.nasa.gov/photojournal/firsoff-crater/',
      reference:'https://cris.unibo.it/bitstream/11585/409790/5/Equatorial%20layered%20deposits%20in%20Arabia%20Terra%2C%20Mars.pdf',referenceLabel:'Pondrelli et al. · interpretación geológica',
      features:[
        ['Estratos expuestos','Las imágenes orbitales muestran depósitos estratificados y superficies modificadas por el viento. Una interpretación propone aportes antiguos de aguas subterráneas.'],
        ['Comparación terrestre','Pilot Valley y Atacama permiten estudiar depósitos salinos. La analogía no demuestra que los estratos de Firsoff compartan su origen.']
      ], limit:'El origen de los depósitos de Firsoff se evalúa con estratigrafía y mineralogía orbital. El carácter hidrotermal se trata como hipótesis.'}
  ]
};

for (const group of lunarMatrix) for (const row of group.rows.filter(hasCoordinates)) {
  planetaryAreas.Moon.push({
    id:row.code.toLowerCase(),profile:'impact',name:row.name,lat:row.lat,lon:row.lon,range:row.diameterKm/2,
    type:'Cráter · período '+group.period,source:null,
    features:[['Matriz del usuario',row.code+' · diámetro '+row.diameterKm+' km · profundidad '+row.depthKm+' km · '+row.morphology],
      ['Coordenadas aportadas',row.lat+'°, '+row.lon+'° · longitud positiva interpretada al este'],
      ['Objetivo propuesto',row.reason??group.purpose]],
    limit:'Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original.'
  });
}

// Active destinations selected by the user. Other reference areas remain available
// internally for saved analyses, but are not offered as map/catalog locations.
export function activePlanetaryAreas(world) {
  return (planetaryAreas[world]??[]).filter(area=>world!=='Moon' || area.id==='apollo' || /^(csn|cse|csc)\d+$/i.test(area.id));
}

export const earthImages = {
  atacama:{id:'atacama',caption:'Salar de Atacama, contexto regional · NASA Earth Observatory, Landsat 7.',source:'https://science.nasa.gov/earth/earth-observatory/salar-de-atacama-chile-76518/'}
};

const bodyRadius = {Earth:6371,Moon:1737.4,Mars:3389.5};
const rad = Math.PI/180;

export function areaDistance(world,a,b) {
  const dlat = (b.lat-a.lat)*rad;
  const dlon = (b.lon-a.lon)*rad;
  const h = Math.sin(dlat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
  return 2*bodyRadius[world]*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}

export function documentedArea(world,point,catalog) {
  const entries = catalog ?? planetaryAreas[world] ?? [];
  if (!hasCoordinates(point)) return null;
  const nearby = entries.filter(hasCoordinates).map(area=>({area,km:areaDistance(world,point,area)}))
    .filter(x=>x.km <= (world==='Earth' ? 28 : x.area.range));
  return nearby.sort((a,b)=>a.km-b.km)[0] ?? null;
}

export function kmPerDegree(world) {
  return bodyRadius[world]*rad;
}
