import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {useLocalAssets} from '../scripts/local-assets.mjs';
import {loadPeruGeology,measurePeruGeology,peruRegions,peruWindow} from '../dist/assets/peru-geology.js';
const restore=useLocalAssets();
test.after(restore);

test('official Peru polygons retain provenance and cover both study windows offline',async()=>{
  const layer=await loadPeruGeology();
  assert.equal(layer.metadata.scale,'1:100 000');
  assert.equal(layer.metadata.crs,'EPSG:4326');
  assert.equal(layer.features.length,layer.metadata.count);
  const original=layer.features.map(({bounds,...f})=>f);
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),layer.metadata.sha256Features);
  for (const region of peruRegions) {
    const m=measurePeruGeology(peruWindow(region),region.center,layer);
    assert.equal(m.status,'covered');
    assert.ok(m.coverage>.95 && m.coverage<=1,JSON.stringify({id:region.id,coverage:m.coverage}));
    assert.ok(m.units.length>3);
    assert.ok(m.units.every(u=>u.objectIds.length && u.sheets.length && u.description));
    assert.ok(m.andaguaArea>0 && m.andaguaArea<=m.mapped);
  }
  const outside={center:{lat:10,lon:10}};
  assert.equal(measurePeruGeology(peruWindow(outside),outside.center,layer).status,'outside');
});

test('polygon coverage respects holes and does not double count overlapping official geometries',()=>{
  const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
  const shape=[[ring(-.1,-.1,.1,.1),ring(-.02,-.02,.02,.02)]];
  const feature={type:'Feature',properties:{NAME:'Qp-an',UNIDAD:'Grupo Andagua',DESCRIP:'Lavas',HOJA:'test',OBJECTID:1},geometry:{type:'MultiPolygon',coordinates:shape}};
  const layer={features:[feature,{...feature,properties:{...feature.properties,OBJECTID:2}}]};
  const m=measurePeruGeology([[ring(-.1,-.1,.1,.1)]],{lat:0,lon:0},layer);
  assert.ok(Math.abs(m.coverage-.96)<.00001);
  assert.ok(Math.abs(m.andaguaShare-.96)<.00001);
  assert.ok(Math.abs(m.units[0].area-m.mapped)<.00001);
});
