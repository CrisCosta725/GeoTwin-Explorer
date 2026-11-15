const rad = Math.PI/180;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const wrap = lon => (lon+540)%360-180;
const radius = {Earth:6371,Moon:1737.4,Mars:3389.5};
export const reliefSources = {
  usgs3dep:{name:'USGS · 3DEP, recorte Hawaiʻi (100 m)',datum:'Elevación del servicio 3DEP, en metros',url:'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'},
  terrarium:{name:'Mapzen · Terrain Tiles (Terrarium)',datum:'Referencia de las fuentes del mosaico',url:'https://registry.opendata.aws/terrain-tiles/'},
  etopo:{name:'NOAA · ETOPO1',datum:'Nivel medio del mar',url:'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.html'},
  copernicus:{name:'Copernicus · GLO-90',datum:'Geoide EGM2008',url:'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'},
  copernicus30:{name:'Copernicus · GLO-30',datum:'Geoide EGM2008',url:'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'},
  lola:{name:'NASA LRO · LOLA',datum:'Radio lunar de 1 737,4 km',url:'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/'},
  lolaRegional:{name:'NASA LRO · LOLA',datum:'Radio lunar de 1 737,4 km',url:'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/'},
  lolaPolar:{name:'NASA LRO · LOLA polar',datum:'Radio lunar de 1 737,4 km',url:'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/'},
  lolaShackleton:{name:'NASA LRO · LOLA, borde de Shackleton',datum:'Radio lunar de 1 737,4 km',url:'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/'},
  lolaAdjustedPolar:{name:'NASA LRO · LOLA polar ajustado',datum:'Radio lunar de 1 737,4 km',url:'https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/'},
  lolaMalapert:{name:'NASA LRO · LOLA, macizo Malapert',datum:'Radio lunar de 1 737,4 km',url:'https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/'},
  mola:{name:'NASA MGS · MOLA',datum:'Areoide marciano',url:'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html'},
  molaRegional:{name:'NASA MGS · MOLA',datum:'Areoide marciano',url:'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html'},
  hrscMola:{name:'USGS · HRSC–MOLA',datum:'Areoide marciano',url:'https://fdp.astrogeology.usgs.gov/fdp/mars/'},
  ctxJezero:{name:'NASA MRO · CTX, mosaico de Jezero (USGS)',datum:'Referencia vertical MOLA',url:'https://www.usgs.gov/media/images/jezero-crater-0'}
};

export function offsetPoint(world,point,east,north) {
  const angle = Math.hypot(east,north)/radius[world];
  if (!angle) return point;
  const bearing = Math.atan2(east,north);
  const phi = point.lat*rad;
  const latitude = Math.asin(clamp(Math.sin(phi)*Math.cos(angle)+Math.cos(phi)*Math.sin(angle)*Math.cos(bearing),-1,1));
  const delta = Math.atan2(Math.sin(bearing)*Math.sin(angle)*Math.cos(phi),Math.cos(angle)-Math.sin(phi)*Math.sin(latitude));
  return {lat:latitude/rad,lon:wrap(point.lon+delta/rad)};
}

function gridPosition(tile,point) {
  if (tile.projection==='south-pole') {
    const rho = 2*radius.Moon*1000*Math.tan((90+point.lat)*rad/2);
    return [(rho*Math.sin(point.lon*rad)-tile.west)/tile.dx,(tile.north-rho*Math.cos(point.lon*rad))/tile.dy];
  }
  if (tile.projection==='equirectangular') {
    const x = point.lon*rad*tile.radius*Math.cos(tile.standardParallel*rad);
    const y = point.lat*rad*tile.radius;
    return [(x-tile.west)/tile.dx,(tile.north-y)/tile.dy];
  }
  const delta = tile.periodic ? ((point.lon-tile.west)%360+360)%360 : wrap(point.lon-tile.west);
  return [delta/tile.dx,(tile.north-point.lat)/tile.dy];
}

function contains(tile,point) {
  if (tile.periodic) return true;
  const [x,y] = gridPosition(tile,point);
  return x>=0 && y>=0 && x<tile.width-1 && y<tile.height-1;
}

export function elevation(tile,point) {
  if (tile.sample) return tile.sample(point);
  if (!contains(tile,point)) return null;
  let [x,y] = gridPosition(tile,point);
  x = tile.periodic ? x%tile.width : x;
  y = clamp(y,0,tile.height-1);
  const x0=Math.floor(x), y0=Math.floor(y);
  const x1=tile.periodic ? (x0+1)%tile.width : Math.min(x0+1,tile.width-1);
  const y1=Math.min(y0+1,tile.height-1);
  const read = tile.read || ((col,row)=>tile.values[row*tile.width+col]);
  const a=read(x0,y0),b=read(x1,y0),c=read(x0,y1),d=read(x1,y1);
  if ([a,b,c,d].includes(-32768)) return null;
  const f=x-x0,g=y-y0;
  return (a+(b-a)*f)*(1-g)+(c+(d-c)*f)*g;
}

