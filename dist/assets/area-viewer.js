import {drawProfile,drawRelief,loadRelief,reliefModel,reliefSources} from './relief.js';
import {imageryCredit,imageryView,loadImagery,moveImagery} from './area-imagery.js';
import {kmPerDegree} from './areas.js';
import {worlds} from './globe.js';

const format = new Intl.NumberFormat('es-PE',{maximumFractionDigits:1});
const coordinate = new Intl.NumberFormat('es-PE',{maximumFractionDigits:3});
const meters = value => value==null ? '—' : format.format(Math.round(value))+' m';
const distanceLabel = km => km<1 ? meters(km*1000) : format.format(km)+' km';
const extent = {Earth:[8,20,50,120,300,800],Moon:[6,15,36,90,220,500],Mars:[20,60,145,350,800,1800]};
const namedExtents = {
  Earth:[1.5,4,...extent.Earth],
  Moon:extent.Moon,
  Mars:[4,10,...extent.Mars]
};
const closeExtents = {
  shackleton:[.25,1,3,...extent.Moon],
  cabeus:[1,3,...extent.Moon],
  malapert:[1,3,...extent.Moon],
  jezero:[1,...namedExtents.Mars]
};
const namedInitialSpan = {Earth:20,Moon:36,Mars:145};
const initialSpanBySite = {shackleton:15,marius:36,cabeus:15,malapert:15,'mons-mouton':15,'connecting-ridge':15,jezero:20,ulysses:60,gale:60,firsoff:60,'arcadia-ap1':20,'arcadia-ap8':20,'arcadia-ap9':20,deuteronilus:60,university:8,barrow:8,'cinder-lake':8,mullins:8,huambo:8,farnell:8};
const defaultCamera = {yaw:-.35,pitch:.56,exaggeration:1};
const clamp = (v,min,max)=>Math.min(max,Math.max(min,v));

export class AreaViewer {
  constructor(root,globe) {
    this.root = root;
    this.globe = globe;
    this.mode = 'relief';
    this.camera = {...defaultCamera};
    this.token = 0;
    this.photoToken = 0;
    this.zoom = null;
    this.scene = this.find('terrain-scene');
    this.canvas = this.find('terrain-canvas');
    this.profile = this.find('terrain-profile');
    this.photoMap = this.find('photo-map');
    this.photoTiles = this.find('photo-tiles');
    this.bind();
    new ResizeObserver(()=>this.resize()).observe(this.root);
  }

  find(id) { return this.root.querySelector('#'+id); }

