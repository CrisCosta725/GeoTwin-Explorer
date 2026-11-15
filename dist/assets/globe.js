const rad = Math.PI / 180;
const tau = 2 * Math.PI;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const worlds = {
  Earth: {
    label: 'Tierra', image: 'earth-globe.webp', lon: -63, lat: 11, tint: [93,166,245],
    credit: 'NASA · Blue Marble', source: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/'
  },
  Moon: {
    label: 'Luna', image: 'moon-globe.webp', lon: 8, lat: -46, tint: [169,180,217],
    credit: 'NASA SVS · LRO', source: 'https://svs.gsfc.nasa.gov/4720/'
  },
  Mars: {
    label: 'Marte', image: 'mars-globe.webp', lon: 53, lat: 15, tint: [252,141,88],
    credit: 'NASA/JPL-Caltech · Viking', source: 'https://science.nasa.gov/3d-resources/mars/'
  }
};

function loadTexture(world) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = reject;
    image.onload = () => {
      const buffer = document.createElement('canvas');
      buffer.width = image.naturalWidth;
      buffer.height = image.naturalHeight;
      const ctx = buffer.getContext('2d');
      ctx.drawImage(image,0,0);
      resolve({width:buffer.width,height:buffer.height,pixels:ctx.getImageData(0,0,buffer.width,buffer.height).data});
    };
    image.src = new URL(world.image,import.meta.url).href;
  });
}

function sphereGrid(size) {
  const coords = [];
  const radius = (size-2)/2;
  for (let row=0;row<size;row++) {
    const y = (size/2-row-.5)/radius;
    for (let col=0;col<size;col++) {
      const x = (col+.5-size/2)/radius;
      const distance = Math.hypot(x,y);
      if (distance>1+1/radius) continue;
      const z = Math.sqrt(Math.max(0,1-x*x-y*y));
      const light = .30 + .75*Math.max(0,-.37*x+.46*y+.807*z);
      const rim = Math.pow(1-z,3)*Math.max(0,.52-.30*x+.32*y);
      const alpha = Math.round(255*clamp((1-distance)*radius+.5,0,1));
      coords.push(4*(row*size+col),x,y,z,light,rim,alpha);
    }
  }
  return Float32Array.from(coords);
}

export class PlanetViewer {
  constructor(viewport, onView, onPick, onTextureReady) {
    this.viewport = viewport;
    this.canvas = viewport.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.status = viewport.querySelector('[data-globe-status]');
    this.onView = onView;
    this.onPick = onPick;
    this.onTextureReady = onTextureReady;
    this.cameras = Object.fromEntries(Object.entries(worlds).map(([id,world])=>[id,{lon:world.lon,lat:world.lat,zoom:1}]));
    this.textures = new Map();
    this.world = 'Earth';
    this.drag = null;
    this.frame = 0;
    new ResizeObserver(()=>this.requestDraw()).observe(viewport);
    this.bindControls();
  }

  get camera() { return this.cameras[this.world]; }

  show(id) {
    this.world = id;
    if (!this.textures.has(id)) {
      this.textures.set(id,{status:'loading'});
      loadTexture(worlds[id]).then(texture=>{
        this.textures.set(id,{status:'ready',texture});
        this.requestDraw();
        this.onTextureReady?.();
      }).catch(()=>{
        this.textures.set(id,{status:'error'});
        this.requestDraw();
        this.onTextureReady?.();
      });
    }
    this.requestDraw();
  }

  center(lat,lon,zoom=this.camera.zoom) {
    Object.assign(this.camera,{lat:clamp(lat,-90,90),lon,zoom});
    this.requestDraw();
  }

  reset() {
    const world = worlds[this.world];
    Object.assign(this.camera,{lat:world.lat,lon:world.lon,zoom:1});
    this.requestDraw();
  }

  zoom(amount) {
    this.camera.zoom = clamp(this.camera.zoom+amount, .8, 2.4);
    this.requestDraw();
  }

