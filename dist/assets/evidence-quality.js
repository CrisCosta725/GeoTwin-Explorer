import {geologySummary} from './sector-comparison.js';

const localDescriptions={
  university:{hielo:'Sondeos con profundidad al suelo cementado por hielo.'},
  farnell:{hielo:'Sondeos en el valle. El marcador es una referencia regional.'},
  barrow:{hielo:'Testigos de suelo congelado. La ficha describe tundra con deshielo estacional.'},
  mullins:{hielo:'Testigos de hielo y sedimento. El marcador indica el centro del valle.'},
  'cienaga-norte':{jarosita:'Identificación mineralógica publicada. Verificar la ubicación de las muestras.',hematita:'Identificación mineralógica publicada. Verificar la ubicación de las muestras.'},
  'cinder-lake':{crater:'Modelos de elevación de cráteres artificiales publicados por USGS.'}
};

export const evidenceLabels={local:'Medición local publicada',regional:'Capa o referencia regional',point:'Registro puntual publicado',
  pending:'Verificación pendiente',geology:'Cartografía oficial',terrain:'Topografía medida',provided:'Capa aportada'};

export function catalogEvidence(site,tag) {
  if (site.originStatus==='unverified') return {level:'pending',detail:'La ubicación propuesta no verifica el origen geológico ni los materiales. Se requiere evidencia independiente.'};
  if (![...(site.geology ?? []),...(site.terrain ?? [])].includes(tag)) {
    return {level:'pending',detail:'Este rasgo carece de evidencia registrada en la ficha. No equivale a una ausencia comprobada.'};
  }
  const detail=localDescriptions[site.id]?.[tag];
  return detail ? {level:'local',detail} :
    {level:'regional',detail:'La ficha respalda el rasgo a escala del sitio. Falta medirlo en el sector de ensayo.'};
}

// Evidence scope is reported directly, without inventing a probability of validity.
export function summarizeEvidence(site,groups) {
  const required=[...new Set(groups.flatMap(group=>group.values.map(tag=>group.field+':'+tag)))];
  const records=required.map(key=>{
    const [field,tag]=key.split(':');
    return {field,tag,...(site[field]?.includes(tag)?catalogEvidence(site,tag):
      {level:'pending',detail:'Rasgo pendiente de verificación en la ficha.'})};
  });
  const local=records.filter(record=>record.level==='local').length;
  const regional=records.filter(record=>record.level==='regional').length;
  const pending=records.length-local-regional;
  const coverage=records.length?Math.round((local+regional)/records.length*100):0;
  const label=local===records.length && local?'Evidencia local publicada':local?'Evidencia local y regional':
    regional?'Evidencia regional':'Sin respaldo para los rasgos solicitados';
  return {total:records.length,local,regional,pending,coverage,label,records};
}

export function sectorEvidence(row,analysis) {
  const records=[];
  if (analysis.official) {
    records.push({level:row.geology?.status==='covered'?'geology':'pending',
      detail:geologySummary(row.geology,analysis.official),source:analysis.official});
  }
  for (const item of row.evidencePoints ?? []) records.push({level:'point',detail:item.detail,source:item});
  for (const item of row.volcanic ?? []) records.push({level:'point',detail:'Centro volcánico incluido en el inventario GVP.',
    source:{name:item.name,url:'https://volcano.si.edu/volcano.cfm?vn='+item.id}});
  if (row.thematicMatch!=null && analysis.thematic) records.push({level:'regional',
    detail:Math.round(row.thematicMatch*100)+' % de coincidencia entre celdas clasificadas, con '+Math.round(row.thematicCoverage*100)+' % de cobertura.',
    source:analysis.thematic});
  if (row.match!=null && analysis.source) records.push({level:'provided',
    detail:Math.round(row.match*100)+' % de coincidencia por centros de celda.',source:{name:'Cartografía aportada',url:analysis.source}});
  if (analysis.trait==='relieve' && (row.stats.slope!=null || row.stats.relief!=null)) {
    records.push({level:'terrain',detail:'Pendiente y relieve derivados del modelo de elevación.',source:row.source});
  }
  if (analysis.trait!=='relieve' || !records.length) records.push({level:'pending',
    detail:'Verificar el rasgo en el sector a la escala requerida para el ensayo.'});
  return records;
}
