import {PlanetAtlas,worlds} from './globe.js';
import {analogs,tags} from './analogs.js';
import {activePlanetaryAreas,documentedArea} from './areas.js';
import {planetaryMatches} from './site-matches.js';
import {evaluationFor,lunarCraterRationale} from './evaluation-schema.js';
import {marsOperations} from './mars-operations.js';
import {lunarMatrix} from './lunar-matrix.js';
import {rationaleFor} from './study-rationale-map.js';
import {bindWelcomeIntro} from './welcome-intro.js';

const el=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog={Earth:analogs,Moon:activePlanetaryAreas('Moon'),Mars:activePlanetaryAreas('Mars')};
let selected=null;
const viewer=new PlanetAtlas(el('map'),()=>{},pick,world=>{viewer.show(world);renderCatalog();});
function markers(){
 viewer.setOverviewLocations(Object.fromEntries(Object.entries(catalog).map(([world,sites])=>[world,sites.map(site=>({id:site.id,name:site.name,lat:site.lat,lon:site.lon,tone:'planet-marker',selected:selected?.id===site.id && selected?.world===world}))])));
}
function showCatalog(open){
 el('catalogo').hidden=!open;
 document.body.classList.toggle('catalog-open',open);
 document.querySelector('[data-page="atlas"]').hidden=false;
 renderCatalog();
}
function renderCatalog(){
 const query=el('atlas-search').value.trim().toLocaleLowerCase('es');
 const body=el('catalog-body').value;
 const sites=(body==='all'?Object.keys(catalog):[body]).flatMap(world=>catalog[world].map(site=>({...site,world})));
 const environment=el('atlas-environment'),prior=environment.value;
 const values=[...new Set(sites.map(s=>s.biome??s.type??'').filter(Boolean))];
 environment.replaceChildren(new Option('Entorno: Todos',''),...values.map(v=>new Option(v,v)));
 environment.value=values.includes(prior)?prior:'';
 const shown=sites.filter(s=>(!environment.value||(s.biome??s.type)===environment.value)&&(!query||[s.name,s.place,s.country,s.application,s.biome,s.type].join(' ').toLocaleLowerCase('es').includes(query)));
 el('atlas-count').textContent=shown.length+' sitios';
 el('atlas-search-empty').hidden=shown.length>0;
 el('atlas-sites').innerHTML=shown.map(s=>'<button class="outline catalog-site" data-site="'+s.id+'" data-site-world="'+s.world+'" aria-pressed="'+(selected?.id===s.id)+'"><span class="catalog-meta">'+esc(s.place??worlds[s.world].label)+'<small>'+ (s.originStatus==='unverified'||s.id.startsWith('cs')?'Por verificar':'Documentado')+'</small></span><strong>'+esc(s.name)+'</strong><span class="catalog-bottom">'+esc(s.biome??s.type)+'<small>'+ (Number.isFinite(s.elevationM)?s.elevationM+' m':'Cota sin registrar')+'</small></span></button>').join('');
}
const source=(url,label='Fuente')=>url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(label)+' ↗</a>':'';
function select(world,id){const site=catalog[world].find(s=>s.id===id);if(site)inspect(world,site);}
function pick(point,world){const match=documentedArea(world,point,catalog[world]);inspect(world,match?.area??{...point,name:'Punto seleccionado',geology:[],terrain:[]});}
function inspect(world,site){
 selected={world,id:site.id};viewer.show(world);viewer.center(site.lat,site.lon);markers();renderCatalog();
 const panel=el('location-analogs');panel.hidden=false;
 const lunarRow=world==='Moon'?lunarMatrix.flatMap(g=>g.rows).find(r=>r.code.toLowerCase()===site.id):null;
 let html='<header><div><small>'+esc(worlds[world].label)+'</small><h3>'+esc(site.name)+'</h3></div><button data-close-info aria-label="Cerrar ficha">×</button></header><p>'+site.lat.toFixed(5)+'°, '+site.lon.toFixed(5)+'°</p><p>'+esc(site.description??site.type)+'</p>';
 const rationale=rationaleFor(world,site);
 if(rationale.length&&world!=='Moon')html+='<section class="study-rationale"><h4>Sustento de selección · estudio aportado</h4>'+rationale.map(item=>'<h5>'+esc(item.label)+'</h5><p>'+esc(item.value)+'</p>').join('')+'</section>';
 if(world==='Earth'){
  html+='<p><strong>Aplicación: </strong>'+esc(site.application)+'</p>';
  const matches=planetaryMatches(site);
  for(const body of ['Moon','Mars'])html+='<h4>'+worlds[body].label+' · posibles semejanzas</h4>'+ (matches[body].length?matches[body].map(r=>'<article><h5>'+esc(r.area.name)+'</h5><p>Por qué es una opción: comparte '+esc(r.matches.map(m=>tags[m.tag]??m.tag).join(', '))+'.</p><p class="match-limit">'+esc(r.area.limit)+'</p>'+source(r.area.source)+' <button data-site="'+r.area.id+'" data-site-world="'+body+'">Ver destino</button></article>').join(''):'<p>Sin evidencia suficiente para asignar una analogía confirmada.</p>');
 }
 if(world==='Mars'&&marsOperations[site.id]){const row=marsOperations[site.id];html+='<h4>Evaluación operativa aportada</h4><p>Aterrizaje: '+esc(row.landing)+'</p><p>Base humana: '+esc(row.habitat)+'</p><p>Laboratorio: '+esc(row.laboratory)+'</p><p class="match-limit">'+esc(row.status)+'. No certifica seguridad para una misión.</p>';}
 if(world==='Moon'){
  html+='<details><summary>Justificación de selección lunar</summary>'+lunarCraterRationale.map(r=>'<h5>'+esc(r.name)+'</h5><p>'+esc(r.detail)+'</p><p>'+esc(r.check)+'</p>').join('')+'</details>';
 }
 html+='<p class="match-limit">'+esc(site.limit??'Verificar la parcela, escala y fuentes antes de extrapolar resultados.')+'</p>'+source(site.source,'Fuente del lugar');
 html+='<section class="site-evaluation"><h4>Datos a evaluar</h4>'+evaluationFor(site,lunarRow).map(g=>'<details open><summary>'+esc(g.name)+'</summary><dl>'+g.variables.map(v=>'<div><dt>'+esc(v.name)+'</dt><dd>'+esc(v.value??'Sin datos')+'<small>'+esc(v.status)+'</small>'+source(v.source)+'</dd></div>').join('')+'</dl><p>'+esc(g.method)+'</p></details>').join('')+'</section>';
 if(lunarRow?.reason)html+='<p class="match-limit"><strong>Motivo de selección: </strong>'+esc(lunarRow.reason)+'</p>';
 panel.innerHTML=html;
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');
 if(link){event.preventDefault();showCatalog(link.hash==='#catalogo');return;}
 const site=event.target.closest('[data-site]');if(site){select(site.dataset.siteWorld,site.dataset.site);return;}
 if(event.target.closest('[data-close-info]'))el('location-analogs').hidden=true;
 if(event.target.closest('[data-atlas-view]'))viewer.showOverview();
 const world=event.target.closest('button[data-world]');if(world){viewer.focusWorld(world.dataset.world);renderCatalog();}
});
el('map').addEventListener('atlas-location-pick',event=>select(event.detail.world,event.detail.id));
for(const id of ['atlas-search','catalog-body','atlas-environment'])el(id).addEventListener(id==='atlas-search'?'input':'change',renderCatalog);
el('zoom-in').addEventListener('click',()=>viewer.zoom(.22));el('zoom-out').addEventListener('click',()=>viewer.zoom(-.22));
el('reset-map').addEventListener('click',()=>viewer.reset());el('reset-all-globes').addEventListener('click',()=>{viewer.resetAll();viewer.showOverview();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){showCatalog(false);el('location-analogs').hidden=true;}});
const header=document.querySelector('.appbar');
const resize=()=>{const h=header.getBoundingClientRect().height;if(h)document.documentElement.style.setProperty('--appbar-height',Math.ceil(h)+'px');viewer.requestDraw();};
new ResizeObserver(resize).observe(header);window.addEventListener('resize',resize);resize();
markers();showCatalog(location.hash==='#catalogo');bindWelcomeIntro();
