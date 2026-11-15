import './vendor/polygon-clipping.min.js';
import {footprintArea} from './result-map.js';
import {radii} from './study-metrics.js';

const {intersection}=globalThis.polygonClipping;
const radians=Math.PI/180;
const extent=[-156.15,18.87,-154.78,20.33];
const dataSource={
  name:'USGS · Unidades geológicas de Hawaiʻi (OFR 2007-1089)',
  url:'https://geodata.hawaii.gov/arcgis/rest/services/Terrestrial/MapServer/28',
  publication:'https://doi.org/10.3133/ofr20071089',
  scale:'1:250 000',
  year:2007
};

const criteria={
  'marius-basalt':{
    mask:'marius-basalt',trait:'cueva',center:{lat:19.54,lon:-155.55},label:'Coladas basálticas cartografiadas',
    matches:unit=>unit.rock==='Lava flows' && /\bbasalt\b/i.test(unit.composition),
    limit:'Las coladas describen el sustrato volcánico. La presencia y geometría de tubos requieren datos de cavidades.'
  },
  'ulysses-scoria':{
    mask:'ulysses-scoria',trait:'volcánico',center:{lat:19.86,lon:-155.49},label:'Conos de escoria cartografiados',
    matches:unit=>/\b(?:scoria cones?|cinder cones?)\b/i.test(unit.rock),
    limit:'La comparación se refiere a la forma volcánica. Los materiales de Ulysses Colles se interpretan a partir de imágenes orbitales.'
  }
};

export function geologyCase(target,trait) {
  const criterion=criteria[target.geologyCase];
  return criterion?.trait===trait ? criterion : null;
}

export function intersectsBounds(a,b) {
  return a[0]<=b[2] && a[2]>=b[0] && a[1]<=b[3] && a[3]>=b[1];
}

export function geologyMetadata(criterion) {
  return {...dataSource,label:criterion.label,limit:criterion.limit};
}

let layer;
export function loadGeology() {
  return layer ??= fetch(new URL('hawaii-geology.json.gz',import.meta.url)).then(async response=>{
    if (!response.ok) throw Error('Cartografía geológica no disponible');
    const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    return {...data,units:data.units.map(([code,name,rock,composition,,bounds,rings])=>({code,name,rock,composition,bounds,rings}))};
  }).catch(error=>{
    layer=null;
    throw error;
  });
}

function bounds(polygon) {
  const [outer]=polygon;
  return outer.reduce(([w,s,e,n],[x,y])=>[Math.min(w,x),Math.min(s,y),Math.max(e,x),Math.max(n,y)],
    [Infinity,Infinity,-Infinity,-Infinity]);
}

export function measureGeology(geometry,center,criterion,data) {
  if (!geometry.some(poly=>intersectsBounds(bounds(poly),extent))) return {status:'outside'};
  if (!data) return {status:'unavailable'};
  // Lambert azimuthal equal-area, locally centered on the sector, in km.
  const phi0=center.lat*radians;
  const sin0=Math.sin(phi0),cos0=Math.cos(phi0);
  const project=([lon,lat])=>{
    const phi=lat*radians,lambda=(lon-center.lon)*radians;
    const sin=Math.sin(phi),cos=Math.cos(phi);
    const k=radii.Earth*Math.sqrt(2/(1+sin0*sin+cos0*cos*Math.cos(lambda)));
    return [k*cos*Math.sin(lambda),k*(cos0*sin-sin0*cos*Math.cos(lambda))];
  };
  const measure=polygons=>footprintArea(polygons.map(poly=>poly.map(ring=>ring.map(project))));
  const area=measure(geometry);
  if (area<=0) return {status:'outside'};
  let mapped=0,matched=0;
  const byUnit=new Map();
  for (const poly of geometry) {
    const frame=bounds(poly);
    const clip=(box,rings)=>intersectsBounds(frame,box) ? measure(intersection([poly],[rings])) : 0;
    // The downloadable masks are dissolved and split into disjoint tiles at build time.
    for (const [box,rings] of data.masks.mapped) mapped+=clip(box,rings);
    for (const [box,rings] of data.masks[criterion.mask]) matched+=clip(box,rings);
    for (const unit of data.units) {
      const area=clip(unit.bounds,unit.rings);
      if (area<=0.000001) continue;
      const {code,name,rock,composition}=unit;
      const id=JSON.stringify([code,name,rock,composition]);
      if (!byUnit.has(id)) byUnit.set(id,{code,name,rock,composition,match:criterion.matches(unit),area:0});
      byUnit.get(id).area+=area;
    }
  }
  mapped=Math.min(area,mapped);
  if (mapped<=0.000001) return {status:'outside'};
  matched=Math.min(mapped,matched);
  const mapUnits=[...byUnit.values()].sort((a,b)=>b.area-a.area);
  return {status:'covered',area,mapped,matched,coverage:mapped/area,share:matched/area,units:mapUnits};
}