  clear() {
    ++this.token;++this.photoToken;
    this.world=null;this.point=null;this.model=null;this.projected=null;
    this.photoTiles.replaceChildren();
    this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);
    this.find('terrain-measurements').hidden=true;
  }

  setArea(world,point,picture) {
    if (this.world===world && this.point?.lat===point.lat && this.point?.lon===point.lon && this.picture?.id===picture?.id) return;
    this.world=world;
    this.point=point;
    this.photoPoint=point;
    this.picture=picture;
    this.extents=point.id ? closeExtents[point.id] ?? namedExtents[world] : extent[world];
    this.zoom=null;
    const initialSpan=point.id ? initialSpanBySite[point.id] ?? namedInitialSpan[world] : extent[world][3];
    this.step=this.extents.indexOf(initialSpan);
    this.model=null;
    this.camera={...defaultCamera,exaggeration:this.camera.exaggeration};
    this.setReference();
    this.renderMode();
  }

  setReference() {
    const {picture} = this;
    const image = this.find('terrain-photo');
    const reference = this.find('photo-reference');
    reference.hidden = !picture;
    reference.open = false;
    if (picture) {
      image.src = 'assets/area-'+picture.id+'.webp';
      image.alt = picture.caption;
    } else image.removeAttribute('src');
    this.find('photo-caption').textContent = picture?.caption || '';
  }

  sync(view) {
    if (view.world!==this.world) return;
    if (this.zoom!=null && Math.abs(view.zoom-this.zoom)>.12) {
      const prior = this.zoom;
      this.zoom = view.zoom;
      this.setStep(this.step+(view.zoom>prior ? -1 : 1));
    } else if (this.zoom==null) this.zoom=view.zoom;
    if (this.mode==='photo') this.drawPhotoFallback();
  }

  drawPhotoFallback() {
    const mosaic = this.find('terrain-mosaic');
    this.globe.drawDetail(this.world,this.photoPoint,mosaic,this.extents[this.step]/kmPerDegree(this.world));
  }

  async updatePhoto() {
    const token=++this.photoToken;
    const {world,photoPoint}=this;
    const span=this.extents[this.step];
    const view=imageryView(world,photoPoint,span);
    const fallback=this.find('terrain-mosaic');
    fallback.getContext('2d').clearRect(0,0,fallback.width,fallback.height);
    delete fallback.dataset.ready;
    this.drawPhotoFallback();
    this.photoTiles.replaceChildren();
    this.photoTiles.style.transform='';
    this.find('photo-reset').hidden=photoPoint===this.point;
    const status=this.find('photo-status');
    const source=this.find('photo-source');
    status.textContent='Cargando imágenes…';
    source.hidden=true;
    let images=await loadImagery(world,view,640);
    if (!images && view.layer && token===this.photoToken) images=await loadImagery(world,view,640,-1);
    if (token!==this.photoToken) return;
    const [label,url]=images ? imageryCredit(world,view) : [worlds[world].credit,worlds[world].source];
    if (images) this.photoTiles.replaceChildren(...images);
    source.hidden=false;
    source.textContent=label;
    source.href=url;
    status.textContent=images ? '' : 'Mosaico de respaldo · detalle limitado';
  }

  renderMode() {
    const relief = this.mode==='relief';
    this.root.querySelectorAll('[data-view-mode]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.viewMode===this.mode));
    ++this.photoToken;
    const target=relief ? 'relieve' : 'imagen';
    this.find('terrain-tools').setAttribute('aria-label','Escala de '+target);
    for (const [id,label] of [['terrain-far','Alejar '],['terrain-near','Acercar ']]) {
      const button=this.find(id);
      button.title=label+target;
      button.setAttribute('aria-label',button.title);
    }
    this.find('terrain-data').hidden = !relief;
    this.scene.hidden = !relief;
    this.find('terrain-image').hidden = relief;
    this.updateScale();
    if (relief) this.updateRelief();
    else {
      ++this.token;
      this.updatePhoto();
    }
  }

  setStep(step) {
    const next=clamp(step,0,this.extents.length-1);
    if (this.step===next) return;
    this.step=next;
    this.updateScale();
    if (this.mode==='relief') this.updateRelief();
    else this.updatePhoto();
  }

  updateScale() {
    this.find('terrain-extent').textContent=distanceLabel(this.extents[this.step])+' de ancho';
    this.find('terrain-near').disabled=this.step===0;
    this.find('terrain-far').disabled=this.step===this.extents.length-1;
  }

  panPhoto(dx,dy) {
    this.photoPoint=moveImagery(this.world,imageryView(this.world,this.photoPoint,this.extents[this.step]),dx,dy);
    this.updatePhoto();
  }

  async updateRelief() {
    const token=++this.token;
    const {world,point} = this;
    const span=this.extents[this.step];
    this.span=span;
    this.model=null;
    this.projected=null;
    this.find('terrain-status').hidden=false;
    this.find('terrain-retry').hidden=true;
    this.find('terrain-status').textContent='Cargando elevaciones…';
    this.find('terrain-measurements').hidden=true;
    this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);
    try {
      const tile=await loadRelief(world,point,span);
      if (token!==this.token) return;
      const model=reliefModel(world,point,span,tile);
      if (!model) throw Error('Área sin cobertura');
      const source=reliefSources[tile.source];
      this.model=model;
      const middle=(model.n-1)/2;
      this.cursor=middle*(model.n+1);
      const slider=this.find('profile-position');
      slider.max=model.n-1;
      slider.value=middle;
      this.find('terrain-center').textContent=meters(model.center.z);
      this.find('terrain-min').textContent=meters(model.min);
      this.find('terrain-max').textContent=meters(model.max);
      const gridCells=span*1000/tile.resolution;
      this.find('terrain-resolution').textContent=(tile.resolution<1000 ? format.format(tile.resolution)+' m' : format.format(tile.resolution/1000)+' km')+' por celda';
      this.find('terrain-detail').textContent=gridCells<8 ? 'Esta vista interpola pocas celdas del modelo. Aleja el visor para abarcar más celdas.' : 'El realce vertical es visual. Las cotas se interpolan de la cuadrícula. La resolución indicada es la del modelo de origen.';
      const link=this.find('terrain-source');
      link.href=source.url;
      link.textContent=source.name;
      this.find('terrain-datum').textContent='Referencia vertical · '+source.datum;
      this.find('terrain-status').hidden=true;
      this.find('terrain-measurements').hidden=false;
      this.draw();
    } catch {
      if (token!==this.token) return;
      this.find('terrain-status').textContent='No se pudo cargar el relieve de esta área.';
      this.find('terrain-retry').hidden=false;
    }
  }

  draw() {
    if (!this.model) return;
    this.projected=drawRelief(this.canvas,this.model,this.camera,this.cursor);
    const n=this.model.n;
    const row=(n-1)/2;
    const profileIndex=Math.round(Number(this.find('profile-position').value));
    drawProfile(this.profile,this.model,profileIndex);
    const point=this.model.vertices[this.cursor];
    this.find('terrain-point').textContent='Punto · '+meters(point.z)+' · '+coordinate.format(Math.abs(point.lat))+'° '+(point.lat<0?'S':'N')+' · '+coordinate.format(Math.abs(point.lon))+'° '+(point.lon<0?'O':'E');
    const profilePoint=this.model.vertices[row*n+profileIndex];
    const distance=this.span*profileIndex/(n-1);
    this.find('profile-reading').textContent=(this.span<1 ? meters(distance*1000) : format.format(distance)+' km')+' · '+meters(profilePoint.z);
  }

  resize() {
    const density=Math.min(devicePixelRatio||1,1.5);
    for (const canvas of [this.canvas,this.profile]) {
      const rect=canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const width=Math.max(1,Math.min(1800,Math.round(rect.width*density)));
      const height=Math.max(1,Math.round(rect.height*width/rect.width));
      if (canvas.width!==width || canvas.height!==height) {canvas.width=width;canvas.height=height;}
    }
    this.draw();
  }

  pick(clientX,clientY) {
    if (!this.projected) return;
    const r=this.canvas.getBoundingClientRect();
    const x=(clientX-r.left)*this.canvas.width/r.width,y=(clientY-r.top)*this.canvas.height/r.height;
    let nearest=-1,best=(22*this.canvas.width/r.width)**2;
    this.projected.forEach((p,i)=>{
      if(this.model.vertices[i].z===null) return;
      const d=(x-p.x)**2+(y-p.y)**2;
      if(d<best){nearest=i;best=d;}
    });
    if (nearest<0) return;
    this.cursor=nearest;
    this.draw();
  }

  bind() {
    this.root.addEventListener('click',event=>{
      const mode=event.target.closest('[data-view-mode]')?.dataset.viewMode;
      if(mode && mode!==this.mode) {this.mode=mode;this.renderMode();}
    });
    this.find('terrain-near').addEventListener('click',()=>this.setStep(this.step-1));
    this.find('terrain-far').addEventListener('click',()=>this.setStep(this.step+1));
    this.find('photo-reset').addEventListener('click',()=>{
      this.photoPoint=this.point;
      this.updatePhoto();
      this.photoMap.focus();
    });
    this.photoMap.addEventListener('pointerdown',event=>{
      if (!event.isPrimary || event.button!==0) return;
      this.photoDrag={id:event.pointerId,x:event.clientX,y:event.clientY};
      this.photoMap.setPointerCapture(event.pointerId);
    });
    this.photoMap.addEventListener('pointermove',event=>{
      if (this.photoDrag?.id!==event.pointerId) return;
      const dx=event.clientX-this.photoDrag.x;
      const dy=event.clientY-this.photoDrag.y;
      this.photoTiles.style.transform='translate('+dx+'px,'+dy+'px)';
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) this.photoMap.addEventListener(name,event=>{
      if (this.photoDrag?.id!==event.pointerId) return;
      const dx=event.clientX-this.photoDrag.x;
      const dy=event.clientY-this.photoDrag.y;
      this.photoDrag=null;
      this.photoTiles.style.transform='';
      if (name==='pointerup' && Math.hypot(dx,dy)>4) this.panPhoto(dx/this.photoMap.clientWidth,dy/this.photoMap.clientHeight);
    });
    this.photoMap.addEventListener('keydown',event=>{
      const actions={
        ArrowLeft:()=>this.panPhoto(.22,0),ArrowRight:()=>this.panPhoto(-.22,0),
        ArrowUp:()=>this.panPhoto(0,.22),ArrowDown:()=>this.panPhoto(0,-.22),
        '+':()=>this.setStep(this.step-1),'-':()=>this.setStep(this.step+1)
      };
      if (!actions[event.key]) return;
      event.preventDefault();
      actions[event.key]();
    });
    this.find('terrain-retry').addEventListener('click',()=>this.updateRelief());
    this.find('terrain-reset').addEventListener('click',()=>{
      this.camera={...defaultCamera};
      this.find('terrain-exaggeration').value=1;
      this.draw();
    });
    this.find('terrain-exaggeration').addEventListener('input',event=>{
      this.camera.exaggeration=Number(event.target.value);
      this.draw();
    });
    this.find('profile-position').addEventListener('input',event=>{
      if(!this.model) return;
      this.cursor=(this.model.n-1)/2*this.model.n+Number(event.target.value);
      this.draw();
    });
    this.profile.addEventListener('pointerdown',event=>{
      if(!this.model) return;
      const rect=this.profile.getBoundingClientRect();
      const index=clamp(Math.round((event.clientX-rect.left)/rect.width*(this.model.n-1)),0,this.model.n-1);
      const control=this.find('profile-position');
      control.value=index;
      control.dispatchEvent(new Event('input'));
    });
    this.canvas.addEventListener('pointerdown',event=>{
      if(!event.isPrimary || event.button!==0 || !this.model) return;
      this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove',event=>{
      if(this.drag?.id!==event.pointerId) return;
      const dx=event.clientX-this.drag.x,dy=event.clientY-this.drag.y;
      if(!this.drag.moved && Math.hypot(dx,dy)<4) return;
      this.drag.moved=true;
      this.camera.yaw+=dx*.012;
      this.camera.pitch=clamp(this.camera.pitch-dy*.008,.23,1.46);
      Object.assign(this.drag,{x:event.clientX,y:event.clientY});
      this.draw();
    });
    for(const name of ['pointerup','pointercancel','lostpointercapture']) this.canvas.addEventListener(name,event=>{
      if(this.drag?.id!==event.pointerId) return;
      if(name==='pointerup'&&!this.drag.moved) this.pick(event.clientX,event.clientY);
      this.drag=null;
    });
    this.canvas.addEventListener('keydown',event=>{
      const actions={
        ArrowLeft:()=>{this.camera.yaw-=.15;},ArrowRight:()=>{this.camera.yaw+=.15;},
        ArrowUp:()=>{this.camera.pitch=clamp(this.camera.pitch+.1,.23,1.46);},
        ArrowDown:()=>{this.camera.pitch=clamp(this.camera.pitch-.1,.23,1.46);},
        '+':()=>this.setStep(this.step-1),'-':()=>this.setStep(this.step+1)
      };
      if(!actions[event.key]) return;
      event.preventDefault();actions[event.key]();this.draw();
    });
  }
}
