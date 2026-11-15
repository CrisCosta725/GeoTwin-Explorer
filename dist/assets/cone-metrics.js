import {elevation,reliefSources,offsetPoint} from './relief.js';
import {inside,localPoint,polygonArea,polygonBounds,quantile,simplePolygon,studyRelief,surface} from './study-metrics.js';

const pointIn=(vertices,p)=>inside(vertices,p.x,p.y);
const equivalentDiameter=vertices=>Math.sqrt(4*polygonArea(vertices)/Math.PI);
const maxDiameter=vertices=>Math.max(...vertices.flatMap(a=>vertices.map(b=>Math.hypot(a.x-b.x,a.y-b.y))));

function plane(samples) {
  if (samples.length<3) return null;
  const m=Array.from({length:3},()=>[0,0,0,0]);
  for (const {x,y,z} of samples) {
    const v=[1,x,y];
    for (let i=0;i<3;i++) {for (let j=0;j<3;j++) m[i][j]+=v[i]*v[j];m[i][3]+=v[i]*z;}
  }
  for (let i=0;i<3;i++) {
    const pivot=m.map((row,j)=>j>=i?Math.abs(row[i]):-1).indexOf(Math.max(...m.map((row,j)=>j>=i?Math.abs(row[i]):-1)));
    [m[i],m[pivot]]=[m[pivot],m[i]];
    if (Math.abs(m[i][i])<1e-10) return null;
    const d=m[i][i];for (let k=i;k<4;k++) m[i][k]/=d;
    for (let j=0;j<3;j++) if (j!==i) {const f=m[j][i];for (let k=i;k<4;k++) m[j][k]-=f*m[i][k];}
  }
  const coefficients=m.map(row=>row[3]);
  const at=(x,y)=>coefficients[0]+coefficients[1]*x+coefficients[2]*y;
  return {coefficients,rms:Math.sqrt(samples.reduce((sum,p)=>sum+(p.z-at(p.x,p.y))**2,0)/samples.length),at};
}

function boundary(world,center,vertices,model,step) {
  const points=[];
  for (let i=0;i<vertices.length;i++) {
    const a=vertices[i],b=vertices[(i+1)%vertices.length];
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/step));
    for (let j=0;j<count;j++) {
      const x=a.x+(b.x-a.x)*j/count,y=a.y+(b.y-a.y)*j/count;
      points.push({x,y,z:elevation(model,offsetPoint(world,center,x,y))});
    }
  }
  const samples=points.filter(p=>Number.isFinite(p.z));
  return {coverage:samples.length/points.length,samples:samples.length,fit:plane(samples)};
}

export function validateCone(base,crater) {
  if (!base?.points?.length || !['Earth','Mars','Moon'].includes(base.world)) throw Error('Selecciona un contorno de base.');
  const frame=polygonBounds(base.world,base.points);
  if (!simplePolygon(frame.vertices) || frame.span>80 || frame.span<=0) throw Error('La base debe ser un polígono simple de hasta 80 km.');
  let rim=null;
  if (crater) {
    if (crater.world!==base.world || crater.id===base.id) throw Error('La base y el cráter deben ser contornos distintos del mismo mundo.');
    rim=crater.points.map(p=>localPoint(base.world,frame.center,p));
    if (!simplePolygon(rim) || !rim.every(p=>pointIn(frame.vertices,p))) throw Error('El cráter debe quedar completamente dentro de la base.');
    // Reject edges crossing a concave base even when every crater vertex is inside.
    const turn=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    for (let i=0;i<rim.length;i++) for (let j=0;j<frame.vertices.length;j++) {
      const a=rim[i],b=rim[(i+1)%rim.length],c=frame.vertices[j],d=frame.vertices[(j+1)%frame.vertices.length];
      const overlap=['x','y'].every(axis=>Math.max(Math.min(a[axis],b[axis]),Math.min(c[axis],d[axis]))<=Math.min(Math.max(a[axis],b[axis]),Math.max(c[axis],d[axis])));
      if (overlap && turn(a,b,c)*turn(a,b,d)<=0 && turn(c,d,a)*turn(c,d,b)<=0) throw Error('El cráter cruza el contorno de la base.');
    }
  }
  return {...frame,rim};
}

