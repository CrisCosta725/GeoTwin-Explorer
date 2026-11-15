import test from 'node:test';
import assert from 'node:assert/strict';
import {bootGeoTwin} from './support/dom.mjs';
import {analogs} from '../dist/assets/analogs.js';
import {planetaryAreas} from '../dist/assets/areas.js';
import {hasCoordinates} from '../dist/assets/coordinates.js';

const key=(app,target,value)=>target.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));

test('atlas starts in the joint three-world view with Earth as the comparison center',async()=>{
  const requests=[];
  const app=await bootGeoTwin({assetResponse:url=>{requests.push(url.pathname);}});
  try {
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('planet-overview').hidden,false);
    assert.equal(app.el('surface-view').hidden,true);
    assert.equal(app.document.querySelectorAll('[data-globe]').length,3);
    assert.equal(app.document.querySelectorAll('[data-overview-world]').length,3);
    assert.deepEqual([...app.document.querySelectorAll('[data-overview-texture]')].map(canvas=>canvas.dataset.overviewTexture).sort(),['Earth','Mars','Moon']);
    assert.equal([...app.document.querySelectorAll('.planet-card')].filter(card=>!card.hidden).length,0);
    assert.equal(app.el('map').querySelector('#solar-canvas'),null);
    assert.equal(app.el('area-empty').hidden,false);assert.equal(app.el('area-details').hidden,true);
    assert.equal(app.el('study-map').dataset.mapState,'empty');
    await app.settle();assert.equal(requests.some(p=>p.includes('/relief-data/')),false);
    app.click('project-export');const saved=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(saved.state.values.selected,null);assert.equal(saved.state.editor,null);
    assert.equal('solarSystem' in saved.state.values,false);
    assert.equal(saved.state.values.atlasView,'overview');
    assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('world selector inspects each planet inside the joint view and reset keeps it there',async()=>{
  const app=await bootGeoTwin();
  try {
    app.document.querySelector('[data-world="Moon"]').click();
    assert.equal(app.el('map').dataset.world,'Moon');
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.document.querySelector('[data-world="Moon"]').getAttribute('aria-pressed'),'true');
    assert.equal([...app.document.querySelectorAll('.planet-card')].filter(card=>!card.hidden).length,0);
    assert.equal(app.el('map').dataset.focusedWorld,'Moon');
    assert.equal(app.el('surface-view').hidden,true);
    app.click('atlas-overview-view');
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('planet-overview').hidden,false);
    const scene=app.el('planet-overview'),url=app.window.location.href;
    app.document.querySelector('[data-overview-world="Mars"]').click();
    assert.equal(app.el('map').dataset.world,'Mars');
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('planet-overview'),scene);
    assert.equal(app.el('surface-view').hidden,true);
    assert.equal(app.el('map').dataset.focusedWorld,'Mars');
    assert.equal(app.window.location.href,url);
    assert.equal(app.el('area-details').hidden,false);
    assert.ok(app.document.querySelector('[data-overview-location="selection-Mars"]'));
    app.document.querySelector('[data-world="Mars"]').click();
    app.click('reset-all-globes');
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('map').dataset.world,'Mars');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('overview globes support keyboard rotation, shared zoom controls and per-world reset',async()=>{
  const app=await bootGeoTwin();
  try {
    const earth=app.document.querySelector('[data-overview-world="Earth"]');
    earth.dispatchEvent(new app.window.FocusEvent('focus'));
    key(app,earth,'ArrowRight');
    app.click('zoom-in');
    assert.equal(app.el('active-globe-label').textContent,'Tierra');
    assert.equal(app.document.querySelector('[data-overview-card="Earth"]').dataset.active,'true');

    const mars=app.document.querySelector('[data-overview-world="Mars"]');
    mars.dispatchEvent(new app.window.FocusEvent('focus'));
    key(app,mars,'ArrowUp');
    key(app,mars,'+');
    assert.equal(app.el('active-globe-label').textContent,'Marte');
    assert.equal(app.el('map').dataset.mode,'overview');
    app.click('project-export');
    const saved=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(saved.state.values.atlasCameras.Earth.lon,-51);
    assert.equal(saved.state.values.atlasCameras.Earth.lat,11);
    assert.ok(Math.abs(saved.state.values.atlasCameras.Earth.zoom-1.22)<1e-10);
    assert.equal(saved.state.values.atlasCameras.Mars.lon,53);
    assert.equal(saved.state.values.atlasCameras.Mars.lat,27);
    assert.ok(Math.abs(saved.state.values.atlasCameras.Mars.zoom-1.2)<1e-10);

    app.click('reset-map');
    app.click('project-export');
    const reset=JSON.parse(await app.downloads.at(-1).text());
    assert.deepEqual(reset.state.values.atlasCameras.Mars,{lon:53,lat:15,zoom:1});

    key(app,earth,'ArrowLeft');
    app.click('reset-all-globes');
    app.click('project-export');
    const resetAll=JSON.parse(await app.downloads.at(-1).text());
    assert.deepEqual(resetAll.state.values.atlasCameras.Earth,{lon:-63,lat:11,zoom:1});
    assert.deepEqual(resetAll.state.values.atlasCameras.Moon,{lon:8,lat:-46,zoom:1});
    assert.deepEqual(resetAll.state.values.atlasCameras.Mars,{lon:53,lat:15,zoom:1});
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('inspecting a planet keeps the same three spheres and canvas objects in the joint scene',async()=>{
  const app=await bootGeoTwin();
  try {
    const planet=app.document.querySelector('.world-switch [data-world="Moon"]');
    const orb=app.document.querySelector('[data-overview-world="Moon"]');
    orb.getBoundingClientRect=()=>({width:120,height:120,left:0,top:0});
    app.document.querySelector('.planet-network').getBoundingClientRect=()=>({width:900,height:420,left:0,top:0});
    const canvases=[...app.document.querySelectorAll('[data-overview-texture]')];
    orb.animate=()=>{throw Error('Inspection must stay in the scene instead of opening another surface.');};

    planet.click();
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('active-globe-label').textContent,'Luna');
    assert.equal(app.el('map').dataset.world,'Moon');
    assert.equal(app.el('map').dataset.focusedWorld,'Moon');
    assert.equal(app.el('planet-overview').hidden,false);
    assert.equal(app.el('surface-view').hidden,true);
    assert.equal(app.el('viewer-dialog').open,false);
    assert.deepEqual([...app.document.querySelectorAll('[data-overview-texture]')],canvases);
    assert.equal(app.document.querySelector('[data-overview-card="Moon"]').dataset.inspecting,'true');
    key(app,orb,'ArrowRight');app.click('zoom-in');
    app.click('atlas-overview-view');
    assert.equal(app.el('map').dataset.focusedWorld,'');
    assert.equal(app.el('map').dataset.mode,'overview');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('planet inspection remains in the joint view with reduced motion',async()=>{
  const app=await bootGeoTwin();
  try {
    app.window.matchMedia=()=>({matches:true});
    const orb=app.document.querySelector('[data-overview-world="Mars"]');
    orb.animate=()=>{throw Error('Zoom animation must be skipped when reduced motion is requested.');};
    app.document.querySelector('.world-switch [data-world="Mars"]').click();
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('map').dataset.focusedWorld,'Mars');
    assert.equal(app.el('map').dataset.world,'Mars');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('joint overview plots catalog locations on the visible side of each rotating globe',async()=>{
  const texture={width:2,height:1,pixels:new Uint8ClampedArray([90,120,160,255,110,140,180,255])};
  const app=await bootGeoTwin({manualAnimationFrames:true,textureFixture:texture});
  try {
    const sizes={Earth:196,Moon:112,Mars:144};
    for (const [world,size] of Object.entries(sizes)) {
      app.document.querySelector('[data-overview-world="'+world+'"]').getBoundingClientRect=()=>({width:size,height:size,left:0,top:0});
    }
    await app.settle();
    app.window.dispatchEvent(new app.window.Event('resize'));
    app.animationFrame(0);

    for (const world of Object.keys(sizes)) {
      const expected=(world==='Earth'?analogs:planetaryAreas[world]).filter(hasCoordinates);
      const layer=app.document.querySelector('[data-overview-locations="'+world+'"]');
      assert.equal(layer.children.length,expected.length);
      assert.deepEqual([...layer.children].map(marker=>marker.dataset.overviewLocation),expected.map(site=>site.id));
    }

    const earth=app.document.querySelector('[data-overview-world="Earth"]');
    const point=app.document.querySelector('[data-overview-location="isabella-choten"]');
    assert.equal(point.hidden,false);
    const previousLeft=point.style.left;
    app.click('overview-spin');
    earth.focus();key(app,earth,'ArrowRight');
    assert.notEqual(point.style.left,previousLeft);
    assert.equal(app.document.querySelector('[data-overview-location="marius"]').hidden,false);
    assert.equal(app.document.querySelector('[data-overview-location="deuteronilus"]').hidden,false);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('joint overview is preserved when a project is reopened',async()=>{
  let app=await bootGeoTwin();
  try {
    app.click('project-export');const text=await app.downloads.at(-1).text();
    await app.close();app=await bootGeoTwin();app.file('project-import',text);
    await app.waitFor(()=>app.el('study-save-status').textContent.startsWith('Proyecto abierto'),'joint atlas import');
    assert.equal(app.el('map').dataset.mode,'overview');
    assert.equal(app.el('planet-overview').hidden,false);
    assert.equal(app.el('atlas-overview-view').getAttribute('aria-pressed'),'true');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('selected planet and camera persist when exporting and reopening a project',async()=>{
  let app=await bootGeoTwin();
  try {
    app.document.querySelector('[data-world="Earth"]').click();
    assert.equal(app.el('map').dataset.mode,'overview');assert.equal(app.el('map').dataset.world,'Earth');
    assert.equal(app.el('surface-view').hidden,true);
    assert.equal([...app.document.querySelectorAll('.planet-card')].filter(c=>!c.hidden).length,0);
    assert.equal(app.el('area-details').hidden,true);
    app.document.querySelector('[data-marker-world="Earth"][data-marker="andagua"]').click();
    assert.match(app.el('draw-context').textContent,/Andahua/);
    app.click('project-export');const text=await app.downloads.at(-1).text();
    await app.close();app=await bootGeoTwin();app.file('project-import',text);
    await app.waitFor(()=>app.el('study-save-status').textContent.startsWith('Proyecto abierto'),'atlas project import');
    assert.equal(app.el('map').dataset.mode,'overview');assert.equal(app.el('map').dataset.world,'Earth');
    assert.equal(app.el('map').dataset.focusedWorld,'Earth');
    assert.match(app.el('draw-context').textContent,/Andahua/);
    app.document.querySelector('[data-world="Moon"]').click();
    assert.equal(app.el('map').dataset.world,'Moon');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