  rotate(lon,lat) {
    this.camera.lon = (this.camera.lon+lon+540)%360-180;
    this.camera.lat = clamp(this.camera.lat+lat,-90,90);
    this.requestDraw();
  }

  requestDraw() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(()=>{
      this.frame = 0;
      this.draw();
    });
  }

  draw() {
    const width = this.viewport.clientWidth;
    const height = this.viewport.clientHeight;
    if (!width || !height) return;
    const diameter = Math.min(height*.91,width*.88)*this.camera.zoom;
    const size = Math.min(this.viewport.closest('[data-expanded="true"]')?1000:510,Math.max(160,Math.round(diameter*Math.min(devicePixelRatio||1,1.35))));
    const entry = this.textures.get(this.world);
    this.canvas.style.width = diameter+'px';
    this.canvas.style.height = diameter+'px';
    this.status.hidden = entry?.status==='ready';
    if (entry?.status!=='ready') this.status.textContent = entry?.status==='error' ? 'La textura no está disponible.' : 'Cargando superficie…';
    if (entry?.status==='ready') {
      if (size!==this.canvas.width || !this.grid) {
        this.canvas.width = this.canvas.height = size;
        this.grid = sphereGrid(size);
        this.image = this.ctx.createImageData(size,size);
      }
      this.renderSphere(entry.texture);
    } else {
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    this.view = {world:this.world,zoom:this.camera.zoom,radius:diameter/2,width,height};
    this.onView(this.view);
  }

  renderSphere(texture,target=this.canvas,camera=this.camera) {
    const {width,height,pixels} = texture;
    const targetCtx=target.getContext('2d');
    const size=target.width;
    this.sphereTargets??=new WeakMap();
    let cached=this.sphereTargets.get(target);
    if (target!==this.canvas && cached?.size!==size) {
      cached={size,grid:sphereGrid(size),image:targetCtx.createImageData(size,size)};
      this.sphereTargets.set(target,cached);
    }
    const grid=target===this.canvas?this.grid:cached.grid;
    const image=target===this.canvas?this.image:cached.image;
    const dest = image.data;
    const lon = camera.lon*rad;
    const lat = camera.lat*rad;
    const sin = Math.sin(lat);
    const cos = Math.cos(lat);
    const [red,green,blue] = worlds[this.world].tint;
    for (let i=0;i<grid.length;i+=7) {
      const offset = grid[i], x=grid[i+1], y=grid[i+2], z=grid[i+3];
      const longitude = Math.atan2(x,z*cos-y*sin)+lon;
      const latitude = Math.asin(clamp(y*cos+z*sin,-1,1));
      const col = Math.floor((longitude/tau+1.5)*width)%width;
      const row = Math.min(height-1,Math.floor((.5-latitude/Math.PI)*height));
      const source = (row*width+col)*4;
      const light = grid[i+4], rim = grid[i+5] * (this.world==='Earth' ? .77 : .20);
      dest[offset] = pixels[source]*light+red*rim;
      dest[offset+1] = pixels[source+1]*light+green*rim;
      dest[offset+2] = pixels[source+2]*light+blue*rim;
      dest[offset+3] = grid[i+6];
    }
    targetCtx.putImageData(image,0,0);
  }

  drawTexture(target) {
    const entry=this.textures.get(this.world);
    if (entry?.status!=='ready') return false;
    const rect=target.parentElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const size=Math.min(512,Math.max(96,Math.round(Math.min(rect.width,rect.height)*this.camera.zoom*Math.min(globalThis.devicePixelRatio||1,1.6))));
    if (target.width!==size || target.height!==size) target.width=target.height=size;
    // CSS size is relative to the orb, never to the raster buffer's pixels.
    target.style.width=(100*this.camera.zoom)+'%';
    target.style.height=(100*this.camera.zoom)+'%';
    this.renderSphere(entry.texture,target,this.camera);
    target.dataset.ready='true';
    return true;
  }

  project(lat,lon,{radius,width,height}) {
    const phi = lat*rad;
    const delta = (lon-this.camera.lon)*rad;
    const tilt = this.camera.lat*rad;
    const x = Math.cos(phi)*Math.sin(delta);
    const y = Math.sin(phi)*Math.cos(tilt)-Math.cos(phi)*Math.cos(delta)*Math.sin(tilt);
    const z = Math.sin(phi)*Math.sin(tilt)+Math.cos(phi)*Math.cos(delta)*Math.cos(tilt);
    return {x:width/2+x*radius,y:height/2-y*radius,z};
  }

  unproject(x,y,view=this.view) {
    if (!view) return null;
    const u = (x-view.width/2)/view.radius;
    const v = (view.height/2-y)/view.radius;
    const d = u*u+v*v;
    if (d>1) return null;
    const z = Math.sqrt(1-d);
    const lat = this.camera.lat*rad;
    const sin = Math.sin(lat), cos = Math.cos(lat);
    const latitude = Math.asin(clamp(v*cos+z*sin,-1,1))/rad;
    const longitude = Math.atan2(u,z*cos-v*sin)/rad+this.camera.lon;
    return {lat:latitude,lon:(longitude+540)%360-180};
  }

  drawDetail(world,point,canvas,span) {
    const entry = this.textures.get(world);
    if (entry?.status!=='ready' || canvas.dataset.ready) return;
    const texture = entry.texture;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width,canvas.height);
    const lat = point.lat*rad;
    const sin = Math.sin(lat), cos = Math.cos(lat);
    const lon = point.lon*rad;
    for (let y=0;y<canvas.height;y++) {
      const v = (canvas.height/2-y-.5)*span*rad/canvas.width;
      for (let x=0;x<canvas.width;x++) {
        const u = (x+.5-canvas.width/2)*span*rad/canvas.width;
        const z = Math.sqrt(1-u*u-v*v);
        const longitude = Math.atan2(u,z*cos-v*sin)+lon;
        const latitude = Math.asin(clamp(v*cos+z*sin,-1,1));
        const col = Math.floor((longitude/tau+1.5)*texture.width)%texture.width;
        const row = Math.min(texture.height-1,Math.floor((.5-latitude/Math.PI)*texture.height));
        const src = (row*texture.width+col)*4;
        const dst = (y*canvas.width+x)*4;
        image.data[dst] = texture.pixels[src];
        image.data[dst+1] = texture.pixels[src+1];
        image.data[dst+2] = texture.pixels[src+2];
        image.data[dst+3] = 255;
      }
    }
    ctx.putImageData(image,0,0);
    canvas.dataset.ready = 'true';
  }

  bindControls() {
    const view = this.viewport;
    view.addEventListener('pointerdown',event=>{
      if (!event.isPrimary || event.button!==0 || event.target.closest('button,a,[data-atlas-sector]')) return;
      this.drag = {id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      view.setPointerCapture(event.pointerId);
      view.classList.add('dragging');
    });
    view.addEventListener('pointermove',event=>{
      if (this.drag?.id!==event.pointerId) return;
      const dx = event.clientX-this.drag.x, dy = event.clientY-this.drag.y;
      if (!this.drag.moved && Math.hypot(dx,dy)<5) return;
      this.drag.moved = true;
      const speed = .33 / this.camera.zoom;
      this.rotate(-dx*speed,dy*speed);
      Object.assign(this.drag,{x:event.clientX,y:event.clientY});
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      view.addEventListener(name,event=>{
        if (this.drag?.id!==event.pointerId) return;
        const pick = name==='pointerup' && !this.drag.moved;
        this.drag = null;
        view.classList.remove('dragging');
        if (pick) {
          const rect = view.getBoundingClientRect();
          const point = this.unproject(event.clientX-rect.left,event.clientY-rect.top);
          if (point) this.onPick(point);
        }
      });
    }
    view.addEventListener('keydown',event=>{
      if (event.target!==view) return;
      const actions = {
        ArrowLeft:()=>this.rotate(-12,0),ArrowRight:()=>this.rotate(12,0),
        ArrowUp:()=>this.rotate(0,12),ArrowDown:()=>this.rotate(0,-12),
        '+':()=>this.zoom(.2),'=':()=>this.zoom(.2),'-':()=>this.zoom(-.2),Home:()=>this.reset(),Enter:()=>this.onPick({lat:this.camera.lat,lon:this.camera.lon})
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    });
  }
}

export class PlanetAtlas {
  constructor(root,onView,onPick,onActivate) {
    this.viewport=root;
    this.world='Earth';
    this.viewMode='overview';
    this.autoRotate=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.overviewFrame=0;this.overviewLast=null;
    this.focusedWorld=null;
    this.overviewLocations=Object.fromEntries(Object.keys(worlds).map(world=>[world,[]]));
    this.onActivate=onActivate;
    this.planets=new Map();
    for (const world of Object.keys(worlds)) {
      const viewport=root.querySelector('[data-globe="'+world+'"]');
      const viewer=new PlanetViewer(viewport,onView,point=>onPick(point,world),()=>{this.drawOverview();this.requestOverviewDraw();});
      viewer.show(world);this.planets.set(world,viewer);
      viewport.addEventListener('pointerdown',event=>{if (!event.target.closest('button,a,[data-atlas-sector]') && this.world!==world) onActivate(world);},true);
      viewport.addEventListener('focus',()=>{if (this.world!==world) onActivate(world);});
      this.bindOverviewControls(world,viewer,onPick,onActivate);
    }
    document.addEventListener('visibilitychange',()=>{this.overviewLast=null;this.requestOverviewDraw();});
    this.showOverview();
    window.addEventListener('resize',()=>this.requestDraw());
  }
  get active() {return this.planets.get(this.world);}
  get isOverview() {return this.viewMode==='overview';}
  get camera() {return this.active.camera;}
  get view() {return this.active.view;}
  setOverviewWorld(world) {
    if (!this.isOverview || !this.planets.has(world)) return;
    if (this.world!==world) this.onActivate(world);
    this.world=world;
    this.syncControls();
  }
  setOverviewLocations(locations) {
    this.overviewLocations=locations;
    for (const world of Object.keys(worlds)) {
      const layer=this.viewport.querySelector('[data-overview-locations="'+world+'"]');
      const sites=locations[world]??[];
      const existing=[...layer.children].map(node=>node.dataset.overviewLocation);
      if (existing.join('\0')!==sites.map(site=>site.id).join('\0')) {
        layer.replaceChildren(...sites.map(site=>{
          const marker=document.createElement('span');
          marker.className='overview-location-point '+site.tone;
          marker.dataset.overviewLocation=site.id;
          marker.setAttribute('aria-hidden','true');
          marker.hidden=true;
          return marker;
        }));
      }
      sites.forEach((site,index)=>layer.children[index].classList.toggle('selected',site.selected));
    }
    this.drawOverview();
  }
  bindOverviewControls(world,viewer,onPick,onActivate) {
    const control=this.viewport.querySelector('[data-overview-world="'+world+'"]');
    if (!control) return;
    let drag=null,suppressClick=false;
    const selectPoint=(x,y)=>{
      const rect=control.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const view={world,zoom:viewer.camera.zoom,radius:Math.min(rect.width,rect.height)*viewer.camera.zoom/2,width:rect.width,height:rect.height};
      const point=viewer.unproject(x-rect.left,y-rect.top,view);
      if (!point) return;
      this.setOverviewWorld(world);
      this.focusWorld(world,()=>{onActivate(world);onPick(point,world);});
    };
    control.addEventListener('focus',()=>this.setOverviewWorld(world));
    control.addEventListener('pointerdown',event=>{
      if (!event.isPrimary || event.button!==0) return;
      suppressClick=false;
      this.setOverviewWorld(world);
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      control.setPointerCapture(event.pointerId);
      control.classList.add('dragging');
    });
    control.addEventListener('pointermove',event=>{
      if (drag?.id!==event.pointerId) return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if (!drag.moved && Math.hypot(dx,dy)<5) return;
      drag.moved=true;
      const speed=.33/viewer.camera.zoom;
      viewer.rotate(-dx*speed,dy*speed);
      Object.assign(drag,{x:event.clientX,y:event.clientY});
      this.drawOverview(world);
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      control.addEventListener(name,event=>{
        if (drag?.id!==event.pointerId) return;
        const pick=name==='pointerup' && !drag.moved;
        suppressClick=drag.moved;
        drag=null;
        control.classList.remove('dragging');
        if (pick) selectPoint(event.clientX,event.clientY);
      });
    }
    control.addEventListener('click',event=>{
      if (event.detail===0) suppressClick=false;
      if (suppressClick) {suppressClick=false;event.preventDefault();return;}
      if (event.detail!==0) return;
      this.setOverviewWorld(world);
      this.focusWorld(world,()=>{onActivate(world);onPick({lat:viewer.camera.lat,lon:viewer.camera.lon},world);});
    });
    control.addEventListener('keydown',event=>{
      const actions={
        ArrowLeft:()=>viewer.rotate(-12,0),ArrowRight:()=>viewer.rotate(12,0),
        ArrowUp:()=>viewer.rotate(0,12),ArrowDown:()=>viewer.rotate(0,-12),
        '+':()=>viewer.zoom(.2),'=':()=>viewer.zoom(.2),'-':()=>viewer.zoom(-.2),
        Home:()=>viewer.reset()
      };
      const action=actions[event.key];
      if (!action) return;
      event.preventDefault();
      this.setOverviewWorld(world);
      action();
      this.drawOverview(world);
      this.syncControls();
    });
  }
  show(world) {
    this.world=world;
    this.viewMode='overview';
    for (const [name,viewer] of this.planets) viewer.viewport.dataset.active=String(name===world);
    this.syncMode();this.requestDraw();
  }
  syncMode() {
    this.viewport.dataset.mode=this.viewMode;
    this.viewport.querySelector('#planet-overview').hidden=!this.isOverview;
    this.viewport.querySelector('#surface-view').hidden=true;
    for (const viewer of this.planets.values()) viewer.viewport.closest('.planet-card').hidden=true;
    this.viewport.querySelector('.planet-network').dataset.focusedWorld=this.focusedWorld??'';
    this.viewport.dataset.focusedWorld=this.focusedWorld??'';
    this.overviewLast=null;
    this.syncControls();
  }
  syncControls() {
    document.getElementById('active-globe-label').textContent=worlds[this.world].label;
    document.getElementById('zoom-in').disabled=this.camera.zoom>=2.4;
    document.getElementById('zoom-out').disabled=this.camera.zoom<=.8;
    this.viewport.querySelectorAll('[data-overview-card]').forEach(card=>{
      card.dataset.active=String(card.dataset.overviewCard===this.world);
      card.dataset.inspecting=String(card.dataset.overviewCard===this.focusedWorld);
    });
  }
  drawOverview(onlyWorld=null) {
    if (!this.isOverview) return;
    for (const [world,viewer] of this.planets) {
      if (onlyWorld && onlyWorld!==world) continue;
      const canvas=this.viewport.querySelector('[data-overview-texture="'+world+'"]');
      if (canvas) {
        viewer.drawTexture(canvas);
        const entry=viewer.textures.get(world),control=canvas.parentElement,status=control.querySelector('[data-overview-status]');
        control.setAttribute('aria-busy',String(entry?.status==='loading'));
        status.hidden=entry?.status==='ready';
        status.textContent=entry?.status==='error'?'Esfera no disponible':'Cargando esfera…';
      }
      const control=this.viewport.querySelector('[data-overview-world="'+world+'"]');
      const layer=this.viewport.querySelector('[data-overview-locations="'+world+'"]');
      const {width,height}=control.getBoundingClientRect();
      const radius=Math.min(width,height)*viewer.camera.zoom/2;
      if (!radius) continue;
      const view={world,zoom:viewer.camera.zoom,radius,width,height};
      viewer.view=view;
      if (viewer.textures.get(world)?.status==='ready') viewer.onView(view);
      const visible=[];
      const clusterMargin=Math.min(width,height)/2-12;
      for (const [index,site] of (this.overviewLocations[world]??[]).entries()) {
        const point=viewer.project(site.lat,site.lon,view);
        const marker=layer.children[index];
        marker.hidden=point.z<=.06;
        marker.classList.remove('cluster','cluster-member');
        marker.classList.toggle('selected',Boolean(site.selected));
        marker.removeAttribute('data-cluster-count');
        if (!marker.hidden) {
          marker.style.left=point.x+'px';
          marker.style.top=point.y+'px';
          const clusterable=Math.hypot(point.x-width/2,point.y-height/2)<=clusterMargin;
          visible.push({marker,point,selected:Boolean(site.selected),clusterable});
        }
      }
      const clusters=[];
      for (const item of visible.filter(candidate=>candidate.clusterable)) {
        const cluster=clusters.find(group=>group.every(other=>Math.hypot(item.point.x-other.point.x,item.point.y-other.point.y)<=11));
        if (cluster) cluster.push(item);
        else clusters.push([item]);
      }
      for (const cluster of clusters) {
        if (cluster.length<2) continue;
        const leader=cluster.find(item=>item.selected)??cluster[0];
        leader.marker.classList.add('cluster');
        leader.marker.classList.toggle('selected',cluster.some(item=>item.selected));
        leader.marker.dataset.clusterCount=String(cluster.length);
        for (const item of cluster) if (item!==leader) item.marker.classList.add('cluster-member');
      }
    }
  }
  requestOverviewDraw() {
    if (this.overviewFrame) return;
    this.overviewFrame=requestAnimationFrame(time=>{
      this.overviewFrame=0;
      const visible=this.isOverview && !document.hidden && this.viewport.isConnected && !this.viewport.closest('[hidden]') &&
        [...this.viewport.querySelectorAll('[data-overview-world]')].some(node=>node.getBoundingClientRect().width>0);
      if (!visible) {this.overviewLast=null;return;}
      const ready=[...this.planets.values()].some(viewer=>viewer.textures.get(viewer.world)?.status==='ready');
      const moving=this.autoRotate && ready;
      if (moving && this.overviewLast!==null) {
        const degrees=(time-this.overviewLast)*.004;
        for (const viewer of this.planets.values()) viewer.camera.lon=(viewer.camera.lon+degrees+540)%360-180;
      }
      this.overviewLast=moving?time:null;
      this.drawOverview();
      if (moving) this.requestOverviewDraw();
    });
  }
  showOverview() {this.focusedWorld=null;this.viewMode='overview';this.syncMode();this.drawOverview();this.requestDraw();}
  focusWorld(world=this.world,afterFocus) {
    if (!this.planets.has(world)) return;
    this.focusedWorld=world;
    this.show(world);
    this.drawOverview();
    afterFocus?.();
  }
  requestDraw() {for (const viewer of this.planets.values()) viewer.requestDraw();if (this.isOverview) this.requestOverviewDraw();}
  center(lat,lon,zoom) {this.active.center(lat,lon,zoom);this.focusWorld();this.requestOverviewDraw();}
  zoom(amount) {this.active.zoom(amount);this.refreshOverviewControls();}
  rotate(lon,lat) {this.active.rotate(lon,lat);this.refreshOverviewControls();}
  reset() {this.active.reset();this.refreshOverviewControls();}
  resetAll() {
    for (const viewer of this.planets.values()) viewer.reset();
    this.requestDraw();
    if (this.isOverview) this.drawOverview();
    this.syncControls();
  }
  refreshOverviewControls() {if (this.isOverview) {this.drawOverview(this.world);this.syncControls();}}
  project(lat,lon,view) {return this.planets.get(view.world).project(lat,lon,view);}
  drawDetail(world,point,canvas,span) {this.planets.get(world).drawDetail(world,point,canvas,span);}
  snapshot() {return Object.fromEntries([...this.planets].map(([world,viewer])=>[world,{...viewer.camera}]));}
  restore(cameras) {
    for (const [world,camera] of Object.entries(cameras??{})) this.planets.get(world)?.center(camera.lat,camera.lon,camera.zoom);
  }
}
