import {PlanetAtlas,worlds} from './globe.js';
import {animateAstronaut,moveAstronaut} from './astronaut-motion.js';
import {analogs,tags} from './analogs.js';
import {activePlanetaryAreas,documentedArea} from './areas.js';
import {planetaryMatches,terrestrialMatches} from './site-matches.js';
import {evaluationFor,lunarCraterRationale} from './evaluation-schema.js';
import {marsOperations} from './mars-operations.js';
import {lunarMatrix} from './lunar-matrix.js';
import {rationaleFor} from './study-rationale-map.js';
import {bindWelcomeIntro} from './welcome-intro.js';
import {bindLanguageToggle,currentLanguage,t,tx} from './i18n.js';
import {englishContent,englishRationale} from './content-en.js';
import {earthSummaries,earthSummaryLabels} from './earth-summary.js';

const el=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog={Earth:analogs,Moon:activePlanetaryAreas('Moon'),Mars:activePlanetaryAreas('Mars')};
let selected=null;
const viewer=new PlanetAtlas(el('map'),()=>{},pick,world=>{viewer.show(world);renderCatalog();});
const localizedSite=(world,site)=>{
 if(currentLanguage()!=='en')return site;
 const translated=englishContent[world]?.[site.id]??{};
 return {
  ...site,...translated,
  name:translated.name??tx(site.name),
  place:translated.place??tx(site.place),
  region:translated.region??tx(site.region),
  country:translated.country??tx(site.country),
  biome:translated.biome??tx(site.biome),
  type:translated.type??tx(site.type),
  application:translated.application??tx(site.application),
  description:translated.description??tx(site.description),
  limit:translated.limit??tx(site.limit)
 };
};
const localizedRationale=(world,site)=>rationaleFor(world,site).map(item=>({
 ...item,label:tx(item.label),value:currentLanguage()==='en'?(englishRationale[world]?.[site.id]?.[item.label]??tx(item.value)):item.value
}));
function activeMarkerIds(){
 if(!selected)return null;
 const site=catalog[selected.world]?.find(item=>item.id===selected.id);
 if(!site)return null;
 const active=Object.fromEntries(Object.keys(catalog).map(world=>[world,new Set()]));
 active[selected.world].add(site.id);
 if(selected.world==='Earth'){
  const matches=planetaryMatches(site);
  for(const world of ['Moon','Mars'])for(const match of matches[world])active[world].add(match.area.id);
 }else{
  for(const id of terrestrialMatches(selected.world,site.id,catalog.Earth))active.Earth.add(id);
 }
 return active;
}
function markers(){
 const active=activeMarkerIds();
 const site=selected?.world==='Earth'?catalog.Earth.find(item=>item.id===selected.id):null;
 const matches=site?planetaryMatches(site):null;
 viewer.setOverviewConnections(matches?['Moon','Mars'].flatMap(world=>matches[world].map(match=>({
  fromWorld:'Earth',fromId:site.id,toWorld:world,toId:match.area.id
 }))):[]);
 viewer.setOverviewLocations(Object.fromEntries(Object.entries(catalog).map(([world,sites])=>[world,sites.map(site=>({id:site.id,name:localizedSite(world,site).name??site.name,lat:site.lat,lon:site.lon,tone:'planet-marker',selected:selected?.id===site.id && selected?.world===world,active:active===null||active[world].has(site.id)}))])));
}
function clearSelection(){
 selected=null;
 viewer.clearSelectedCoordinates();
 el('location-analogs').hidden=true;
 markers();
 renderCatalog();
}
function showCatalog(open){
 el('catalogo').hidden=!open;
 document.body.classList.toggle('catalog-open',open);
 document.querySelector('[data-page="atlas"]').hidden=false;
 renderCatalog();
}
function renderCatalog(){
 const query=el('atlas-search').value.trim().toLocaleLowerCase(currentLanguage());
 const body=el('catalog-body').value;
 const sites=(body==='all'?Object.keys(catalog):[body]).flatMap(world=>catalog[world].map(site=>({...site,world})));
 const environment=el('atlas-environment'),prior=environment.value;
 const values=[...new Set(sites.map(s=>s.biome??s.type??'').filter(Boolean))];
 environment.replaceChildren(new Option(currentLanguage()==='en'?'Environment: All':'Entorno: Todos',''),...values.map(value=>{
  const site=sites.find(item=>(item.biome??item.type)===value);
  const display=site?localizedSite(site.world,site):{};
  return new Option(tx(display.biome??display.type??value),value);
 }));
 environment.value=values.includes(prior)?prior:'';
 const shown=sites.filter(s=>{
  const display=localizedSite(s.world,s);
  const searchable=[s.name,s.place,s.country,s.application,s.biome,s.type,display.name,display.place,display.application,display.biome,display.type,tx(s.biome??s.type)].join(' ').toLocaleLowerCase(currentLanguage());
  return (!environment.value||(s.biome??s.type)===environment.value)&&(!query||searchable.includes(query));
 });
 el('atlas-count').textContent=shown.length+' '+t('catalog.count');
 el('atlas-search-empty').hidden=shown.length>0;
 el('atlas-sites').innerHTML=shown.map(s=>{
  const display=localizedSite(s.world,s);
  return '<button class="outline catalog-site" data-site="'+s.id+'" data-site-world="'+s.world+'" aria-pressed="'+(selected?.id===s.id && selected?.world===s.world)+'"><span class="catalog-meta">'+esc(display.place??worlds[s.world].label)+'<small>'+tx(s.originStatus==='unverified'||s.id.startsWith('cs')?'Por verificar':'Documentado')+'</small></span><strong>'+esc(tx(display.name??s.name))+'</strong><span class="catalog-bottom">'+esc(tx(display.biome??display.type))+'<small>'+ (Number.isFinite(s.elevationM)?s.elevationM+' m':tx('Cota sin registrar'))+'</small></span></button>';
 }).join('');
}
const source=(url,label=tx('Fuente'))=>url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(label)+' ↗</a>':'';
function select(world,id){const site=catalog[world].find(s=>s.id===id);if(site)inspect(world,site);}
function pick(point,world){const match=documentedArea(world,point,catalog[world]);inspect(world,match?.area??{...point,name:'Punto seleccionado',geology:[],terrain:[]});}
let guideSteps=[],guideIndex=0;
function inspect(world,site,focus=true){
 selected={world,id:site.id,site};
 viewer.setSelectedCoordinates(site.lat,site.lon);
 if(focus){viewer.show(world);viewer.center(site.lat,site.lon);}
 markers();renderCatalog();
 const panel=el('location-analogs');panel.hidden=false;
 const display=localizedSite(world,site);
 const lunarRow=world==='Moon'?lunarMatrix.flatMap(g=>g.rows).find(r=>r.code.toLowerCase()===site.id):null;
 const number=new Intl.NumberFormat(currentLanguage(),{maximumFractionDigits:5});
 let html='<header><div><small>'+esc(tx(worlds[world].label))+'</small><h3>'+esc(display.name??site.name)+'</h3></div><button data-close-info aria-label="'+esc(t('site.close'))+'">×</button></header><p>'+number.format(site.lat)+'°, '+number.format(site.lon)+'°</p><p>'+esc(display.description??display.type)+'</p>';
 const summary=world==='Earth'?earthSummaries[site.id]:null;
 if(summary){
  const language=currentLanguage();
  html+='<section class="earth-summary site-evaluation"><h4>'+esc(t('earth.summary.heading'))+'</h4><p class="match-limit">'+esc(t('earth.summary.note'))+'</p><dl>'+earthSummaryLabels[language].map((label,index)=>summary.unavailable?.includes(index)?'':'<div><dt>'+esc(label)+'</dt><dd>'+esc(summary[language][index])+'</dd></div>').join('')+'</dl>';
  if(site.id==='andagua')html+='<p class="match-limit">'+esc(t('earth.summary.andagua'))+'</p>';
  html+='</section>';
 }
 const rationale=localizedRationale(world,site);
 if(rationale.length&&world!=='Moon')html+='<section class="study-rationale"><h4>'+esc(t('rationale.heading'))+'</h4>'+rationale.map(item=>'<h5>'+esc(item.label)+'</h5><p>'+esc(item.value)+'</p>').join('')+'</section>';
 if(world==='Earth'){
  html+='<p><strong>'+esc(tx('Aplicación: '))+'</strong>'+esc(display.application)+'</p>';
  const matches=planetaryMatches(site);
  for(const body of ['Moon','Mars'])html+='<h4>'+esc(tx(worlds[body].label))+' · '+esc(t('match.possible'))+'</h4>'+ (matches[body].length?matches[body].map(r=>{
   const area=localizedSite(body,r.area);
   return '<article><h5>'+esc(area.name)+'</h5><p>'+esc(t('match.why'))+esc(r.matches.map(m=>tx(tags[m.tag]??m.tag)).join(', '))+'.</p><p class="match-limit">'+esc(area.limit)+'</p>'+source(area.source)+' <button data-site="'+r.area.id+'" data-site-world="'+body+'">'+esc(t('match.destination'))+'</button></article>';
  }).join(''):'<p>'+esc(t('match.none'))+'</p>');
 }
 if(world==='Mars'&&marsOperations[site.id]){const row=marsOperations[site.id];html+='<h4>'+esc(t('mars.evaluation'))+'</h4><p>'+esc(tx('Aterrizaje: '))+esc(tx(row.landing))+'</p><p>'+esc(tx('Base humana: '))+esc(tx(row.habitat))+'</p><p>'+esc(tx('Laboratorio: '))+esc(tx(row.laboratory))+'</p><p class="match-limit">'+esc(tx(row.status))+'. '+esc(currentLanguage()==='en'?'This does not certify mission safety.':'No certifica seguridad para una misión.')+'</p>';}
 if(world==='Moon'){
  html+='<details><summary>'+esc(t('lunar.rationale'))+'</summary>'+lunarCraterRationale.map(r=>'<h5>'+esc(tx(r.name))+'</h5><p>'+esc(tx(r.detail))+'</p><p>'+esc(tx(r.check))+'</p>').join('')+'</details>';
 }
 html+='<p class="match-limit">'+esc(display.limit??t('site.limit.fallback'))+'</p>'+source(display.source,t('site.source'));
 const evaluation=evaluationFor(site,lunarRow).map(group=>({...group,variables:group.variables.filter(variable=>variable.value!=null&&variable.value!=='')})).filter(group=>group.variables.length);
 if(evaluation.length)html+='<section class="site-evaluation"><h4>'+esc(t('site.evaluation'))+'</h4>'+evaluation.map(g=>'<details open><summary>'+esc(tx(g.name))+'</summary><dl>'+g.variables.map(v=>'<div><dt>'+esc(tx(v.name))+'</dt><dd>'+esc(tx(v.value))+'<small>'+esc(tx(v.status))+'</small>'+source(v.source)+'</dd></div>').join('')+'</dl><p>'+esc(tx(g.method))+'</p></details>').join('')+'</section>';
 if(lunarRow?.reason)html+='<p class="match-limit"><strong>'+esc(t('lunar.reason'))+' </strong>'+esc(tx(lunarRow.reason))+'</p>';
 const en=currentLanguage()==='en';
 const known=catalog[world].some(item=>item.id===site.id);
 const argument=world==='Moon'?(tx(lunarRow?.reason)??display.description??display.type):(rationale.find(r=>/justific|strateg|utilidad|utility/i.test(r.label))?.value??display.description??display.type);
 const operation=world==='Mars'?marsOperations[site.id]:null;
 const detail=known&&lunarRow?.code==='CSC13'?t('guide.lunar.aristarchus'):
  known&&lunarRow&&!lunarRow.reason?t('guide.lunar.period',{period:tx(lunarRow.period)}):
  known&&argument?t(world==='Moon'&&lunarRow?.reason?'guide.lunar.reason':'guide.why',{detail:argument}):t('guide.unknown.intro');
 const decimal=new Intl.NumberFormat(currentLanguage(),{maximumFractionDigits:3});
 const explanation=!known?t('guide.unknown.compare'):
  world==='Earth'?(site.originStatus==='unverified'?t('guide.earth.unverified'):t('guide.earth.application',{application:display.application})):
  world==='Moon'?(lunarRow?t('guide.moon.measures',{diameter:decimal.format(lunarRow.diameterKm),depth:decimal.format(lunarRow.depthKm),shape:tx(lunarRow.morphology)}):t('guide.moon.general')):
  operation?t('guide.mars.operation',{habitat:tx(operation.habitat),laboratory:tx(operation.laboratory)}):t('guide.mars.general');
 guideSteps=[
  t('guide.welcome',{name:display.name??site.name})+' '+detail,
  explanation,
  known?t('guide.caution',{limit:display.limit??t('site.limit.fallback')}):t('guide.unknown.limit')
 ];
 guideIndex=focus?0:Math.min(guideIndex,guideSteps.length-1);
 panel.classList.add('astronaut-guide');
 panel.innerHTML='<div class="astronaut-character" aria-hidden="true"><svg viewBox="0 0 120 160" fill="none"><path d="M27 77h66v59H27z" fill="#64788a"/><rect x="30" y="70" width="60" height="62" rx="22" fill="#e9eff4"/><path d="M36 122l-5 27h22l7-24 7 24h22l-5-27M31 80L15 114l12 7 16-30M89 80l16 34-12 7-16-30" fill="#d1dfe9" stroke="#6d859b" stroke-width="3"/><circle cx="60" cy="45" r="34" fill="#f1f6fa" stroke="#8ca6b9" stroke-width="3"/><rect x="34" y="25" width="52" height="39" rx="19" fill="#102e43" stroke="#00ddeb" stroke-width="2"/><path d="M43 35q12-9 27-2" stroke="#b1eaf3" stroke-width="4" stroke-linecap="round"/><rect x="44" y="82" width="32" height="24" rx="5" fill="#193e52"/><circle cx="52" cy="93" r="3" fill="#00e3ed"/><path d="M61 92h8M61 98h8" stroke="#d6f5ff" stroke-width="2"/></svg></div>'+
 '<section class="astronaut-speech"><header><div><small>'+ (en?'MISSION GUIDE':'GUÍA DE MISIÓN')+'</small><h3>'+esc(display.name??site.name)+'</h3></div><button data-close-info aria-label="'+esc(t('site.close'))+'">×</button></header><p id="guide-speech" aria-live="polite"></p><nav class="guide-navigation" aria-label="'+(en?'Guide explanations':'Explicaciones del guía')+'"><button data-guide-step="-1">←</button><span id="guide-progress"></span><button data-guide-step="1">'+(en?'Next':'Continuar')+' →</button></nav><details class="guide-evidence"><summary>'+(en?'View observations, sources and data':'Ver observaciones, fuentes y datos')+'</summary>'+html+'</details></section>';
 updateGuide();
 animateAstronaut(panel,world);
}
function updateGuide(){
 el('guide-speech').textContent=guideSteps[guideIndex];
 el('guide-progress').textContent=(guideIndex+1)+' / '+guideSteps.length;
 document.querySelector('[data-guide-step="-1"]').disabled=guideIndex===0;
 document.querySelector('[data-guide-step="1"]').disabled=guideIndex===guideSteps.length-1;
}
document.addEventListener('click',event=>{
 const step=event.target.closest('[data-guide-step]');
 if(step){guideIndex=Math.max(0,Math.min(guideSteps.length-1,guideIndex+Number(step.dataset.guideStep)));updateGuide();return;}
 const link=event.target.closest('a[href^="#"]');
 if(link){event.preventDefault();showCatalog(link.hash==='#catalogo');return;}
 const site=event.target.closest('[data-site]');if(site){select(site.dataset.siteWorld,site.dataset.site);return;}
 if(event.target.closest('[data-close-info]')){clearSelection();return;}
 if(event.target.closest('[data-atlas-view]'))viewer.showOverview();
 const world=event.target.closest('button[data-world]');if(world){viewer.focusWorld(world.dataset.world);renderCatalog();moveAstronaut(world.dataset.world);}
});
el('map').addEventListener('atlas-location-pick',event=>select(event.detail.world,event.detail.id));
for(const id of ['atlas-search','catalog-body','atlas-environment'])el(id).addEventListener(id==='atlas-search'?'input':'change',renderCatalog);
el('zoom-in').addEventListener('click',()=>viewer.zoom(.22));el('zoom-out').addEventListener('click',()=>viewer.zoom(-.22));
el('reset-map').addEventListener('click',()=>viewer.reset());el('reset-all-globes').addEventListener('click',()=>{viewer.resetAll();viewer.showOverview();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){showCatalog(false);clearSelection();}});
const header=document.querySelector('.appbar');
const resize=()=>{const h=header.getBoundingClientRect().height;if(h)document.documentElement.style.setProperty('--appbar-height',Math.ceil(h)+'px');viewer.requestDraw();};
new ResizeObserver(resize).observe(header);window.addEventListener('resize',resize);resize();
markers();showCatalog(location.hash==='#catalogo');bindWelcomeIntro();
bindLanguageToggle(()=>{
 viewer.syncControls();viewer.drawOverview();viewer.requestDraw();
 if(selected){
  inspect(selected.world,selected.site,false);
 }else{
  markers();renderCatalog();
 }
});
