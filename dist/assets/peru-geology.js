import './vendor/polygon-clipping.min.js';
import {footprintArea,catalogGeometry} from './result-map.js';
import {square,radii} from './study-metrics.js';
const {intersection,union}=globalThis.polygonClipping;
const radians=Math.PI/180;
export const peruRegions=[{id:'andahua',label:'Andahua–Orcopampa · 20 × 20 km',center:{lat:-15.42,lon:-72.33}},
  {id:'huambo',label:'Huambo · 20 × 20 km',center:{lat:-15.701667,lon:-72.0025}}];
let layer;
const bounds=shape=>shape.flat(2).reduce(([w,s,e,n],[x,y])=>[Math.min(w,x),Math.min(s,y),Math.max(e,x),Math.max(n,y)],[Infinity,Infinity,-Infinity,-Infinity]);
const intersects=(a,b)=>a[0]<=b[2] && a[2]>=b[0] && a[1]<=b[3] && a[3]>=b[1];
export function peruWindow(region) {return catalogGeometry(square('Earth',region.center,20));}
export function loadPeruGeology() {
  return layer ??=fetch(new URL('peru-geology.geojson.gz',import.meta.url)).then(async response=>{
    if (!response.ok) throw Error('No se pudo cargar la cartografía de INGEMMET.');
    const data=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    return {...data,features:data.features.map(f=>({...f,bounds:bounds(f.geometry.coordinates)}))};
  }).catch(error=>{layer=null;throw error;});
}

export function measurePeruGeology(geometry,center,data,{includeFeatures=false}={}) {
  const phi0=center.lat*radians,sin0=Math.sin(phi0),cos0=Math.cos(phi0);
  const project=([lon,lat])=>{
    const phi=lat*radians,lambda=(lon-center.lon)*radians,sin=Math.sin(phi),cos=Math.cos(phi);
    const k=radii.Earth*Math.sqrt(2/(1+sin0*sin+cos0*cos*Math.cos(lambda)));
    return [k*cos*Math.sin(lambda),k*(cos0*sin-sin0*cos*Math.cos(lambda))];
  };
  const areaOf=shape=>footprintArea(shape.map(poly=>poly.map(ring=>ring.map(project))));
  const area=areaOf(geometry),frame=bounds(geometry);
  const features=[];
  for (const f of data.features) {
    if (!intersects(frame,f.bounds??bounds(f.geometry.coordinates))) continue;
    const coordinates=intersection(geometry,f.geometry.coordinates);
    if (coordinates.length) features.push({type:'Feature',properties:f.properties,geometry:{type:'MultiPolygon',coordinates}});
  }
  if (!features.length) return {status:'outside',area,mapped:0,coverage:0,andaguaArea:0,andaguaShare:0,units:[],...(includeFeatures?{features:[]}: {})};
  const mapped=areaOf(union(...features.map(f=>f.geometry.coordinates)));
  const groups=new Map();
  for (const f of features) {
    const p=f.properties,key=JSON.stringify([p.NAME,p.UNIDAD,p.DESCRIP]);
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(f);
  }
  const units=[...groups.values()].map(list=>{
    const p=list[0].properties;
    return {code:p.NAME,name:p.UNIDAD,description:p.DESCRIP,sheets:[...new Set(list.map(f=>f.properties.HOJA))].sort(),
      objectIds:list.map(f=>f.properties.OBJECTID),area:areaOf(union(...list.map(f=>f.geometry.coordinates)))};
  }).sort((a,b)=>b.area-a.area);
  const andagua=features.filter(f=>f.properties.NAME==='Qp-an');
  const andaguaArea=andagua.length?areaOf(union(...andagua.map(f=>f.geometry.coordinates))):0;
  return {status:'covered',area,mapped:Math.min(area,mapped),coverage:Math.min(1,mapped/area),andaguaArea,
    andaguaShare:Math.min(1,andaguaArea/area),overlapArea:Math.max(0,units.reduce((sum,u)=>sum+u.area,0)-mapped),units,
    ...(includeFeatures?{features}: {})};
}

export async function casePeruGeology(features) {
  const data=await loadPeruGeology();
  return {source:data.metadata,scope:'Contexto litológico regional; no interviene en el orden por pendiente ni delimita conos.',
    windows:features.filter(f=>['andagua','huambo'].includes(f.properties.id)).map(f=>({id:f.properties.id,label:f.properties.label,
      ...measurePeruGeology(f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates],f.properties.center,data)}))};
}
