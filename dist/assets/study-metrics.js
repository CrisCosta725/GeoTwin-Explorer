import {loadTerrarium} from './study-earth.js';
import {elevation,loadRelief,offsetPoint,reliefSources} from './relief.js';

export const studyWidth = 20;
export const studyStep = 2;
export const radii = {Earth:6371,Moon:1737.4,Mars:3389.5};
const rad = Math.PI/180;

export function localPoint(world,center,point) {
  const a = center.lat*rad;
  const b = point.lat*rad;
  const delta = (point.lon-center.lon)*rad;
  const east = Math.sin(delta)*Math.cos(b);
  const north = Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(delta);
  const distance = Math.atan2(Math.hypot(east,north),Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(delta))*radii[world];
  const bearing = Math.atan2(east,north);
  return {x:distance*Math.sin(bearing),y:distance*Math.cos(bearing)};
}

export function square(world,center,span) {
  const half = span/2;
  return [[-half,-half],[half,-half],[half,half],[-half,half]].map(([x,y])=>offsetPoint(world,center,x,y));
}

export function inside(vertices,x,y) {
  return vertices.reduce((inShape,b,i)=>{
    const a = vertices[(i+vertices.length-1)%vertices.length];
    const crossed = (a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x;
    return crossed ? !inShape : inShape;
  },false);
}

export function polygonArea(vertices) {
  return Math.abs(vertices.reduce((sum,a,i)=>{
    const b = vertices[(i+1)%vertices.length];
    return sum+a.x*b.y-b.x*a.y;
  },0))/2;
}

export function simplePolygon(vertices) {
  const n = vertices.length;
  if (n<3 || polygonArea(vertices)<.000001) return false;
  const turn = (a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for (let i=0;i<n;i++) {
    const a=vertices[i], b=vertices[(i+1)%n];
    if (Math.hypot(b.x-a.x,b.y-a.y)<.0001) return false;
    for (let j=i+2;j<n;j++) {
      if ((j+1)%n===i) continue;
      const c=vertices[j], d=vertices[(j+1)%n];
      const overlap = ['x','y'].every(axis=>Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]))<=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis])));
      if (overlap && turn(a,b,c)*turn(a,b,d)<=0 && turn(c,d,a)*turn(c,d,b)<=0) return false;
    }
  }
  return true;
}

export function polygonBounds(world,points) {
  const origin=points[0];
  const local=points.map(point=>localPoint(world,origin,point));
  const east=local.map(p=>p.x), north=local.map(p=>p.y);
  const left=Math.min(...east), right=Math.max(...east);
  const bottom=Math.min(...north), top=Math.max(...north);
  const center=offsetPoint(world,origin,(left+right)/2,(bottom+top)/2);
  const vertices=points.map(point=>localPoint(world,center,point));
  const span=2*Math.max(...vertices.map(p=>Math.max(Math.abs(p.x),Math.abs(p.y))));
  return {center,vertices,span};
}

export function quantile(values,fraction) {
  const sorted = [...values].sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const i = (sorted.length-1)*fraction;
  const lo = Math.floor(i);
  return sorted[lo]+(sorted[Math.ceil(i)]-sorted[lo])*(i-lo);
}

export async function studyRelief(world,center,span) {
  const tile=await loadRelief(world,center,span);
  return world==='Earth' && tile.source==='etopo' && span<=65 ? loadTerrarium(center,span).catch(()=>tile) : tile;
}

export async function surface(world,center,span,divisions,tile) {
  const model = tile ?? await studyRelief(world,center,span);
  const step = span/divisions;
  const cells = [];
  const height = (x,y)=>elevation(model,offsetPoint(world,center,x,y));
  for (let row=0;row<divisions;row++) {
    for (let col=0;col<divisions;col++) {
      const x = (col+.5)*step-span/2;
      const y = span/2-(row+.5)*step;
      const z = height(x,y);
      const ends = [height(x-step/2,y),height(x+step/2,y),height(x,y-step/2),height(x,y+step/2)];
      const slope = z===null || ends.includes(null) || step*1000<model.resolution
        ? null : Math.atan(Math.hypot(ends[1]-ends[0],ends[3]-ends[2])/(step*1000))/rad;
      cells.push({row,col,x,y,z,slope});
    }
  }
  return {model,cells,span,step,divisions,source:reliefSources[model.source]};
}

