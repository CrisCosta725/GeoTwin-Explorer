import {searches,searchArea} from './discovery.js';
import {prepareValidation,reproducibleCases,validationExport} from './validation-model.js';
import {normalizeTolerances} from './validation-policy.js';
import {casePeruGeology} from './peru-geology.js';

export function targetForCase(key) {
  const descriptor=reproducibleCases[key];
  const search=searches.find(item=>item.geologyCase===(descriptor?.targetCase ?? key));
  if (!search) return null;
  const area=searchArea(search);
  return {world:search.world,center:{lat:area.lat,lon:area.lon},name:area.name,
    geologyCase:descriptor?.geology===false?undefined:search.geologyCase,
    documented:{name:'Evidencia planetaria',url:search.source}};
}

export const showcase={
  id:'andahua-ulysses',
  title:'Andahua–Orcopampa ↔ Ulysses Colles',
  hypothesis:'Evaluar si el relieve regional de un campo volcánico peruano ofrece un terreno útil para practicar cartografía de paisajes con conos y coladas, con Ulysses Colles como referencia marciana.',
  process:'La analogía propuesta estudia formas asociadas al volcanismo y su relación espacial con las coladas. Las fuentes no establecen que la composición o la historia eruptiva de los dos campos sean iguales.',
  scope:'Comparación geomorfológica regional. El centro terrestre representa el campo volcánico; la ventana cuadrada no es el contorno de un cono ni una ruta de campo validada.',
  sources:[
    {name:'INGEMMET · Mariño y Zavala (2010), cartografiado de Andahua–Orcopampa',url:'https://app.ingemmet.gob.pe/biblioteca/pdf/CPG15-199.pdf',
      supports:'Conos de ceniza y escoria, coladas y composición variable en el campo terrestre. El mapa publicado es 1:50 000; sus polígonos no están digitalizados en esta comparación.'},
    {name:'INGEMMET · GEOCATMIN, Geología 100K empalmados',url:'https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_MAPAS_GEOLOGICOS/MapServer/11',
      supports:'Polígonos oficiales regionales, códigos de unidad, litología y hojas. Recortes incluidos para Andahua y Huambo a 1:100 000, distintos del mapa 1:50 000 de la publicación de 2010.'},
    {name:'Smithsonian GVP · Andahua–Orcopampa, 354004',url:'https://volcano.si.edu/volcano.cfm?vn=354004',
      supports:'Coordenada regional de referencia del campo terrestre.'},
    {name:'NASA Earth Observatory · Scoria Cones on Earth and Mars (2026)',url:'https://science.nasa.gov/earth/earth-observatory/scoria-cones-on-earth-and-mars/',
      supports:'Contexto e interpretación volcánica de Ulysses Colles. Su comparación terrestre publicada es con Arizona; el par peruano es una hipótesis de GeoTwin.'}
  ],
  reproduced:['Pendiente mediana y P90 a escala común','Relieve relativo P90−P10','Rugosidad regional y fracción de terreno bajo un umbral'],
  pending:['Delimitar e interpretar cada cono y su cráter con imágenes; medirlos en el comparador individual a resolución suficiente','Composición y mineralogía comparables','Edad, erosión y secuencia de emplazamiento','Temperatura, polvo, iluminación y condiciones del subsuelo','Acceso y comprobación de campo para un ensayo real'],
  mission:{
    objective:'Preparar un reconocimiento cartográfico regional de un paisaje volcánico.',
    protocol:'Comparar una ventana de 20 × 20 km en cada mundo a paso común. Revisar cobertura, pendiente mediana, P90 y relieve; contrastar el candidato con Huambo y dos controles. Cambiar escala y umbral antes de elegir.',
    metric:'Fracción de celdas con pendiente ≤ 12°',unit:'%',operator:'>=',threshold:75,
    origin:'Resultado del DEM regional; no es una prueba de conducción ni un ensayo de campo.'
  }
};

export function assessMission(plan) {
  const observed=plan.observed;
  if (!Number.isFinite(plan.threshold) || !Number.isFinite(observed)) {
    return {status:'pending',label:'Medición pendiente',detail:'Registra una observación para contrastar el criterio del ensayo.'};
  }
  if (plan.unit==='%' && (observed<0 || observed>100 || plan.threshold<0 || plan.threshold>100)) {
    return {status:'invalid',label:'Valor fuera de rango',detail:'Los porcentajes deben estar entre 0 y 100.'};
  }
  const passed=plan.operator==='>='?observed>=plan.threshold:plan.operator==='<='?observed<=plan.threshold:null;
  if (passed===null) return {status:'invalid',label:'Criterio inválido',detail:'Selecciona un operador de comparación.'};
  return {status:passed?'met':'not-met',label:passed?'Criterio numérico alcanzado':'Criterio numérico no alcanzado',
    detail:'Resultado limitado al dato registrado y al protocolo indicado; requiere revisar escala, cobertura y condiciones del ensayo.'};
}

