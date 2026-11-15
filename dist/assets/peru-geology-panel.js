import {catalogGeometry} from './result-map.js';
import {loadPeruGeology,measurePeruGeology,peruRegions,peruWindow} from './peru-geology.js';
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
const fmt=(v,u='')=>v.toLocaleString('es-PE',{maximumFractionDigits:2})+u;

export function bindPeruGeologyPanel(study,download) {
  let result=null,revision=0;
  function refresh() {
    const select=id('peru-geology-area'),value=select.value;
    select.replaceChildren(...peruRegions.map(r=>new Option(r.label,'region:'+r.id)),
      ...[...study.library.values()].filter(a=>a.world==='Earth').map(a=>new Option(a.label,a.id)));
    if ([...select.options].some(o=>o.value===value)) select.value=value;
  }
  const selection=()=>{
    const value=id('peru-geology-area').value;
    const region=peruRegions.find(r=>'region:'+r.id===value);
    if (region) return {...region,geometry:peruWindow(region)};
    const area=study.library.get(value);
    if (!area) throw Error('Selecciona una región o polígono terrestre.');
    return {...area,geometry:catalogGeometry(area.points),saved:true};
  };
  function render() {
    const root=id('peru-geology-results');root.replaceChildren();id('peru-geology-export').disabled=!result;
    if (!result) return;
    const m=result.measurement,s=result.source;
    root.innerHTML='<p class="study-reason">'+esc(result.label)+' · '+fmt(m.coverage*100,' % cartografiado')+' ('+fmt(m.mapped,' km²')+'). Grupo Andagua (Qp-an): '+fmt(m.andaguaArea,' km²')+' / '+fmt(m.andaguaShare*100,' % de la huella')+'.</p>'+
      '<p class="study-note">'+link(s.url,s.name)+' · '+esc(s.scale)+' · hojas '+esc(s.sheets.join(', '))+'. Consulta: '+esc(s.retrievedAt.slice(0,10))+'. '+esc(s.limitation)+'</p>'+ 
      (m.status==='outside'?'<p>El polígono está fuera de los dos recortes incluidos o no tiene unidades disponibles. La ausencia de cobertura no demuestra ausencia del rasgo.</p>':
        '<div class="table-wrap" tabindex="0"><table aria-label="Unidades geológicas peruanas intersectadas"><thead><tr><th>Código / unidad</th><th>Litología original</th><th>Hoja</th><th>Área intersectada</th></tr></thead><tbody>'+
        m.units.map(u=>'<tr><th scope="row">'+esc(u.code)+' · '+esc(u.name)+'</th><td>'+esc(u.description??'Sin descripción')+'</td><td>'+esc(u.sheets.join(', '))+'</td><td>'+fmt(u.area,' km²')+'</td></tr>').join('')+'</tbody></table></div>')+
      '<p class="study-note">La cobertura se calcula sobre la unión de polígonos, respetando sus huecos. Las unidades que se superponen pueden sumar más que la huella; solapamiento entre clases: '+fmt(m.overlapArea??0,' km²')+'. Qp-an describe lavas andesíticas y basálticas según la fuente; su presencia no confirma conos, tubos ni equivalencia mineralógica con Marte.</p>';
  }
  id('peru-geology-area').addEventListener('change',()=>{++revision;result=null;render();});
  id('peru-geology-run').addEventListener('click',async()=>{
    const epoch=++revision;result=null;render();id('peru-geology-run').disabled=true;
    id('peru-geology-status').textContent='Intersectando la huella con polígonos oficiales…';
    try {
      const selected=selection(),data=await loadPeruGeology();
      const measurement=measurePeruGeology(selected.geometry,selected.center,data,{includeFeatures:true});
      if (epoch!==revision) return;
      result={method:'geotwin-peru-geology-1',label:selected.label,source:data.metadata,geometry:{type:'MultiPolygon',coordinates:selected.geometry},measurement};
      render();id('peru-geology-status').textContent='Intersección terminada con cartografía incluida; no requiere conexión.';
    } catch (error) {if (epoch===revision) id('peru-geology-status').textContent=error.message;}
    finally {id('peru-geology-run').disabled=false;}
  });
  id('peru-geology-map').addEventListener('click',()=>{
    const selected=selection();
    if (selected.saved) study.openSaved(selected.id);else study.api.openArea('Earth',selected.center);
    id('study-layer').value='peru-geology';study.loadEvidencePoints();study.paint();
  });
  id('peru-geology-export').addEventListener('click',()=>{
    if (!result) return;
    const {features,...measurement}=result.measurement;
    download('GeoTwin-INGEMMET-interseccion.geojson','application/geo+json',JSON.stringify({type:'FeatureCollection',
      method:result.method,source:result.source,studyFootprint:result.geometry,measurement,features},null,2));
  });
  refresh();
  return {refresh,snapshot:()=>({selection:id('peru-geology-area').value,result}),restore:saved=>{
    ++revision;refresh();if (saved?.selection) id('peru-geology-area').value=saved.selection;
    result=saved?.result??null;render();id('peru-geology-status').textContent=result?'Intersección recuperada del proyecto.':'';
  }};
}
