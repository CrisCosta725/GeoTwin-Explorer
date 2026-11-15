import {projectedPath} from './result-map.js';
import {catalogEvidence,evidenceLabels} from './evidence-quality.js';
import {Study,download} from './study.js';
import {bindMissionPanel} from './mission-panel.js';
import {targetForCase} from './case-study.js';
import {analogyLimits,planetaryLimits,measurementCaution} from './analogy-limits.js';
import {terrainMetrics} from './terrain-comparison.js';
import {AreaViewer} from './area-viewer.js';
import {bindViewerExpansion} from './viewer-expand.js';
import {documentedArea, earthImages, planetaryAreas, worldMaps} from './areas.js';
import {PlanetAtlas, worlds} from './globe.js';
import {analogs, tags} from './analogs.js';
import {hasCoordinates} from './coordinates.js';
import {baseAssessments} from './base-assessment.js';
import {discover, searchArea, searches} from './discovery.js';
import {bodyLabel, category, getProfile, initial, ranking} from './model.js';
import {bindWelcomeIntro} from './welcome-intro.js';

const byId = id => document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => '<svg aria-hidden="true"><use href="#i-'+name+'"/></svg>';
const local = new Intl.NumberFormat('es-PE',{maximumFractionDigits:2});
const grade = score => score === null ? {label:'Sin datos',className:'low'} : category(score);
const scoreText = score => score === null ? '—' : String(score);
const coordinate = (value, positive, negative) => local.format(Math.abs(value))+'° '+(value < 0 ? negative : positive);
const coords = site => hasCoordinates(site)?coordinate(site.lat,'N','S')+' · '+coordinate(site.lon,'E','O'):'Ubicación pendiente';
const discoveryForm = byId('discovery-form');
const map = byId('map');
const sectionLinks = [...document.querySelectorAll('.nav-link')];
const pages = [...document.querySelectorAll('.workspace-page')];
const pageFor = element => element?.closest('.workspace-page');
const caseButtons = [...document.querySelectorAll('[data-guided-case]')];
const guidedCases = {
  Moon:{
    profile:'malapert',
    title:'Luna · relieve polar',
    task:'Explora las pendientes de Malapert y compara su relieve con terrenos polares o rocosos de la Tierra.'
  },
  Mars:{
    profile:'arcadia-ap1',
    title:'Marte · búsqueda de hielo bajo el suelo',
    task:'Compara los indicios de hielo y el relieve de las regiones marcianas. Elige un análogo para ensayar detección o muestreo.'
  }
};
const areaFor = ({body,profile}) => planetaryAreas[body]?.find(area=>area.profile===profile);
const casesFor = (body,area) => searches.flatMap((item,index)=>item.world===body && item.area===area ? [index] : []);

