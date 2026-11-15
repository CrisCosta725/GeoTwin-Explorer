import test from 'node:test';
import assert from 'node:assert/strict';
import {analogs,profiles} from '../dist/assets/analogs.js';
import {baseAssessments} from '../dist/assets/base-assessment.js';
import {hasCoordinates} from '../dist/assets/coordinates.js';
import {documentedArea} from '../dist/assets/areas.js';
import {catalogEvidence} from '../dist/assets/evidence-quality.js';
import {terrainMetrics} from '../dist/assets/terrain-comparison.js';
import {ranking} from '../dist/assets/model.js';
import {bootGeoTwin} from './support/dom.mjs';

const names=['Isabella–Chotén','Sucre','Pampas de La Joya','Coropuna','Andahua–Orcopampa','Huambo–Cerro Keyocc','Cumbemayo','Nasca–Palpa','Atacama','McMurdo','Haughton','Cinder Lake','Lava Beds','Kīlauea','Lanzarote','Vikursundar–Askja','Cráter Ries','Meteor Crater','Pilot Valley','Utqiaġvik–Barrow'];
const isabella=analogs.find(site=>site.id==='isabella-choten');
const sucre=analogs.find(site=>site.id==='sucre');

test('catalog has the requested 20 zones and keeps proposed impact origins separate from coordinates',async()=>{
  assert.deepEqual(analogs.map(site=>site.name),names);
  assert.deepEqual(analogs.map(site=>site.catalogNumber),Array.from({length:20},(_,i)=>i+1));
  assert.equal(new Set(analogs.map(site=>site.id)).size,20);
  assert.equal(analogs.filter(site=>site.country==='Perú').length,8);
  assert.ok(analogs.every(site=>site.application && site.country && site.locationNote));
  assert.equal(analogs.filter(hasCoordinates).length,20);
  assert.ok(Math.abs(isabella.lat-(-7.267416666666667))<1e-12);
  assert.ok(Math.abs(isabella.lon-(-78.454975))<1e-12);
  assert.equal(isabella.elevationM,3664);assert.equal(isabella.locationStatus,'provided');
  assert.equal(isabella.originStatus,'unverified');
  assert.equal(catalogEvidence(isabella,'brechas').level,'pending');
  const proposed=ranking({body:'Moon',profile:'impact'}).find(site=>site.id===isabella.id);
  assert.equal(proposed.score,null);assert.equal(proposed.coverage,0);
  assert.ok(Math.abs(sucre.lat-(-6.955163888888889))<1e-12);
  assert.ok(Math.abs(sucre.lon-(-78.14481111111112))<1e-12);
  assert.equal(sucre.elevationM,3189);assert.equal(sucre.locationStatus,'provided');
  assert.equal(sucre.originStatus,'unverified');
  assert.equal(catalogEvidence(sucre,'brechas').level,'pending');
  const unlocated={...sucre,lat:null,lon:null};
  assert.equal(hasCoordinates(unlocated),false);
  assert.equal(documentedArea('Earth',{lat:0,lon:0},[unlocated]),null);
  await assert.rejects(terrainMetrics('Earth',unlocated),/sin coordenadas/);
  for (const profile of Object.values(profiles).flat()) for (const id of profile.earth??[]) assert.ok(analogs.some(site=>site.id===id),'Unknown curated site: '+id);
  for (const assessment of Object.values(baseAssessments)) for (const id of Object.keys(assessment.pairs)) assert.ok(analogs.some(site=>site.id===id),'Unknown assessment site: '+id);
});

test('atlas lists 20 applications, maps only located zones and preserves the provided Isabella point',async()=>{
  const requests=[];
  let app=await bootGeoTwin({assetResponse:url=>{requests.push(url.pathname);}});
  try {
    assert.equal(app.document.querySelector('#inicio .workspace-actions'),null);
    const buttons=[...app.el('atlas-sites').querySelectorAll('[data-atlas-site]')];
    assert.equal(buttons.length,20);
    assert.deepEqual(buttons.map(button=>button.dataset.atlasSite),analogs.map(site=>site.id));
    for (const [i,site] of analogs.entries()) assert.ok(buttons[i].textContent.includes(site.application));
    const markers=app.document.querySelectorAll('[data-markers="Earth"] [data-marker]');
    assert.equal(markers.length,20);
    assert.ok(app.document.querySelector('[data-markers="Earth"] [data-marker="sucre"]'));
    assert.equal(app.el('atlas-count').textContent,'20 sitios');
    assert.equal(app.el('area-details').hidden,true);
    await app.settle();assert.equal(requests.some(path=>path.includes('/relief-data/')),false);
    assert.equal(app.document.querySelector('#isabelita'),null);
    assert.equal(app.document.querySelector('a[href="#isabelita"]'),null);
    app.change('area-list','sucre');
    assert.match(app.el('focus-site').textContent,/Sucre/);
    assert.match(app.el('focus-site').textContent,/3189 m/);
    app.click('project-export');const savedSucre=JSON.parse(await app.downloads.at(-1).text()).state.values.areaState.Earth;
    assert.equal(savedSucre.point.lat,sucre.lat);assert.equal(savedSucre.point.lon,sucre.lon);assert.equal(savedSucre.unverified,true);

    app.change('area-list','isabella-choten');
    assert.match(app.el('focus-site').textContent,/Isabella–Chotén/);
    assert.match(app.el('focus-site').textContent,/3664 m/);
    assert.match(app.el('focus-site').textContent,/Origen geológico por verificar/);
    app.click('project-export');const text=await app.downloads.at(-1).text();
    const saved=JSON.parse(text).state.values.areaState.Earth;
    assert.equal(saved.id,isabella.id);assert.equal(saved.unverified,true);
    assert.equal(saved.point.lat,isabella.lat);assert.equal(saved.point.lon,isabella.lon);
    assert.equal(saved.point.elevationM,3664);
    await app.close();app=await bootGeoTwin();app.file('project-import',text);
    await app.waitFor(()=>app.el('study-save-status').textContent.startsWith('Proyecto abierto'),'Isabella project import');
    assert.match(app.el('focus-site').textContent,/Isabella–Chotén/);
    app.click('project-export');const restored=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(restored.state.values.areaState.Earth.unverified,true);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('old project locations remain visible as saved points without returning retired sites to the catalog',async()=>{
  const app=await bootGeoTwin();
  try {
    app.click('project-export');const file=JSON.parse(await app.downloads.at(-1).text());
    file.state.values.atlasWorld='Earth';file.state.values.atlasView='surface';
    file.state.values.areaState.Earth={point:{id:'university',name:'University Valley',lat:-77.86563,lon:160.72627},id:'university'};
    file.state.values.compared=['university'];file.state.values.selected='university';
    app.file('project-import',JSON.stringify(file));
    await app.waitFor(()=>app.el('study-save-status').textContent.startsWith('Proyecto abierto'),'legacy location import');
    assert.match(app.el('focus-site').textContent,/University Valley · proyecto anterior/);
    assert.equal(app.document.querySelector('[data-atlas-site="university"]'),null);
    assert.equal(app.el('compare-count').textContent,'0');
    app.click('project-export');const saved=JSON.parse(await app.downloads.at(-1).text()).state.values.areaState.Earth;
    assert.equal(saved.id,null);assert.equal('id' in saved.point,false);assert.equal(saved.unverified,true);
    assert.equal(saved.point.lat,-77.86563);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