export const missionFields=['objective','protocol','metric','unit','operator','threshold','observed','notes'];

export function updateMissionPlan(previous,values,changedField) {
  const plan=Object.fromEntries(missionFields.map(field=>[field,values[field] ?? (['threshold','observed'].includes(field)?null:'')]));
  plan.origin=previous?.origin || values.origin || 'Medición pendiente.';
  if (['metric','unit','protocol'].includes(changedField) && previous?.[changedField]!==plan[changedField]) {
    plan.observed=null;
    plan.origin='Protocolo o métrica modificados; registrar una nueva observación.';
  } else if (changedField==='observed') {
    plan.origin=Number.isFinite(plan.observed)?'Dato aportado por el usuario; sin validación independiente.':'Medición pendiente.';
  }
  return plan;
}

export async function calculateShowcase({width=20,limit=12,priority='terrain',tolerances}={}) {
  const preset=reproducibleCases[showcase.id];
  const result=await prepareValidation(targetForCase(showcase.id),preset.sites,preset.trait,showcase.id);
  result.tolerances=normalizeTolerances(tolerances);
  const exported=validationExport(result,width,limit,priority,showcase.scope);
  const candidate=exported.payload.terrestrial.features.find(feature=>feature.properties.id==='andagua');
  const observed=candidate.properties.pass==null?null:candidate.properties.pass*100;
  const mission={...showcase.mission,metric:'Fracción de celdas con pendiente ≤ '+limit+'°',observed};
  const comparisonCoverage=candidate.properties.coverage;
  const assessment=assessMission(mission);
  const screeningStatus=comparisonCoverage<.8?'Cobertura regional insuficiente':
    assessment.status==='met'?'Cumple los mínimos del escenario regional':'No cumple los mínimos del escenario regional';
  const payload={...exported.payload,scientificCase:showcase,
    regionalGeology:await casePeruGeology(exported.payload.terrestrial.features),
    mission:{...mission,assessment,comparisonCoverage,screeningStatus,
      caveat:'Los umbrales de 80 % de cobertura y 75 % bajo la pendiente límite son supuestos de demostración; no requisitos validados de un vehículo.'}};
  return {result,payload,csv:exported.csv};
}

export function caseMarkdown(payload) {
  const measurements=[{label:payload.target.name,stats:payload.target.stats,pass:payload.target.stats.pass,resolution:payload.target.resolution},
    ...payload.terrestrial.features.map(feature=>feature.properties)];
  const rows=measurements.map(s=>'| '+s.label+' | '+
    [s.stats.slope,s.stats.slopeP90,s.stats.relief,s.stats.roughness,s.pass==null?null:s.pass*100].map(v=>
      Number.isFinite(v)?v.toFixed(3):'Sin datos').join(' | ')+' | '+s.resolution+' |');
  return ['# '+showcase.title,'',showcase.hypothesis,'',showcase.process,'',showcase.scope,'',
    'Método: '+payload.method+'. Ventana: '+payload.parameters.windowKm+' km. Paso común: '+payload.parameters.stepKm*1000+' m.',
    'Las pendientes están en grados; el relieve y la rugosidad, en metros. La fracción bajo el umbral está en porcentaje.','',
    '| Sitio | Pendiente mediana | P90 | Relieve P90−P10 | Rugosidad | Bajo umbral (%) | DEM (m) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',...rows,'',payload.decision,'',
    '## Protocolo y resultado','',payload.mission.protocol,'',
    payload.mission.metric+': '+(payload.mission.observed==null?'Sin datos':payload.mission.observed.toFixed(3)+' %')+'. '+payload.mission.screeningStatus+'.',
    payload.mission.caveat,'',payload.mission.origin,'',
    '## Cartografía geológica peruana','',
    ...(payload.regionalGeology?.windows??[]).map(w=>'- '+w.label+': '+(w.coverage*100).toFixed(2)+' % cartografiado; '+w.andaguaArea.toFixed(3)+' km² del Grupo Andagua (Qp-an).'),
    payload.regionalGeology?.source.limitation??'',
    'La cobertura usa unión e intersección de polígonos. La clasificación regional no delimita conos; no interviene en el orden por pendiente.','',
    '## Límites y comprobaciones pendientes','',...payload.limits.map(line=>'- '+line),
    ...showcase.pending.map(line=>'- '+line),'',payload.uncertainty,'',
    '## Fuentes','',...showcase.sources.map(source=>'- ['+source.name+']('+source.url+'). '+source.supports),
    '- DEM planetario: '+payload.target.source.url,
    ...[...new Set(payload.terrestrial.features.map(f=>f.properties.source.url))].map(url=>'- DEM terrestre: '+url),'',
    'Recalcular: npm run examples. Verificación de referencias científicas: 2026-11-14.',''].join('\n');
}
