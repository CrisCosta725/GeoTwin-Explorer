import {bindValidation} from './validation-panel.js';
import {catalogGeometry,footprintArea,geographicFootprint,locator,projectedPath,sampledFootprint,sectorGeometry} from './result-map.js';
import {evidenceLabels,sectorEvidence} from './evidence-quality.js';
import {geologyCase,geologyMetadata,loadGeology,measureGeology} from './geology-coverage.js';
import {analogyLimits,measurementCaution} from './analogy-limits.js';
import {parseProject,projectDocument,projectLimit,readTextFile,validateState} from './project-file.js';
import {bindConePanel} from './cone-panel.js';
import {bindPeruGeologyPanel} from './peru-geology-panel.js';
import {loadPeruGeology} from './peru-geology.js';
import {candidateComparison,candidateCsv,geologyArea,geologySummary} from './sector-comparison.js';
import {offsetPoint} from './relief.js';
import {evidenceLayer,isLand,landLayer,volcanoLayer} from './study-layers.js';
import {comparePolygons,eastProfile,inside,localPoint,polygonBounds,simplePolygon,square,stats,studyRelief,studyStep,studyWidth,surface,transectLength,transectProfile} from './study-metrics.js';

const byId = id=>document.getElementById(id);
const fmt = (value,digits=1)=>value==null ? 'Sin datos' : value.toLocaleString('es-PE',{maximumFractionDigits:digits});
const percent = value=>value==null ? 'Sin datos' : fmt(value*100,0)+' %';
const position = point=>fmt(point.lat,5)+'°, '+fmt(point.lon,5)+'°';
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeHref(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:','https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const sourceLink = source=>{
  if (!source) return 'Sin fuente';
  const href = safeHref(typeof source === 'string' ? source : source.url);
  const name = typeof source === 'string' ? source : source.name || 'Enlace';
  return href ? '<a href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(name)+'</a>' : esc(name);
};
const key = 'geotwin.study.v1';
const palette = ['#8ce3d1','#ffc49d','#a5bff5','#dec4ed','#f5db87'];
const samePoint=(a,b)=>a?.lat===b?.lat && a?.lon===b?.lon;
const polygonKey=(world,point)=>[world,point.lat,point.lon].join(':');

function safeUrl(value) {
  try { const url = new URL(value); return url.protocol==='https:' || url.protocol==='http:' ? url.href : null; }
  catch { return null; }
}

function coordinates(value) {
  return Array.isArray(value) && value.length>=2 && value.slice(0,2).every(Number.isFinite) &&
    Math.abs(value[0])<=180 && Math.abs(value[1])<=90;
}

function readEvidence(data) {
  const polygons = [];
  const add = geometry=>{
    if (geometry?.type==='MultiPolygon') {
      for (const rings of geometry.coordinates) add({type:'Polygon',coordinates:rings});
    } else if (geometry?.type==='Polygon') {
      if (!Array.isArray(geometry.coordinates) || !geometry.coordinates.length) throw Error();
      const rings = geometry.coordinates.map(ring=>{
        if (!Array.isArray(ring) || ring.length<4 || !ring.every(coordinates)) throw Error();
        if (ring[0][0]!==ring.at(-1)[0] || ring[0][1]!==ring.at(-1)[1]) throw Error();
        return ring.slice(0,-1).map(([lon,lat])=>({lat,lon}));
      });
      polygons.push(rings);
    }
  };
  if (data.type==='FeatureCollection') data.features.forEach(item=>add(item.geometry));
  else add(data.type==='Feature'?data.geometry:data);
  if (!polygons.length || polygons.flat(2).length>40000) throw Error();
  return polygons;
}

export function download(name,type,value) {
  const url = URL.createObjectURL(new Blob([value],{type}));
  const link = document.createElement('a');
  link.href=url;
  link.download=name;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

function summary(data,limit) {
  if (!data) return '';
  return '<dl class="study-values"><div><dt>Superficie</dt><dd>'+(data.area<.01?fmt(data.area*1e6,0)+' m²':fmt(data.area,2)+' km²')+'</dd></div>'+
    '<div><dt>Pendiente mediana</dt><dd>'+fmt(data.slope)+(data.slope==null?'':'°')+'</dd></div>'+
    '<div><dt>Pendiente P90</dt><dd>'+fmt(data.slopeP90)+(data.slopeP90==null?'':'°')+'</dd></div>'+
    '<div><dt>Rugosidad local</dt><dd>'+fmt(data.roughness)+(data.roughness==null?'':' m')+'</dd></div>'+
    '<div><dt>Relieve P90−P10</dt><dd>'+fmt(data.relief)+(data.relief==null?'':' m')+'</dd></div>'+
    '<div><dt>Área muestreada ≤ '+fmt(limit)+'°</dt><dd>'+percent(data.pass)+'</dd></div>'+
    '<div><dt>Cobertura de elevación</dt><dd>'+percent(data.elevationCoverage)+'</dd></div>'+
    '<div><dt>Cobertura de pendiente</dt><dd>'+percent(data.slopeCoverage)+'</dd></div></dl>';
}

export class Study {
  constructor(api) {
    this.api=api;
    this.canvas=byId('study-map');
    this.points=[];
    this.polygons={};
    this.library=new Map();
    this.pairEpoch=0;
    this.drafts=new Map();
    this.history=[];
    this.mode='draw';
    this.closed=false;
    this.dirty=false;
    this.measuring=false;
    this.cursor={x:.5,y:.5};
    this.analysis=null;
    this.atlasSectorId=null;
    this.sectorGeometries=new WeakMap();
    this.evidence=null;
    this.epoch=0;
    this.profileEpoch=0;
    this.scanEpoch=0;
    this.measureEpoch=0;
    this.loadingGrid=false;
    this.updateValidation=bindValidation(this,download);
    this.cones=bindConePanel(this,download);
    this.peruGeology=bindPeruGeologyPanel(this,download);
    this.bind();
  }

  bind() {
    this.bindMap();
    byId('study-width').addEventListener('change',()=>{
      this.refreshGrid();
      this.updateControls();
      if (this.points.some(point=>{
        const {x,y}=this.mapPosition(point);
        return x<0 || y<0 || x>1 || y>1;
      })) byId('study-status').textContent='Hay vértices fuera de la vista. «Centrar contorno» vuelve a encuadrarlos.';
    });
    byId('study-library').addEventListener('change',event=>this.openSaved(event.target.value));
    byId('study-new').addEventListener('click',()=>this.startNew());
    byId('scan-slope').addEventListener('change',()=>this.compareSaved());
    byId('study-metadata-save').addEventListener('click',()=>this.saveMetadata());
    byId('study-pilot-save').addEventListener('click',()=>{
      const area=this.currentSaved();
      if (area?.world!=='Earth' || area.unverified) return;
      this.clearPilot();
      this.api.clearCatalogPilot();
      this.savedPilot=area.id;
      this.savedPilotReference=this.api.target().reference;
      this.renderSavedPilot();
      this.renderBrief();
      this.api.navigate('ficha-piloto');
    });
    byId('study-pilot-remove').addEventListener('click',()=>{this.savedPilot=null;this.renderSavedPilot();this.renderBrief()});
    byId('study-pilot-open').addEventListener('click',()=>this.openSaved(this.savedPilot));
    byId('scan-boundary').addEventListener('change',()=>this.updateBoundary());
    for (const id of ['study-pair-target','study-pair-earth']) byId(id).addEventListener('change',()=>this.compareSaved());
    byId('study-scan').addEventListener('click',()=>{
      const saved=this.polygons[this.world];
      if (!saved || this.dirty || !samePoint(saved.origin ?? saved.center,this.center)) return;
      if (this.world==='Earth') {
        byId('scan-boundary').value=saved.id;
        this.updateBoundary();
        byId('scan-lat').value=saved.center.lat.toFixed(6);
        byId('scan-lon').value=saved.center.lon.toFixed(6);
      } else {
        this.activePlanet=this.world;
        this.activeArea=saved.id;
        this.updateContext();
      }
    });
    byId('scan-source').addEventListener('input',()=>this.paint());
    byId('study-layer').addEventListener('change',()=>{this.paint();this.loadEvidencePoints()});
    byId('study-map-retry').addEventListener('click',()=>this.refreshGrid());
    byId('study-undo').addEventListener('click',()=>this.undo());
    byId('study-clear').addEventListener('click',()=>this.clear());
    byId('study-square').addEventListener('click',()=>{
      if (!this.center) return;
      this.remember();
      this.points=square(this.world,this.mapCenter,this.span*.7);
      this.closed=true;
      this.changed();
    });
    byId('study-measure').addEventListener('click',()=>this.measure());
    byId('scan-earth').addEventListener('click',()=>{
      const point=this.api.earth();
      if (!point) return;
      byId('scan-lat').value=point.lat.toFixed(6);
      byId('scan-lon').value=point.lon.toFixed(6);
    });
    byId('scan-use-mission').addEventListener('click',()=>{this.activePlanet=null;this.activeArea=null;this.updateContext()});
    byId('scan-geology').addEventListener('change',()=>{this.traitEdited=true;this.showGeologyCase()});
    byId('scan-geology-example').addEventListener('click',()=>{
      const criterion=geologyCase(this.target(),byId('scan-geology').value);
      if (!criterion) return;
      byId('scan-boundary').value='';
      this.updateBoundary();
      byId('scan-lat').value=criterion.center.lat;
      byId('scan-lon').value=criterion.center.lon;
      byId('scan-status').textContent='Centro de búsqueda en Hawaiʻi. Pulsa «Buscar sectores» para calcular la cobertura.';
    });
    byId('study-limit').addEventListener('change',()=>{
      const limit=byId('study-limit');
      if (limit.value!=='' && limit.validity.valid) byId('scan-slope').value=limit.value;
      if (this.points.length) this.changed();
    });
    byId('scan-form').addEventListener('submit',event=>{event.preventDefault();this.scan()});
    byId('scan-file').addEventListener('change',event=>this.importEvidence(event.target.files[0]));
    byId('scan-clear-evidence').addEventListener('click',()=>{
      this.evidence=null;
      byId('scan-file').value='';
      byId('scan-source').value='';
      byId('scan-status').textContent='Capa cartográfica retirada. Vuelve a buscar para actualizar los resultados.';
      this.paint();
    });
    byId('scan-results').addEventListener('click',event=>{
      const button=event.target.closest('[data-study-sector],[data-view-sector]');
      if (button?.hasAttribute('data-study-sector')) this.choose(Number(button.dataset.studySector));
      if (button?.hasAttribute('data-view-sector')) this.openSector(Number(button.dataset.viewSector));
    });
    byId('spatial-pilot').addEventListener('change',event=>{
      if (event.target.id==='spatial-pilot-select') this.choose(Number(event.target.value),false);
    });
    byId('spatial-pilot').addEventListener('click',event=>{
      const action=event.target.closest('[data-study-action]')?.dataset.studyAction;
      if (!action) return;
      const candidate=this.pilot();
      if (!candidate || this.outdatedSearch()) return;
      if (action==='map') {
        this.openSector(candidate.id);
      } else {
        this.updateProfiles();
        this.api.navigate('perfiles');
      }
    });
    byId('spatial-pilot-note').addEventListener('input',event=>{this.note=event.target.value;this.renderBrief()});
    byId('atlas-sector-card').addEventListener('click',event=>{
      if (event.target.closest('[data-select-atlas-pilot]')) this.choose(this.atlasSectorId);
    });
    byId('pilot-brief').addEventListener('click',event=>{
      const button=event.target.closest('[data-open-brief],[data-view-sector]');
      if (!button) return;
      if (button.dataset.viewSector) this.openSector(Number(button.dataset.viewSector));
      else if (button.dataset.openBrief==='saved') this.openSaved(this.savedPilot);
      else this.api.openCatalog(button.dataset.openBrief);
    });
    byId('study-save').addEventListener('click',()=>this.save());
    byId('study-restore').addEventListener('click',()=>this.restore());
    byId('project-export').addEventListener('click',()=>{
      download('GeoTwin-proyecto.geotwin.json','application/json',JSON.stringify(projectDocument(this.captureState()),null,2));
      byId('study-save-status').textContent='Proyecto descargado. Puedes abrirlo en otro navegador con todos sus datos de trabajo.';
    });
    byId('project-import').addEventListener('change',async event=>{
      const file=event.target.files[0];
      if (!file) return;
      try {
        if (file.size>projectLimit) throw Error('El proyecto supera el límite de 24 MB.');
        const record=parseProject(await readTextFile(file));
        const previous=this.captureState();
        try {this.applyState(record);} catch (error) {this.applyState(previous);throw Error('La estructura está incompleta; se conserva la sesión anterior.');}
        byId('study-save-status').textContent='Proyecto abierto: polígonos, fuentes, parámetros y planes recuperados.';
      } catch (error) {byId('study-save-status').textContent='No se pudo abrir el proyecto. '+error.message;}
      finally {event.target.value='';}
    });
    byId('study-export-earth').addEventListener('click',()=>this.exportEarth());
    byId('study-export-planet').addEventListener('click',()=>this.exportPlanet());
    byId('study-export-candidates').addEventListener('click',()=>this.exportCandidates());
    byId('study-export-report').addEventListener('click',()=>this.report());
    this.renderScan();
    this.refreshLibrary();
  }

  bindMap() {
    const canvas=this.canvas;
    for (const mode of ['draw','pan','transect']) {
      byId('study-'+mode).addEventListener('click',()=>this.setMode(mode));
    }
    byId('study-center').addEventListener('click',()=>this.centerMap());
    canvas.addEventListener('pointerdown',event=>{
      if (!event.isPrimary || event.button!==0 || !this.center) return;
      const point=this.pointer(event);
      const vertex=this.mode==='draw' ? this.nearVertex(point) : -1;
      this.pointerStart={id:event.pointerId,point,vertex,center:this.mapCenter,original:this.points[vertex],moved:false};
      canvas.focus({preventScroll:true});
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if (!this.center || !event.isPrimary) return;
      this.cursor=this.pointer(event);
      const drag=this.pointerStart;
      if (drag?.id===event.pointerId) {
        const dx=this.cursor.x-drag.point.x, dy=this.cursor.y-drag.point.y;
        if (Math.hypot(dx,dy)>.011) drag.moved=true;
        if (drag.moved && this.mode==='pan') {
          this.mapCenter=offsetPoint(this.world,drag.center,-dx*this.span,dy*this.span);
          this.previewShift=true;
        }
        if (drag.moved && drag.vertex>=0) this.points[drag.vertex]=this.mapPoint(this.cursor);
      }
      this.paint();
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      canvas.addEventListener(name,event=>{
        const drag=this.pointerStart;
        if (drag?.id!==event.pointerId) return;
        this.pointerStart=null;
        if (name!=='pointerup') {
          if (drag.vertex>=0) this.points[drag.vertex]=drag.original;
          if (this.previewShift) this.mapCenter=drag.center;
          this.previewShift=false;
          this.paint();
          return;
        }
        if (this.mode==='pan') {
          if (drag.moved) this.refreshGrid();
          return;
        }
        if (drag.moved && drag.vertex>=0) {
          const next=this.points[drag.vertex];
          this.points[drag.vertex]=drag.original;
          this.remember();
          this.points[drag.vertex]=next;
          this.changed();
        } else if (!drag.moved) this.mark(this.pointer(event));
      });
    }
    canvas.addEventListener('keydown',event=>{
      const moves={ArrowLeft:[-.03,0],ArrowRight:[.03,0],ArrowUp:[0,-.03],ArrowDown:[0,.03]};
      const move=moves[event.key];
      if ((!move && event.key!=='Enter' && event.key!=='Escape') || !this.center) return;
      event.preventDefault();
      if (event.key==='Escape') this.setMode('draw');
      else if (event.key==='Enter') {
        if (this.mode!=='pan') this.mark(this.cursor);
      } else if (this.mode==='pan') {
        this.mapCenter=offsetPoint(this.world,this.mapCenter,move[0]*this.span*4,-move[1]*this.span*4);
        this.refreshGrid();
      } else {
        this.cursor={x:Math.max(.01,Math.min(.99,this.cursor.x+move[0])),y:Math.max(.01,Math.min(.99,this.cursor.y+move[1]))};
        this.paint();
      }
    });
  }

  get span() { return Number(byId('study-width').value); }

  pointer(event) {
    const rect=this.canvas.getBoundingClientRect();
    const clamp=value=>Math.max(0,Math.min(1,value));
    return {x:clamp((event.clientX-rect.left)/rect.width),y:clamp((event.clientY-rect.top)/rect.height)};
  }

  mapPoint({x,y}) {
    return offsetPoint(this.world,this.mapCenter,(x-.5)*this.span,(.5-y)*this.span);
  }

  mapPosition(point) {
    const {x,y}=localPoint(this.world,this.mapCenter,point);
    return {x:x/this.span+.5,y:.5-y/this.span};
  }

  nearVertex(point) {
    const radius=14/Math.max(240,this.canvas.clientWidth);
    return this.points.findIndex(vertex=>{
      const p=this.mapPosition(vertex);
      return Math.hypot(p.x-point.x,p.y-point.y)<radius;
    });
  }

  mark(point) {
    this.cursor=point;
    if (this.mode==='transect') {this.markTransect(this.mapPoint(point));return}
    const vertex=this.nearVertex(point);
    if (vertex===0 && this.points.length>=3 && !this.closed) {
      this.measure();
    } else if (vertex>=0) {
      byId('study-status').textContent='Arrastra el vértice para moverlo. Usa Deshacer para revertir el último cambio.';
    } else if (this.closed) {
      byId('study-status').textContent='Contorno cerrado. Arrastra un vértice para editarlo o pulsa Limpiar para dibujar otro.';
    } else if (this.points.length>=64) {
      byId('study-status').textContent='El contorno admite hasta 64 vértices.';
    } else {
      this.remember();
      this.points.push(this.mapPoint(point));
      this.changed();
    }
  }

  setMode(mode) {
    if (mode==='transect' && !this.currentSaved()) return;
    this.mode=mode;
    this.lineStart=null;
    this.canvas.dataset.mode=mode;
    for (const tool of ['draw','pan','transect']) byId('study-'+tool).setAttribute('aria-pressed',mode===tool);
    this.updateControls();
    if (mode==='transect') byId('study-status').textContent='Marca el inicio del perfil dentro del polígono.';
    this.paint();
  }

  centerMap() {
    const bounds=this.points.length ? polygonBounds(this.world,this.points) : null;
    this.mapCenter=bounds?.center ?? this.center;
    if (bounds && bounds.span*1.12>this.span) {
      const widths=[...byId('study-width').options].map(option=>Number(option.value));
      byId('study-width').value=String(widths.find(width=>width>=bounds.span*1.12) ?? widths.at(-1));
    }
    this.cursor={x:.5,y:.5};
    this.updateControls();
    this.refreshGrid();
  }

  remember() {
    this.history.push({points:this.points.slice(),closed:this.closed,dirty:this.dirty,saved:this.polygons[this.world],activePlanet:this.activePlanet});
    if (this.history.length>80) this.history.shift();
  }

  undo() {
    const previous=this.history.pop();
    if (!previous) return;
    this.points=previous.points;
    this.closed=previous.closed;
    this.dirty=previous.dirty;
    if (previous.saved) {
      this.polygons[this.world]=previous.saved;
      this.library.set(previous.saved.id,previous.saved);
    }
    else delete this.polygons[this.world];
    this.refreshLibrary();
    this.activePlanet=previous.activePlanet;
    this.changed(previous.dirty);
    this.updateContext();
  }

  clear() {
    this.remember();
    if (samePoint(this.polygons[this.world]?.origin ?? this.polygons[this.world]?.center,this.center)) {
      delete this.polygons[this.world];
      if (this.activePlanet===this.world) this.activePlanet=null;
    }
    this.points=[];
    this.closed=false;
    this.setMode('draw');
    this.changed(false);
    this.updateContext();
  }

  deselect(world) {
    if (this.center) this.drafts.set(polygonKey(this.world,this.center),{points:this.points,closed:this.closed,dirty:this.dirty,history:this.history,mapCenter:this.mapCenter,span:this.span,limit:byId('study-limit').value});
    ++this.epoch;++this.measureEpoch;
    this.world=world;this.center=null;this.mapCenter=null;this.grid=null;this.gridError=false;
    this.points=[];this.history=[];this.closed=false;this.dirty=false;this.measuring=false;this.loadingGrid=false;
    byId('draw-context').textContent='Sin área seleccionada · elige una región en el atlas.';
    byId('study-cursor').textContent='';
    this.updateControls();this.paint();this.refreshLibrary();
  }

  select(world,center,label,documented,unverified=false) {
    this.documented=documented;
    this.unverified=unverified;
    this.label=label;
    if (!this.center || this.world!==world || !samePoint(this.center,center)) {
      if (this.center) this.drafts.set(polygonKey(this.world,this.center),{
        points:this.points,closed:this.closed,dirty:this.dirty,history:this.history,mapCenter:this.mapCenter,
        span:this.span,limit:byId('study-limit').value
      });
      ++this.epoch;
      this.grid=null;
      this.gridError=false;
      this.sectorFrame=null;
      this.world=world;
      this.center={lat:center.lat,lon:center.lon};
      const saved=this.polygons[world];
      const available=samePoint(saved?.origin ?? saved?.center,center)?saved:null;
      const draft=this.drafts.get(polygonKey(world,this.center));
      this.points=draft?.points.slice() ?? available?.points.slice() ?? [];
      this.history=draft?.history ?? [];
      this.closed=draft?.closed ?? Boolean(available);
      this.mapCenter=draft?.mapCenter ?? available?.center ?? this.center;
      byId('study-width').value=String(draft?.span ?? available?.viewSpan ?? available?.span ?? studyWidth);
      if (byId('study-width').selectedIndex<0) byId('study-width').value=String(studyWidth);
      byId('study-limit').value=draft?.limit ?? available?.limit ?? byId('scan-slope').value;
      this.cursor={x:.5,y:.5};
      this.changed(draft?.dirty ?? false);
      this.setMode('draw');
      this.refreshGrid();
    }
    this.loadEvidencePoints();
    byId('draw-context').textContent=label+' · '+position(center);
    this.updateControls();
    this.refreshLibrary();
  }

  refreshLibrary() {
    const all=[...this.library.values()];
    const options=(id,label,areas,preferred)=>{
      const select=byId(id);
      const value=preferred ?? select.value;
      select.replaceChildren(new Option(label,''),...areas.map(area=>new Option(area.label+' · '+({Earth:'Tierra',Moon:'Luna',Mars:'Marte'}[area.world]),area.id)));
      if (areas.some(area=>area.id===value)) select.value=value;
    };
    options('study-library','Seleccionar polígono',all,this.currentSaved()?.id ?? '');
    options('scan-boundary','Ventana regional de 60 × 60 km',all.filter(area=>area.world==='Earth'));
    options('study-pair-target','Región de referencia',all.filter(area=>area.world!=='Earth'));
    options('study-pair-earth','Sector piloto o análogos del catálogo',all.filter(area=>area.world==='Earth'));
    this.cones?.refresh();
    this.peruGeology?.refresh();
  }

  openSaved(id) {
    const area=this.library.get(id);
    if (!area) return;
    this.sectorFrame=null;
    this.api.openArea(area.world,area.origin ?? area.center);
    this.polygons[area.world]=area;
    this.points=area.points.slice();
    this.mapCenter=area.center;
    this.closed=true;
    this.history=[];
    this.fillMetadata(area);
    byId('study-width').value=String(area.viewSpan ?? 20);
    byId('study-limit').value=area.limit;
    this.setMode('draw');
    this.changed(false);
    this.centerMap();
    this.refreshLibrary();
  }

  startNew() {
    this.remember();
    delete this.polygons[this.world];
    this.points=[];
    this.closed=false;
    this.setMode('draw');
    this.changed(false);
    this.refreshLibrary();
    byId('study-library-status').textContent='Dibuja el nuevo contorno. Los polígonos medidos siguen en la lista.';
  }

  renderSavedPilot() {
    const area=this.library.get(this.savedPilot);
    const current=this.savedPilotReference==null || this.savedPilotReference===this.api.target().reference;
    byId('study-pilot-record').hidden=!area || !current;
    if (!area || !current) return;
    byId('study-pilot-name').textContent=area.label;
    byId('study-pilot-why').textContent=area.justification || 'Justificación pendiente. Registra qué rasgo reproduce y qué falta comprobar en la ficha del polígono.';
    byId('study-pilot-source').innerHTML=area.evidenceUrl?sourceLink({name:'Fuente del rasgo',url:area.evidenceUrl}):'Fuente temática pendiente.';
  }

  fillMetadata(area) {
    byId('study-name').dataset.area=area.id;
    byId('study-name').value=area.label;
    byId('study-evidence-url').value=area.evidenceUrl ?? '';
    byId('study-justification').value=area.justification ?? '';
  }

  saveMetadata() {
    const area=this.currentSaved();
    if (!area) return;
    const name=byId('study-name').value.trim();
    const value=byId('study-evidence-url').value.trim();
    const evidenceUrl=value?safeUrl(value):'';
    const status=byId('study-library-status');
    if (!name || (value && !evidenceUrl)) {
      status.textContent='Indica un nombre y, si agregas una fuente, una URL HTTP o HTTPS.';
      return;
    }
    Object.assign(area,{label:name,evidenceUrl,justification:byId('study-justification').value.trim()});
    this.library.set(area.id,area);
    this.renderSavedPilot();
    this.renderBrief();
    this.refreshLibrary();
    this.updateContext();
    this.compareSaved();
    status.textContent='Ficha actualizada. Usa «Guardar en este navegador» para recuperarla en otra sesión.';
  }

  lineInside(area,line) {
    const vertices=area.points.map(point=>localPoint(area.world,area.center,point));
    const [a,b]=line.map(point=>localPoint(area.world,area.center,point));
    if (Math.hypot(b.x-a.x,b.y-a.y)<.002) return false;
    const turn=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    return [a,b].every(p=>inside(vertices,p.x,p.y)) &&
      !vertices.some((p,i)=>{
        const q=vertices[(i+1)%vertices.length];
        return turn(a,b,p)*turn(a,b,q)<0 && turn(p,q,a)*turn(p,q,b)<0;
      });
  }

  markTransect(point) {
    const area=this.currentSaved();
    if (!area) return;
    const p=localPoint(area.world,area.center,point);
    const polygon=area.points.map(vertex=>localPoint(area.world,area.center,vertex));
    const status=byId('study-status');
    if (!inside(polygon,p.x,p.y)) {status.textContent='Marca el punto dentro del contorno.';return}
    if (!this.lineStart) {
      this.lineStart=point;
      status.textContent='Marca el extremo final dentro del mismo contorno.';
      this.paint();
      return;
    }
    const line=[this.lineStart,point];
    if (!this.lineInside(area,line)) {status.textContent='El perfil debe tener longitud y quedar dentro del contorno.';return}
    area.line=line;
    this.library.set(area.id,area);
    this.setMode('draw');
    status.textContent='Transecto guardado · '+fmt(transectLength(area),3)+' km.';
    this.compareSaved();
  }

  updateBoundary() {
    const area=this.library.get(byId('scan-boundary').value);
    for (const axis of ['lat','lon']) {
      const input=byId('scan-'+axis);
      input.disabled=Boolean(area);
      if (area) input.value=area.center[axis].toFixed(6);
    }
    byId('scan-earth').disabled=Boolean(area);
  }

  async compareSaved() {
    const root=byId('study-pair-result');
    const revision=++this.pairEpoch;
    const target=this.library.get(byId('study-pair-target').value);
    const earth=this.library.get(byId('study-pair-earth').value);
    if (!target || !earth) {
      root.replaceChildren();
      this.updateProfiles();
      return;
    }
    const profile=byId('study-profile');
    ++this.profileEpoch;
    profile.replaceChildren();
    root.textContent='Calculando métricas a la misma escala…';
    try {
      const limitInput=byId('scan-slope');
      const limit=limitInput.validity.valid ? limitInput.valueAsNumber : 12;
      const results=await comparePolygons([target,earth],limit);
      if (revision!==this.pairEpoch) return;
      const step=results[0].grid.step;
      root.innerHTML='<p class="study-note">Paso común de '+fmt(step*1000,0)+' m. Para comparar la pendiente y el relieve se requieren al menos cuatro celdas dentro de cada contorno. La continuidad agrupa celdas vecinas por sus lados y describe el terreno a esta escala.</p>'+
        '<div class="table-wrap" tabindex="0" aria-label="Comparación de polígonos"><table><thead><tr><th>Polígono</th><th>Superficie</th><th>Pendiente mediana</th><th>Pendiente P90</th><th>Rugosidad local</th><th>Relieve P90−P10</th><th>Celdas evaluables ≤ '+fmt(limit)+'°</th><th>Mayor zona continua bajo el umbral</th><th>Cobertura de pendiente y fuente</th></tr></thead><tbody>'+
        results.map(({area,grid,result})=>'<tr><th scope="row">'+esc(area.label)+'</th><td>'+fmt(result.area,4)+' km²</td><td>'+fmt(result.slope)+(result.slope==null?'':'°')+'</td><td>'+fmt(result.slopeP90)+(result.slopeP90==null?'':'°')+'</td><td>'+fmt(result.roughness)+(result.roughness==null?'':' m')+'</td><td>'+fmt(result.relief)+(result.relief==null?'':' m')+'</td><td>'+percent(result.pass)+'</td><td>'+fmt(result.patch,4)+(result.patch==null?'':' km²')+'</td><td>'+percent(result.slopeCoverage)+' · '+result.samples+' celdas<small>'+sourceLink(grid.source)+'</small></td></tr>').join('')+'</tbody></table></div>';
      const distance=Math.min(...results.map(({area})=>transectLength(area) ?? 0));
      if (!distance) {profile.textContent='Traza un perfil en cada polígono para comparar las curvas.';return}
      const segments=Math.min(100,Math.floor(distance/step));
      if (segments<2) {profile.textContent='La longitud común es insuficiente para dos intervalos a la resolución disponible.';return}
      const lines=results.map(({area,grid})=>({entry:{name:area.label},source:grid.source,resolution:grid.model.resolution,
        heights:transectProfile(area,grid.model,distance,segments)}));
      profile.innerHTML='<p class="study-note">Longitud común: '+fmt(distance,3)+' km desde el inicio de cada línea. Paso: '+fmt(distance/segments*1000,0)+' m. Cotas relativas al inicio.</p>';
      this.renderProfiles(lines,distance,segments);
    } catch {
      if (revision===this.pairEpoch) root.textContent='No se pudieron cargar los modelos de elevación de ambos polígonos.';
    }
  }

  async loadEvidencePoints() {
    if (this.world==='Earth' && byId('study-layer').value==='peru-geology' && !this.peruLayer) {
      this.peruLayer=await loadPeruGeology().catch(()=>null);
      this.paint();
    }
    if (this.world!=='Earth' || byId('study-layer').value!=='evidence' || this.volcanoes) return;
    this.volcanoes=await volcanoLayer().catch(()=>null);
    this.paint();
  }

  target() {
    const current=this.api.target();
    const custom=this.library.get(this.activeArea) ?? this.polygons[this.activePlanet];
    if (custom) return {world:custom.world,center:custom.center,name:custom.label,points:custom.points,span:custom.span,documented:custom.documented,reference:current.reference,geologyCase:custom.world===current.world?current.geologyCase:null};
    return current;
  }

  useReference(trait) {
    this.activePlanet=null;
    this.activeArea=null;
    this.renderSavedPilot();
    byId('scan-geology').value=trait;
    this.thematic=null;
    this.loadEvidencePoints();
  }

  showGeologyCase() {
    const criterion=geologyCase(this.target(),byId('scan-geology').value);
    byId('scan-official-geology').hidden=!criterion;
    if (criterion) byId('scan-official-geology-note').innerHTML=
      '<strong>'+esc(criterion.label)+'</strong> · '+sourceLink(geologyMetadata(criterion))+
      ' · escala 1:250 000. Disponible en la isla de Hawaiʻi.';
  }

  updateContext() {
    this.showGeologyCase();
    const target=this.target();
    byId('scan-use-mission').hidden=!target.points;
    byId('scan-target').textContent='Destino de referencia: '+target.name+' · '+position(target.center)+(target.points?' · polígono guardado':' · región de referencia');
    if (this.analysis) this.renderScan();
    this.renderBrief();
    this.updateProfiles();
  }

  changed(dirty=true) {
    ++this.measureEpoch;
    this.measuring=false;
    this.dirty=dirty;
    this.updateControls();
    this.paint();
  }

  currentSaved() {
    const saved=this.polygons[this.world];
    return this.closed && !this.dirty && saved && samePoint(saved.origin ?? saved.center,this.center) ? saved : null;
  }

  updateControls() {
    const current=this.currentSaved();
    const ready=Boolean(current);
    byId('study-transect').disabled=!ready || this.measuring;
    byId('study-metadata').hidden=!ready;
    byId('study-pilot-save').hidden=this.world!=='Earth' || Boolean(current?.unverified);
    if (current && byId('study-name').dataset.area!==current.id) this.fillMetadata(current);
    const count=this.points.length;
    byId('study-measure').disabled=count<3 || this.measuring;
    byId('study-measure').textContent=this.measuring?'Midiendo…':this.closed?(ready?'Medir de nuevo':'Medir contorno'):'Cerrar y medir';
    byId('study-undo').disabled=!this.history.length;
    byId('study-clear').disabled=!count;
    byId('study-center').disabled=!this.center;
    byId('study-square').disabled=!this.center;
    byId('study-scale').textContent=this.span<1?fmt(this.span*1000,0)+' m de ancho':fmt(this.span)+' km de ancho';
    byId('study-scan').textContent=ready?(this.world==='Earth'?'Buscar alrededor de este polígono':'Buscar con este polígono'):'Ir a la búsqueda espacial';
    byId('study-values').innerHTML=ready ? summary(current.result,current.limit)+
      '<p class="study-note">Elevación de la medición: '+sourceLink(current.source)+' · '+fmt(current.resolution,0)+' m de grilla.</p>' : '';
    byId('study-status').textContent=!this.center?'Selecciona una región o un punto del atlas para comenzar.':this.measuring?'Calculando superficie y relieve…':
      ready ? (current.result.samples ? 'Contorno medido · '+current.result.samples+' celdas · paso '+fmt((current.step ?? current.span/40)*1000,0)+' m.'+
        (current.result.slope===null?' La resolución del modelo no permite estimar la pendiente.':'') : 'Contorno guardado. El modelo disponible no resuelve la pendiente o el relieve a esta escala.') :
      this.closed ? 'Contorno cerrado. Pulsa «Medir contorno» para actualizar el análisis.' :
      count===0 ? 'Pulsa el mapa para marcar el primer vértice.' : count+' vértices. '+(count<3?'Agrega al menos tres.':'Pulsa el primero o «Cerrar y medir».');
  }

  async refreshGrid() {
    if (!this.center) return;
    const world=this.world,center={...this.mapCenter},span=this.span;
    const revision=++this.epoch;
    this.grid=null;
    this.loadingGrid=true;
    this.previewShift=false;
    this.gridError=false;
    this.paint();
    try {
      const model=await studyRelief(world,center,span);
      if (revision!==this.epoch) return;
      const divisions=Math.min(100,Math.max(1,Math.floor(span*1000/model.resolution+1e-6)));
      const grid=await surface(world,center,span,divisions,model);
      if (revision!==this.epoch) return;
      if (!grid.cells.some(cell=>Number.isFinite(cell.z))) throw Error('Sin elevaciones en esta ventana');
      this.grid=grid;
    } catch {
      if (revision!==this.epoch) return;
      this.gridError=true;
      byId('study-status').textContent='El modelo de elevación del área no pudo cargarse.';
    }
    this.loadingGrid=false;
    this.paint();
  }

  paint() {
    const canvas=this.canvas;
    const ctx=canvas.getContext('2d');
    const w=canvas.width;
    ctx.fillStyle='#101920';
    ctx.fillRect(0,0,w,w);
    if (!this.center) {
      canvas.dataset.mapState='empty';
      byId('study-map-state').hidden=false;
      byId('study-map-state').textContent='Selecciona una región en Tierra, Luna o Marte para delimitarla.';
      byId('study-map-retry').hidden=true;
      byId('study-layer-credit').textContent='El mapa de relieve se carga al elegir un área.';
      return;
    }
    const grid=this.grid;
    const layer=byId('study-layer').value;
    const mapState=byId('study-map-state');
    mapState.hidden=Boolean(grid) && !this.previewShift;
    mapState.textContent=this.gridError?'No se pudo cargar el relieve. Pulsa «Volver a cargar mapa».':
      this.previewShift?'Desplazando mapa…':this.loadingGrid?'Cargando relieve del área seleccionada…':'Preparando mapa…';
    byId('study-map-retry').hidden=!this.gridError;
    canvas.dataset.mapState=this.gridError?'error':grid&&!this.previewShift?'ready':'loading';
    if (!grid || this.previewShift) {
      ctx.strokeStyle='#31434e';ctx.lineWidth=1;
      ctx.beginPath();
      for (let i=1;i<4;i++) {
        const p=w*i/4;
        ctx.moveTo(p,0);ctx.lineTo(p,w);ctx.moveTo(0,p);ctx.lineTo(w,p);
      }
      ctx.stroke();
    }
    if (grid && !this.previewShift) {
      const heights=grid.cells.map(c=>c.z).filter(z=>z!==null);
      const lo=Math.min(...heights), hi=Math.max(...heights);
      for (const [i,c] of grid.cells.entries()) {
        if (c.z===null || layer==='slope' && c.slope===null) continue;
        const fraction=layer==='slope' ? Math.min(1,c.slope/35) : (c.z-lo)/Math.max(1,hi-lo);
        ctx.fillStyle=layer==='slope' ? `hsl(${158-fraction*134} 61% ${31+fraction*26}%)` :
          `hsl(${202-fraction*172} ${layer==='evidence'?20:52}% ${28+fraction*45}%)`;
        const size=w/grid.divisions;
        ctx.fillRect((i%grid.divisions)*size,Math.floor(i/grid.divisions)*size,size+.5,size+.5);
      }
    }
    const path=(vertices,closed,fill,stroke)=>{
      ctx.beginPath();
      vertices.forEach((vertex,i)=>{
        const {x,y}=localPoint(this.world,this.mapCenter,vertex);
        const px=w*(x/this.span+.5), py=w*(.5-y/this.span);
        if (i) ctx.lineTo(px,py);
        else ctx.moveTo(px,py);
      });
      if (closed) ctx.closePath();
      if (fill) {ctx.fillStyle=fill;ctx.fill()}
      ctx.strokeStyle=stroke;
      ctx.lineWidth=2;
      ctx.stroke();
    };
    if (layer==='evidence' && this.world==='Earth' && this.evidence) {
      for (const [outer,...holes] of this.evidence) {
        path(outer,true,'#8ce3d142','#8ce3d1');
        for (const hole of holes) path(hole,true,null,'#ffd8ab');
      }
    }
    if (layer==='peru-geology' && this.world==='Earth' && this.peruLayer) {
      for (const feature of this.peruLayer.features) {
        const [west,south,east,north]=feature.bounds;
        const reach=this.span/85;
        if (this.mapCenter.lat+reach<south || this.mapCenter.lat-reach>north || this.mapCenter.lon+reach<west || this.mapCenter.lon-reach>east) continue;
        const andagua=feature.properties.NAME==='Qp-an';
        for (const rings of feature.geometry.coordinates) {
          ctx.beginPath();
          for (const ring of rings) {
            ring.forEach(([lon,lat],index)=>{
              const p=this.mapPosition({lat,lon});
              if (index) ctx.lineTo(p.x*w,p.y*w);else ctx.moveTo(p.x*w,p.y*w);
            });
            ctx.closePath();
          }
          ctx.fillStyle=andagua?'#ee9f6577':'#80c5c83b';ctx.fill('evenodd');
          ctx.strokeStyle=andagua?'#ffc49d':'#86c5c8';ctx.lineWidth=1;ctx.stroke();
        }
      }
    }
    if (layer==='evidence' && this.world==='Earth' && this.volcanoes) {
      for (const [,name,lon,lat] of this.volcanoes.volcanoes) {
        const {x,y}=localPoint('Earth',this.mapCenter,{lat,lon});
        if (Math.abs(x)>this.span/2 || Math.abs(y)>this.span/2) continue;
        const px=w*(x/this.span+.5), py=w*(.5-y/this.span);
        ctx.fillStyle='#ffc49d';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
        ctx.font='12px sans-serif';ctx.fillText(name,px+7,py-4);
      }
    }
    if (layer==='evidence' && this.documented) {
      ctx.fillStyle='#ffd8ab';ctx.beginPath();const p=this.mapPosition(this.center);ctx.arc(p.x*w,p.y*w,5,0,Math.PI*2);ctx.fill();
    }
    if (this.points.length) {
      path(this.points,this.closed,this.closed?'#8ce3d13d':null,'#e4fff7');
      if (!this.closed && this.mode==='draw') {
        ctx.setLineDash([5,5]);
        path([this.points.at(-1),this.mapPoint(this.cursor)],false,null,'#e4fff799');
        ctx.setLineDash([]);
      }
      for (const [i,vertex] of this.points.entries()) {
        const {x,y}=localPoint(this.world,this.mapCenter,vertex);
        const px=w*(x/this.span+.5), py=w*(.5-y/this.span);
        ctx.fillStyle=i===0?'#ffc49d':'#e4fff7';ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
        ctx.font='bold 12px sans-serif';ctx.strokeStyle='#101920';ctx.lineWidth=3;ctx.strokeText(String(i+1),px+8,py-6);ctx.fillText(String(i+1),px+8,py-6);
      }
    }
    if (this.sectorFrame) {
      ctx.setLineDash([6,4]);
      path(this.sectorFrame,true,null,'#f3b480');
      ctx.setLineDash([]);
    }
    const line=this.currentSaved()?.line;
    if (line) path(line,false,null,'#ffd06e');
    if (this.mode==='transect' && this.lineStart) {
      ctx.setLineDash([6,4]);
      path([this.lineStart,this.mapPoint(this.cursor)],false,null,'#ffd06e');
      ctx.setLineDash([]);
    }
    const x=this.cursor.x*w,y=this.cursor.y*w;
    ctx.strokeStyle='#fff';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();
    byId('study-cursor').textContent='Cursor: '+position(this.mapPoint(this.cursor));
    const credit=byId('study-layer-credit');
    if (layer==='peru-geology') {
      credit.innerHTML=this.world!=='Earth'?'La cartografía de INGEMMET corresponde a la Tierra.':
        this.peruLayer?sourceLink(this.peruLayer.metadata)+' · '+esc(this.peruLayer.metadata.scale)+'. Naranja: Grupo Andagua (Qp-an); azul: otras unidades. Solo recortes de Andahua y Huambo. <a href="#geologia-peru">Medir cobertura y consultar leyenda</a>.':'Cargando cartografía de INGEMMET…';
    } else if (layer==='evidence') {
      const userSource=safeUrl(byId('scan-source').value);
      credit.innerHTML=(this.world==='Earth' && this.evidence?'Contornos: '+(userSource?sourceLink({name:'fuente de la capa cargada',url:userSource}):'capa cargada')+'. ':'')+
        (this.world==='Earth' && this.volcanoes?'Puntos de volcanes holocenos: '+sourceLink({name:'Smithsonian GVP',url:this.volcanoes.source})+'. ':'')+
        (this.documented?'Marcador central: '+sourceLink(this.documented)+'.':'Consulta la cobertura de la capa visible en este mapa.');
    } else credit.innerHTML=grid ? sourceLink(grid.source)+' · '+fmt(grid.model.resolution,0)+' m de grilla · paso '+fmt(grid.step,2)+' km'+(layer==='slope'?' · verde: pendiente baja. Naranja: 35° o más.':'') : this.gridError ? 'Modelo de elevación no disponible.' : 'Cargando modelo de elevación…';
  }

  async measure(limit=byId('study-limit').valueAsNumber) {
    if (!Number.isFinite(limit) || limit<0 || limit>90) {
      byId('study-status').textContent='Indica una pendiente límite entre 0° y 90°.';
      byId('study-limit').focus();
      return;
    }
    const {world}=this;
    const points=this.points.slice();
    if (points.length<3 || !simplePolygon(points.map(point=>localPoint(world,points[0],point)))) {
      byId('study-status').textContent='Contorno inválido. Revisa si dos lados se cruzan o si hay vértices repetidos.';
      return;
    }
    const {center,vertices,span}=polygonBounds(world,points);
    if (span>80.001) {
      byId('study-status').textContent='El contorno excede 80 km de ancho. Divide la zona en sectores más pequeños.';
      return;
    }
    const previous=this.polygons[world];
    const record=samePoint(previous?.origin ?? previous?.center,this.center)?previous:null;
    const revision=++this.measureEpoch;
    const sampleSpan=Math.max(.02,span*1.04);
    if (!this.closed) this.remember();
    this.closed=true;
    this.measuring=true;
    this.updateControls();
    this.paint();
    try {
      const model=await studyRelief(world,center,sampleSpan);
      const divisions=Math.min(100,Math.max(1,Math.floor(sampleSpan*1000/model.resolution+1e-6)));
      const grid=await surface(world,center,sampleSpan,divisions,model);
      if (revision!==this.measureEpoch) return;
      const result=stats(grid,vertices,limit);
      const id=record?.id ?? crypto.randomUUID();
      const saved={...record,id,world,origin:this.center,center,span:sampleSpan,viewSpan:this.span,points,
        label:record?.label ?? this.label,documented:this.documented,unverified:this.unverified || Boolean(record?.unverified),result,limit,source:grid.source,resolution:grid.model.resolution,step:grid.step};
      if (saved.line && !this.lineInside(saved,saved.line)) delete saved.line;
      this.polygons[world]=saved;
      this.library.set(id,saved);
      this.renderSavedPilot();
      if (world!=='Earth') {this.activePlanet=world;this.activeArea=id;}
      this.dirty=false;
      this.measuring=false;
      this.updateControls();
      this.refreshLibrary();
      this.updateContext();
      this.compareSaved();
    } catch {
      if (revision!==this.measureEpoch) return;
      this.measuring=false;
      this.updateControls();
      byId('study-status').textContent='El modelo de elevación no está disponible para medir este contorno. Puedes reintentar.';
    }
  }

  async importEvidence(file) {
    if (!file) return;
    const status=byId('scan-status');
    try {
      if (file.size>3000000) throw Error();
      const parsed=readEvidence(JSON.parse(await file.text()));
      if (byId('scan-file').files[0]!==file) return;
      this.evidence=parsed;
      status.textContent=parsed.length+' polígonos cargados. Indica su fuente y ejecuta la búsqueda.';
    } catch {
      if (byId('scan-file').files[0]!==file) return;
      this.evidence=null;
      status.textContent='Carga un GeoJSON terrestre con polígonos WGS 84 válidos de hasta 3 MB.';
    }
    this.paint();
  }

  async scan() {
    const boundary=this.library.get(byId('scan-boundary').value);
    const center=boundary?.center ?? {lat:byId('scan-lat').valueAsNumber,lon:byId('scan-lon').valueAsNumber};
    const limit=byId('scan-slope').valueAsNumber;
    const trait=byId('scan-geology').value;
    const source=this.evidence?safeUrl(byId('scan-source').value):null;
    const evidence=this.evidence;
    const status=byId('scan-status');
    if (evidence && !source) {status.textContent='Indica una URL http o https para la capa cargada.';return}
    const target=this.target();
    const officialCriterion=geologyCase(target,trait);
    const official=officialCriterion?geologyMetadata(officialCriterion):null;
    const revision=++this.scanEpoch;
    status.textContent='Cruzando elevación y evidencia terrestre…';
    const found=[];
    let catalog=0, noData=0;
    try {
      const targetWidth=target.span ?? studyWidth;
      const sectorWidth=boundary ? Math.min(studyWidth,Math.max(.1,boundary.span/3)) : studyWidth;
      const step=boundary ? Math.max(targetWidth/100,Math.min(studyStep,sectorWidth/8)) : studyStep;
      const divisions=Math.ceil(targetWidth/step);
      const span=divisions*step;
      const sectorDivisions=Math.ceil(sectorWidth/step);
      const sectorSpan=sectorDivisions*step;
      const [targetGrid,land,volcanoes,thematic]=await Promise.all([
        surface(target.world,target.center,span,divisions),
        landLayer(),
        trait==='volcánico'?volcanoLayer().catch(()=>null):null,
        evidenceLayer(trait).catch(()=>null)
      ]);
      const vertices=target.points?.map(point=>localPoint(target.world,target.center,point));
      const targetStats=stats(targetGrid,vertices,limit);
      if (targetStats.samples<4) {targetStats.slope=null;targetStats.slopeP90=null;targetStats.roughness=null;targetStats.relief=null;targetStats.pass=null}
      const searchShape=boundary?.points.map(point=>localPoint('Earth',center,point));
      const inBoundary=point=>{
        if (!searchShape) return true;
        const {x,y}=localPoint('Earth',center,point);
        return inside(searchShape,x,y);
      };
      const count=boundary?Math.ceil((polygonBounds('Earth',boundary.points).span-1e-7)/sectorSpan):3;
      const offsets=Array.from({length:count},(_,i)=>(i-(count-1)/2)*sectorSpan);
      const existing=this.api.catalog();
      const zones=offsets.flatMap(y=>offsets.map(x=>offsetPoint('Earth',center,x,y)));
      const geologicUnits=officialCriterion ? await loadGeology().catch(()=>null) : null;
      if (revision!==this.scanEpoch) return;
      const results=await Promise.allSettled(zones.map(async (point,i)=>{
        const inSector=location=>{
          const {x,y}=localPoint('Earth',point,location);
          return Math.abs(x)<=sectorSpan/2 && Math.abs(y)<=sectorSpan/2 && inBoundary(location);
        };
        if (existing.some(inSector)) return 'catalog';
        const grid=await surface('Earth',point,sectorSpan,sectorDivisions);
        const locations=grid.cells.map(cell=>({...cell,point:offsetPoint('Earth',point,cell.x,cell.y)}));
        const eligible=locations.filter(cell=>inBoundary(cell.point));
        if (!eligible.length) return 'outside';
        const terrestrial=eligible.filter(cell=>isLand(land,cell.point));
        const landCoverage=terrestrial.length/eligible.length;
        const samples=terrestrial.filter(cell=>cell.z!==null);
        if (landCoverage<.8 || samples.length<terrestrial.length*.8 || !samples.length) return 'noData';
        const footprint=sampledFootprint(point,grid.step,samples,boundary?.points);
        const geometry=geographicFootprint(point,footprint);
        if (!geometry.length) return 'outside';
        const measured=stats({...grid,cells:terrestrial},null,limit);
        measured.area=footprintArea(footprint);
        if (measured.samples<4) {measured.slope=null;measured.slopeP90=null;measured.roughness=null;measured.relief=null;measured.pass=null}
        const volcanic=volcanoes?.volcanoes.filter(([, ,lon,lat])=>inSector({lat,lon})).map(([id,name])=>({id,name})) ?? [];
        const evidencePoints=thematic?.points.filter(inSector) ?? [];
        const classes=thematic?.sample ? samples.map(cell=>thematic.sample(cell.point)).filter(value=>value!==null) : [];
        const thematicMatch=classes.length ? classes.filter(Boolean).length/classes.length : null;
        const thematicCoverage=classes.length/samples.length;
        const local=evidence?.map(polygon=>polygon.map(ring=>ring.map(vertex=>localPoint('Earth',point,vertex))));
        const match=local ? samples.filter(c=>local.some(([outer,...holes])=>inside(outer,c.x,c.y)&&!holes.some(hole=>inside(hole,c.x,c.y)))).length/samples.length : null;
        let geology=null;
        if (officialCriterion) {
          try { geology=measureGeology(geometry,point,officialCriterion,geologicUnits); }
          catch { geology={status:'unavailable'}; }
        }
        const difference=measured.slope==null || targetStats.slope==null ? null : Math.abs(measured.slope-targetStats.slope);
        const reliefDifference=measured.relief==null || targetStats.relief==null ? null : Math.abs(measured.relief-targetStats.relief);
        return {id:i+1,center:point,stats:measured,difference,reliefDifference,match,volcanic,evidencePoints,thematicMatch,thematicCoverage,landCoverage,geometry,geology,span:sectorSpan,source:grid.source,resolution:grid.model.resolution};
      }));
      if (revision!==this.scanEpoch) return;
      for (const result of results) {
        if (result.value==='outside') continue;
        if (result.value==='catalog') catalog++;
        else if (!result.value || result.value==='noData') noData++;
        else found.push(result.value);
      }
      found.sort((a,b)=>(b.geology?.share??0)-(a.geology?.share??0) || (b.match??0)-(a.match??0) || Number(b.volcanic.length+b.evidencePoints.length>0)-Number(a.volcanic.length+a.evidencePoints.length>0) || (b.thematicMatch??0)-(a.thematicMatch??0) || (a.difference??Infinity)-(b.difference??Infinity) || (b.stats.pass??0)-(a.stats.pass??0) || a.id-b.id);
      this.analysis={target,targetStats,targetSource:targetGrid.source,targetResolution:targetGrid.model.resolution,center,limit,trait,source,official,boundary:boundary?{id:boundary.id,label:boundary.label,points:boundary.points}:null,step,thematic:thematic?.url?{name:thematic.name,url:thematic.url,label:thematic.label,scope:thematic.scope}:null,volcanoSource:volcanoes?.source,landSource:land.source,found,catalog,noData};
      this.pilotId=null;
      this.atlasSectorId=null;
      this.note='';
      byId('spatial-pilot-note').value='';
      this.renderScan();
      this.renderBrief();
      this.updateProfiles();
      status.textContent=found.length+' sectores prospectivos · '+catalog+' con un sitio del catálogo · '+noData+' con cobertura terrestre o de elevación insuficiente.'+(boundary?' Muestreo dentro de '+boundary.label+'.':'');
    } catch {
      if (revision===this.scanEpoch) status.textContent='No se pudieron cargar las capas de la búsqueda. Los resultados anteriores siguen disponibles.';
    }
  }

  clearPilot() {
    this.savedPilot=null;
    this.pilotId=null;
    this.note='';
    byId('spatial-pilot-note').value='';
    this.renderSavedPilot();
    this.renderScan();
    this.renderBrief();
    this.updateProfiles();
  }

  pilot() { return this.analysis?.found.find(row=>row.id===this.pilotId); }

  choose(id,navigate=true) {
    if (!this.analysis?.found.some(row=>row.id===id) || this.outdatedSearch()) return;
    this.savedPilot=null;
    this.renderSavedPilot();
    this.api.clearCatalogPilot();
    if (id!==this.pilotId) {
      this.note='';
      byId('spatial-pilot-note').value='';
    }
    this.pilotId=id;
    this.renderScan();
    this.renderBrief();
    this.updateProfiles();
    if (navigate) this.api.navigate('ficha-piloto');
  }

  reason(row) {
    const {trait,limit}=this.analysis;
    const geology=row.match==null ? (trait==='relieve'?'Rasgo evaluado: relieve y pendiente.':'Rasgo evaluado: '+trait+'. La confirmación local requiere evidencia de detalle.') : row.match>0 ?
      'La capa aportada coincide con '+percent(row.match)+' de las celdas del sector para el rasgo '+trait+'.' :
      'El muestreo de la capa aportada no detecta el rasgo '+trait+' en el sector.';
    const terrain=row.difference==null?'La diferencia de pendiente sigue sin datos comparables.':
      'La diferencia de pendiente mediana con el destino es '+fmt(row.difference)+'°.';
    const apt=row.stats.pass==null?'El umbral de pendiente queda por verificar.':
      percent(row.stats.pass)+' de las celdas evaluables tienen una pendiente ≤ '+fmt(limit)+'°.';
    const official=row.geology?.status==='covered' ? ' '+geologySummary(row.geology,this.analysis.official)+'.' : '';
    const points=row.evidencePoints?.length?' Registros publicados: '+row.evidencePoints.map(point=>point.detail+' en '+point.name).join('; ')+'.':'';
    const map=row.thematicMatch==null?'':' La capa regional identifica el rasgo en '+percent(row.thematicMatch)+' de las celdas clasificadas (cobertura '+percent(row.thematicCoverage)+').';
    const volcanic=row.volcanic?.length ? ' Smithsonian GVP registra '+row.volcanic.map(v=>v.name).join(', ')+' en el sector.' : '';
    return geology+official+volcanic+points+map+' '+terrain+' '+apt+' Comprueba el rasgo en campo y documenta la escala de las observaciones.';
  }

  outdatedSearch() {
    if (!this.analysis) return false;
    const {target}=this.analysis;
    const active=this.target();
    return (target.reference!=null && active.reference!==target.reference) ||
      active.world!==target.world || !samePoint(active.center,target.center) ||
      JSON.stringify(active.points)!==JSON.stringify(target.points);
  }

  geometry(row) {
    if (!this.sectorGeometries.has(row)) this.sectorGeometries.set(row,sectorGeometry(row,this.analysis));
    return this.sectorGeometries.get(row);
  }

  atlasRows() {
    return this.outdatedSearch() ? [] : this.analysis?.found ?? [];
  }

  openSector(id,navigate=true) {
    const row=this.atlasRows().find(item=>item.id===id);
    if (!row) return;
    this.atlasSectorId=id;
    this.api.openSector(row.center,navigate);
  }

  evidenceMarkup(row) {
    const mapUnits=row.geology?.units ?? [];
    const scale=this.analysis.official?.scale;
    const details=mapUnits.length && scale ? '<details class="area-summary geology-units"><summary>Unidades geológicas del sector ('+mapUnits.length+')</summary><ul>'+
      mapUnits.map(unit=>'<li><strong>'+esc([unit.code,unit.name].filter(Boolean).join(' · ')||unit.rock)+'</strong> · '+esc([unit.rock,unit.composition].filter(Boolean).join(' · '))+
        ' · '+geologyArea(unit.area,Math.min(1,unit.area/row.geology.area))+' de la huella'+(unit.match?' · respalda el rasgo':'')+'</li>').join('')+'</ul></details>' : '';
    return '<ul class="evidence-list">'+sectorEvidence(row,this.analysis).map(record=>
      '<li><span class="evidence-label" data-evidence="'+record.level+'">'+evidenceLabels[record.level]+'</span> '+
      esc(record.detail)+(record.source?' '+sourceLink(record.source):'')+'</li>').join('')+'</ul>'+details;
  }

  atlasDetail(rows) {
    const width=560,height=255;
    const span=Math.max(this.analysis.boundary?.points ? polygonBounds('Earth',this.analysis.boundary.points).span : 60,10);
    const project=locator(this.analysis.center,span*1.35,width,height);
    const path=polygons=>projectedPath(polygons,project);
    const boundary=this.analysis.boundary;
    const shapes=rows.map(row=>{
      const selected=row.id===this.atlasSectorId;
      const {x,y}=project(row.center);
      return '<g class="'+(selected?'selected':'')+'" data-atlas-sector="'+row.id+'"><title>Sector '+row.id+'</title>'+
        '<path fill-rule="evenodd" d="'+path(this.geometry(row))+'"></path><text x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'">'+row.id+'</text></g>';
    }).join('');
    const bar=Math.min(width,height)*.8/1.35;
    const lengthKm=span>=40?10:2;
    const scale=bar*lengthKm/span;
    return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Mapa local de los sectores, norte arriba. Usa la lista de botones para seleccionar con teclado.">'+
      '<path class="context-grid" d="M280 12v226M15 127.5h530"></path>'+
      (boundary?'<path class="sector-boundary" d="'+path(catalogGeometry(boundary.points))+'"></path>':'')+shapes+
      '<text x="529" y="23">N ↑</text><path class="sector-scale" d="M20 230h'+scale.toFixed(2)+'"></path><text x="20" y="245">'+lengthKm+' km</text></svg>';
  }

  sectorCard() {
    const row=this.atlasRows().find(item=>item.id===this.atlasSectorId);
    if (!row) return '';
    const {target,limit,step}=this.analysis;
    return '<article class="sector-card"><h3>Sector '+row.id+'</h3><p class="study-note">'+esc(position(row.center))+' · Referencia: '+esc(target.name)+'</p>'+
      this.evidenceMarkup(row)+summary(row.stats,limit)+
      '<p class="study-note">Diferencia con el destino: '+fmt(row.difference)+(row.difference==null?'':'° de pendiente')+' · '+fmt(row.reliefDifference)+(row.reliefDifference==null?'':' m de relieve P90−P10')+'.</p>'+
      '<p class="study-note">'+sourceLink(row.source)+' · '+fmt(row.resolution,0)+' m de resolución · paso '+fmt(step*1000,0)+' m.</p>'+
      '<button type="button" data-select-atlas-pilot class="primary">Elegir como área piloto</button></article>';
  }

  renderBrief() {
    const root=byId('pilot-brief');
    const target=this.target();
    const catalog=this.api.catalogPilot();
    const spatial=this.outdatedSearch()?null:this.pilot();
    const saved=this.savedPilotReference==null || this.savedPilotReference===target.reference ? this.library.get(this.savedPilot) : null;
    byId('pilot-brief-reference').textContent=target.name+' · '+this.api.referenceTrait();
    if (!catalog && !spatial && !saved) {
      root.innerHTML='<p class="study-note">Elige un candidato para reunir su mapa, evidencia y justificación.</p><div class="study-toolbar">'+
        '<a class="outline" href="#area-piloto">Elegir del catálogo</a><a class="outline" href="#busqueda-espacial">Buscar sectores nuevos</a></div>';
      return;
    }
    const row=spatial ?? saved ?? catalog;
    const center=row.center ?? row;
    const name=spatial?'Sector '+row.id:row.label ?? row.name;
    const alt=spatial?candidateComparison(this.analysis,row).alternative:this.api.catalogAlternative(catalog?.id);
    const altName=alt?(spatial?'Sector '+alt.id:alt.name):null;
    const altDetail=alt?(spatial ?
      (sectorEvidence(alt,this.analysis).map(item=>evidenceLabels[item.level]).join(' · ')+'. '+
      (alt.difference==null?'Pendiente sin datos comparables.':'Diferencia de pendiente mediana: '+fmt(alt.difference)+'°.')) : alt.description):'';
    const polygons=spatial?this.geometry(row):saved?catalogGeometry(row.points):[];
    const project=locator(center,Math.max(10,(row.span ?? 20)*2.6));
    const path=projectedPath(polygons,project);
    const dot=alt?project(alt.center ?? alt):null;
    const altOnMap=dot && dot.x>14 && dot.x<316 && dot.y>14 && dot.y<156;
    const earth=this.api.earthImage;
    const x=32+(center.lon+180)/360*266,y=25+(90-center.lat)/180*120;
    const map=path?'<svg viewBox="0 0 330 170" role="img" aria-label="Huella del área piloto terrestre, norte arriba"><path class="context-grid" d="M165 10v150M15 85h300"></path><path class="brief-shape" fill-rule="evenodd" d="'+path+'"></path>'+
      (altOnMap?'<circle class="brief-alternative" cx="'+dot.x.toFixed(2)+'" cy="'+dot.y.toFixed(2)+'" r="4"/>':'')+'<text x="305" y="20">N ↑</text></svg>':
      '<svg viewBox="0 0 330 170" role="img" aria-label="Ubicación terrestre del candidato"><image href="'+esc(earth)+'" x="32" y="25" width="266" height="120" preserveAspectRatio="none"/><circle class="brief-alternative" cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="5"/></svg>';
    const reason=spatial?'Diferencia con la referencia: '+fmt(row.difference)+(row.difference==null?'':'° de pendiente mediana')+
      ' · '+fmt(row.reliefDifference)+(row.reliefDifference==null?'':' m de relieve P90−P10')+'.':saved?(row.justification || 'Justificación por registrar en el polígono.'):catalog.description;
    const note=spatial?this.note:catalog?.note;
    const whatNext=({cueva:'Cartografiar la entrada y la geometría interior. El modelo de elevación describe la superficie.',
      polar:'Verificar la profundidad y continuidad del hielo en el sector. La capa regional describe extensión del permafrost.',
      volcánico:'Verificar la geometría y composición de los materiales del sector.',
      mineralógico:'Confirmar los minerales y ubicar las muestras mediante cartografía o espectros.',
      'árido':'Verificar condiciones locales y salinidad con observaciones o muestras.',
      relieve:'Contrastar las pendientes y el relieve con topografía de mayor detalle.'})[this.analysis?.trait];
    const comparison=spatial && alt && this.analysis.official ?
      '<div class="table-wrap geology-comparison"><table aria-label="Comparación de evidencia cartográfica"><thead><tr><th>Sector</th><th>Superficie cartografiada</th><th>Superficie que respalda el rasgo</th></tr></thead><tbody>'+
      [row,alt].map((item,i)=>{
        const coverage=item.geology?.status==='covered'?item.geology:null;
        return '<tr><th scope="row">'+(i?'Alternativa':'Piloto')+' · '+item.id+'</th><td>'+
          (coverage?geologyArea(coverage.mapped,coverage.coverage):'Sin datos')+'</td><td>'+
          (coverage?geologyArea(coverage.matched,coverage.share):'Sin datos')+'</td></tr>';
      }).join('')+'</tbody></table></div>' : '';
    const verification=spatial?(whatNext ?? 'Confirmar el rasgo en la huella con datos de escala local.'): catalog?.verification ?? 'Documentar la evidencia del rasgo y verificar su representatividad en campo.';
    const sources=spatial?this.evidenceMarkup(row)+'<p class="study-note">Elevación: '+sourceLink(row.source)+'</p>':
      '<p class="study-note">'+(saved?(row.evidenceUrl?sourceLink({name:'Evidencia del rasgo',url:row.evidenceUrl}):'Evidencia temática pendiente.'):sourceLink(row.source))+'</p>'+
      (saved?'<p class="study-note">Elevación: '+sourceLink(row.source)+'</p>':'');
    const action=spatial?' data-view-sector="'+row.id+'"':' data-open-brief="'+(saved?'saved':esc(row.id))+'"';
    root.innerHTML='<div class="pilot-brief-layout"><figure class="pilot-location">'+map+'<figcaption>'+esc(position(center))+
      (altOnMap?' · El punto indica la alternativa.':'')+'</figcaption><button type="button" class="outline"'+action+'>Ver candidato en el atlas</button></figure>'+
      '<div><h3>'+esc(name)+'</h3><p>'+esc(reason)+'</p>'+(note?'<p class="study-reason"><strong>Justificación registrada</strong> '+esc(note)+'</p>':'')+
      sources+'<p class="study-note">Referencia planetaria: '+sourceLink(target.documented)+'</p>'+
      (altName?'<h4>Alternativa</h4><p><strong>'+esc(altName)+'</strong> · '+esc(altDetail)+'</p>':'')+comparison+
      '<h4>Qué falta comprobar</h4><p>'+esc(verification)+'</p>'+
      '<div class="study-toolbar"><a class="outline" href="#'+(spatial?'piloto-espacial':saved?'delimitar':'area-piloto')+'">Editar selección o justificación</a><a class="outline" href="#guardar-analisis">Guardar o exportar</a></div></div></div>';
  }

  renderScan() {
    const results=byId('scan-results');
    const pilot=byId('spatial-pilot');
    const row=this.pilot();
    this.api.refreshAtlas(this);
    this.updateValidation();
    byId('spatial-pilot-note-wrap').hidden=!row;
    if (!this.analysis) {
      results.replaceChildren();
      pilot.innerHTML='<p class="empty">Ejecuta una búsqueda espacial y elige un sector como área piloto. <a class="outline" href="#busqueda-espacial">Ir a la búsqueda</a></p>';
      return;
    }
    const {target,found,targetStats,targetSource,targetResolution,limit,source,trait,volcanoSource,landSource,boundary,thematic,official,step}=this.analysis;
    const stale=this.outdatedSearch();
    const message=(stale?'Estos resultados corresponden a otra referencia. Vuelve a buscar para elegir un sector con la referencia actual. ':'')+
      'Destino evaluado: '+target.name+(target.points?' · polígono delimitado':'')+' · pendiente mediana '+fmt(targetStats.slope)+(targetStats.slope==null?'':'°')+' · '+fmt(targetResolution,0)+' m de grilla.';
    const head='<p class="study-note">'+esc(message)+' '+sourceLink(targetSource)+'</p>'+
      (target.points && targetStats.samples<4?'<p class="study-note">El polígono tiene menos de cuatro celdas al paso común de la búsqueda. Se muestran los sectores terrestres, con la diferencia topográfica pendiente.</p>':'');
    const evidence = row=>this.evidenceMarkup(row);
    results.innerHTML=head+(boundary?'<p class="study-note">Contorno terrestre: '+esc(boundary.label)+' · paso común '+fmt(step*1000,0)+' m.</p>':'')+
      (official?'<p class="study-note">Capa oficial: '+sourceLink(official)+' · '+esc(official.scale)+'. '+esc(official.limit)+'</p>':'')+
      (thematic?'<p class="study-note">'+sourceLink(thematic)+' · '+esc(thematic.scope)+'</p>':'')+'<p class="study-note">'+(landSource?'Máscara terrestre: '+sourceLink({name:'Natural Earth · 1:50 millones',url:landSource})+'. ':'')+
      (volcanoSource?'Volcanes holocenos: '+sourceLink({name:'Smithsonian GVP',url:volcanoSource})+'. ':'')+
      (official?'Orden: superficie que respalda el rasgo, otras evidencias y diferencia de pendiente.':'Orden: evidencia disponible, diferencia de pendiente y celdas dentro del umbral.')+'</p>'+(source?'<p class="study-note">Evidencia de '+esc(trait)+': '+sourceLink({name:'capa aportada',url:source})+'. La intersección se estima por centros de celda.</p>':'')+
      (!stale && found.length?'<p><button type="button" class="primary sector-jump" data-view-sector="'+found[0].id+'">Ver todos los sectores en el atlas</button></p>':'')+
      (found.length?'<div class="table-wrap" tabindex="0" aria-label="Sectores terrestres prospectivos"><table><thead><tr><th>Sector</th><th>Evidencia del rasgo</th><th>Diferencia con el destino</th><th>Terreno ≤ '+fmt(limit)+'°</th><th>Cobertura y fuente</th><th>Acción</th></tr></thead><tbody>'+
        found.map(c=>'<tr><th scope="row">Sector '+c.id+'<small>'+position(c.center)+'</small></th><td>'+evidence(c)+'</td><td>'+fmt(c.difference)+(c.difference==null?'':'° de pendiente')+'<small>'+fmt(c.reliefDifference)+(c.reliefDifference==null?'':' m de relieve P90−P10')+'</small></td><td>'+percent(c.stats.pass)+'</td><td>'+percent(c.stats.slopeCoverage)+' pendiente<small>'+sourceLink(c.source)+' · '+fmt(c.resolution,0)+' m de grilla</small></td><td><button type="button" class="outline" data-study-sector="'+c.id+'"'+(stale?' disabled':'')+'>Elegir sector '+c.id+'</button> <button type="button" class="outline" data-view-sector="'+c.id+'"'+(stale?' disabled':'')+'>Ver en atlas</button></td></tr>').join('')+'</tbody></table></div>':
      '<p class="empty">No quedaron sectores terrestres con cobertura suficiente. Prueba otra zona del atlas.</p>');
    pilot.innerHTML=!row?'<p class="empty">Elige un sector de la búsqueda para guardar su justificación. <a class="outline" href="#busqueda-espacial">Ver sectores</a></p>':
      head+'<div class="field"><label for="spatial-pilot-select">Sector seleccionado</label><select id="spatial-pilot-select"'+(stale?' disabled':'')+'>'+found.map(c=>'<option value="'+c.id+'"'+(c.id===row.id?' selected':'')+'>Sector '+c.id+' · '+position(c.center)+'</option>').join('')+'</select></div>'+
      '<p class="study-reason">'+esc(this.reason(row))+'</p>'+summary(row.stats,limit)+
      '<div class="study-toolbar"><button type="button" class="outline" data-study-action="map">'+(boundary?'Abrir contorno de búsqueda':'Abrir sector en el atlas')+'</button>'+
      (boundary?'<a class="outline" href="#perfiles">Comparar polígonos</a>':'<button type="button" class="outline" data-study-action="profiles">Comparar perfiles</button>')+'</div>';
  }

  async updateProfiles() {
    if (byId('study-pair-target').value && byId('study-pair-earth').value) return;
    const root=byId('study-profile');
    const revision=++this.profileEpoch;
    const candidate=this.analysis?.boundary ? null : this.pilot();
    const target=candidate ? this.analysis.target : this.target();
    const sites=this.api.compared();
    const entries=[target,...(candidate?[{world:'Earth',center:candidate.center,name:'Sector '+candidate.id}]:[]),
      ...sites.map(site=>({world:'Earth',center:site,name:site.name}))];
    if (entries.length===1) {
      root.innerHTML='<p class="empty">Elige un sector prospectivo o agrega un análogo del catálogo a la comparación.</p>';
      return;
    }
    root.innerHTML='<p class="study-note">Cargando perfiles…</p>';
    const lines=await Promise.all(entries.map(async entry=>{
      const grid=await surface(entry.world,entry.center,studyWidth,studyWidth/studyStep).catch(()=>null);
      return {entry,source:grid?.source,resolution:grid?.model.resolution,
        heights:grid && grid.model.resolution<=studyStep*1000 ? eastProfile(entry.world,entry.center,grid) : []};
    }));
    if (revision!==this.profileEpoch) return;
    root.innerHTML='<p class="study-note">Perfil regional oeste–este de 20 km cada 2 km, con cotas relativas al inicio.</p>';
    this.renderProfiles(lines,studyWidth,studyWidth/studyStep);
  }

  renderProfiles(lines,distance,segments) {
    const root=byId('study-profile');
    const available=lines.flatMap(line=>line.heights.filter(Number.isFinite));
    if (!available.length) {
      root.innerHTML='<p class="empty">El relieve disponible carece de resolución suficiente para estos perfiles.</p>';
      return;
    }
    root.insertAdjacentHTML('beforeend','<div class="study-profile-frame"><canvas id="study-profile-plot" width="760" height="225" aria-hidden="true"></canvas></div>'+
      '<div class="field"><label for="study-profile-position">Distancia desde el inicio</label><input type="range" id="study-profile-position" min="0" max="'+segments+'" value="'+Math.floor(segments/2)+'"></div>'+
      '<output id="study-profile-readings" for="study-profile-position"></output>');
    const input=byId('study-profile-position');
    const canvas=byId('study-profile-plot');
    const draw=()=>{
      const step=Number(input.value);
      const ctx=canvas.getContext('2d');
      const low=Math.min(0,...available), high=Math.max(0,...available);
      const x=i=>80+i/segments*640, y=z=>195-(z-low)/Math.max(1,high-low)*160;
      ctx.clearRect(0,0,760,225);
      ctx.font='13px DM Sans, sans-serif';
      for (const value of [low,(low+high)/2,high]) {
        ctx.fillStyle='#bccbd3';ctx.fillText(fmt(value,0)+' m',8,y(value)+4);
        ctx.strokeStyle='#344751';ctx.beginPath();ctx.moveTo(x(0),y(value));ctx.lineTo(x(segments),y(value));ctx.stroke();
      }
      for (const i of [0,segments/2,segments]) ctx.fillText(fmt(i/segments*distance,2)+' km',x(i)-12,216);
      for (const [i,line] of lines.entries()) {
        ctx.strokeStyle=palette[i];ctx.lineWidth=3;ctx.beginPath();
        line.heights.forEach((z,j)=>{
          if (z===null) return;
          if (!Number.isFinite(line.heights[j-1])) ctx.moveTo(x(j),y(z));
          else ctx.lineTo(x(j),y(z));
        });
        ctx.stroke();
      }
      ctx.strokeStyle='#fff9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(step),30);ctx.lineTo(x(step),197);ctx.stroke();
      byId('study-profile-readings').innerHTML='<strong>'+fmt(step/segments*distance,3)+' km</strong><ul>'+
        lines.map((line,i)=>'<li><span class="profile-key" style="background:'+palette[i]+'"></span><strong>'+esc(line.entry.name)+'</strong> · '+
          (Number.isFinite(line.heights[step])?fmt(line.heights[step])+' m':'Sin cota comparable')+
          ' <small>'+sourceLink(line.source)+(line.resolution?' · '+fmt(line.resolution,0)+' m':'')+'</small></li>').join('')+'</ul>';
    };
    input.addEventListener('input',draw);
    canvas.addEventListener('pointerdown',event=>{
      const box=canvas.getBoundingClientRect();
      input.value=Math.round(((event.clientX-box.left)*760/box.width-80)/640*segments);
      draw();
    });
    draw();
  }

  captureState() {
    const values=this.api.snapshot();
    const form=Object.fromEntries(['scan-lat','scan-lon','scan-slope','scan-geology','scan-source'].map(id=>[id,byId(id).value]));
    const record={version:2,values,form,library:[...this.library.values()],boundary:byId('scan-boundary').value,pair:[byId('study-pair-target').value,byId('study-pair-earth').value],polygons:this.polygons,activeArea:this.activeArea,activePlanet:this.activePlanet,analysis:this.analysis,savedPilot:this.savedPilot,savedPilotReference:this.savedPilotReference,pilotId:this.pilotId,note:this.note,evidence:this.evidence};
    const drafts=new Map(this.drafts);
    if (this.center) drafts.set(polygonKey(this.world,this.center),{points:this.points,closed:this.closed,dirty:this.dirty,mapCenter:this.mapCenter,span:this.span,limit:byId('study-limit').value});
    record.drafts=[...drafts].map(([id,{history,...draft}])=>[id,draft]);
    record.editor=this.center?{world:this.world,center:this.center,label:this.label,documented:this.documented,unverified:this.unverified}:null;
    record.layer=byId('study-layer').value;
    record.validation=this.updateValidation.snapshot();
    record.cones=this.cones?.snapshot();
    record.peruGeology=this.peruGeology?.snapshot();
    return JSON.parse(JSON.stringify(record));
  }

  save() {
    try {
      localStorage.setItem(key,JSON.stringify(this.captureState()));
      byId('study-save-status').textContent='Sesión guardada en este navegador.';
    } catch {
      byId('study-save-status').textContent='El almacenamiento del navegador está lleno o deshabilitado. Puedes descargar la ficha y las geometrías.';
    }
  }

  restore() {
    const status=byId('study-save-status');
    try {
      const record=JSON.parse(localStorage.getItem(key));
      if (![1,2].includes(record?.version)) {
        status.textContent='Todavía no hay un análisis guardado en este navegador.';
        return;
      }
      validateState(record);
      this.applyState(record);
      status.textContent='Referencia, polígonos, resultados y área piloto recuperados.';
    } catch {
      status.textContent='No se pudo recuperar el análisis guardado.';
    }
  }

  applyState(record) {
      ++this.scanEpoch;
      ++this.measureEpoch;
      ++this.epoch;
      for (const [id,value] of Object.entries(record.form)) byId(id).value=value;
      byId('study-limit').value=byId('scan-slope').value;
      this.polygons=record.polygons;
      this.library=new Map((record.library ?? Object.values(this.polygons)).map(area=>{
        area.id ??= crypto.randomUUID();
        return [area.id,area];
      }));
      for (const [world,area] of Object.entries(this.polygons)) this.polygons[world]=this.library.get(area.id) ?? area;
      this.analysis=record.analysis;
      this.atlasSectorId=null;
      this.pilotId=record.pilotId;
      this.savedPilot=record.savedPilot;
      this.savedPilotReference=record.savedPilotReference;
      this.note=record.note || '';
      this.evidence=record.evidence;
      byId('scan-file').value='';
      byId('spatial-pilot-note').value=this.note;
      this.center=null;
      this.drafts=new Map(record.drafts ?? []);
      this.api.restore(record.values,record.polygons);
      if (record.editor) this.api.openArea(record.editor.world,record.editor.center);
      if (record.editor) this.select(record.editor.world,record.editor.center,record.editor.label,record.editor.documented,record.editor.unverified);
      this.renderSavedPilot();
      for (const [id,value] of Object.entries(record.form)) byId(id).value=value;
      this.activePlanet=record.activePlanet;
      this.activeArea=record.activeArea;
      this.refreshLibrary();
      byId('scan-boundary').value=record.boundary ?? '';
      this.updateBoundary();
      if (record.pair) {
        byId('study-pair-target').value=record.pair[0];
        byId('study-pair-earth').value=record.pair[1];
      }
      this.updateContext();
      if (record.pair?.every(Boolean)) this.compareSaved();
      this.renderScan();
      this.renderBrief();
      byId('study-layer').value=record.layer ?? 'elevation';
      this.updateValidation.restore(record.validation);
      this.cones?.restore(record.cones);
      this.peruGeology?.restore(record.peruGeology);
      this.api.restoreView?.(record.values);
      this.loadEvidencePoints();
      this.paint();
      if (this.analysis) byId('scan-status').textContent='Resultados recuperados de la sesión guardada.';
  }

  exportEarth() {
    const candidate=this.pilot();
    const inputs=[...[...this.library.values()].filter(area=>area.world==='Earth').map(area=>({
      points:area.points,name:area.label,result:area.result,limit:area.limit,source:area.source,resolution:area.resolution,
      evidence:area.evidenceUrl,justification:area.justification,unverified:area.unverified || undefined,line:area.line,pilot:area.id===this.savedPilot
    })),
      ...(this.analysis?.found??[]).map(row=>({geometry:this.geometry(row),name:'Sector '+row.id,geometryScope:row.geometry?'Huella de celdas terrestres con elevación, recortada por el límite de búsqueda':'Sector recuperado: geometría aproximada',result:row.stats,
        source:row.source,resolution:row.resolution,limit:this.analysis.limit,geologyOverlap:row.match,geologySource:this.analysis.source,
        officialGeology:row.geology ?? null,officialGeologySource:this.analysis.official ?? null,
        difference:row.difference,reliefDifference:row.reliefDifference,landCoverage:row.landCoverage,thematicMatch:row.thematicMatch,thematicCoverage:row.thematicCoverage,thematicSource:this.analysis.thematic?.url,evidencePoints:row.evidencePoints,landSource:this.analysis.landSource,volcanicEvidence:row.volcanic,volcanicSource:this.analysis.volcanoSource,pilot:row===candidate,justification:row===candidate?[this.reason(row),this.note].filter(Boolean).join(' '):null}))];
    if (!inputs.length) {byId('study-save-status').textContent='Dibuja un polígono terrestre o ejecuta una búsqueda antes de exportar.';return}
    const features=inputs.map(({points,geometry,...properties})=>{
      const pieces=geometry ?? catalogGeometry(points);
      return {type:'Feature',properties,geometry:pieces.length===1 ? {type:'Polygon',coordinates:pieces[0]} :
        {type:'MultiPolygon',coordinates:pieces}};
    }).filter(feature=>feature.geometry.coordinates.length);
    download('GeoTwin-sectores-terrestres.geojson','application/geo+json',JSON.stringify({type:'FeatureCollection',features},null,2));
    byId('study-save-status').textContent='GeoJSON terrestre descargado en WGS 84.';
  }

  exportCandidates() {
    const status=byId('study-save-status');
    if (!this.analysis?.found?.length) {
      status.textContent='Ejecuta una búsqueda con sectores antes de exportar la comparación.';
      return;
    }
    if (this.outdatedSearch()) {
      status.textContent='Actualiza la búsqueda para exportar sectores de la referencia que tienes seleccionada.';
      return;
    }
    download('GeoTwin-comparacion-sectores.csv','text/csv;charset=utf-8',candidateCsv(this.analysis,this.pilot(),this.note));
    status.textContent='CSV comparativo descargado.';
  }

  exportPlanet() {
    const areas=[...this.library.values()].filter(area=>area.world!=='Earth');
    const status=byId('study-save-status');
    if (!areas.length) {status.textContent='Mide un polígono lunar o marciano antes de exportar su geometría.';return}
    const csv=value=>'"'+String(value).replaceAll('"','""')+'"';
    const rows=areas.flatMap(area=>[...area.points,area.points[0]].map((point,i)=>
      [area.world,csv(area.label),i+1,point.lat.toFixed(8),point.lon.toFixed(8)].join(',')));
    download('GeoTwin-vertices-planetarios.csv','text/csv',['cuerpo,poligono,vertice,latitud_planetocentrica_grados,longitud_este_grados',...rows].join('\r\n'));
    status.textContent='Vértices descargados en coordenadas del cuerpo planetario indicado en el archivo.';
  }

  report() {
    const state=this.api.snapshot();
    const candidate=this.pilot();
    const a=this.analysis;
    const lines=[
      'GeoTwin Explorer · ficha de análisis',new Date().toLocaleDateString('es-PE'),'',
      ...this.api.referenceLabels(),
      state.pilot?'Área piloto del catálogo: '+state.pilot:'',state.pilotReason ?? '',''
    ];
    for (const area of this.library.values()) {
      const {result}=area;
      lines.push(area.world+' · '+area.label+' · '+position(area.center),
        'Superficie: '+fmt(result.area,2)+' km² · pendiente mediana: '+fmt(result.slope)+' · pendiente P90: '+fmt(result.slopeP90)+'° · rugosidad: '+fmt(result.roughness)+' m · relieve P90−P10: '+fmt(result.relief)+' m',
        'Pendiente ≤ '+fmt(area.limit)+'°: '+percent(result.pass)+' · cobertura de pendiente: '+percent(result.slopeCoverage),
        'Modelo: '+area.source.name+' · '+area.resolution+' m · '+area.source.url,area.evidenceUrl?'Evidencia del rasgo: '+area.evidenceUrl:'',area.justification??'','');
    }
    if (a) lines.push('Búsqueda espacial: '+a.target.name+' · centro terrestre '+position(a.center),
      'Rasgo: '+a.trait+' · sectores prospectivos: '+a.found.length,
      'Fuente del relieve del destino: '+a.targetSource.url, 'Paso de muestreo: '+fmt(a.step*1000,0)+' m',
      a.landSource?'Máscara terrestre: '+a.landSource:'',a.thematic?'Capa temática: '+a.thematic.url:'',a.boundary?'Límite: '+a.boundary.label:'',a.volcanoSource?'Volcanes holocenos: '+a.volcanoSource:'',
      a.source?'Cartografía aportada: '+a.source:'',
      ...a.found.map(row=>'Sector '+row.id+' · '+position(row.center)+' · Δ pendiente '+fmt(row.difference)+' · Δ relieve '+fmt(row.reliefDifference)+' · pendiente P90 '+fmt(row.stats.slopeP90)+'° · rugosidad '+fmt(row.stats.roughness)+' m · coincidencia cartográfica '+percent(row.match)+' · cobertura pendiente '+percent(row.stats.slopeCoverage)+(row.thematicMatch==null?'':' · coincidencia temática '+percent(row.thematicMatch))+(row.evidencePoints?.length?' · registros '+row.evidencePoints.map(point=>point.name+' '+point.url).join(' / '):'')+' · '+row.source.url+(row.volcanic?.length?' · Volcanes: '+row.volcanic.map(v=>v.name).join(', '):'')));
    if (this.savedPilot && (this.savedPilotReference==null || this.savedPilotReference===this.api.target().reference)) lines.push('Polígono terrestre elegido como piloto: '+(this.library.get(this.savedPilot)?.label ?? ''));
    if (candidate && !this.outdatedSearch()) {
      const {alternative}=candidateComparison(a,candidate);
      lines.push('', 'Área piloto de los sectores nuevos: sector '+candidate.id,this.reason(candidate),this.note||'',
        ...sectorEvidence(candidate,a).map(record=>evidenceLabels[record.level]+': '+record.detail+
          (record.source?' '+record.source.url:'')),
        alternative?'Alternativa: sector '+alternative.id+' · Δ pendiente '+fmt(alternative.difference)+' · '+alternative.source.url:'',
        alternative && a.official ? geologySummary(alternative.geology,a.official) : '',
        a.official?'Escala de la cartografía: '+a.official.scale+' · '+a.official.publication+'. '+a.official.limit:'');
    } else if (state.pilot) {
      const catalog=this.api.catalogPilot();
      const alternative=this.api.catalogAlternative(catalog?.id);
      if (catalog) lines.push('Fuente del piloto: '+catalog.source.url,'Por comprobar: '+catalog.verification);
      if (alternative) lines.push('Alternativa: '+alternative.name+' · '+alternative.source);
    }
    const mission=state.missionPlans;
    if (mission) lines.push('', 'Planes de ensayo vinculados a su referencia (JSON):',JSON.stringify(mission,null,2));
    lines.push('', 'Alcance: análisis preliminar para ensayos terrestres. Verificar escala, cobertura y evidencia de campo.',
      measurementCaution,...analogyLimits(this.api.target().world));
    download('GeoTwin-ficha-de-analisis.txt','text/plain;charset=utf-8',lines.join('\n'));
    byId('study-save-status').textContent='Ficha de análisis descargada.';
  }
}
