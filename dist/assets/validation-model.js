import {geologyCase,geologyMetadata,loadGeology,measureGeology} from './geology-coverage.js';
import {loadHawaiiStudy,reliefSources} from './relief.js';
import {catalogGeometry} from './result-map.js';
import {square,stats,studyRelief,surface} from './study-metrics.js';
import {csvCell} from './sector-comparison.js';
import {analogyLimits,measurementCaution} from './analogy-limits.js';
import {rankWithPolicy,reasonWithPolicy,normalizeTolerances,summarizeScenarios} from './validation-policy.js';

export const windows=[5,10,20];
export const thresholds=[5,12,20];
export const adequateCoverage=.8;
export const adequateTerrain=.75;
const demWindow=20;
const method='geotwin-sensibilidad-2';

const nahuku={label:'Nāhuku · tubo documentado',center:{lat:19.41359,lon:-155.238811},
  source:'https://www.nps.gov/havo/planyourvisit/day-hike-nahuku.htm',
  context:'Centro aproximado en el acceso publicado por NPS. La cartografía mide el sustrato basáltico.'};
const maunaKea={label:'Mauna Kea · conos documentados',center:{lat:19.82,lon:-155.47},
  source:'https://www.usgs.gov/volcanoes/mauna-kea/',
  context:'Centro regional del sector de cumbre. USGS documenta conos de escoria en el entorno.'};

export const reproducibleCases={
  'marius-basalt':{label:'Luna · Marius Hills',trait:'cueva',sites:[
    {id:'pilot',label:'Sector 1',role:'Piloto de referencia',center:{lat:19.36004,lon:-155.74064}},
    {id:'alternative',label:'Sector 4',role:'Alternativa de referencia',center:{lat:19.53990,lon:-155.74086}},
    {id:'known',...nahuku,role:'Control conocido'},
    {id:'control',label:'Flanco norte de Mauna Kea',role:'Control cartográfico',center:{lat:19.87,lon:-155.44}}
  ],reason:'El sector 1 parte con mayor cobertura de coladas que el sector 4 en el cribado original. Comprueba si conserva el primer lugar al variar la escala y la pendiente. Para un ensayo en cavidades, Nāhuku aporta evidencia directa del rasgo terrestre.'},
  'ulysses-scoria':{label:'Marte · Ulysses Colles',trait:'volcánico',sites:[
    {id:'pilot',label:'Sector 5',role:'Piloto de referencia',center:{lat:19.86,lon:-155.49}},
    {id:'alternative',label:'Sector 7',role:'Alternativa de referencia',center:{lat:20.03976,lon:-155.68146}},
    {id:'known',...maunaKea,role:'Control conocido'},
    {id:'control',label:'Flanco de Mauna Loa',role:'Control cartográfico',center:{lat:19.54,lon:-155.55}}
  ],reason:'El sector 5 parte con más superficie cartografiada como conos de escoria y el sector 7 con una pendiente más cercana a la referencia. Verifica si el umbral favorece la alternativa y contrasta las formas a mayor detalle.'},
  'andahua-ulysses':{label:'Perú · Andahua–Orcopampa frente a Ulysses Colles',targetCase:'ulysses-scoria',geology:false,trait:'volcánico',sites:[
    {id:'andagua',label:'Andahua–Orcopampa',role:'Candidato peruano',center:{lat:-15.42,lon:-72.33},
      source:'https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf',
      context:'Punto regional del campo. INGEMMET documenta conos y coladas; la ventana no delimita un cono individual.'},
    {id:'huambo',label:'Huambo · Cerro Keyocc',role:'Alternativa peruana',center:{lat:-15.701667,lon:-72.0025},
      source:'https://volcano.si.edu/volcano.cfm?vn=354005',context:'Comparación regional centrada en el punto del catálogo.'},
    {id:'known',...maunaKea,model:'hawaii',role:'Control volcánico documentado'},
    {id:'control',label:'Atacama · control de procedimiento',role:'Control de relieve árido',center:{lat:-24.10,lon:-69.93},
      source:'https://science.nasa.gov/solar-system/analog-explorer/',context:'Control de procedimiento; no se interpreta como prueba de volcanismo.'}
  ],reason:'Hipótesis de analogía geomorfológica regional, propuesta por GeoTwin. Las fuentes respaldan los paisajes volcánicos de cada mundo, no una validación independiente de este par. Se comparan ventanas a escala común. Faltan geometrías de conos, mineralogía y verificación de campo para extender la interpretación.'}
};

