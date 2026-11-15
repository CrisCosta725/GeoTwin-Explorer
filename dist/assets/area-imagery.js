import {kmPerDegree} from './areas.js';

const rad = Math.PI/180;
const lunarRadius = 1737400;
const wrap = lon => ((lon+180)%360+360)%360-180;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const earthService = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const moonService = 'https://trek.nasa.gov/tiles/Moon';
const trekTile = (layer,extension) => (level,row,col) =>
  moonService+'/'+layer+'/1.0.0/default/default028mm/'+level+'/'+row+'/'+col+'.'+extension;
const credits = {
  Earth:['Esri World Imagery · Esri, Vantor, Earthstar Geographics y comunidad SIG',earthService],
  Moon:['NASA Moon Trek · LRO/LROC', 'https://trek.nasa.gov/moon/'],
  Mars:['CTX · NASA/JPL/MSSS/Caltech Murray Lab/Esri','https://murray-lab.caltech.edu/CTX/beta01.html']
};
const moonLayer = {
  size:256, max:8, width:360, left:-180, top:90,
  url:trekTile('EQ/LRO_WAC_Mosaic_Global_303ppd_v02','jpg')
};
const lunarSouth = {
  size:256, max:12, width:4383720, left:-1095930, top:1095930, polar:true,
  url:trekTile('SP/LRO_NAC_Mosaic_1mpp_SP','png')
};
const lunarSouthWide = {
  ...lunarSouth, max:5,
  url:trekTile('SP/LRO_WAC_Mosaic_SPole60_100m_v02','png')
};
const marsLayer = {
  size:512, max:11, width:360, left:-180, top:90,
  url:(level,row,col) => 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/'+level+'/'+row+'/'+col
};

export function imageryView(world,point,span) {
  if (world==='Moon' && point.lat<=-84) {
    const rho = 2*lunarRadius*Math.tan((90+point.lat)*rad/2);
    const x = rho*Math.sin(point.lon*rad);
    const y = rho*Math.cos(point.lon*rad);
    const layer = span<=100 && Math.abs(x)+span*500<=136000 && Math.abs(y)+span*250<=136000 ? lunarSouth : lunarSouthWide;
    return {x,y,width:span*1000,height:span*500,layer};
  }
  const layer = world==='Moon' ? moonLayer : world==='Mars' ? marsLayer : null;
  const scale = span/kmPerDegree(world);
  return {
    x:point.lon, y:clamp(point.lat,-90+scale/4,90-scale/4), height:scale/2,
    width:Math.min(360,scale/Math.max(.025,Math.cos(point.lat*rad))),layer
  };
}

export function moveImagery(world,view,dx,dy) {
  const x = view.x-dx*view.width;
  const y = view.y+dy*view.height;
  if (view.layer?.polar) {
    return {lat:2*Math.atan(Math.hypot(x,y)/(2*lunarRadius))/rad-90,lon:Math.atan2(x,y)/rad};
  }
  return {lat:clamp(y,world==='Earth'?-89.99:-90,world==='Earth'?89.99:90),lon:wrap(x)};
}

function tileLayout(view,pixels,levelOffset) {
  const {x,y,width,height,layer} = view;
  const level = clamp(Math.ceil(Math.log2(layer.width*pixels/(2*layer.size*width)))+levelOffset,0,layer.max);
  const columns = 2**(level+1);
  const tile = layer.width/columns;
  const left = x-width/2;
  const top = y+height/2;
  const tiles = [];
  for (let row=Math.max(0,Math.floor((layer.top-top)/tile));row<columns/2 && layer.top-row*tile>top-height;row++) {
    for (let col=Math.floor((left-layer.left)/tile);layer.left+col*tile<left+width;col++) {
      if (layer.polar && (col<0 || col>=columns)) continue;
      const leftFraction = (layer.left+col*tile-left)/width;
      const topFraction = (top-layer.top+row*tile)/height;
      const wrapped = (col%columns+columns)%columns;
      tiles.push({url:layer.url(level,row,wrapped),left:leftFraction,top:topFraction,width:tile/width,height:tile/height});
    }
  }
  return tiles;
}

function earthLayout(view,pixels) {
  const {x,y,width,height} = view;
  const left=x-width/2, right=x+width/2;
  const bottom=y-height/2, top=y+height/2;
  const slices = [];
  for (let shift=-360;shift<=360;shift+=360) {
    const west=Math.max(left,-180+shift), east=Math.min(right,180+shift);
    if (west>=east) continue;
    const fraction=(east-west)/width;
    const size=Math.max(1,Math.round(pixels*fraction));
    const params = new URLSearchParams({
      bbox:[west-shift,bottom,east-shift,top].map(v=>v.toFixed(7)).join(','),
      bboxSR:'4326',imageSR:'4326',size:size+','+Math.round(pixels/2),format:'jpg',
      dpi:'96',adjustAspectRatio:'false',f:'image'
    });
    slices.push({url:earthService+'/export?'+params,left:(west-left)/width,top:0,width:fraction,height:1});
  }
  return slices;
}

function loadImage(url) {
  const image = new Image();
  image.alt = '';
  return new Promise(resolve=>{
    const finish = value=>{
      clearTimeout(timer);
      image.onload=null;
      image.onerror=null;
      resolve(value);
    };
    const timer=setTimeout(()=>finish(null),7000);
    image.onload=()=>image.decode().then(()=>finish(image),()=>finish(null));
    image.onerror=()=>finish(null);
    image.src=url;
  });
}

export async function loadImagery(world,view,pixels,levelOffset=0) {
  const tiles = view.layer ? tileLayout(view,pixels,levelOffset) : earthLayout(view,pixels);
  const images = await Promise.all(tiles.map(async tile=>{
    const image=await loadImage(tile.url);
    if (!image) return null;
    for (const key of ['left','top','width','height']) image.style[key]=(tile[key]*100)+'%';
    return image;
  }));
  if (!images.length || images.some(image=>!image)) return null;
  return images;
}

export function imageryCredit(world,view) {
  if (view.layer===lunarSouth) return ['NASA Moon Trek · LROC NAC, polo sur',credits.Moon[1]];
  if (view.layer===lunarSouthWide) return ['NASA Moon Trek · LROC WAC, polo sur',credits.Moon[1]];
  if (view.layer===moonLayer) return ['NASA Moon Trek · LROC WAC',credits.Moon[1]];
  return credits[world];
}
