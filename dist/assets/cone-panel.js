import {compareCones} from './cone-metrics.js';
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
const fmt=(v,u='',digits=2)=>Number.isFinite(v)?v.toLocaleString('es-PE',{maximumFractionDigits:digits})+u:'Sin resolución / datos';
const slots=['cone-earth-base','cone-earth-crater','cone-target-base','cone-target-crater'];

export function bindConePanel(study,download) {
  let result=null,revision=0;
  function render() {
    id('cone-export').disabled=!result;
    const root=id('cone-results');root.replaceChildren();
    if (!result) return;
    root.innerHTML='<p class="study-note">Paso común: '+fmt(result.stepM,' m')+'. Altura sobre el plano de base; profundidad bajo el plano del borde del cráter.</p>'+
      '<div class="table-wrap" tabindex="0"><table aria-label="Morfometría de conos individuales"><thead><tr><th>Contorno</th><th>Diámetro equivalente / máximo</th><th>Altura</th><th>H/D</th><th>Cráter: diámetro / profundidad</th><th>Pendiente mediana / P90</th><th>Cobertura / DEM</th></tr></thead><tbody>'+
      result.measurements.map(m=>'<tr><th scope="row">'+esc(m.label)+'<small>'+esc(m.world)+'</small></th><td>'+fmt(m.diameterKm*1000,' m')+' / '+fmt(m.maxDiameterKm*1000,' m')+'</td><td>'+fmt(m.heightM,' m')+'</td><td>'+fmt(m.heightDiameter,'',3)+'</td><td>'+(m.crater?fmt(m.crater.diameterKm*1000,' m')+' / '+fmt(m.crater.depthM,' m'):'Sin cráter delimitado')+'</td><td>'+fmt(m.slopeMedianDeg,'°')+' / '+fmt(m.slopeP90Deg,'°')+'</td><td>'+fmt(m.coverage*100,' %')+' / '+fmt(m.resolutionM,' m')+'<small>'+esc(m.source?.name??'DEM')+'</small></td></tr>').join('')+'</tbody></table></div>'+
      result.measurements.map(m=>'<p class="study-note"><strong>'+esc(m.label)+'</strong> · RMS del plano de base: '+fmt(m.basePlane?.rmsM,' m')+'. '+m.warnings.map(esc).join(' ')+'</p>').join('')+
      result.measurements.map(m=>'<p class="study-note">'+esc(m.label)+' · '+link(m.source?.url??'https://www.nasa.gov/',m.source?.name??'Fuente del DEM')+'. Referencia vertical: '+esc(m.source?.datum??'Consultar fuente')+'.'+(m.crater?' Diámetro de cráter/base: '+fmt(m.crater.diameterRatio,'',3)+'.':'')+'</p>').join('')+
      '<ul class="study-note">'+result.limits.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>';
  }
  function refresh() {
    const areas=[...study.library.values()];
    for (const key of slots) {
      const select=id(key),value=select.value;
      const earth=key.includes('earth'),crater=key.endsWith('crater');
      select.replaceChildren(new Option(crater?'Sin cráter delimitado':'Seleccionar base',''),...areas.filter(a=>(a.world==='Earth')===earth).map(a=>new Option(a.label+' · '+a.world,a.id)));
      if (areas.some(a=>a.id===value)) select.value=value;
    }
  }
  for (const key of slots) id(key).addEventListener('change',()=>{++revision;result=null;render();id('cone-status').textContent='Selección modificada. Vuelve a medir.';});
  id('cone-run').addEventListener('click',async()=>{
    const epoch=++revision;
    const objects=[];
    for (const prefix of ['cone-earth','cone-target']) {
      const base=study.library.get(id(prefix+'-base').value),crater=study.library.get(id(prefix+'-crater').value);
      if (crater && !base) {id('cone-status').textContent='Selecciona la base asociada a cada cráter.';return;}
      if (base) objects.push({base,crater});
    }
    if (!objects.length) {id('cone-status').textContent='Dibuja y mide una base en el atlas, y selecciónala aquí.';return;}
    result=null;render();id('cone-run').disabled=true;id('cone-status').textContent='Midiendo bases, cráteres y flancos al mismo paso…';
    try {
      const measured=await compareCones(objects);
      if (epoch!==revision) return;
      result=measured;render();
      id('cone-status').textContent='Medición terminada. '+measured.measurements.filter(m=>m.resolved).length+' de '+objects.length+' bases con resolución suficiente.';
    } catch (error) {if (epoch===revision) id('cone-status').textContent='No se pudo medir. '+error.message;}
    finally {id('cone-run').disabled=false;}
  });
  id('cone-export').addEventListener('click',()=>{
    if (result) download('GeoTwin-conos.json','application/json',JSON.stringify(result,null,2));
  });
  return {refresh,snapshot:()=>({selection:Object.fromEntries(slots.map(key=>[key,id(key).value])),result}),restore:saved=>{
    ++revision;refresh();
    for (const key of slots) id(key).value=saved?.selection?.[key]??'';
    result=saved?.result??null;render();
    id('cone-status').textContent=result?'Mediciones recuperadas del proyecto.':'';
  }};
}
