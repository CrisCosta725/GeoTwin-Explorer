import {showcase,calculateShowcase,caseMarkdown,assessMission,missionFields,updateMissionPlan} from './case-study.js';
import {analogyLimits,planetaryLimits,measurementCaution} from './analogy-limits.js';

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
const link=(url,label)=>{
  const href=safeHref(url);
  return href ? '<a href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(label)+'</a>' : esc(label);
};
const number=new Intl.NumberFormat('es-PE',{maximumFractionDigits:2});
const fields=missionFields;
const storageKey='geotwin-mission-plans-v1';

export function bindMissionPanel({context,openCase,openAtlas,download}) {
  const form=id('mission-form');
  let plans={},activeKey=null,caseData=null,caseBusy=false,caseEpoch=0;
  const key=ctx=>JSON.stringify([ctx.world,ctx.reference,ctx.site?.id]);
  const isShowcase=ctx=>ctx.world==='Mars' && ctx.target.id==='ulysses' && ctx.site?.id==='andagua';
  const defaults=ctx=>isShowcase(ctx)?{...showcase.mission,observed:null,origin:'Plan de ensayo; medición pendiente.',notes:''}:
    {objective:'Evaluar el rasgo seleccionado en una parcela terrestre.',protocol:'Definir el instrumento, la parcela, el procedimiento y una referencia de campo antes de medir.',
      metric:'Error respecto a una referencia independiente',unit:'%',operator:'<=',threshold:10,observed:null,
      origin:'Plan de ensayo; medición pendiente.',notes:''};
  function read() {
    const plan={origin:plans[activeKey]?.origin ?? defaults(context()).origin};
    for (const field of fields) {
      const input=id('mission-'+field);
      plan[field]=['threshold','observed'].includes(field)?(input.value.trim()===''?null:input.valueAsNumber):input.value.trim();
    }
    return plan;
  }
  function renderAssessment() {
    const result=assessMission(read());
    const status=id('mission-assessment');
    status.dataset.state=result.status;
    status.textContent=result.label+'. '+result.detail;
    id('mission-origin').textContent=plans[activeKey]?.origin ?? 'Medición pendiente.';
  }
  function refresh() {
    const ctx=context();
    const next=key(ctx);
    if (activeKey!==next) {
      activeKey=next;
      const plan=plans[next] ??=defaults(ctx);
      for (const field of fields) id('mission-'+field).value=plan[field] ?? '';
      id('mission-status').textContent='';
    }
    id('mission-context').textContent=(ctx.site?.name ?? 'Sitio pendiente')+' ↔ '+ctx.target.name;
    id('mission-limits').innerHTML=analogyLimits(ctx.world,ctx.site).map(line=>'<li>'+esc(line)+'</li>').join('');
    const source=planetaryLimits[ctx.world]?.source;
    id('mission-limits-source').innerHTML=source?link(source.url,source.name):'';
    id('mission-apply-case').disabled=!caseData || !isShowcase(ctx);
    renderAssessment();
  }
  form.addEventListener('input',event=>{
    const field=event.target.id.replace(/^mission-/,'');
    plans[activeKey]=updateMissionPlan(plans[activeKey],read(),field);
    id('mission-observed').value=plans[activeKey].observed ?? '';
    renderAssessment();
    id('mission-status').textContent='Cambios pendientes de guardar.';
  });
  id('mission-save').addEventListener('click',()=>{
    if (!form.reportValidity()) return;
    plans[activeKey]=read();
    try {localStorage.setItem(storageKey,JSON.stringify({version:1,plans}));id('mission-status').textContent='Planes guardados en este navegador.';}
    catch {id('mission-status').textContent='No se pudo guardar. Descarga el plan para conservarlo.';}
  });
  id('mission-export').addEventListener('click',()=>{
    if (!form.reportValidity()) return;
    const ctx=context(),plan=read();
    download('GeoTwin-plan-de-ensayo.json','application/json',JSON.stringify({method:'geotwin-mission-1',context:ctx,
      plan,assessment:assessMission(plan),limits:analogyLimits(ctx.world,ctx.site),uncertainty:measurementCaution},null,2));
    id('mission-status').textContent='Plan y resultado descargados con su referencia, fuentes y límites.';
  });
  id('mission-apply-case').addEventListener('click',()=>{
    if (!caseData || !isShowcase(context())) return;
    const plan=updateMissionPlan(null,{...caseData.payload.mission,notes:''});
    plans[activeKey]=plan;
    for (const field of fields) id('mission-'+field).value=plan[field] ?? '';
    renderAssessment();
    id('mission-status').textContent='Se han aplicado métricas del DEM regional. Guarda el plan para conservarlas.';
  });
  id('showcase-open').addEventListener('click',()=>{openCase();openAtlas();});
  function renderCase() {
    id('showcase-downloads').hidden=!caseData;
    if (!caseData) {id('showcase-results').replaceChildren();return;}
    const payload=caseData.payload;
    const rows=[{label:payload.target.name,stats:payload.target.stats,resolution:payload.target.resolution,source:payload.target.source},
      ...payload.terrestrial.features.map(feature=>feature.properties)];
    const cell=value=>Number.isFinite(value)?number.format(value):'Sin datos';
    id('showcase-results').innerHTML='<p class="study-reason">'+esc(payload.decision)+'</p>'+
      '<div class="table-wrap" tabindex="0"><table aria-label="Caso peruano a escala común"><thead><tr><th>Sitio</th><th>Pendiente mediana (°)</th><th>P90 (°)</th><th>Relieve (m)</th><th>Rugosidad (m)</th><th>DEM</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><th scope="row">'+esc(row.label)+'</th><td>'+cell(row.stats.slope)+'</td><td>'+cell(row.stats.slopeP90)+
        '</td><td>'+cell(row.stats.relief)+'</td><td>'+cell(row.stats.roughness)+'</td><td>'+((safeHref(row.source?.url) ? '<a href="'+esc(safeHref(row.source.url))+'" target="_blank" rel="noopener">'+cell(row.resolution)+' m</a>' : cell(row.resolution)+' m'))+'</td></tr>').join('')+
      '</tbody></table></div><p class="study-note">Ventana de '+cell(payload.parameters.windowKm)+' × '+cell(payload.parameters.windowKm)+' km; paso común de '+cell(payload.parameters.stepKm*1000)+' m. '+esc(payload.mission.screeningStatus)+
      '. '+esc(payload.mission.caveat)+'</p>'+
      '<p class="study-note">Geología de INGEMMET a 1:100 000: '+(payload.regionalGeology?.windows??[]).map(w=>esc(w.label)+' '+cell(w.coverage*100)+' % cartografiado; '+cell(w.andaguaShare*100)+' % de la huella en Grupo Andagua (Qp-an)').join(' · ')+'. <a href="#geologia-peru">Consultar unidades e intersecciones</a>.</p>';
  }
  id('showcase-run').addEventListener('click',async()=>{
    if (caseBusy) return;
    caseBusy=true;id('showcase-run').disabled=true;
    const epoch=++caseEpoch;
    id('showcase-status').textContent='Calculando los modelos locales, las tres escalas y los controles…';
    openCase();
    try {
      const calculated=await calculateShowcase();
      if (epoch!==caseEpoch) return;
      caseData=calculated;renderCase();
      id('showcase-status').textContent='Caso calculado con datos incluidos. La comparación regional no resuelve los conos individuales.';
      id('showcase-downloads').hidden=false;
      refresh();
    } catch {
      caseData=null;id('showcase-downloads').hidden=true;
      id('showcase-results').replaceChildren();
      id('showcase-status').textContent='No se pudieron cargar los datos del caso. Revisa que se haya extraído toda la carpeta y vuelve a calcular.';
      refresh();
    } finally {caseBusy=false;id('showcase-run').disabled=false;}
  });
  for (const type of ['json','csv','md']) id('showcase-export-'+type).addEventListener('click',()=>{
    if (!caseData) return;
    download('GeoTwin-andahua-ulysses.'+type,type==='csv'?'text/csv;charset=utf-8':type==='json'?'application/json':'text/markdown;charset=utf-8',
      type==='json'?JSON.stringify(caseData.payload,null,2):type==='csv'?caseData.csv:caseMarkdown(caseData.payload));
    id('showcase-status').textContent='Archivo '+type.toUpperCase()+' del caso descargado.';
  });
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if (saved?.version===1 && saved.plans && typeof saved.plans==='object' && !Array.isArray(saved.plans)) plans=saved.plans;
  } catch { /* Start with an empty plan when storage is unavailable. */ }
  refresh();
  return {refresh,snapshot:()=>({version:1,plans,caseData}),restore:saved=>{
    ++caseEpoch;caseData=saved?.caseData??null;renderCase();
    id('showcase-status').textContent=caseData?'Caso recuperado del proyecto, con su cartografía y resultados.':'';
    if (saved?.version===1 && saved.plans && typeof saved.plans==='object' && !Array.isArray(saved.plans)) {
      plans=saved.plans;activeKey=null;refresh();
    }
  }};
}
