import {writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import '../dist/assets/vendor/polygon-clipping.min.js';

const endpoint='https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_MAPAS_GEOLOGICOS/MapServer/11';
const windows=[{id:'andahua',bounds:[-72.55,-15.62,-72.11,-15.20]},
  {id:'huambo',bounds:[-72.23,-15.91,-71.78,-15.49]}];
const {intersection,union}=globalThis.polygonClipping;
const request=async params=>{
  const url=endpoint+'/query?'+new URLSearchParams(params);
  const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
  if (!response.ok) throw Error('INGEMMET HTTP '+response.status);
  const data=await response.json();
  if (data.error || data.exceededTransferLimit) throw Error(JSON.stringify(data.error??'Consulta incompleta'));
  return {data,url};
};
const features=new Map(),queries=[];
for (const window of windows) {
  const {data:ids,url}=await request({where:'1=1',geometry:window.bounds.join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',returnIdsOnly:'true',f:'json'});
  if (!ids.objectIds?.length) throw Error('Sin polígonos en '+window.id);
  queries.push({window:window.id,bounds:window.bounds,idsQuery:url,expected:ids.objectIds.length});
  const sorted=ids.objectIds.sort((a,b)=>a-b);
  for (let i=0;i<sorted.length;i+=80) {
    const batch=sorted.slice(i,i+80);
    const {data,url}=await request({objectIds:batch.join(','),outFields:'OBJECTID,CODI,NAME,UNIDAD,DESCRIP,HOJA',returnGeometry:'true',outSR:'4326',maxAllowableOffset:'0.00001',f:'geojson'});
    if (data.features.length!==batch.length) throw Error('Faltan entidades en la consulta.');
    queries.push({geometryQuery:url,returned:data.features.length});
    for (const f of data.features) features.set(f.properties.OBJECTID,f);
    console.log(window.id+': '+Math.min(i+80,sorted.length)+'/'+sorted.length);
  }
}
const rectangles=windows.map(({bounds:[w,s,e,n]})=>[[[w,s],[e,s],[e,n],[w,n],[w,s]]]);
const mask=union(...rectangles);
const clipped=[];
for (const feature of [...features.values()].sort((a,b)=>a.properties.OBJECTID-b.properties.OBJECTID)) {
  if (!['Polygon','MultiPolygon'].includes(feature.geometry?.type)) throw Error('Geometría inesperada.');
  const shape=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  const coordinates=intersection(shape,mask);
  if (!coordinates.length) continue;
  clipped.push({...feature,geometry:{type:'MultiPolygon',coordinates}});
}
const metadata={name:'INGEMMET · GEOCATMIN, Geología 100K empalmados',url:endpoint,scale:'1:100 000',crs:'EPSG:4326',
  retrievedAt:new Date().toISOString(),windows,queries,
  processing:'Consulta por identificadores completos; geometrías del servicio con maxAllowableOffset=0.00001 grados; recorte a dos ventanas, sin reclasificar códigos ni litologías.',
  limitation:'Mapa regional de unidades litológicas. No son contornos individuales de conos ni el mapa 1:50 000 de Mariño y Zavala (2010). La fecha de consulta no es la fecha de publicación de cada hoja.',
  count:clipped.length,sheets:[...new Set(clipped.map(f=>f.properties.HOJA))].sort()};
const data={type:'FeatureCollection',metadata,features:clipped};
const bytes=Buffer.from(JSON.stringify(data));
metadata.sha256Features=createHash('sha256').update(JSON.stringify(clipped)).digest('hex');
await writeFile(new URL('../dist/assets/peru-geology.geojson.gz',import.meta.url),gzipSync(JSON.stringify(data),{level:9}));
await writeFile(new URL('../dist/assets/peru-geology-provenance.json',import.meta.url),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({features:clipped.length,sheets:metadata.sheets,uncompressed:bytes.length,sha256Features:metadata.sha256Features}));