const centerOffsets = [-.5,0,.5];
const dataUrl = name => new URL('relief-data/'+name,import.meta.url);
const cache = new Map();
const sampleCount = 49;
let indexPromise;

async function loadTile(tile) {
  if (!cache.has(tile.file)) {
    const job = (async()=>{
      const response = await fetch(dataUrl(tile.file+'.bin.gz'));
      if (!response.ok) throw Error('Elevación no disponible');
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      if (buffer.byteLength!==tile.width*tile.height*2) throw Error('Modelo incompleto');
      const values = new Int16Array(buffer);
      for (let i=tile.width;i<values.length;i++) values[i]+=values[i-tile.width];
      for (let row=0;row<tile.height;row++) {
        const start=row*tile.width;
        for (let i=start+1;i<start+tile.width;i++) values[i]+=values[i-1];
      }
      return {...tile,values};
    })();
    cache.set(tile.file,job);
    if (cache.size>48) cache.delete(cache.keys().next().value);
    job.catch(()=>cache.delete(tile.file));
  }
  return cache.get(tile.file);
}

let hawaiiStudy;
export function loadHawaiiStudy() {
  return hawaiiStudy ??= fetch(dataUrl('hawaii-3dep.json')).then(response=>{
    if (!response.ok) throw Error('Recorte 3DEP no disponible');
    return response.json();
  }).then(loadTile).catch(error=>{hawaiiStudy=null;throw error});
}

export async function loadRelief(world,point,span) {
  indexPromise ??= fetch(dataUrl('index.json')).then(response=>{
    if (!response.ok) throw Error('Índice no disponible');
    return response.json();
  }).catch(error=>{ indexPromise=null; throw error; });
  const {base,local} = (await indexPromise)[world];
  const coverage = centerOffsets.flatMap(x=>centerOffsets.map(y=>offsetPoint(world,point,x*span,y*span)));
  const candidates = local.filter(tile=>coverage.every(location=>contains(tile,location)))
    .sort((a,b)=>a.resolution-b.resolution);
  for (const candidate of candidates) {
    const tile = await loadTile(candidate).catch(()=>null);
    if (tile && coverage.every(location=>elevation(tile,location)!==null)) return tile;
  }
  return loadGlobal(base,world,point,span);
}

async function loadGlobal(base,world,point,span) {
  const {chunk,width,height} = base;
  const needed = new Map();
  const key = (x,y)=>Math.floor(x/chunk)+'-'+Math.floor(y/chunk);
  const add = (x,y)=>{
    const id = key(x,y);
    if (needed.has(id)) return;
    needed.set(id,loadTile({
      file:base.file+'-'+id,
      width:Math.min(chunk,width-Math.floor(x/chunk)*chunk),
      height:Math.min(chunk,height-Math.floor(y/chunk)*chunk)
    }));
  };
  for (let row=0;row<sampleCount;row++) {
    for (let col=0;col<sampleCount;col++) {
      const location = offsetPoint(world,point,(col/(sampleCount-1)-.5)*span,(.5-row/(sampleCount-1))*span);
      const [x,y] = gridPosition(base,location);
      const ix = Math.floor(x%width), iy = Math.floor(clamp(y,0,height-1));
      add(ix,iy);add((ix+1)%width,iy);
      add(ix,Math.min(iy+1,height-1));add((ix+1)%width,Math.min(iy+1,height-1));
    }
  }
  const tiles = new Map(await Promise.all(Array.from(needed,async ([id,pending])=>[id,await pending])));
  const read = (x,y)=>{
    const tile = tiles.get(key(x,y));
    return tile ? tile.values[(y%chunk)*tile.width+x%chunk] : -32768;
  };
  return {...base,read};
}

const stops = [[31,75,141],[34,157,177],[109,184,134],[212,197,131],[225,153,88],[251,238,211]];
function shade(value,lighting) {
  const colorIndex = clamp(value,0,1)*(stops.length-1);
  const index = Math.min(stops.length-2,Math.floor(colorIndex));
  const fraction = colorIndex-index;
  return 'rgb('+stops[index].map((c,i)=>Math.round((c+(stops[index+1][i]-c)*fraction)*lighting)).join(',')+')';
}

