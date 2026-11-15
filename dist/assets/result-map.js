import './vendor/polygon-clipping.min.js';
import {offsetPoint} from './relief.js';
import {localPoint,polygonArea,square} from './study-metrics.js';

const {intersection,union}=globalThis.polygonClipping;
const rectangle=(left,bottom,right,top)=>[[[left,bottom],[right,bottom],[right,top],[left,top],[left,bottom]]];
const close=ring=>[...ring,ring[0]];
const adjustLon=(lon,base)=>base+((lon-base+540)%360)-180;

export function sampledFootprint(center,step,cells,boundary) {
  const rectangles=cells.map(({col,row})=>{
    // Grid indices give adjacent cells the exact same edge.
    const left=(col-.5)*step;
    const bottom=(-row-.5)*step;
    return rectangle(left,bottom,(col+.5)*step,(-row+.5)*step);
  });
  if (!rectangles.length) return [];
  const origin=cells[0];
  const dx=origin.x-origin.col*step,dy=origin.y+origin.row*step;
  const merged=union(...rectangles).map(poly=>poly.map(ring=>ring.map(([x,y])=>[x+dx,y+dy])));
  return boundary ? intersection(merged,[close(boundary.map(point=>{
    const {x,y}=localPoint('Earth',center,point);
    return [x,y];
  }))]) : merged;
}

export function footprintArea(polygons) {
  return polygons.reduce((total,[outer,...holes])=>total+polygonArea(outer.map(([x,y])=>({x,y})))-
    holes.reduce((sum,ring)=>sum+polygonArea(ring.map(([x,y])=>({x,y}))),0),0);
}

export function geographicFootprint(center,polygons) {
  const unwrapped=polygons.map(poly=>poly.map(ring=>ring.map(([x,y])=>{
    const {lat,lon}=offsetPoint('Earth',center,x,y);
    return [adjustLon(lon,center.lon),lat];
  })));
  return [-360,0,360].flatMap(shift=>
    intersection(unwrapped,rectangle(-180+shift,-90,180+shift,90))
      .map(poly=>poly.map(ring=>ring.map(([lon,lat])=>[lon-shift,lat]))));
}

export function catalogGeometry(points) {
  const base=points[0].lon;
  const polygon=[close(points.map(({lat,lon})=>[adjustLon(lon,base),lat]))];
  return [-360,0,360].flatMap(shift=>intersection(polygon,rectangle(-180+shift,-90,180+shift,90))
    .map(poly=>poly.map(ring=>ring.map(([lon,lat])=>[lon-shift,lat]))));
}

export function sectorGeometry(row,analysis) {
  if (row.geometry) return row.geometry;
  const frame=catalogGeometry(square('Earth',row.center,row.span ?? 20));
  if (!analysis.boundary) return frame;
  return intersection(frame,catalogGeometry(analysis.boundary.points));
}

export function projectedPath(polygons, project) {
  return polygons.map(poly=>{
    const rings=poly.map(ring=>ring.map(([lon,lat])=>project({lon,lat})));
    if (!rings[0]?.length || rings[0].some(point=>!point)) return '';
    return rings.filter(ring=>ring.every(Boolean)).map(ring=>
      'M'+ring.map(({x,y})=>x.toFixed(2)+','+y.toFixed(2)).join('L')+'Z').join('');
  }).join('');
}

export function locator(point,span=45,width=330,height=170) {
  const scale=Math.min(width,height)*.8/span;
  return ({lat,lon})=>{
    const {x,y}=localPoint('Earth',point,{lat,lon});
    return {x:width/2+x*scale,y:height/2-y*scale};
  };
}