export function terrainIndicators(cells,step,minimum=1) {
  const slopes=cells.map(cell=>cell.slope).filter(Number.isFinite);
  const heights=new Map();
  for (const {row,col,z} of cells) {
    if (Number.isFinite(z)) heights.set(row+':'+col,z);
  }
  const roughness=[];
  if (step>0) {
    for (const {row,col} of cells) {
      const neighborhood=[];
      for (let dy=-1;dy<=1;dy++) {
        for (let dx=-1;dx<=1;dx++) {
          const elevation=heights.get((row+dy)+':'+(col+dx));
          if (elevation!=null) neighborhood.push(elevation);
        }
      }
      if (neighborhood.length!==9) continue;
      const mean=neighborhood.reduce((a,b)=>a+b,0)/9;
      roughness.push(Math.sqrt(neighborhood.reduce((sum,z)=>sum+(z-mean)**2,0)/9));
    }
  }
  return {
    slopeP90:slopes.length>=minimum?quantile(slopes,.9):null,
    roughness:roughness.length>=minimum?quantile(roughness,.5):null,
    roughnessCoverage:cells.length?roughness.length/cells.length:0
  };
}

export function stats(grid,vertices,limit) {
  const cells = vertices ? grid.cells.filter(cell=>inside(vertices,cell.x,cell.y)) : grid.cells;
  const heights = cells.map(cell=>cell.z).filter(z=>z!==null);
  const slopes = cells.map(cell=>cell.slope).filter(slope=>slope!==null);
  return {
    area:vertices ? polygonArea(vertices) : grid.span**2,
    samples:cells.length,
    ...terrainIndicators(cells,grid.step*1000>=grid.model.resolution?grid.step:0,4),
    elevationCoverage:cells.length ? heights.length/cells.length : 0,
    slopeCoverage:cells.length ? slopes.length/cells.length : 0,
    slope:slopes.length ? quantile(slopes,.5) : null,
    pass:slopes.length ? slopes.filter(slope=>slope<=limit).length/slopes.length : null,
    relief:heights.length>1 ? quantile(heights,.9)-quantile(heights,.1) : null,
    min:heights.length ? Math.min(...heights) : null,
    max:heights.length ? Math.max(...heights) : null
  };
}

export function eastProfile(world,center,grid,span=studyWidth) {
  const points = Array.from({length:span/studyStep+1},(_,i)=>elevation(grid.model,offsetPoint(world,center,i*studyStep-span/2,0)));
  return points.map(value=>value===null || points[0]===null ? null : value-points[0]);
}

export function largestSlopePatch(grid,vertices,limit) {
  const cells=grid.cells.filter(cell=>inside(vertices,cell.x,cell.y) && cell.slope!==null);
  if (!cells.length) return null;
  const width=grid.divisions;
  const remaining=new Set(cells.filter(cell=>cell.slope<=limit).map(({row,col})=>row*width+col));
  let largest=0;
  while (remaining.size) {
    const first=remaining.values().next().value;
    const queue=[first];
    remaining.delete(first);
    for (let i=0;i<queue.length;i++) {
      const cell=queue[i], column=cell%width;
      const neighbors=[cell-width,cell+width];
      if (column>0) neighbors.push(cell-1);
      if (column<width-1) neighbors.push(cell+1);
      for (const neighbor of neighbors) if (remaining.delete(neighbor)) queue.push(neighbor);
    }
    largest=Math.max(largest,queue.length);
  }
  return largest*grid.step**2;
}

export async function comparePolygons(areas, limit) {
  const models=await Promise.all(areas.map(area=>studyRelief(area.world,area.center,area.span)));
  const step=Math.max(.02,...models.map(model=>model.resolution/1000),...areas.map(area=>area.span/80));
  return Promise.all(areas.map(async (area,i)=>{
    const divisions=Math.max(1,Math.floor(area.span/step));
    const grid=await surface(area.world,area.center,divisions*step,divisions,models[i]);
    const vertices=area.points.map(point=>localPoint(area.world,area.center,point));
    const result=stats(grid,vertices,limit);
    if (result.samples<4 || area.span<step*2) {
      result.slope=null;
      result.slopeP90=null;
      result.roughness=null;
      result.pass=null;
      result.relief=null;
    }
    result.patch=result.pass==null ? null : largestSlopePatch(grid,vertices,limit);
    return {area,grid,result};
  }));
}

export function transectLength(area) {
  if (area.line?.length!==2) return null;
  const [start,end]=area.line;
  const {x,y}=localPoint(area.world,start,end);
  return Math.hypot(x,y);
}

export function transectProfile(area,model,distance,segments) {
  const [start,end]=area.line;
  const {x,y}=localPoint(area.world,start,end);
  const length=Math.hypot(x,y);
  const base=elevation(model,start);
  return Array.from({length:segments+1},(_,index)=>{
    const fraction=distance/length*index/segments;
    const height=elevation(model,offsetPoint(area.world,start,x*fraction,y*fraction));
    return height===null || base===null ? null : height-base;
  });
}