function syncNavigation(target) {
  const active = pageFor(target) ?? pages[0];
  const changed = active.hidden;
  for (const page of pages) page.hidden = page !== active;
  for (const link of sectionLinks) {
    if (pageFor(byId(link.hash.slice(1))) === active) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  return changed;
}

function revealSection(target,{focus=false,block='start'}={}) {
  viewerExpansion.close({restoreFocus:false});
  const changed = syncNavigation(target);
  if (target.id==='delimitar') study.refreshGrid();
  const page = pageFor(target);
  const destination = target.hidden && page ? byId(page.getAttribute('aria-labelledby')) : target;
  if (focus) {
    if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex','-1');
    destination.focus({preventScroll:true});
  }
  const behavior = changed ? 'instant' : 'auto';
  if (target===page || target.id==='inicio') window.scrollTo({top:0,behavior});
  else destination.scrollIntoView({block,behavior});
}

function goToSection(id,options) {
  const target = byId(id==='ajustes'?'verificacion':id==='planificador'?'descubrimiento':id);
  if (!target) return;
  if (location.hash!=='#'+id) history.pushState(null,'','#'+id);
  revealSection(target,options);
}

function followHash() {
  const id=location.hash.slice(1);
  const target = byId(id==='ajustes'?'verificacion':id==='planificador'?'descubrimiento':id);
  if (target) revealSection(target);
  else if (syncNavigation()) window.scrollTo({top:0,behavior:'instant'});
}

window.addEventListener('hashchange',followHash);
document.addEventListener('click',event=>{
  if (event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || !byId(link.hash.slice(1))) return;
  event.preventDefault();
  goToSection(link.hash.slice(1),{focus:true});
});
let config = {...initial};
let activeSearch=casesFor(initial.body,areaFor(initial).id)[0];
let scored = ranking(config,searches[activeSearch].groups);
let selected = null;
let compared = [];
let expanded = false;
let markers = [];
let sectorPaths=[];
let comparisonRevision = 0;
let guidedBody = null;
let missionPanel;
let discoveryRun = 0;
const pilotChoices=new Map();
const pilotNotes=new Map();
const areaState = {
  Earth:{point:null,id:null},
  Moon:{point:null,id:null},
  Mars:{point:null,id:null}
};
const viewer = new PlanetAtlas(map,updateGlobe,pickArea,id=>showWorld(id));
const areaViewer = new AreaViewer(byId('area-viewer'),viewer);
const viewerExpansion=bindViewerExpansion({
  globe:{target:map,button:byId('globe-expand'),tools:byId('atlas-overview-view'),
    title:'Vista conjunta · Tierra, Luna y Marte',label:'Ampliar visor planetario',context:()=>viewer.focusedWorld?byId('draw-context').textContent:'Tierra al centro de la comparación con la Luna y Marte.',
    focus:()=>map.querySelector('[data-overview-world="'+viewer.world+'"]'),resize:()=>viewer.requestDraw()},
  terrain:{target:byId('area-viewer'),button:byId('terrain-expand'),
    title:'Visor de relieve · vista ampliada',label:'Ampliar visor de relieve',context:()=>byId('draw-context').textContent,
    focus:()=>areaViewer.mode==='photo'?areaViewer.photoMap:areaViewer.canvas,resize:()=>areaViewer.resize()}
});
const study = new Study({
  validationTarget:targetForCase,
  target:()=>{
    const point=areaFor(config);
    return {world:config.body,center:{lat:point.lat,lon:point.lon},name:point.name,reference:activeSearch,geologyCase:searches[activeSearch].geologyCase,
      documented:{name:'Evidencia del rasgo de referencia',url:searches[activeSearch].source}};
  },
  earth:()=>areaState.Earth.point,
  earthImage:new URL('earth-globe.webp',import.meta.url).href,
  referenceTrait:()=>searches[activeSearch].label,
  catalogAlternative:id=>studyCandidates().find(site=>site.id!==id),
  catalogPilot:()=>{
    const site=scored.find(item=>item.id===pilotChoices.get(activeSearch));
    if (!site) return null;
    const pair=baseAssessments[config.profile]?.pairs?.[site.id];
    return {...site,description:pair?.detail ?? site.description,note:pilotNotes.get(activeSearch),
      source:{url:pair?.source ?? site.source,name:pair?.sourceLabel ?? site.organization},
      verification:[site.limit,searches[activeSearch].next].filter(Boolean).join(' ')};
  },
  refreshAtlas:state=>renderSectors(state),
  openCatalog:id=>selectArea(id,'card'),
  openSector:(point,navigate)=>{
    areaState.Earth={point,id:null};
    showWorld('Earth');
    viewer.center(point.lat,point.lon,2.4);
    if (navigate) goToSection('atlas',{focus:true});
  },
  clearCatalogPilot:()=>{pilotChoices.delete(activeSearch);pilotNotes.delete(activeSearch);renderPilot()},
  catalog:()=>analogs.filter(hasCoordinates),
  compared:()=>compared.map(id=>scored.find(site=>site.id===id)).filter(Boolean),
  navigate:id=>goToSection(id,{focus:true}),
  openArea:(world,point)=>{
    const match=areasFor(world).find(site=>site.lat===point.lat && site.lon===point.lon);
    const previous=areaState[world],same=previous.point?.lat===point.lat && previous.point?.lon===point.lon;
    const {id:oldId,...freePoint}=point;
    areaState[world]={point:match??freePoint,id:match?.id,
      draftLabel:!match && same?previous.draftLabel:undefined,
      unverified:match?.originStatus==='unverified' || Boolean(same && previous.unverified)};
    showWorld(world);
    viewer.center(point.lat,point.lon,1.7);
    goToSection('delimitar',{focus:true});
  },
  snapshot:()=>({config,activeSearch,compared,selected,pilots:[...pilotChoices],pilotNotes:[...pilotNotes],
    pilot:byId('pilot-choice').value ? byId('pilot-choice').selectedOptions[0]?.textContent : null,
    pilotReason:byId('pilot-choice').value ? [byId('pilot-why').textContent,byId('pilot-note').value.trim()].filter(Boolean).join(' ') : null,
    missionPlans:missionPanel?.snapshot(),atlasWorld:viewer.world,atlasView:viewer.viewMode,atlasFocus:viewer.focusedWorld,atlasCameras:viewer.snapshot(),areaState}),
  restore:(snapshot,polygons)=>{
    pilotChoices.clear();
    for (const [reference,id] of snapshot.pilots ?? []) {
      if (typeof reference==='number') pilotChoices.set(reference,id);
      else {
        const index=searches.findIndex(item=>searchArea(item).profile===reference);
        if (index>=0) pilotChoices.set(index,id);
      }
    }
    pilotNotes.clear();
    for (const [reference,note] of snapshot.pilotNotes ?? []) pilotNotes.set(reference,note);
    const savedArea=areaFor(snapshot.config);
    const area=savedArea ?? areaFor(initial);
    const body=savedArea ? snapshot.config.body : initial.body;
    const indexes=casesFor(body,area.id);
    setReference(indexes.includes(snapshot.activeSearch)?snapshot.activeSearch:indexes[0],!snapshot.areaState);
    const valid=new Set(scored.filter(hasCoordinates).map(site=>site.id));
    selected=valid.has(snapshot.selected)?snapshot.selected:null;
    compared=snapshot.compared.filter(id=>valid.has(id)).slice(0,3);
    for (const [world,area] of Object.entries(polygons)) {
      const origin=area.origin ?? area.center;
      const match=areasFor(world).find(site=>site.lat===origin.lat && site.lon===origin.lon);
      areaState[world]={point:match??origin,id:match?.id};
    }
    if (snapshot.areaState) for (const world of ['Earth','Moon','Mars']) {
      if (snapshot.areaState[world]) areaState[world]=snapshot.areaState[world];
    }
    const savedEarth=areaState.Earth;
    if (savedEarth.point && savedEarth.id && !analogs.some(site=>site.id===savedEarth.id)) {
      const {id:oldId,...point}=savedEarth.point;
      areaState.Earth={point,id:null,draftLabel:(savedEarth.point.name??savedEarth.id)+' · proyecto anterior',unverified:true};
    }
    showWorld(['Earth','Moon','Mars'].includes(snapshot.atlasWorld)?snapshot.atlasWorld:config.body);
    viewer.showOverview();
    const focus=snapshot.atlasFocus??(snapshot.atlasView==='surface'?snapshot.atlasWorld:null);
    if (['Earth','Moon','Mars'].includes(focus)) viewer.focusWorld(focus);
    viewer.restore(snapshot.atlasCameras);
    updateAll();
    missionPanel?.restore(snapshot.missionPlans);
  },
  referenceLabels:()=>['Destino: '+bodyLabel[config.body], 'Región: '+areaFor(config).name,
    'Rasgo de comparación: '+searches[activeSearch].label]
});
missionPanel=bindMissionPanel({
  context:()=>{
    const site=scored.find(item=>item.id===pilotChoices.get(activeSearch)) ?? scored.find(item=>item.id===selected);
    const target=areaFor(config);
    return {world:config.body,reference:activeSearch,target:{id:target.id,name:target.name,lat:target.lat,lon:target.lon,
      source:searches[activeSearch].source},site:site?{id:site.id,name:site.name,lat:site.lat,lon:site.lon,
      source:site.source,limit:site.limit,evidence:site.evidenceSummary}:null};
  },
  openCase:()=>{
    const index=searches.findIndex(search=>search.geologyCase==='ulysses-scoria');
    setReference(index);
    selected='andagua';
    areaState.Earth={point:currentSite(),id:selected};
    compared=['andagua','huambo'];
    pilotChoices.set(activeSearch,'andagua');
    study.clearPilot();
    byId('validation-case').value='andahua-ulysses';
    byId('validation-case').dispatchEvent(new Event('change'));
    updateAll();
  },
  openAtlas:()=>{showWorld('Earth');selectArea('andagua','form');goToSection('atlas',{focus:true});},
  download
});
const mapLink = (world,point) => {
  const base = worldMaps[world];
  if (!base?.url) return null;
  const href = safeUrl(base.url);
  if (!href) return null;
  if (world!=='Earth' || Math.abs(point.lon)>176) return href;
  const {lat,lon} = point;
  const box = [lon-3,Math.max(-90,lat-2),lon+3,Math.min(90,lat+2)];
  return href+'?v='+box.map(value=>value.toFixed(3)).join(',');
};

function fill(select, options, current) {
  select.replaceChildren(...options.map(x => new Option(x.label,x.value)));
  select.value = options.some(x=>x.value===current) ? current : options[0]?.value ?? '';
}

function refreshRegions() {
  for (const id of ['region','atlas-region']) {
    const select=byId(id);
    const regions=[...new Set(analogs.map(site=>site.region))].sort((a,b)=>a.localeCompare(b,'es'));
    fill(select,[{value:'all',label:'Todas las regiones'},...regions.map(region=>({value:region,label:region}))],select.value);
  }
}

const studyCandidates=()=>scored.filter(site=>hasCoordinates(site) && (site.score>0 || site.curated));
const visible = () => {
  const region = byId('region').value;
  const sites=studyCandidates();
  return region==='all' ? sites : sites.filter(site=>site.region===region);
};
const currentSite = () => scored.find(site=>site.id===selected);

function comparisonButton(site, compact = false) {
  const added = compared.includes(site.id);
  const label = added ? 'Quitar '+site.name+' de la comparación' : 'Agregar '+site.name+' a la comparación';
  return '<button type="button" class="mini-action" data-compare="'+site.id+'" aria-label="'+label+'" aria-pressed="'+added+'"'+(hasCoordinates(site)?'':' disabled title="Coordenadas pendientes"')+'>'+icon(added?'check':'plus')+(compact?'':added?'Añadido':'Comparar')+'</button>';
}

function areasFor(world) {
  if (world!=='Earth') return planetaryAreas[world];
  const region=byId('atlas-region').value;
  return (region==='all' ? [...scored] : scored.filter(site=>site.region===region)).sort((a,b)=>a.catalogNumber-b.catalogNumber);
}

function renderMarkers() {
  markers=[];
  for (const world of Object.keys(worlds)) {
    const overlay=map.querySelector('[data-markers="'+world+'"]'),allSites=areasFor(world),sites=allSites.filter(hasCoordinates),active=areaState[world].id;
    overlay.innerHTML=sites.map(site=>{
      const tone=world==='Earth'?grade(site.score).className:'planet-marker';
      const name=site.name+(world==='Earth'&&site.score!==null?' · '+scoreText(site.score)+'/100':'');
      return '<button type="button" class="marker '+tone+(active===site.id?' selected':'')+'" data-marker="'+site.id+'" data-marker-world="'+world+'" aria-label="'+esc(name)+'" aria-pressed="'+(active===site.id)+'" hidden><span class="marker-tag" aria-hidden="true">'+esc(site.name)+'</span></button>';
    }).join('');
    markers.push(...Array.from(overlay.children,(node,i)=>({world,node,site:sites[i]})));
    map.querySelector('[data-region-count="'+world+'"]').textContent=sites.length+' regiones'+(sites.length<allSites.length?' · '+(allSites.length-sites.length)+' pendiente':'');
  }
  viewer.setOverviewLocations(Object.fromEntries(Object.keys(worlds).map(world=>[
    world,[...areasFor(world).filter(hasCoordinates).map(site=>({
      id:site.id,lat:site.lat,lon:site.lon,
      tone:world==='Earth'?grade(site.score).className:'planet-marker',
      selected:areaState[world].id===site.id
    })),...(areaState[world].point && !areaState[world].id?[{
      id:'selection-'+world,lat:areaState[world].point.lat,lon:areaState[world].point.lon,tone:'selected-point',selected:true
    }]:[])]
  ])));
  const world=viewer.world,sites=areasFor(world),active=areaState[world].id;
  const shortcuts = byId('atlas-sites');
  shortcuts.innerHTML = sites.map(site=>
    '<button type="button" class="outline'+(world==='Earth'?' catalog-site':'')+'" data-atlas-site="'+site.id+'" aria-pressed="'+(active===site.id)+'">'+
    (world==='Earth'?'<strong>'+site.catalogNumber+'. '+esc(site.name)+'</strong><span>'+esc(site.country)+' · '+esc(site.application)+'</span>'+(!hasCoordinates(site)?'<small>Coordenadas pendientes</small>':'')+(site.originStatus==='unverified'?'<small>Origen por verificar</small>':''):esc(site.name))+'</button>').join('');
  renderSectors(study);
  viewer.requestDraw();
}

function renderSectors(state) {
  const rows=state.atlasRows();
  const overlay=byId('sector-overlay');
  overlay.hidden=!rows.length;
  byId('atlas-sectors').hidden=!rows.length;
  overlay.replaceChildren();
  sectorPaths=rows.map(row=>{
    const ns='http://www.w3.org/2000/svg';
    const group=document.createElementNS(ns,'g');
    group.dataset.atlasSector=row.id;
    group.setAttribute('aria-hidden','true');
    group.classList.toggle('selected',row.id===state.atlasSectorId);
    const node=document.createElementNS(ns,'path');
    node.setAttribute('fill-rule','evenodd');
    const dot=document.createElementNS(ns,'circle');
    dot.setAttribute('r','3.5');
    group.append(node,dot);
    overlay.append(group);
    return {node,row,geometry:state.geometry(row)};
  });
  byId('atlas-sector-buttons').innerHTML=rows.map(row=>
    '<button type="button" class="outline" data-atlas-sector="'+row.id+'" aria-pressed="'+(row.id===state.atlasSectorId)+'">Sector '+row.id+'</button>').join('');
  byId('atlas-sector-detail').innerHTML=rows.length ? state.atlasDetail(rows) : '';
  const card=byId('atlas-sector-card');
  card.innerHTML=rows.length ? state.sectorCard() : '';
  card.hidden=!card.innerHTML;
  viewer.requestDraw();
}

function updateGlobe(view) {
  if (view.world===viewer.world) {
    byId('zoom-in').disabled = view.zoom >= 2.4;
    byId('zoom-out').disabled = view.zoom <= .8;
  }
  function place(node,location) {
    const point = viewer.project(location.lat,location.lon,view);
    node.hidden = point.z<=.045 || point.x<10 || point.y<10 || point.x>view.width-10 || point.y>view.height-10;
    if (node.hidden) return;
    node.style.left = point.x+'px';
    node.style.top = point.y+'px';
    node.classList.toggle('edge',point.x>view.width*.67);
  }
  for (const {world,node,site} of markers) if (world===view.world) place(node,site);
  if (view.world==='Earth') {
    byId('sector-overlay').setAttribute('viewBox','0 0 '+view.width+' '+view.height);
    for (const {node,row,geometry} of sectorPaths) {
      const center=viewer.project(row.center.lat,row.center.lon,view);
      node.parentNode.style.display=center.z<=.06?'none':'';
      if (center.z<=.06) continue;
      const d=projectedPath(geometry,point=>{
        const projected=viewer.project(point.lat,point.lon,view);
        return projected.z>.06 ? projected : null;
      });
        // The projected footprints remain true to scale. A marker supplies
      // a clickable target when a footprint occupies less than one pixel.
      node.setAttribute('d',d);
      node.parentNode.lastElementChild.setAttribute('cx',center.x);
      node.parentNode.lastElementChild.setAttribute('cy',center.y);
    }
  }
  const state = areaState[view.world];
  const pin = map.querySelector('[data-selection-pin="'+view.world+'"]');
  if (!state.point || state.point.id || (view.world==='Earth' && sectorPaths.some(item=>item.row.id===study.atlasSectorId))) pin.hidden = true;
  else place(pin,state.point);
  areaViewer.sync(view);
}

function showWorld(id) {
  const world = worlds[id];
  const isEarth = id==='Earth';
  map.dataset.world = id;
  byId('active-globe-label').textContent=world.label;
  byId('atlas-foot').hidden = !isEarth;
  viewer.show(id);
  renderMarkers();
  renderFocus();
}

function renderFocus() {
  const world = viewer.world;
  const {point,id,draftLabel,unverified} = areaState[world];
  const sites = areasFor(world);
  const pending=sites.filter(site=>!hasCoordinates(site)).length;
  byId('atlas-count').textContent = sites.length+' '+(sites.length===1?'sitio':'sitios')+(pending?' · '+pending+' sin coordenadas':'');
  const site = sites.find(item=>item.id===id);
  const picker = byId('area-list');
  picker.replaceChildren(new Option('Seleccionar zona del catálogo',''),...sites.map(x=>new Option(x.name+(!hasCoordinates(x)?' · coordenadas pendientes':''),x.id)));
  picker.value = site?.id ?? '';
  byId('area-empty').hidden=Boolean(point);
  byId('area-details').hidden=!point;
  byId('scan-earth').disabled=Boolean(byId('scan-boundary').value) || !areaState.Earth.point;
  if (!point) {
    byId('focus-site').replaceChildren();byId('area-primary').replaceChildren();byId('area-evidence-content').replaceChildren();
    byId('area-announcement').textContent='Sin área seleccionada en '+worlds[world].label+'.';
    areaViewer.clear();study.deselect(world);
    return;
  }
  const isEarth = world==='Earth';
  const assessment=baseAssessments[isEarth?config.profile:site?.id];
  const pair = isEarth ? assessment?.pairs[site?.id] : null;
  const picture = point.id ? (isEarth ? earthImages[site?.id] : site?.caption ? site : null) : null;
  const profile=site && !isEarth ? getProfile({body:world,profile:site.profile}) : null;
  const title = site?.name || draftLabel || (isEarth && study.atlasSectorId ? 'Sector prospectivo '+study.atlasSectorId : 'Punto seleccionado');
  study.select(world,point,title,site?.source?{name:'Fuente de '+site.name,url:site.source}:null,unverified);
  const position = !point.id && site ? ' · a '+local.format(documentedArea(world,point,sites).km)+' km del punto de referencia' : '';
  const external = mapLink(world,point) ? '<a href="'+esc(mapLink(world,point))+'" target="_blank" rel="noopener">'+esc(worldMaps[world].label)+' '+icon('ext')+'</a>' : '';
  const heading = byId('focus-site');
  const root = byId('area-evidence-content');
  heading.innerHTML = '<div class="area-heading"><div><p class="area-type">'+(site ? isEarth?site.biome:site.type:draftLabel?'Coordenadas aportadas · verificación pendiente':'Exploración libre')+'</p><h3>'+esc(title)+'</h3><p class="area-coords">'+coords(point)+position+'</p></div>'+
    (site?.detail && isEarth ? '<strong class="score-pill '+grade(site.score).className+'" title="Similitud temática">'+scoreText(site.score)+'/100</strong>' : '')+'</div>';
  if (site) {
    if (isEarth) heading.insertAdjacentHTML('beforeend','<p class="site-scope">'+esc(site.application)+'</p><p class="area-evidence">'+esc(site.locationNote)+
      (Number.isFinite(site.elevationM)?' Cota aportada: '+site.elevationM+' m.':'')+'</p>'+(site.originStatus==='unverified'?'<p class="area-evidence"><span class="evidence-label" data-evidence="pending">Origen geológico por verificar</span></p>':''));
    if (pair) heading.insertAdjacentHTML('beforeend','<p class="site-scope">Ensayo terrestre · '+pair.scope+'</p>');
    else if (!isEarth) heading.insertAdjacentHTML('beforeend','<p class="site-scope">'+(assessment?.status ?? 'Referencia geológica o de recursos')+'</p>');
  }
  root.replaceChildren();
  byId('area-primary').replaceChildren();
  byId('area-summary').querySelector('summary').textContent = site ? 'Por qué sirve para el reto' : 'Evidencia del punto';
  areaViewer.setArea(world,point,picture);
  if (!site) {
    root.innerHTML += '<div class="area-text"><p>El modelo de elevación describe el relieve. La calificación del punto requiere cartografía geológica local y evidencia del rasgo que se quiere comparar.</p></div>';
  } else if (isEarth) {
    const missing = site.detail.flatMap(c=>c.missing ?? []);
    const factors=site.detail.filter(item=>item.matches.length).map(item=>[item.label,item.matches.map(tag=>tags[tag]).join(', ')]);
    const matches = factors.map(([label,detail])=>'<li><strong>'+label+'</strong><span>'+detail+'</span></li>').join('');
    root.innerHTML += '<div class="area-text"><p class="area-target">Entorno objetivo · '+getProfile(config).name+'</p><p>'+(pair?.detail ?? site.description)+'</p>'+
      (matches ? '<ul class="area-factors">'+matches+'</ul>' : '<p>Los criterios activos carecen de coincidencias temáticas documentadas en esta ficha.</p>')+
      '<p class="area-evidence">Rasgos respaldados: '+site.coverage+' %. '+site.evidenceSummary.local+' con publicación local; '+site.evidenceSummary.regional+' con referencia regional; '+site.evidenceSummary.pending+' pendientes. El índice temático no mide confianza científica.</p>'+
      (missing.length ? '<p class="area-evidence">Rasgos por verificar: '+[...new Set(missing)].map(tag=>tags[tag].toLowerCase()).join(', ')+'.</p>' : '')+
      '<p class="area-evidence">'+analogyLimits(config.body,site)[0]+'</p>'+
      (Number.isFinite(site.slope) ? '<p class="area-evidence">Pendiente máxima estimada '+local.format(site.slope)+'° · DEM de '+site.resolution+' m en un radio de 1 km.</p>' : '')+'</div>'+
      '<div class="area-actions">'+comparisonButton(site)+'<a href="#verificacion" class="outline">Qué falta verificar</a></div>';
  } else {
    root.innerHTML += '<div class="area-text"><p class="area-target">Entorno objetivo · '+profile.name+'</p><ul class="area-factors">'+site.features.map(([key,value])=>'<li><strong>'+key+'</strong><span>'+value+'</span></li>').join('')+'</ul><p class="area-evidence">'+(assessment?.summary ?? site.limit)+'</p></div>';
    byId('area-primary').innerHTML='<button class="primary" type="button" data-analyze-area="'+site.id+'">Buscar análogos para esta región '+icon('arrow')+'</button>';
  }
  root.innerHTML += '<div class="area-links">'+(site ? sourceLink(site.source,site.organization || 'Fuente de la ficha')+(site.reference ? sourceLink(site.reference,site.referenceLabel || 'Fuente complementaria') : '') : '')+external+'</div>';
  byId('area-announcement').textContent = title+' · '+coords(point);
  viewer.requestDraw();
}

function pickArea(point,world=viewer.world) {
  study.atlasSectorId=null;
  const match = documentedArea(world,point,areasFor(world));
  if (world==='Earth' && match?.area.detail) selected = match.area.id;
  areaState[world] = {point,id:match?.area.id,unverified:match?.area.originStatus==='unverified'};
  if (viewer.world!==world) showWorld(world);
  viewer.center(point.lat,point.lon,viewer.camera.zoom);
  renderMarkers();
  renderFocus();
  if (world==='Earth' && match?.area.detail) {
    renderCards();
    renderVerification();
  }
}

function renderCards() {
  const filtered = visible();
  const pairs=baseAssessments[config.profile]?.pairs;
  byId('results-subtitle').textContent=bodyLabel[config.body]+' · '+searches[activeSearch].label;
  byId('result-grid').innerHTML = filtered.slice(0,expanded?filtered.length:3).map(site=>{
    const type = grade(site.score);
    return '<article class="result-card'+(selected===site.id?' selected':'')+'"><div class="card-top"><div>'+
      '<button type="button" class="site-title" data-card="'+site.id+'">'+site.name+'</button><p class="card-place">'+site.place+' · '+site.biome+'</p></div>'+
      '<span class="score-pill '+type.className+'" title="Coincidencia de etiquetas; no es confianza científica">'+scoreText(site.score)+'/100</span></div>'+
      (pairs?.[site.id] ? '<p class="site-scope">'+pairs[site.id].scope+'</p>' : '')+
      '<div class="progress-track '+type.className+'" aria-hidden="true"><span style="width:'+(site.score ?? 0)+'%"></span></div>'+
      '<p class="evidence-scope">'+site.evidenceSummary.label+' · '+site.evidenceSummary.local+' rasgos con publicación local, '+site.evidenceSummary.regional+' regionales y '+site.evidenceSummary.pending+' pendientes.</p>'+
      '<div class="card-footer"><span>Coincidencia '+type.label.toLowerCase()+' · '+site.coverage+' % de rasgos respaldados</span>'+comparisonButton(site)+'</div></article>';
  }).join('');
  if (!filtered.length) byId('result-grid').innerHTML='<p class="empty">Las fichas de esta región terrestre carecen de coincidencias documentadas para el rasgo seleccionado.</p>';
  byId('show-all').hidden = filtered.length <= 3;
  byId('show-all').textContent = expanded ? 'Ver los tres primeros' : 'Ver los '+filtered.length+' sitios';
  byId('show-all').setAttribute('aria-expanded',expanded);
}

function row(label, sites, content) {
  return '<tr><th scope="row">'+label+'</th>'+sites.map(site=>'<td>'+content(site)+'</td>').join('')+'</tr>';
}

function safeUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return ['http:','https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function sourceLink(url,label) {
  const href = safeUrl(url);
  if (!href) return '<span>'+esc(label ?? 'Enlace externo')+'</span>';
  return '<a href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(label ?? 'Enlace externo')+' '+icon('ext')+'</a>';
}

function discoveryCriteria() {
  const search = searches[Number(byId('discovery-case').value)];
  byId('discovery-criteria').innerHTML = '<p>'+search.evidence+' '+sourceLink(search.source,'Evidencia del destino')+'</p><ul aria-label="Filtros temáticos">'+
    search.groups.map(group=>'<li>'+group.label+'</li>').join('')+'</ul>'+
    '<button type="button" class="outline" id="discovery-target">Ver '+searchArea(search).name+' en el atlas</button>';
}

function evidenceFor(site,tagsMatched) {
  return '<ul class="evidence-list">'+tagsMatched.map(tag=>{
    const record=catalogEvidence(site,tag);
    return '<li><span class="evidence-label" data-evidence="'+record.level+'">'+evidenceLabels[record.level]+'</span> '+tags[tag]+' · '+record.detail+'</li>';
  }).join('')+'</ul>';
}

function discoveryTable(rows,limit,short = false) {
  const body = rows.map(row=>{
    const {site,missing,matched,terrain,difference,status} = row;
    const reason = row.reason ?? (missing.length ? 'Sin evidencia en la ficha para '+missing.join(', ')
      : status==='unknown' ? 'Datos de relieve insuficientes para comprobar el umbral'
      : status==='excluded' ? 'Diferencia de '+local.format(difference)+'° · umbral de '+local.format(limit)+'°'
      : matched.join(' · '));
    return '<tr><th scope="row">'+site.name+'<small>'+site.place+'</small></th>'+
      '<td>'+reason+(short?'':'<small>'+site.evidence+'</small>'+evidenceFor(site,searches[activeSearch].groups.flatMap(group=>group.values.filter(tag=>site[group.field]?.includes(tag)))))+'</td>'+
      (short?'':'<td>'+(terrain?.metrics?local.format(terrain.metrics.slope)+'° de pendiente mediana'+
        (difference===null?'':'<small>Diferencia de '+local.format(difference)+'°</small>')+
        '<small>'+sourceLink(terrain.source.url,terrain.source.name)+' · '+terrain.resolution+' m por celda</small>'
        :'Sin medida comparable')+'</td>')+
      '<td>'+sourceLink(site.source,site.organization)+(short?'':'<br>'+comparisonButton(scored.find(item=>item.id===site.id))+'<br><button type="button" class="outline" data-discovery-site="'+site.id+'">Ver '+site.name+' en el atlas</button>')+'</td></tr>';
  }).join('');
  return '<div class="table-wrap" role="region" aria-label="'+(short?'Sitios excluidos por los filtros':'Resultados del cruce de datos')+'" tabindex="0"><table><thead><tr>'+
    '<th scope="col">Sitio terrestre</th><th scope="col">'+(short?'Razón de exclusión':'Coincidencias y evidencia')+'</th>'+
    (short?'':'<th scope="col">Relieve comparable</th>')+'<th scope="col">Fuente</th></tr></thead><tbody>'+body+'</tbody></table></div>';
}

async function runDiscovery() {
  const version = ++discoveryRun;
  const search = searches[Number(byId('discovery-case').value)];
  const region = byId('discovery-region').value;
  const value = byId('discovery-slope').valueAsNumber;
  const limit = Number.isFinite(value) ? value : null;
  const status = byId('discovery-status');
  const results = byId('discovery-results');
  const excludedBox = byId('discovery-exclusions');
  status.textContent = 'Calculando coincidencias y consultando modelos de elevación…';
  results.replaceChildren();
  excludedBox.hidden = true;
  const {target,targetTerrain,rows,window} = await discover(search,region,limit);
  if (version!==discoveryRun) return;
  const candidates = rows.filter(row=>row.status==='candidate');
  const pending = rows.filter(row=>row.status==='unknown');
  const excluded = rows.filter(row=>row.status==='excluded');
  status.textContent = rows.length+' sitios revisados · '+candidates.length+' coinciden'+(pending.length?' · '+pending.length+' pendientes de ubicación o relieve':'')+' · '+excluded.length+' excluidos.';
  const context = targetTerrain?.metrics
    ? '<p class="discovery-next">'+target.name+' · '+local.format(targetTerrain.metrics.slope)+'° de pendiente mediana en '+window+' × '+window+
      ' km. '+sourceLink(targetTerrain.source.url,targetTerrain.source.name)+' · '+targetTerrain.resolution+' m por celda.</p>'
    : '<p class="discovery-next">'+target.name+' · pendiente mediana no disponible a escala comparable.</p>';
  results.innerHTML = context+(candidates.length?discoveryTable(candidates,limit):'<p class="empty">Ningún sitio cumplió los filtros seleccionados.</p>')+
    (pending.length?'<h3>Pendientes de ubicación o relieve</h3>'+discoveryTable(pending,limit):'')+
    '<p class="discovery-next">Para validar el ensayo, '+search.next.charAt(0).toLowerCase()+search.next.slice(1)+'</p>';
  excludedBox.hidden = !excluded.length;
  excludedBox.open = false;
  byId('discovery-exclusions-label').textContent = 'Por qué se excluyeron '+excluded.length+' sitios';
  byId('discovery-excluded').innerHTML = excluded.length?discoveryTable(excluded,limit,true):'';
}

function renderReference() {
  const target=areaFor(config);
  const search=searches[activeSearch];
  byId('reference-context').textContent=bodyLabel[config.body]+' · '+target.name;
  byId('base-region').textContent=target.name;
  byId('base-summary').textContent=search.evidence;
  byId('base-target').dataset.baseTarget=target.id;
  byId('base-pairs').innerHTML=target.features.map(([label,value])=>
    '<li><strong>'+label+'</strong><span>'+value+'</span></li>').join('')+
    '<li><strong>Fuente del rasgo</strong><span>'+sourceLink(search.source,'Consultar evidencia del destino')+'</span></li>';
  renderPilot();
}

function renderPilot() {
  const search=searches[activeSearch];
  const assessment=baseAssessments[config.profile];
  const candidates=studyCandidates();
  const choice=pilotChoices.get(activeSearch) ?? '';
  const picker=byId('pilot-choice');
  fill(picker,[{value:'',label:'Seleccionar un sitio terrestre'},...candidates.map(site=>({value:site.id,label:site.name}))],choice);
  const site=candidates.find(item=>item.id===picker.value);
  const pair=assessment?.pairs?.[site?.id];
  byId('pilot-objective').textContent='Rasgo a ensayar · '+search.label;
  byId('pilot-why').textContent=site ? site.name+' · '+(pair?.detail ?? site.description)+' '+search.next : 'Elige un sitio con evidencia del rasgo y compara sus limitaciones.';
  const justification=byId('pilot-note');
  justification.value=site ? pilotNotes.get(activeSearch) ?? '' : '';
  justification.disabled=!site;
  byId('pilot-compare').disabled=!site;
  byId('pilot-source').innerHTML=site?sourceLink(pair?.source ?? site.source,pair?.sourceLabel ?? site.organization):'';
  byId('pilot-alternatives').innerHTML=candidates.map(item=>{
    const evidence=assessment?.pairs?.[item.id];
    const matches=item.detail.flatMap(criterion=>criterion.matches).map(tag=>tags[tag]);
    return '<tr><th scope="row">'+item.name+(item.id===choice?'<small>Área piloto seleccionada</small>':'')+
      '</th><td><strong>'+(matches.length?matches.join(' · '):evidence?.scope ?? 'Referencia para comparación')+'</strong><p>'+
      (evidence?.detail ?? item.description)+'</p><small>'+sourceLink(evidence?.source ?? item.source,evidence?.sourceLabel ?? item.organization)+'</small></td></tr>';
  }).join('');
  study.renderBrief();
  missionPanel?.refresh();
}

async function renderTerrainComparison(sites) {
  const revision = ++comparisonRevision;
  const section = byId('terrain-comparison');
  section.hidden = sites.length===0;
  const root = byId('terrain-comparison-data');
  if (!sites.length) {
    root.replaceChildren();
    return;
  }
  const world = config.body;
  const target = planetaryAreas[world].find(area=>area.profile===config.profile);
  const points = [target,...sites];
  root.innerHTML = '<p class="empty">Cargando modelos de elevación…</p>';
  const data = await Promise.allSettled(points.map((point,i)=>terrainMetrics(i===0?world:'Earth',point)));
  if (revision!==comparisonRevision) return;
  const rows = data.map((result,i)=>{
    const info = result.status==='fulfilled' ? result.value : null;
    const m = info?.metrics;
    return '<tr><th scope="row">'+points[i].name+'<small>'+(i===0?'Objetivo · '+bodyLabel[world]:'Análogo terrestre')+'</small></th>'+
      (m ? '<td>'+local.format(Math.round(m.relief))+' m</td><td>'+local.format(m.slope)+'°</td><td>'+(m.slopeP90==null?'Sin datos':local.format(m.slopeP90)+'°')+'</td><td>'+(m.roughness==null?'Sin datos':local.format(m.roughness)+' m')+'</td>' : '<td colspan="4">'+(info?'Resolución insuficiente para esta escala':'Modelo no disponible')+'</td>')+
      '<td>'+(info ? sourceLink(info.source.url,info.source.name)+'<small>'+local.format(info.resolution)+' m por celda</small>' : '—')+'</td></tr>';
  }).join('');
  root.innerHTML = '<div class="table-wrap" tabindex="0" role="region" aria-label="Comparación topográfica"><table><thead><tr><th scope="col">Área</th><th scope="col">Relieve P90 − P10</th><th scope="col">Pendiente mediana</th><th scope="col">Pendiente P90</th><th scope="col">Rugosidad local</th><th scope="col">Modelo de elevación</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function renderComparison() {
  study.updateContext();
  const sites = compared.map(id=>scored.find(x=>x.id===id));
  renderTerrainComparison(sites);
  byId('compare-count').textContent = sites.length;
  const root = byId('comparison');
  if (!sites.length) {
    root.innerHTML = '<div class="empty"><p>Agrega hasta tres sitios desde la lista de análogos o desde una ficha del atlas.</p><a class="outline" href="#resultados">Ver análogos terrestres '+icon('arrow')+'</a></div>';
    return;
  }
  const detailRows=sites[0].detail.map((criterion,index)=>row(criterion.label,sites,site=>{
    const detail=site.detail[index];
    const matches=detail.matches.map(tag=>tags[tag]);
    const missing=detail.missing.map(tag=>tags[tag]);
    return (detail.score===null?'Sin datos en la ficha':'<strong>'+Math.round(detail.score)+'/100</strong>')+
      (matches.length?'<small>Coincide: '+matches.join(', ')+'</small>'+evidenceFor(site,detail.matches):'')+
      (missing.length?'<small>Por verificar: '+missing.join(', ')+'</small>':'');
  })).join('');
  root.innerHTML = '<div class="table-wrap" role="region" aria-label="Comparación de sitios" tabindex="0"><table><thead><tr><th scope="col">Parámetro</th>'+
    sites.map(site=>'<th scope="col">'+site.name+'<button type="button" class="remove" data-remove="'+site.id+'" aria-label="Quitar '+site.name+'">Quitar</button></th>').join('')+'</tr></thead><tbody>'+
    row('Coincidencia de etiquetas',sites,s=>'<strong class="'+grade(s.score).className+'">'+scoreText(s.score)+'/100 · '+grade(s.score).label+'</strong><small>Sin interpretación probabilística</small>')+
    row('Rasgos solicitados con respaldo',sites,s=>s.coverage+' % · '+(s.evidenceSummary.local+s.evidenceSummary.regional)+' de '+s.evidenceSummary.total)+
    row('Alcance de la evidencia',sites,s=>s.evidenceSummary.label+'<small>'+s.evidenceSummary.local+' locales · '+s.evidenceSummary.regional+' regionales · '+s.evidenceSummary.pending+' pendientes</small>')+detailRows+
    row('Límite de la analogía',sites,s=>analogyLimits(config.body,s)[0])+
    row('Evidencia',sites,s=>s.evidence+'<small>'+sourceLink(s.source,s.organization)+'</small>'+(s.reference?'<small>'+sourceLink(s.reference,s.referenceLabel || 'Fuente complementaria')+'</small>':''))+'</tbody></table></div><p class="study-note">'+measurementCaution+'</p><a class="outline" href="#plan-ensayo">Definir el ensayo y su criterio de éxito</a>';
}

function renderVerification() {
  const search=searches[activeSearch];
  const site=currentSite();
  byId('advice-summary').textContent=areaFor(config).name+' · '+search.label;
  const missing=site?.detail.flatMap(item=>item.missing).map(tag=>tags[tag]) ?? [];
  byId('advice-grid').innerHTML='<article class="advice"><h3>Comprobación del rasgo</h3><p>'+search.next+'</p></article>'+
    (site ? '<article class="advice"><h3>'+site.name+'</h3><p>'+(missing.length?'Rasgos sin coincidencia documentada: '+missing.join(', ')+'.':'Los rasgos coincidentes requieren revisión de escala y alcance.')+'</p><p>'+analogyLimits(config.body,site)[0]+'</p></article>' : '')+
    '<article class="advice"><h3>Límites de la transferencia</h3><ul>'+planetaryLimits[config.body].items.map(line=>'<li>'+line+'</li>').join('')+'</ul>'+sourceLink(planetaryLimits[config.body].source.url,planetaryLimits[config.body].source.name)+'</article>'+
    '<article class="advice"><h3>Escala e incertidumbre</h3><p>'+measurementCaution+'</p><a href="#sensibilidad">Revisar la sensibilidad de la elección</a></article>';
  missionPanel?.refresh();
}

function updateAll() {
  renderMarkers();
  renderFocus();
  renderCards();
  renderComparison();
  renderVerification();
  renderReference();
}

function setReference(index,centerGlobe=false) {
  const search=searches[index];
  const target=searchArea(search);
  const changed=index!==activeSearch;
  activeSearch=index;
  config={body:search.world,profile:target.profile};
  if (changed) {
    scored=ranking(config,search.groups);
    selected=null;
    compared=[];
    expanded=false;
    byId('region').value='all';
    byId('compare-status').textContent='';
  }
  byId('discovery-case').value=String(index);
  discoveryCriteria();
  if (centerGlobe) {
    areaState[config.body]={point:target,id:target.id};
    if (centerGlobe) showWorld(config.body);
  }
  if (changed) {
    ++discoveryRun;
    byId('discovery-results').replaceChildren();
    byId('discovery-status').textContent='';
    byId('discovery-exclusions').hidden=true;
    study.useReference(search.trait);
  }
  updateAll();
}

function renderGuidedRoute(body) {
  guidedBody = body;
  const guided = guidedCases[body];
  for (const button of caseButtons) {
    button.setAttribute('aria-pressed',String(button.dataset.guidedCase===body));
  }
  byId('recorrido').hidden = !guided;
  if (!guided) return;
  byId('route-title').textContent = guided.title;
  byId('route-task').textContent = guided.task;
}

function selectArea(id,origin,explicitWorld) {
  study.atlasSectorId=null;
  const world = explicitWorld ?? (origin==='card' ? 'Earth' : viewer.world);
  if (origin==='card') byId('atlas-region').value = 'all';
  const site = (world==='Earth'?scored:areasFor(world)).find(item=>item.id===id);
  if (!site) return;
  if (!hasCoordinates(site)) {
    byId('area-announcement').textContent=site.name+' · no se puede mostrar en el mapa porque faltan coordenadas.';
    return;
  }
  if (world==='Earth' && !areasFor(world).some(item=>item.id===id)) byId('atlas-region').value='all';
  if (world==='Earth' && site.detail) selected = id;
  areaState[world] = {point:site,id,unverified:site.originStatus==='unverified'};
  if (origin==='card' || viewer.world!==world) {
    showWorld(world);
    if (origin==='card') goToSection('atlas');
  }
  viewer.center(site.lat,site.lon,viewer.camera.zoom);
  renderMarkers();
  renderFocus();
  if (world==='Earth' && site.detail) {
    renderCards();
    renderVerification();
  }
  requestAnimationFrame(()=>{
    if (origin==='form') return;
    const target = origin==='list' ? byId('area-list') : document.querySelector((origin==='shortcut'?'[data-atlas-site="':'[data-marker="')+id+'"]');
    if (target && !target.hidden) target.focus({preventScroll:true});
  });
}

function analyzeArea(id) {
  const indexes=casesFor(viewer.world,id);
  setReference(indexes.includes(activeSearch)?activeSearch:indexes[0]);
  goToSection('descubrimiento',{focus:true});
}

function compareSite(id, origin) {
  const site = scored.find(x=>x.id===id);
  if (!hasCoordinates(site)) return;
  const status = byId('compare-status');
  const discoveryButton=document.activeElement?.closest('#discovery-results [data-compare]');
  if (compared.includes(id)) {
    compared = compared.filter(value=>value!==id);
    status.textContent = site.name+' se quitó de la comparación.';
  } else {
    if (compared.length===3) {
      status.textContent = 'Ya seleccionaste tres sitios. Quita uno para agregar '+site.name+'.';
      goToSection('comparacion',{block:'nearest'});
      return;
    }
    compared.push(id);
    status.textContent = site.name+' se añadió a la comparación.';
  }
  renderFocus();
  renderCards();
  renderComparison();
  for (const button of byId('discovery-results').querySelectorAll('[data-compare="'+id+'"]')) {
    button.outerHTML=comparisonButton(site);
  }
  if (discoveryButton) {
    byId('discovery-results').querySelector('[data-compare="'+id+'"]')?.focus({preventScroll:true});
    return;
  }
  const replacement = (origin === 'remove' ? document.querySelector('[data-remove]') : document.querySelector((origin === 'atlas' ? '#area-evidence-content' : '#result-grid')+' [data-compare="'+id+'"]')) || byId('compare-jump');
  replacement.focus({preventScroll:true});
}

const discoveryPicker = byId('discovery-case');
const discoveryGroups = new Map();
for (const [i,search] of searches.entries()) {
  if (!discoveryGroups.has(search.environment)) {
    const group = document.createElement('optgroup');
    group.label = search.environment;
    discoveryGroups.set(search.environment,group);
    discoveryPicker.append(group);
  }
  discoveryGroups.get(search.environment).append(new Option(bodyLabel[search.world]+' · '+search.label,String(i)));
}
fill(byId('discovery-region'),[{value:'all',label:'Todas las regiones'},...[...new Set(analogs.map(site=>site.region))].sort((a,b)=>a.localeCompare(b,'es')).map(region=>({value:region,label:region}))],'all');
refreshRegions();
study.useReference(searches[activeSearch].trait);
setReference(activeSearch);
showWorld('Earth');
viewer.showOverview();
followHash();

discoveryForm.addEventListener('change',event=>{
  if (event.target.id==='discovery-case') setReference(Number(event.target.value));
  ++discoveryRun;
  byId('discovery-status').textContent='Pulsa «Revisar catálogo» para aplicar los filtros.';
  byId('discovery-results').replaceChildren();
  byId('discovery-exclusions').hidden=true;
});
discoveryForm.addEventListener('submit',event=>{
  event.preventDefault();
  runDiscovery().catch(()=>{
    byId('discovery-status').textContent = 'No se pudo completar el cruce. Vuelve a intentarlo.';
  });
});
byId('discovery-criteria').addEventListener('click',event=>{
  if (!event.target.closest('#discovery-target')) return;
  showWorld(config.body);
  selectArea(areaFor(config).id,'form');
  byId('area-summary').open = true;
  goToSection('atlas',{focus:true});
});
byId('discovery-results').addEventListener('click',event=>{
  const button = event.target.closest('[data-discovery-site]');
  if (!button) return;
  byId('atlas-region').value = 'all';
  showWorld('Earth');
  selectArea(button.dataset.discoverySite,'form');
  byId('area-summary').open = true;
  goToSection('atlas',{focus:true});
});

for (const button of caseButtons) {
  button.addEventListener('click',()=>{
    const body = button.dataset.guidedCase;
    const guided = guidedCases[body];
    setReference(casesFor(body,areaFor({body,profile:guided.profile}).id)[0],true);
    renderGuidedRoute(body);
    goToSection('recorrido',{focus:true});
  });
}
byId('route-atlas').addEventListener('click',()=>{
  showWorld(guidedBody);
  byId('area-summary').open = true;
  goToSection('atlas',{focus:true});
});
byId('region').addEventListener('change',()=>{
  const sites = visible();
  if (sites.length && !sites.some(s=>s.id===selected)) selected=sites[0].id;
  expanded = false;
  renderCards();
  renderVerification();
});
byId('atlas-region').addEventListener('change',()=>{
  if (!areasFor('Earth').some(item=>item.id===areaState.Earth.id)) areaState.Earth={point:null,id:null};
  showWorld('Earth');
});
byId('pilot-choice').addEventListener('change',event=>{
  pilotChoices.set(activeSearch,event.target.value);
  if (event.target.value) study.clearPilot();
  pilotNotes.delete(activeSearch);
  renderPilot();
});
byId('pilot-note').addEventListener('input',event=>{pilotNotes.set(activeSearch,event.target.value);study.renderBrief()});
byId('pilot-compare').addEventListener('click',()=>{
  const choice = byId('pilot-choice').value;
  compared = [choice,...studyCandidates().filter(site=>site.id!==choice).map(site=>site.id)].slice(0,3);
  byId('compare-status').textContent = '';
  renderFocus();
  renderCards();
  renderComparison();
  goToSection('comparacion',{focus:true});
});
byId('area-list').addEventListener('change',event=>{
  if (event.target.value) selectArea(event.target.value,'list');
  else {areaState[viewer.world]={point:null,id:null};renderMarkers();renderFocus();}
});
byId('show-all').addEventListener('click',()=>{
  expanded = !expanded;
  renderCards();
});
byId('compare-jump').addEventListener('click',()=>{
  goToSection('comparacion',{focus:true});
});
document.addEventListener('click',event=>{
  if (event.target.closest('[data-atlas-view="overview"]')) {
    viewer.showOverview();
    return;
  }
  const sector=event.target.closest('[data-atlas-sector]');
  if (sector) {
    study.openSector(Number(sector.dataset.atlasSector),false);
    if (sector.tagName==='BUTTON') byId('atlas-sector-buttons').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  }
  const world = event.target.closest('[data-world]');
  if (world?.tagName==='BUTTON') {
    const select=event.target.closest('[data-marker],[data-card]');
    viewer.focusWorld(world.dataset.world,()=>{
      showWorld(world.dataset.world);
      if (select) selectArea(select.dataset.marker || select.dataset.card,select.dataset.marker?'marker':'card',select.dataset.markerWorld);
    });
    return;
  }
  const target = event.target.closest('[data-base-target]');
  if (target) {
    showWorld(config.body);
    selectArea(target.dataset.baseTarget,'form');
    goToSection('atlas',{focus:true});
  }
  const select = event.target.closest('[data-marker],[data-card]');
  if (select) selectArea(select.dataset.marker || select.dataset.card,select.dataset.marker?'marker':'card',select.dataset.markerWorld);
  const shortcut = event.target.closest('[data-atlas-site]');
  if (shortcut) selectArea(shortcut.dataset.atlasSite,'shortcut');
  const analyze = event.target.closest('[data-analyze-area]');
  if (analyze) analyzeArea(analyze.dataset.analyzeArea);
  const compare = event.target.closest('[data-compare],[data-remove]');
  if (compare) compareSite(compare.dataset.compare || compare.dataset.remove,compare.dataset.remove?'remove':compare.closest('#focus-site')?'atlas':'card');
});
byId('zoom-in').addEventListener('click',()=>viewer.zoom(.22));
byId('zoom-out').addEventListener('click',()=>viewer.zoom(-.22));
byId('reset-map').addEventListener('click',()=>viewer.reset());
byId('reset-all-globes').addEventListener('click',()=>viewer.resetAll());
bindWelcomeIntro();
