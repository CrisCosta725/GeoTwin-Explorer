import {adequateCoverage,adequateTerrain,comparisonReason,evidenceStatus,outcomeGrid,prepareValidation,rankScenario,reproducibleCases,thresholds,validationExport,windows} from './validation-model.js';
import {geologyArea} from './sector-comparison.js';
import {normalizeTolerances,summarizeScenarios} from './validation-policy.js';
import {measurementCaution} from './analogy-limits.js';

const id=value=>document.getElementById(value);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeHref=value=>{
  if (typeof value!=='string') return null;
  try {
    const url=new URL(value);
    return ['http:','https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
const number=new Intl.NumberFormat('es-PE',{maximumFractionDigits:2});
const unit=(value,suffix)=>value==null?'Sin datos':number.format(value)+suffix;
const pct=value=>value==null?'Sin datos':number.format(value*100)+' %';
const link=(url,label)=>{
  const href=safeHref(url);
  return href ? '<a target="_blank" rel="noopener" href="'+esc(href)+'">'+esc(label)+'</a>' : esc(label);
};

export function bindValidation(study,download) {
  const form=id('validation-form');
  const area=id('validation-results');
  const matrix=id('validation-matrix');
  const status=id('validation-status');
  const exportControls=id('validation-exports');
  const caseInput=id('validation-case');
  const widthInput=id('validation-width');
  const limitInput=id('validation-limit');
  const priorityInput=id('validation-priority');
  const note=id('validation-note');
  const settings=()=>[Number(widthInput.value),limitInput.valueAsNumber,priorityInput.value];
  const margins=()=>normalizeTolerances({slopeDeg:id('validation-slope-margin').valueAsNumber,
    geologyFraction:id('validation-geology-margin').valueAsNumber/100});
  let result,revision=0;
  const customLinks=()=>study.atlasRows().length && !study.outdatedSearch();
  const updateCustom=()=>{
    id('validation-use-scan').disabled=!customLinks();
  };
  const currentSiteOptions=()=>{
    if (!customLinks()) return [];
    const selected=study.pilot();
    const rows=study.atlasRows();
    const preferred=selected?[selected,...rows.filter(row=>row.id!==selected.id)]:rows;
    return preferred.map(row=>({id:String(row.id),label:'Sector '+row.id,center:row.center,
      role:row===selected?'Piloto de la búsqueda':'Candidato'}));
  };

  function render() {
    exportControls.hidden=true;
    if (!result || !form.reportValidity()) return;
    const [width,limit,priority]=settings();
    const {target,scales,official,preset}=result;
    result.tolerances=margins();
    const grid=outcomeGrid(result,priority);
    const stability=summarizeScenarios(grid);
    matrix.innerHTML='<p class="study-note">Candidatos con al menos '+pct(adequateCoverage)+
      ' de celdas con pendiente evaluable y '+pct(adequateTerrain)+' de las evaluables bajo el umbral. La referencia debe tener al menos 80 % de cobertura de pendiente.'+
      (official?' Se exige cartografía en al menos 80 % de la huella y presencia cartografiada del rasgo.':' La evidencia geológica regional se revisa por separado.')+
      ' Los controles quedan fuera del orden.</p>'+
      '<div class="table-wrap"><table aria-label="Sensibilidad del primer candidato"><thead><tr><th>Ventana</th>'+
      thresholds.map(value=>'<th scope="col">'+value+'°</th>').join('')+'</tr></thead><tbody>'+
      grid.map(({width:w,outcomes})=>'<tr><th scope="row">'+w+' × '+w+' km</th>'+
        outcomes.map((outcome,i)=>'<td><button type="button" class="outline validation-scenario" data-window="'+w+'" data-limit="'+thresholds[i]+
          '" aria-pressed="'+(w===width&&thresholds[i]===limit)+'"'+(outcome?'':' disabled')+'>'+
          esc(outcome?.equivalent.length>1?'Equivalentes: '+outcome.equivalent.map(row=>row.label).join(' / '):outcome?.leader?.label ?? (outcome?'Ninguno cumple':'Resolución insuficiente'))+'</button></td>').join('')+'</tr>').join('')+
      '</tbody></table></div><p class="study-note">'+stability.computed+' escenarios calculados; '+stability.withoutCandidate+
      ' sin candidato y '+stability.tied+' con equivalencia. '+esc(stability.interpretation)+'</p>';
    if (!scales[width]) {
      area.innerHTML='<p class="empty">Los DEM de este caso requieren un paso mayor que el que admite esta ventana. Puedes elegir una ventana mayor.</p>';
      return;
    }
    const {ref,areas}=scales[width];
    const outcome=rankScenario(areas,ref.stats,limit,priority,!!official,result.tolerances);
    const {leader,alternative,choices,controls}=outcome;
    const presetInfo=reproducibleCases[preset];
    const refPass=ref.slopes.length?ref.slopes.filter(slope=>slope<=limit).length/ref.slopes.length:null;
    const rows=[{...ref,role:'Referencia planetaria',pass:refPass,coverage:ref.stats.slopeCoverage},...choices,...controls];
    const fields=(item)=>{
      const data=item.stats;
      const inOrder=choices.includes(item);
      const evidence=official && item.geometry;
      const geo=item.geology;
      return '<tr><th scope="row">'+esc(item.label)+'<small>'+esc(item.role)+
        (item.sourceReference?' · '+link(item.sourceReference,'Fuente del sitio'):'')+'</small>'+
        (item.context?'<small>'+esc(item.context)+'</small>':'')+'</th><td>'+
        (inOrder?(choices.indexOf(item)+1)+' · '+(item.eligible?(outcome.equivalent.length>1&&outcome.equivalent.includes(item)?'Equivalente':item===leader?'Primero':item===alternative?'Alternativa':'Cumple'):'Fuera de mínimos')+
          (item.exclusions.length?'<small>'+esc(item.exclusions.join('; '))+'</small>':''):'—')+
        '</td><td>'+unit(data.slope,'°')+'</td><td>'+unit(data.slopeP90,'°')+'</td><td>'+unit(data.roughness,' m')+
        (data.roughness==null?'':'<small>'+pct(data.roughnessCoverage)+' de celdas con vecindad completa</small>')+
        '</td><td>'+unit(item.delta,'°')+'</td><td>'+pct(item.pass)+'<small>'+pct(item.coverage)+' de cobertura</small></td><td>'+
        (evidence?evidenceStatus(geo)+(geo?.status==='covered'?'<small>'+geologyArea(geo.matched,geo.share)+' de la huella · '+pct(geo.coverage)+' cartografiada</small>':''):'—')+
        '</td><td>'+link(item.source.url,item.source.name)+'<small>'+unit(item.resolution,' m')+' de grilla</small></td></tr>';
    };
    const summary=esc(comparisonReason(outcome,priority,!!official));
    area.innerHTML='<p class="study-reason">'+summary+'</p><p class="study-note">'+esc(target.name)+' · ventana '+width+
      ' × '+width+' km · paso común de '+unit(ref.step*1000,' m')+' · umbral '+unit(limit,'°')+
      '. Rugosidad: mediana de la desviación estándar de elevaciones en vecindades completas de 3 × 3 celdas.</p>'+
      (official?'<p class="study-note">'+link(official.url,official.name)+' · '+esc(official.scale)+' · '+esc(official.label)+'. '+esc(official.limit)+'</p>':'')+
      (presetInfo?'<p class="study-note">'+esc(presetInfo.reason)+'</p>':'')+
      '<p class="study-note">'+esc(measurementCaution)+'</p>'+
      '<div class="table-wrap" tabindex="0"><table aria-label="Indicadores del escenario seleccionado"><thead><tr><th>Sitio</th><th>Orden y estado</th>'+
      '<th>Pendiente mediana</th><th>Pendiente P90</th><th>Rugosidad local</th><th>Δ pendiente</th><th>Bajo el umbral</th>'+
      '<th>Evidencia cartográfica</th><th>Modelo de elevación</th></tr></thead><tbody>'+rows.map(fields).join('')+'</tbody></table></div>';
    exportControls.hidden=false;
  }

  async function run(useScan) {
    const request=++revision;
    result=null;
    matrix.replaceChildren();
    area.replaceChildren();
    exportControls.hidden=true;
    const preset=useScan?null:caseInput.value;
    const sourceSearch=useScan?study.analysis:null;
    const target=useScan?sourceSearch?.target:study.api.validationTarget(preset);
    const cases=reproducibleCases[preset];
    const sites=useScan?currentSiteOptions():cases?.sites;
    if (!target || !sites?.length) {
      status.textContent='Ejecuta una búsqueda con sectores terrestres antes de comparar tus resultados.';
      return;
    }
    if (useScan && sourceSearch.boundary) {
      status.textContent='Se probarán ventanas cuadradas centradas en tus sectores. Pueden extenderse fuera del límite dibujado.';
    } else status.textContent='Calculando tres escalas con los modelos de elevación…';
    note.value=useScan?study.note:'';
    if (useScan) limitInput.value=sourceSearch.limit;
    try {
      const next=await prepareValidation(target,sites,useScan?sourceSearch.trait:cases.trait,preset);
      if (request!==revision) return;
      result=next;
      priorityInput.disabled=!result.official;
      if (!result.official) priorityInput.value='terrain';
      const scaleCount=Object.keys(result.scales).length;
      status.textContent=scaleCount ? (useScan?'Sectores de tu búsqueda':'Caso reproducible')+' · '+scaleCount+' ventanas calculadas.'+
        (useScan&&sourceSearch.boundary?' Las ventanas cuadradas se centran en tus sectores y pueden extenderse fuera del límite dibujado.':''):
        'La resolución de los modelos disponibles es insuficiente para estas ventanas.';
      render();
    } catch {
      if (request===revision) status.textContent='No se pudieron cargar los modelos de elevación. Vuelve a calcular para reintentar.';
    }
  }
  form.addEventListener('submit',event=>{event.preventDefault();run(false)});
  id('validation-use-scan').addEventListener('click',()=>run(true));
  caseInput.addEventListener('change',()=>{
    revision++;
    result=null;
    priorityInput.disabled=false;
    matrix.replaceChildren();
    area.replaceChildren();
    exportControls.hidden=true;
    status.textContent='Pulsa «Calcular caso» para mostrar los resultados de esta referencia.';
  });
  for (const input of [widthInput,limitInput,priorityInput,id('validation-slope-margin'),id('validation-geology-margin')]) input.addEventListener('change',render);
  matrix.addEventListener('click',event=>{
    const button=event.target.closest('[data-window][data-limit]');
    if (!button) return;
    widthInput.value=button.dataset.window;
    limitInput.value=button.dataset.limit;
    render();
    matrix.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  });
  for (const [button,type] of [['validation-export-csv','csv'],['validation-export-json','json']]) {
    id(button).addEventListener('click',()=>{
      const [width,limit,priority]=settings();
      if (!result?.scales[width] || !form.reportValidity()) return;
      const {payload,csv}=validationExport(result,width,limit,priority,note.value.trim());
      const name=result.preset??'sectores';
      download('GeoTwin-'+name+'-sensibilidad.'+type,type==='csv'?'text/csv;charset=utf-8':'application/json',
        type==='csv'?csv:JSON.stringify(payload,null,2));
      status.textContent=type==='csv'?'CSV del escenario descargado.':'Ficha JSON con polígonos y escenarios descargada.';
    });
  }
  const savedIds=['validation-case','validation-width','validation-limit','validation-priority','validation-slope-margin','validation-geology-margin','validation-note'];
  updateCustom.snapshot=()=>({parameters:Object.fromEntries(savedIds.map(key=>[key,id(key).value])),result});
  updateCustom.restore=saved=>{
    ++revision;
    result=null;
    area.replaceChildren();matrix.replaceChildren();exportControls.hidden=true;
    if (!saved) return;
    for (const key of savedIds) if (typeof saved.parameters?.[key]==='string') id(key).value=saved.parameters[key];
    result=saved.result;
    priorityInput.disabled=!result?.official;
    render();updateCustom();
  };
  return updateCustom;
}