export async function measureCone(base,crater,{model,stepKm}={}) {
  const {center,vertices,span,rim}=validateCone(base,crater);
  model ??=await studyRelief(base.world,center,span*1.08);
  const step=Math.max(model.resolution/1000,span/160,stepKm??0);
  const divisions=Math.ceil(span*1.04/step)+2;
  const grid=await surface(base.world,center,divisions*step,divisions,model);
  const cells=grid.cells.filter(p=>pointIn(vertices,p));
  const valid=cells.filter(p=>Number.isFinite(p.z));
  const edge=boundary(base.world,center,vertices,model,step);
  const diameter=equivalentDiameter(vertices),coverage=cells.length?valid.length/cells.length:0;
  const resolved=diameter/step>=6 && valid.length>=9 && coverage>=.8 && edge.coverage>=.8 && Boolean(edge.fit);
  const height=resolved?Math.max(...valid.map(p=>p.z-edge.fit.at(p.x,p.y))):null;
  const flank=cells.filter(p=>Number.isFinite(p.slope) && (!rim || !pointIn(rim,p)));
  const slopes=flank.map(p=>p.slope);
  const warnings=[];
  if (!resolved) warnings.push('Base sin resolución o cobertura suficiente: se requieren 6 pasos a través del diámetro, 9 celdas y 80 % de cobertura interior y de borde.');
  if (resolved && height<=0) warnings.push('El contorno no presenta relieve positivo respecto al plano de base; revisar su interpretación como cono.');
  let craterMetrics=null;
  if (rim) {
    const rimDiameter=equivalentDiameter(rim);
    const interior=grid.cells.filter(p=>pointIn(rim,p));
    const bottom=interior.filter(p=>Number.isFinite(p.z));
    const lip=boundary(base.world,center,rim,model,step);
    const craterCoverage=interior.length?bottom.length/interior.length:0;
    const enough=rimDiameter/step>=6 && bottom.length>=9 && craterCoverage>=.8 && lip.coverage>=.8 && Boolean(lip.fit);
    const depth=enough?Math.max(...bottom.map(p=>lip.fit.at(p.x,p.y)-p.z)):null;
    craterMetrics={id:crater.id,label:crater.label,diameterKm:rimDiameter,depthM:depth!=null&&depth>0?depth:null,
      diameterRatio:rimDiameter/diameter,resolved:enough && depth>0,coverage:craterCoverage,rimCoverage:lip.coverage,
      plane:lip.fit?{coefficients:lip.fit.coefficients,rmsM:lip.fit.rms}:null,points:crater.points};
    if (!enough) warnings.push('El cráter es demasiado pequeño o tiene cobertura insuficiente para estimar profundidad con este DEM y paso.');
    else if (depth<=0) warnings.push('No se resuelve una depresión bajo el plano del borde del cráter.');
  }
  const slopeCoverage=cells.length?flank.length/cells.filter(p=>!rim || !pointIn(rim,p)).length:0;
  const slopeResolved=resolved && slopeCoverage>=.8 && slopes.length>=9;
  return {id:base.id,label:base.label,world:base.world,center,points:base.points,crater:craterMetrics,
    areaKm2:polygonArea(vertices),diameterKm:diameter,maxDiameterKm:maxDiameter(vertices),heightM:height!=null&&height>0?height:null,
    heightDiameter:height>0?height/(diameter*1000):null,slopeMedianDeg:slopeResolved?quantile(slopes,.5):null,
    slopeP90Deg:slopeResolved?quantile(slopes,.9):null,slopeCoverage:Number.isFinite(slopeCoverage)?slopeCoverage:0,
    resolutionM:model.resolution,stepM:step*1000,samples:valid.length,coverage,baseCoverage:edge.coverage,
    basePlane:edge.fit?{coefficients:edge.fit.coefficients,rmsM:edge.fit.rms}:null,resolved,warnings,source:reliefSources[model.source]};
}

export async function compareCones(objects) {
  const prepared=await Promise.all(objects.map(async ({base,crater})=>{
    const frame=validateCone(base,crater);
    return {base,crater,span:frame.span,model:await studyRelief(base.world,frame.center,frame.span*1.08)};
  }));
  const stepKm=Math.max(...prepared.map(p=>Math.max(p.model.resolution/1000,p.span/160)));
  const measurements=await Promise.all(prepared.map(p=>measureCone(p.base,p.crater,{model:p.model,stepKm})));
  return {method:'geotwin-cones-1',stepM:stepKm*1000,measurements,
    definitions:{diameter:'Diámetro del círculo de igual área al contorno de base; diámetro máximo entre vértices.',
      height:'Máxima elevación interior sobre un plano ajustado por mínimos cuadrados al borde de la base.',
      depth:'Máxima depresión interior respecto al plano ajustado al borde del cráter.',
      slope:'Mediana y P90 del gradiente del DEM en los flancos, excluyendo el cráter delimitado.',
      planes:'z = a + b·x + c·y; x e y locales en km, z en m. RMS del ajuste de borde no es un error del DEM.'},
    limits:['Contornos interpretados por el usuario; revisar imágenes y geología antes de identificar la forma como cono.',
      'Los diámetros proceden de los contornos; altura, profundidad y pendiente dependen del DEM y del paso común.',
      'Interpolar el DEM no aumenta su resolución. Se exigen 6 pasos por diámetro, 9 celdas y cobertura de 80 % como control de demostración, sin validación instrumental.',
      'La similitud geométrica no prueba composición, edad ni mecanismo de formación equivalentes. La Tierra no reproduce gravedad, atmósfera o radiación planetarias.']};
}