export function reliefModel(world,point,span,tile) {
  const n = sampleCount;
  const vertices = [];
  let min = Infinity, max = -Infinity;
  for (let row=0;row<n;row++) {
    for (let col=0;col<n;col++) {
      const x = col/(n-1)-.5, y = .5-row/(n-1);
      const location = offsetPoint(world,point,x*span,y*span);
      const z = elevation(tile,location);
      if (z!==null) {min=Math.min(min,z);max=Math.max(max,z);}
      vertices.push({x,y,z,...location});
    }
  }
  if (!Number.isFinite(min)) return null;
  const faces=[];
  for (let row=0;row<n-1;row++) {
    for (let col=0;col<n-1;col++) {
      const i = row*n+col;
      const corners = [i,i+1,i+n+1,i+n];
      const [a,b,c,d] = corners.map(k=>vertices[k]);
      if ([a,b,c,d].some(p=>p.z===null)) continue;
      const z = (a.z+b.z+c.z+d.z)/4;
      const slope = ((b.z+c.z)-(a.z+d.z)+.65*((d.z+c.z)-(a.z+b.z)))*(n-1)/(span*2000);
      faces.push({corners,x:(a.x+c.x)/2,y:(a.y+c.y)/2,z,color:shade((z-min)/Math.max(1,max-min),clamp(.90-slope*.8,.48,1))});
    }
  }
  return {n,vertices,faces,min,max,center:vertices[(vertices.length-1)/2]};
}

export function drawRelief(canvas,model,camera,cursor) {
  const w=canvas.width,h=canvas.height;
  const ctx=canvas.getContext('2d');
  const sin=Math.sin(camera.yaw),cos=Math.cos(camera.yaw);
  const pitchSin=Math.sin(camera.pitch),pitchCos=Math.cos(camera.pitch);
  const size=Math.min(w*.64,h*.91);
  const vertical=.26/Math.max(1,model.max-model.min);
  const project = v=>{
    const x=v.x*cos-v.y*sin, y=v.x*sin+v.y*cos;
    const z=(v.z-(model.min+model.max)/2)*vertical*camera.exaggeration;
    return {x:w/2+x*size,y:h*.53+(-y*pitchSin-z*pitchCos)*size,depth:y*pitchCos-z*pitchSin};
  };
  const projected=model.vertices.map(project);
  ctx.clearRect(0,0,w,h);
  const faces=model.faces.map(face=>({...face,depth:project(face).depth})).sort((a,b)=>b.depth-a.depth);
  for (const face of faces) {
    ctx.beginPath();
    for (let i=0;i<4;i++) {
      const p=projected[face.corners[i]];
      if(i===0) ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    }
    ctx.closePath();
    ctx.fillStyle=ctx.strokeStyle=face.color;
    ctx.lineWidth=.9;
    ctx.fill();ctx.stroke();
  }
  const mid=(model.n-1)/2*model.n;
  ctx.beginPath();
  for (let i=0;i<model.n;i++) {
    const {x,y}=projected[mid+i];
    if(i===0) ctx.moveTo(x,y-1);
    else ctx.lineTo(x,y-1);
  }
  ctx.setLineDash([3,4]);ctx.strokeStyle='#f0fbff';ctx.lineWidth=1.25;ctx.stroke();ctx.setLineDash([]);
  const p=projected[cursor];
  if(p) {
    ctx.beginPath();ctx.arc(p.x,p.y-1,4.5,0,2*Math.PI);
    ctx.fillStyle='#e2fda4';ctx.strokeStyle='#122130';ctx.lineWidth=2;ctx.fill();ctx.stroke();
  }
  return projected;
}

export function drawProfile(canvas,model,index) {
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  const mid=(model.n-1)/2*model.n;
  const rows=model.vertices.slice(mid,mid+model.n);
  const top=8,bottom=h-11;
  const scale=z=>bottom-(z-model.min)*(bottom-top)/Math.max(1,model.max-model.min);
  const xs=i=>9+i*(w-18)/(model.n-1);
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#334760';ctx.lineWidth=1;
  for (const y of [top,(top+bottom)/2,bottom]) {
    ctx.beginPath();ctx.moveTo(9,y+.5);ctx.lineTo(w-9,y+.5);ctx.stroke();
  }
  ctx.beginPath();
  rows.forEach((p,i)=>{
    if (p.z===null) return;
    if(i===0 || rows[i-1].z===null) ctx.moveTo(xs(i),scale(p.z));
    else ctx.lineTo(xs(i),scale(p.z));
  });
  ctx.strokeStyle='#91e3d6';ctx.lineWidth=2;ctx.stroke();
  if (rows[index]?.z!=null) {
    const x=xs(index), y=scale(rows[index].z);
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.strokeStyle='#aac477';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,3.5,0,2*Math.PI);ctx.fillStyle='#dbfc8e';ctx.fill();
  }
}
