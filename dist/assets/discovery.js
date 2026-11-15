import {analogs, profiles, tags} from './analogs.js';
import {planetaryAreas} from './areas.js';
import {terrainMetrics, terrainWindowKm} from './terrain-comparison.js';
import {hasCoordinates} from './coordinates.js';

const arcadiaSource = 'https://pubs.usgs.gov/publication/70266466';

export const searches = [
  {area:'arcadia-ap1', world:'Mars', environment:'Polar y permafrost', trait:'polar',
    label:'Hielo bajo el suelo · AP‑1', source:arcadiaSource,
    evidence:'La geomorfología orbital de AP‑1 indica posible hielo somero. El ensayo terrestre necesita observaciones de hielo en el subsuelo.',
    groups:[{field:'geology',label:'Evidencia de hielo o permafrost',values:['hielo']}],
    next:'Contrastar profundidad, humedad y contenido de hielo con observaciones directas en cada punto de ensayo.'},
  {area:'malapert', world:'Moon', environment:'Relieve polar', trait:'relieve',
    label:'Relieve polar · Malapert', source:'https://science.nasa.gov/image-detail/20100618/',
    evidence:'La topografía lunar permite analizar laderas y visibilidad. El cruce identifica terrenos polares accidentados para comparar sus formas y pendientes.',
    groups:[{field:'terrain',label:'Ambiente polar',values:['polar']},{field:'terrain',label:'Relieve accidentado',values:['accidentado']}],
    next:'Delimitar un transecto comparable y verificar pendientes y rugosidad con un modelo de detalle.'},
  {area:'ulysses', world:'Mars', environment:'Volcánico', trait:'volcánico', geologyCase:'ulysses-scoria',
    label:'Conos volcánicos · Ulysses Colles', source:'https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/',
    evidence:'Las imágenes CTX muestran conos cuya forma es compatible con conos de escoria. El cruce busca terrenos volcánicos con piroclastos documentados.',
    groups:[{field:'geology',label:'Piroclastos',values:['piroclastos']},{field:'terrain',label:'Relieve volcánico',values:['volcanico']}],
    next:'Medir diámetro, altura, pendiente de flancos y relación con las coladas en modelos de detalle.'},
  {area:'marius', world:'Moon', environment:'Cuevas y tubos de lava', trait:'cueva', geologyCase:'marius-basalt',
    label:'Acceso a cavidades · Marius Hills', source:'https://science.nasa.gov/photojournal/marius-hills-pit-lava-tube-skylight/',
    evidence:'La imagen LROC muestra una posible abertura a un tubo de lava. La búsqueda identifica sitios con basaltos y tubos documentados.',
    groups:[{field:'geology',label:'Basaltos',values:['basalto']},{field:'terrain',label:'Tubos de lava',values:['tubos']}],
    next:'Cartografiar la abertura y la geometría interna con levantamientos de detalle.'},
  {area:'meridiani', world:'Mars', environment:'Desiertos y terrenos áridos', trait:'árido',
    label:'Suelos áridos y salinos · Meridiani', source:'https://pubs.usgs.gov/publication/70028845',
    evidence:'Los datos de Opportunity documentan sulfatos en rocas y sedimentos. Los ambientes áridos y salinos ofrecen una referencia para ensayar muestreo superficial.',
    groups:[{field:'geology',label:'Sales',values:['sales']},{field:'terrain',label:'Ambiente árido',values:['desierto','eolico']}],
    next:'Medir mineralogía, granulometría y humedad en las muestras del sector elegido.'},
  {area:'meridiani', world:'Mars', environment:'Mineralogía', trait:'mineralógico',
    label:'Jarosita y hematita · cráter Eagle', source:'https://www.usgs.gov/publications/in-situ-evidence-ancient-aqueous-environment-meridiani-planum-mars',
    evidence:'Opportunity documentó jarosita y hematita en sedimentos del cráter Eagle. La búsqueda exige evidencia publicada de los dos minerales para ensayar su identificación.',
    groups:[{field:'geology',label:'Jarosita',values:['jarosita']},{field:'geology',label:'Hematita',values:['hematita']}],
    next:'Verificar los afloramientos y comparar espectros de muestras terrestres y marcianas con el mismo criterio.'}
];

for (const [world,areas] of Object.entries(planetaryAreas)) {
  for (const area of areas) {
    if (searches.some(search=>search.world===world && search.area===area.id)) continue;
    const profile=profiles[world].find(item=>item.id===area.profile);
    const trait=profile.terrain.includes('tubos') ? 'cueva' :
      profile.geology.includes('hielo') || profile.terrain.includes('polar') ? 'polar' :
      profile.terrain.includes('volcanico') ? 'volcánico' :
      profile.terrain.includes('desierto') ? 'árido' :
      profile.geology.some(tag=>['carbonatos','sales'].includes(tag)) ? 'mineralógico' : 'relieve';
    const groups=[{field:'geology',label:'Geología',values:profile.geology},
      {field:'terrain',label:'Geomorfología y ambiente',values:profile.terrain}].filter(group=>group.values.length);
    searches.push({area:area.id,world,environment:'Otras regiones',trait,label:area.name,source:area.source,
      evidence:profile.description,groups,next:'Verificar localmente los rasgos coincidentes, la escala de los datos y las diferencias con el destino.'});
  }
}

export const searchArea = search => planetaryAreas[search.world].find(area=>area.id===search.area);

export function screenSite(search,site) {
  const matched = [];
  const missing = [];
  for (const {field,label,values} of search.groups) {
    const present = values.filter(value=>site[field].includes(value));
    if (present.length) matched.push(...present.map(value=>tags[value]));
    else missing.push(label);
  }
  return {site,matched:[...new Set(matched)],missing};
}

export async function discover(search,region,terrainLimit) {
  const target = searchArea(search);
  const targetTerrain = await terrainMetrics(search.world,target).catch(()=>null);
  const pool = analogs.filter(site=>region==='all'||site.region===region);
  const rows = await Promise.all(pool.map(async site=>{
    const row = screenSite(search,site);
    if (!hasCoordinates(site)) return {...row,status:'unknown',reason:'Ubicación pendiente de coordenadas; rasgos y origen por verificar.'};
    if (row.missing.length) return {...row,status:'excluded'};
    const terrain = await terrainMetrics('Earth',site).catch(()=>null);
    const difference = terrain?.metrics && targetTerrain?.metrics
      ? Math.abs(terrain.metrics.slope-targetTerrain.metrics.slope)
      : null;
    const status = terrainLimit===null ? 'candidate'
      : difference===null ? 'unknown'
      : difference<=terrainLimit ? 'candidate' : 'excluded';
    return {...row,terrain,difference,status};
  }));
  const priority = {candidate:0,unknown:1,excluded:2};
  rows.sort((a,b)=>priority[a.status]-priority[b.status]
    || Number(b.site.evidence.startsWith('Candidato'))-Number(a.site.evidence.startsWith('Candidato'))
    || (a.difference??Infinity)-(b.difference??Infinity) || a.site.name.localeCompare(b.site.name,'es'));
  return {target,targetTerrain,rows,window:terrainWindowKm};
}
