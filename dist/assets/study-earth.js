import {offsetPoint} from './relief.js';

const rad=Math.PI/180;
const zoom=11;
const tileSize=256;
const tileCount=2**zoom;
const edge=tileCount*tileSize;
const tiles=new Map();
const wrap = x=>((x%edge)+edge)%edge;

function pixel({lat,lon}) {
  return [wrap((lon+180)/360*edge),(1-Math.asinh(Math.tan(lat*rad))/Math.PI)*edge/2];
}

function fetchTile(x,y) {
  const key=x+'/'+y;
  if (!tiles.has(key)) {
    const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+zoom+'/'+key+'.png';
    const pending=(async()=>{
      const response=await fetch(url,{signal:AbortSignal.timeout(7000)});
      if (!response.ok) throw Error('Tesela de elevación no disponible');
      const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none'});
      try {
        if (bitmap.width!==tileSize || bitmap.height!==tileSize) throw Error('Tamaño de tesela inesperado');
        const canvas=document.createElement('canvas');
        canvas.width=canvas.height=tileSize;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        context.drawImage(bitmap,0,0);
        return context.getImageData(0,0,tileSize,tileSize).data;
      } finally {
        bitmap.close();
      }
    })();
    tiles.set(key,pending);
    if (tiles.size>96) tiles.delete(tiles.keys().next().value);
    pending.catch(()=>{if (tiles.get(key)===pending) tiles.delete(key)});
  }
  return tiles.get(key);
}

export async function loadTerrarium(center,span) {
  if (Math.abs(center.lat)>83) throw Error('Área fuera de cobertura Mercator');
  const coverage=[-.5,-.25,0,.25,.5].flatMap(x=>[-.5,-.25,0,.25,.5].map(y=>pixel(offsetPoint('Earth',center,x*span,y*span))));
  const [origin]=pixel(center);
  const columns=coverage.map(([x])=>origin+((x-origin+edge*1.5)%edge)-edge/2);
  const rows=coverage.map(([,y])=>y);
  const bounds=[Math.min(...columns)-1,Math.min(...rows)-1,Math.max(...columns)+1,Math.max(...rows)+1].map(value=>Math.floor(value/tileSize));
  const needed=[];
  for (let y=bounds[1];y<=bounds[3];y++) {
    for (let x=bounds[0];x<=bounds[2];x++) {
      const column=((x%tileCount)+tileCount)%tileCount;
      needed.push([column+'/'+y,fetchTile(column,y)]);
    }
  }
  const data=new Map(await Promise.all(needed.map(async ([key,pending])=>[key,await pending])));
  const read=(x,y)=>{
    x=wrap(x);
    const tile=data.get(Math.floor(x/tileSize)+'/'+Math.floor(y/tileSize));
    if (!tile) return null;
    const i=4*((y%tileSize)*tileSize+x%tileSize);
    return tile[i+3] ? tile[i]*256+tile[i+1]+tile[i+2]/256-32768 : null;
  };
  const sample=point=>{
    const [x,y]=pixel(point);
    const i=Math.floor(x-.5), j=Math.floor(y-.5);
    const [a,b,c,d]=[read(i,j),read(i+1,j),read(i,j+1),read(i+1,j+1)];
    if ([a,b,c,d].includes(null)) return null;
    const f=x-.5-i,g=y-.5-j;
    return (a+(b-a)*f)*(1-g)+(c+(d-c)*f)*g;
  };
  return {sample,resolution:Math.round(2*Math.PI*6378137*Math.cos(center.lat*rad)/edge),source:'terrarium'};
}