export function evidenceStatus(geology) {
  if (geology?.status==='unavailable') return 'Capa no disponible';
  if (geology?.status!=='covered') return 'Sin cobertura cartográfica';
  if (geology.matched>0) return 'Rasgo cartografiado';
  return geology.coverage>=.99 ? 'Rasgo no cartografiado' : 'Sin rasgo en la parte cartografiada';
}

export function rankScenario(areas,reference,limit,priority,hasGeology,tolerances) {
  return rankWithPolicy(areas,reference,limit,priority,hasGeology,tolerances);
}

async function evaluateWindow(world,site,width,step,model,criterion,data) {
  const geometry=world==='Earth'?catalogGeometry(square(world,site.center,width)):null;
  const points=world==='Earth'?null:square(world,site.center,width);
  const grid=await surface(world,site.center,width,Math.round(width/step),model);
  const slopes=grid.cells.map(cell=>cell.slope).filter(Number.isFinite);
  const measured=stats(grid,null,12);
  let geology;
  if (geometry && criterion) {
    try { geology=measureGeology(geometry,site.center,criterion,data); }
    catch { geology={status:'unavailable'}; }
  }
  return {...site,sourceReference:site.source,geometry,points,stats:measured,slopes,geology,step:grid.step,
    source:reliefSources[model.source],resolution:model.resolution};
}

export function comparisonReason(outcome,priority,hasGeology) {
  return reasonWithPolicy(outcome,priority,hasGeology);
}

export async function prepareValidation(target,sites,trait,preset) {
  const criterion=geologyCase(target,trait);
  const [reference,models,geology]=await Promise.all([
    studyRelief(target.world,target.center,demWindow),
    Promise.all(sites.map(site=>(preset==='marius-basalt'||preset==='ulysses-scoria'||site.model==='hawaii')?
      loadHawaiiStudy():studyRelief('Earth',site.center,demWindow))),
    criterion?loadGeology().catch(()=>null):null
  ]);
  const coarse=Math.max(.5,reference.resolution/1000,...models.map(model=>model.resolution/1000));
  const scales={};
  for (const width of windows) {
    const divisions=Math.floor(width/coarse+1e-8);
    if (divisions<3) continue;
    const step=width/divisions;
    const [ref,...areas]=await Promise.all([
      evaluateWindow(target.world,{label:target.name,center:target.center},width,step,reference,null,null),
      ...sites.map((site,i)=>evaluateWindow('Earth',site,width,step,models[i],criterion,geology))
    ]);
    scales[width]={ref,areas};
  }
  return {target,trait,official:criterion?geologyMetadata(criterion):null,scales,coarse,preset};
}

export function outcomeGrid(result,priority,tolerances=result.tolerances) {
  return windows.map(width=>({width,outcomes:thresholds.map(limit=>{
    const scale=result.scales[width];
    return scale?rankScenario(scale.areas,scale.ref.stats,limit,priority,!!result.official,tolerances):null;
  })}));
}

