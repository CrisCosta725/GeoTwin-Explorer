const areaFormat=new Intl.NumberFormat('es-PE',{maximumFractionDigits:3});
const pct=new Intl.NumberFormat('es-PE',{style:'percent',maximumFractionDigits:2});

export function geologyArea(area,share) {
  const percent=share>0 && share<.0001 ? 'menos de 0.01%' : pct.format(share);
  const surface=area>0 && area<.001 ? 'menos de 0.001 km²' : areaFormat.format(area)+' km²';
  return surface+' ('+percent+')';
}

export function geologySummary(geology,source) {
  if (geology?.status==='unavailable') return 'La cartografía no se pudo cargar. Repite la búsqueda para calcular la cobertura';
  if (geology?.status!=='covered') return 'Sin cobertura de esta cartografía en la huella del sector';
  return source.label+': '+geologyArea(geology.matched,geology.share)+' de la huella. '+
    'Cobertura cartográfica: '+geologyArea(geology.mapped,geology.coverage)+', escala '+source.scale;
}

export function candidateComparison(analysis,pilot) {
  return {pilot,alternative:pilot?analysis.found.find(row=>row.id!==pilot.id):undefined};
}

const fields=['referencia_planetaria','cuerpo','url_referencia','rasgo','sector','orden','rol',
  'latitud','longitud','area_sector_km2','pendiente_mediana_grados','delta_pendiente_grados','relieve_p90_p10_m',
  'delta_relieve_m','umbral_pendiente_grados','pendiente_bajo_umbral_pct','cobertura_pendiente_pct',
  'paso_muestreo_m','resolucion_dem_m','url_dem_terrestre','url_dem_planetario',
  'estado_cartografia','criterio_cartografico','area_cartografiada_km2','cobertura_cartografica_pct',
  'area_coincidente_km2','coincidencia_en_huella_pct','unidades_coincidentes','escala_cartografica',
  'url_cartografia','url_publicacion','limite_interpretacion','justificacion_piloto',
  'pendiente_p90_grados','rugosidad_local_m','cobertura_rugosidad_pct'];

export function csvCell(value) {
  if (value==null) return '';
  if (typeof value==='number') return Number.isFinite(value) ? String(Number(value.toFixed(6))) : '';
  const string=String(value);
  // Keep labels and notes literal when opened in a spreadsheet.
  const safe=/^[\s\uFEFF]*[=+@-]/.test(string) ? "'"+string : string;
  return '"'+safe.replaceAll('"','""')+'"';
}

export function candidateCsv(analysis,pilot,note='') {
  const {alternative}=candidateComparison(analysis,pilot);
  const {target,official}=analysis;
  const percent=value=>value==null ? null : value*100;
  const world=target.world==='Moon'?'Luna':'Marte';
  const rows=analysis.found.map((row,index)=>{
    const geometry=row.geology;
    const covered=geometry?.status==='covered';
    const role=row.id===pilot?.id?'Piloto':row.id===alternative?.id?'Alternativa':'Candidato';
    const unitNames=geometry?.units?.filter(unit=>unit.match)
      .map(unit=>[unit.code,unit.name,unit.rock,unit.composition].filter(Boolean).join(' · ')).join(' | ');
    const status=official ? ({covered:'Con cobertura',outside:'Sin cobertura',unavailable:'Capa no disponible'})[geometry?.status] : null;
    return [target.name,world,target.documented?.url,analysis.trait,row.id,index+1,role,row.center.lat,row.center.lon,row.stats.area,
      row.stats.slope,row.difference,row.stats.relief,row.reliefDifference,analysis.limit,percent(row.stats.pass),percent(row.stats.slopeCoverage),
      analysis.step*1000,row.resolution,row.source?.url,analysis.targetSource?.url,status,official?.label,
      covered?geometry.mapped:null,covered?percent(geometry.coverage):null,covered?geometry.matched:null,covered?percent(geometry.share):null,
      unitNames,official?.scale,official?.url,official?.publication,official?.limit,role==='Piloto'?note:null,
      row.stats.slopeP90,row.stats.roughness,percent(row.stats.roughnessCoverage)];
  });
  return '\uFEFF'+[fields.join(','),...rows.map(row=>row.map(csvCell).join(','))].join('\r\n');
}
