import { hasCoordinates } from "./coordinates.js";

const planetaryAreas = {
  Moon: [ {
    id: "apollo",
    profile: "mare",
    name: "Mar de la Tranquilidad",
    lat: .674,
    lon: 23.473,
    range: 310,
    type: "Llanura basáltica · Apollo 11",
    caption: "Lugar de alunizaje del Apollo 11 · NASA/GSFC/Arizona State University.",
    source: "https://science.nasa.gov/resource/apollo-11-landing-site/",
    features: [ [ "Coladas basálticas", "Las llanuras de lava sirven para comparar basaltos, material superficial y unidades volcánicas en la Tierra." ], [ "Regolito y cráteres pequeños", "La superficie ofrece una referencia para muestreo, navegación y detección de obstáculos." ] ],
    limit: "Mide la profundidad del regolito, la rugosidad y la distribución de bloques a escala del ensayo."
  }, {
    id: "csn215",
    profile: "impact",
    name: "Manzinus T",
    lat: -67.5982,
    lon: 32.792,
    range: 10.645,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN215 · diámetro 21.29 km · profundidad 1.929 km · Tazón" ], [ "Coordenadas aportadas", "-67.5982°, 32.792° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Referencia para estudiar una estructura de mayor diámetro con borde irregular." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csn216",
    profile: "impact",
    name: "Manzinus L",
    lat: -64.436,
    lon: 22.6303,
    range: 9.055,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN216 · diámetro 18.11 km · profundidad 1.054 km · Tazón" ], [ "Coordenadas aportadas", "-64.436°, 22.6303° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de evolución y degradación" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csn217",
    profile: "impact",
    name: "Mutus H",
    lat: -63.6761,
    lon: 24.1139,
    range: 10.115,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN217 · diámetro 20.23 km · profundidad 1.675 km · Tazón" ], [ "Coordenadas aportadas", "-63.6761°, 24.1139° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de evolución y degradación" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csn218",
    profile: "impact",
    name: "Manzinus F",
    lat: -64.0839,
    lon: 19.6388,
    range: 8.75,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN218 · diámetro 17.5 km · profundidad 2.289 km · Tazón" ], [ "Coordenadas aportadas", "-64.0839°, 19.6388° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Comparar la profundidad relativa con otros cráteres de diámetro parecido." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csn202",
    profile: "impact",
    name: "Scheiner G",
    lat: -62.5883,
    lon: -28.39240000000001,
    range: 6.8,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN202 · diámetro 13.6 km · profundidad 1.586 km · Cono" ], [ "Coordenadas aportadas", "-62.5883°, -28.39240000000001° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Incorporar una morfología registrada como cono a la comparación." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csn201",
    profile: "impact",
    name: "Scheiner D",
    lat: -60.7218,
    lon: -32.30340000000001,
    range: 8.805,
    type: "Cráter · período Nectárico",
    source: null,
    features: [ [ "Matriz del usuario", "CSN201 · diámetro 17.61 km · profundidad 1.888 km · Tazón" ], [ "Coordenadas aportadas", "-60.7218°, -32.30340000000001° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de evolución y degradación" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "cse37",
    profile: "impact",
    name: "Marius C",
    lat: 13.9767,
    lon: -47.64429999999999,
    range: 5.96,
    type: "Cráter · período Eratosteniano",
    source: null,
    features: [ [ "Matriz del usuario", "CSE37 · diámetro 11.92 km · profundidad 1.369 km · Tazón" ], [ "Coordenadas aportadas", "13.9767°, -47.64429999999999° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Referencia morfológica de tazón en un entorno volcánico." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "cse47",
    profile: "impact",
    name: "Marius B",
    lat: 16.3314,
    lon: -47.351699999999994,
    range: 7.72,
    type: "Cráter · período Eratosteniano",
    source: null,
    features: [ [ "Matriz del usuario", "CSE47 · diámetro 15.44 km · profundidad 1.479 km · Embudo" ], [ "Coordenadas aportadas", "16.3314°, -47.351699999999994° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Comparar una estructura de embudo en el mismo entorno regional." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "cse03",
    profile: "impact",
    name: "König",
    lat: -24.2276,
    lon: -24.67919999999998,
    range: 11.76,
    type: "Cráter · período Eratosteniano",
    source: null,
    features: [ [ "Matriz del usuario", "CSE03 · diámetro 23.52 km · profundidad 1.626 km · Embudo" ], [ "Coordenadas aportadas", "-24.2276°, -24.67919999999998° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Comparar diferencias de geometría en un cráter de mayor diámetro en terrenos de mare." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "cse16",
    profile: "impact",
    name: "Ibn Battuta",
    lat: -6.9516,
    lon: 50.4371,
    range: 6.26,
    type: "Cráter · período Eratosteniano",
    source: null,
    features: [ [ "Matriz del usuario", "CSE16 · diámetro 12.52 km · profundidad 1.164 km · Tazón" ], [ "Coordenadas aportadas", "-6.9516°, 50.4371° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de vulcanismo y modificación superficial" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "cse07",
    profile: "impact",
    name: "Theon Senior",
    lat: -.8143,
    lon: 15.4192,
    range: 9.31,
    type: "Cráter · período Eratosteniano",
    source: null,
    features: [ [ "Matriz del usuario", "CSE07 · diámetro 18.62 km · profundidad 2.94 km · Cono" ], [ "Coordenadas aportadas", "-0.8143°, 15.4192° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de vulcanismo y modificación superficial" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csc13",
    profile: "impact",
    name: "Aristarchus",
    lat: 23.7299,
    lon: -47.490099999999984,
    range: 31.51,
    type: "Cráter · período Copernicano",
    source: null,
    features: [ [ "Matriz del usuario", "CSC13 · diámetro 63.02 km · profundidad 3.479 km · Tazón" ], [ "Coordenadas aportadas", "23.7299°, -47.490099999999984° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "El posible pico central, las paredes escalonadas, los materiales excavados y el contexto volcánico. Estos rasgos aún deben verificarse." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csc16",
    profile: "impact",
    name: "Triesnecker",
    lat: 4.181,
    lon: 3.5988,
    range: 12.955,
    type: "Cráter · período Copernicano",
    source: null,
    features: [ [ "Matriz del usuario", "CSC16 · diámetro 25.91 km · profundidad 1.801 km · Tazón" ], [ "Coordenadas aportadas", "4.181°, 3.5988° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Estudiar morfología de impacto." ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csc25",
    profile: "impact",
    name: "Menelaus",
    lat: 16.2593,
    lon: 15.9294,
    range: 13.405,
    type: "Cráter · período Copernicano",
    source: null,
    features: [ [ "Matriz del usuario", "CSC25 · diámetro 26.81 km · profundidad 2.906 km · Embudo" ], [ "Coordenadas aportadas", "16.2593°, 15.9294° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de impactos recientes y exposición de materiales profundos" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csc19",
    profile: "impact",
    name: "Bessel",
    lat: 21.7342,
    lon: 17.9204,
    range: 7.665,
    type: "Cráter · período Copernicano",
    source: null,
    features: [ [ "Matriz del usuario", "CSC19 · diámetro 15.33 km · profundidad 1.288 km · Tazón" ], [ "Coordenadas aportadas", "21.7342°, 17.9204° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de impactos recientes y exposición de materiales profundos" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  }, {
    id: "csc06",
    profile: "impact",
    name: "CSC06",
    lat: -79.40668,
    lon: 24.04089,
    range: 5.01,
    type: "Cráter · período Copernicano",
    source: null,
    features: [ [ "Matriz del usuario", "CSC06 · diámetro 10.02 km · profundidad 1.305 km · Cono" ], [ "Coordenadas aportadas", "-79.40668°, 24.04089° · longitud positiva interpretada al este" ], [ "Objetivo propuesto", "Laboratorio de impactos recientes y exposición de materiales profundos" ] ],
    limit: "Coordenadas aportadas por el usuario. La clasificación temporal, morfología y referencia cartográfica requieren contrastarse con la fuente original."
  } ],
  Mars: [ {
    id: "arcadia-ap1",
    profile: "arcadia-ap1",
    name: "Arcadia–Amazonis · AP-1",
    lat: 39.8,
    lon: -157.9,
    range: 45,
    type: "Planicie de latitud media · candidato estudiado",
    source: "https://pubs.usgs.gov/publication/70266466",
    reference: "https://doi.org/10.1029/2024JE008724",
    referenceLabel: "Luzzi et al. · coordenadas y cartografía",
    features: [ [ "Planicie de poco relieve", "AP-1 se estudió como candidato a aterrizaje. El desnivel máximo dentro de la huella HiRISE analizada fue de 31 m." ], [ "Polígonos e indicios de hielo somero", "La cartografía orbital documenta polígonos y otras formas compatibles con hielo próximo a la superficie. University Valley permite estudiar esos rasgos y ensayar el muestreo." ] ],
    limit: "La coordenada representa el sitio candidato publicado. La parcela del hábitat, el aterrizaje para un vehículo concreto y la disponibilidad local de agua requieren evaluación."
  }, {
    id: "arcadia-ap8",
    profile: "arcadia-ap8",
    name: "Arcadia–Amazonis · AP-8",
    lat: 40.75,
    lon: -158.7,
    range: 28,
    type: "Planicie de latitud media · candidato estudiado",
    source: "https://pubs.usgs.gov/publication/70266466",
    reference: "https://doi.org/10.1029/2024JE008724",
    referenceLabel: "Luzzi et al. · cartografía de AP-8",
    features: [ [ "Superficie local de poco relieve", "El estudio reporta 8 m de desnivel máximo en los 2,5 km² próximos al punto y 140 m en la huella HiRISE completa." ], [ "Indicios de hielo", "Los polígonos y el índice SWIM justifican una verificación del hielo somero." ] ],
    limit: "La parcela y la elipse de aterrizaje requieren cartografía de mayor detalle y verificación del subsuelo."
  }, {
    id: "arcadia-ap9",
    profile: "arcadia-ap9",
    name: "Arcadia–Amazonis · AP-9",
    lat: 40.02,
    lon: -156.65,
    range: 28,
    type: "Planicie de latitud media · candidato estudiado",
    source: "https://pubs.usgs.gov/publication/70266466",
    reference: "https://doi.org/10.1029/2024JE008724",
    referenceLabel: "Luzzi et al. · cartografía de AP-9",
    features: [ [ "Relieve de la zona estudiada", "El estudio reporta 10 m de desnivel máximo en la huella HiRISE de AP-9." ], [ "Indicios de hielo", "El estudio recoge para AP-9 el mayor índice de consistencia SWIM de los tres candidatos AP; la profundidad y concentración locales requieren verificación." ] ],
    limit: "Confirma la rugosidad, la capacidad portante y la continuidad del hielo en la zona operativa."
  }, {
    id: "deuteronilus",
    profile: "deuteronilus",
    name: "Deuteronilus Mensae",
    lat: 43.56,
    lon: 22.6,
    range: 145,
    type: "Valles y mesetas · prospección regional",
    source: "https://www.nasa.gov/centers-and-facilities/jpl/where-should-future-astronauts-land-on-mars-follow-the-water/",
    reference: "https://planetarynames.wr.usgs.gov/Feature/1509",
    referenceLabel: "IAU / USGS · coordenadas regionales",
    features: [ [ "Hielo cubierto por detritos", "El radar SHARAD respalda la interpretación de depósitos ricos en hielo en lóbulos de la región." ], [ "Selección de terreno", "El centro regional orienta la exploración. Se requiere localizar una planicie operativa y estudiar sus rutas hacia el recurso." ] ],
    limit: "La región es de interés para prospección. Su evaluación de aterrizaje y base empieza por delimitar un sector local."
  }, {
    id: "jezero",
    profile: "jezero",
    name: "Cráter Jezero",
    lat: 18.44,
    lon: 77.45,
    range: 160,
    type: "Antiguo lago y delta",
    caption: "Sector noreste de Jezero, imagen orbital THEMIS · NASA/JPL-Caltech/ASU.",
    source: "https://www.jpl.nasa.gov/images/pia25350-jezero-crater/",
    features: [ [ "Delta y sedimentos", "El antiguo ingreso de agua depositó sedimentos. Su arquitectura permite diseñar recorridos y planes de muestreo." ], [ "Carbonatos y antiguas orillas", "Las unidades lacustres permiten preparar la búsqueda de bioseñales. El catálogo terrestre actual no incluye un equivalente mineralógico de sus carbonatos; la comparación sedimentaria requiere evidencia específica." ] ],
    limit: "Distingue las unidades del delta, del borde y del fondo del cráter. Verifica mineralogía y pendientes en el área concreta."
  }, {
    id: "meridiani",
    profile: "arid",
    name: "Meridiani Planum · cráter Eagle",
    lat: -1.9483,
    lon: -5.52583,
    range: 320,
    type: "Llanura sedimentaria",
    caption: "Materiales de Meridiani Planum · NASA/JPL-Caltech.",
    source: "https://science.nasa.gov/resource/meridiani-planum-2/",
    features: [ [ "Hematita y jarosita", "Opportunity identificó ambos minerales en rocas sedimentarias del cráter Eagle. Los depósitos conservan evidencia de procesos relacionados con agua antigua." ], [ "Planicies con material suelto", "El relieve permite comparar movilidad y cartografía de suelos áridos y sedimentos." ] ],
    limit: "Verifica mineralogía y escala de los depósitos. Un salar terrestre permite ensayar procesos concretos con diferencias ambientales."
  }, {
    id: "phoenix",
    profile: "polar",
    name: "Planicie polar · Phoenix",
    lat: 68.22,
    lon: -125.75,
    range: 240,
    type: "Planicie de altas latitudes",
    caption: "Panorama del lugar de aterrizaje de Phoenix · NASA/JPL-Caltech/University of Arizona/Texas A&M University.",
    source: "https://www.jpl.nasa.gov/images/pia13804-mars-panorama-of-phoenix-landing-site-and-lander-deck/",
    features: [ [ "Hielo somero", "Las excavaciones de Phoenix permiten orientar ensayos de detección y muestreo de hielo en el subsuelo." ], [ "Terreno poligonal", "Los patrones superficiales y el ambiente frío favorecen la comparación con desiertos polares terrestres." ] ],
    limit: "Comprueba profundidad y continuidad del hielo, pendiente y condiciones térmicas de la zona de ensayo."
  }, {
    id: "olympus",
    profile: "volcanic",
    name: "Olympus Mons",
    lat: 18.65,
    lon: -133.8,
    range: 500,
    type: "Volcán en escudo",
    caption: "Mosaico orbital de Viking 1 · NASA/JPL/USGS.",
    source: "https://science.nasa.gov/photojournal/olympus-mons/",
    features: [ [ "Edificio volcánico", "El escudo, la caldera y las coladas permiten comparar formas volcánicas con terrenos basálticos terrestres." ], [ "Relieve heterogéneo", "Los flancos y las superficies circundantes ofrecen contrastes útiles para cartografía orbital y planificación de rutas." ] ],
    limit: "Selecciona un flanco o una unidad concreta. Comprueba pendientes y escala antes de transferir conclusiones desde un volcán terrestre."
  }, {
    id: "ulysses",
    profile: "ulysses",
    name: "Ulysses Colles",
    lat: 6.14,
    lon: -123.09,
    range: 85,
    type: "Campo volcánico · conos y coladas",
    caption: "Conos y coladas en una imagen CTX · NASA Earth Observatory/Lauren Dauphin, con datos de NASA MRO.",
    source: "https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/",
    reference: "https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf",
    referenceLabel: "INGEMMET · Andahua–Orcopampa",
    features: [ [ "Conos y cráteres de cima", "El campo permite cartografiar cráteres de cima, flancos y su relación con las coladas. Su morfología es compatible con conos de escoria." ], [ "Comparación terrestre", "Andahua–Orcopampa, en Arequipa, permite comparar la forma de los conos y preparar transectos de cartografía." ] ],
    limit: "Compara la geometría con el mismo método y escala. La composición de los materiales marcianos requiere evidencia independiente."
  }, {
    id: "gale",
    profile: "gale",
    name: "Cráter Gale · sector de Curiosity",
    lat: -4.59,
    lon: 137.44,
    range: 85,
    type: "Cuenca de impacto · abanicos aluviales",
    caption: "Mapa en falso color del sector de aterrizaje de Curiosity y del abanico aluvial · NASA/JPL-Caltech/ASU.",
    source: "https://science.nasa.gov/photojournal/downslope-of-the-fan/",
    reference: "https://science.nasa.gov/resource/river-fans-on-earth-and-mars/",
    referenceLabel: "NASA · abanicos en la Tierra y Marte",
    features: [ [ "Abanicos y canales fósiles", "Los depósitos y canales próximos al aterrizaje de Curiosity permiten reconstruir el transporte de sedimentos y orientar transectos." ], [ "Comparación terrestre", "Nasca–Palpa se propone para explorar geomorfología desértica y sedimentología. Falta delimitar depósitos concretos y documentar su relación con las formas observadas en Gale." ] ],
    limit: "Delimita el abanico concreto y diferencia sus unidades del fondo del cráter. La similitud geométrica debe evaluarse a una escala comparable."
  }, {
    id: "firsoff",
    profile: "firsoff",
    name: "Cráter Firsoff",
    lat: 2.73,
    lon: -9.37,
    range: 55,
    type: "Cráter · depósitos estratificados",
    caption: "Estratos expuestos en el fondo de Firsoff, imagen THEMIS VIS · NASA/JPL-Caltech/ASU.",
    source: "https://science.nasa.gov/photojournal/firsoff-crater/",
    reference: "https://cris.unibo.it/bitstream/11585/409790/5/Equatorial%20layered%20deposits%20in%20Arabia%20Terra%2C%20Mars.pdf",
    referenceLabel: "Pondrelli et al. · interpretación geológica",
    features: [ [ "Estratos expuestos", "Las imágenes orbitales muestran depósitos estratificados y superficies modificadas por el viento. Una interpretación propone aportes antiguos de aguas subterráneas." ], [ "Comparación terrestre", "Pilot Valley y Atacama permiten estudiar depósitos salinos. La analogía no demuestra que los estratos de Firsoff compartan su origen." ] ],
    limit: "El origen de los depósitos de Firsoff se evalúa con estratigrafía y mineralogía orbital. El carácter hidrotermal se trata como hipótesis."
  } ]
};

export function activePlanetaryAreas(world) {
  return planetaryAreas[world] ?? [];
}

const bodyRadius = {
  Earth: 6371,
  Moon: 1737.4,
  Mars: 3389.5
};

const rad = Math.PI / 180;

function areaDistance(world, a, b) {
  const dlat = (b.lat - a.lat) * rad;
  const dlon = (b.lon - a.lon) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 2 * bodyRadius[world] * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function documentedArea(world, point, catalog) {
  const entries = catalog ?? planetaryAreas[world] ?? [];
  if (!hasCoordinates(point)) return null;
  const nearby = entries.filter(hasCoordinates).map(area => ({
    area: area,
    km: areaDistance(world, point, area)
  })).filter(x => x.km <= (world === "Earth" ? 28 : x.area.range));
  return nearby.sort((a, b) => a.km - b.km)[0] ?? null;
}