export function validationExport(result,width,limit,priority,note,tolerances=result.tolerances) {
  const {ref,areas}=result.scales[width];
  const outcome=rankScenario(areas,ref.stats,limit,priority,!!result.official,tolerances);
  const {choices,controls,leader,alternative}=outcome;
  const decision=comparisonReason(outcome,priority,!!result.official);
  const parameters={windowKm:width,stepKm:ref.step,slopeLimitDeg:limit,minimumSlopeCoverage:adequateCoverage,
    minimumTerrainFraction:adequateTerrain,minimumGeologyCoverage:adequateCoverage,priority,tolerances:normalizeTolerances(tolerances)};
  const simplify=({slopes,geometry,...site})=>site;
  const records=[...choices,...controls];
  const referencePass=ref.slopes.length?ref.slopes.filter(slope=>slope<=limit).length/ref.slopes.length:null;
  const payload={
    method,case:result.preset??null,target:{...result.target,center:ref.center,vertices:ref.points,source:ref.source,resolution:ref.resolution,stats:{...ref.stats,pass:referencePass}},
    parameters,geology:result.official,leader:outcome.equivalent.length===1?leader.id:null,
    representative:leader?.id??null,equivalentCandidates:outcome.equivalent.map(row=>row.id),
    alternative:alternative?.id??null,decision,justification:note,
    limits:analogyLimits(result.target.world),uncertainty:measurementCaution,
    stability:summarizeScenarios(outcomeGrid(result,priority,tolerances)),
    presetRationale:reproducibleCases[result.preset]?.reason,
    scenarios:outcomeGrid(result,priority,tolerances).map(({width,outcomes})=>({
      windowKm:width,results:outcomes.map((outcome,i)=>({limitDeg:thresholds[i],computed:!!outcome,
        leader:outcome?.equivalent.length===1?outcome.leader.id:null,equivalentCandidates:outcome?.equivalent.map(row=>row.id)??[],
        candidates:outcome?.choices.map(site=>({id:site.id,eligible:site.eligible,fractionUnderLimit:site.pass}))??[]}))
    })),
    terrestrial:{type:'FeatureCollection',features:records.map(site=>({type:'Feature',
      geometry:site.geometry.length===1?{type:'Polygon',coordinates:site.geometry[0]}:{type:'MultiPolygon',coordinates:site.geometry},
      properties:simplify(site)}))}
  };
  const headers=['caso','referencia_planetaria','url_referencia','ventana_km','paso_m','umbral_grados','prioridad','ubicacion','rol','orden','seleccionable','latitud','longitud','area_km2',
    'pendiente_mediana_grados','pendiente_p90_grados','rugosidad_local_m','cobertura_rugosidad_pct','delta_pendiente_grados','relieve_p90_p10_m','bajo_umbral_pct','cobertura_pendiente_pct',
    'estado_cartografia','cobertura_cartografia_pct','rasgo_en_huella_pct','resolucion_dem_m','url_dem','url_evidencia_control','url_cartografia','explicacion_orden','justificacion','razon_ejemplo',
    'margen_pendiente_grados','margen_cartografia_puntos_pct','equivalente_al_primero','razones_exclusion','incertidumbre','limites_analogia'];
  const percent=value=>value==null?null:value*100;
  const rowsReference={...ref,role:'Referencia planetaria',coverage:ref.stats.slopeCoverage,pass:ref.slopes.length?
    ref.slopes.filter(slope=>slope<=limit).length/ref.slopes.length:null};
  const rows=[rowsReference,...records].map(site=>[
    result.preset??'búsqueda propia',result.target.name,result.target.documented?.url,width,site.step*1000,limit,priority,
    site.label,site.role,choices.includes(site)?choices.indexOf(site)+1:null,choices.includes(site)?site.eligible? 'Sí':'No':null,site.center.lat,site.center.lon,site.stats.area,
    site.stats.slope,site.stats.slopeP90,site.stats.roughness,percent(site.stats.roughnessCoverage),site.delta,site.stats.relief,percent(site.pass),percent(site.coverage),
    site.geometry&&result.official?evidenceStatus(site.geology):null,percent(site.geology?.coverage),percent(site.geology?.share),
    site.resolution,site.source.url,typeof site.sourceReference==='string'?site.sourceReference:null,site.geometry?result.official?.url:null,
    site===rowsReference?decision:null,site===leader||(!leader&&site===rowsReference)?note:null,site===rowsReference?reproducibleCases[result.preset]?.reason:null,
    outcome.tolerances.slopeDeg,outcome.tolerances.geologyFraction*100,outcome.equivalent.includes(site)?'Sí':'No',site.exclusions?.join('; '),measurementCaution,
    analogyLimits(result.target.world).join(' ')
  ]);
  return {payload,csv:'\uFEFF'+[headers.join(','),...rows.map(row=>row.map(csvCell).join(','))].join('\r\n')};
}
