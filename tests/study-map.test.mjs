import test from 'node:test';
import assert from 'node:assert/strict';
import {bootGeoTwin} from './support/dom.mjs';

test('study map waits for an explicit selection, then paints terrain without navigating to its link',async()=>{
  const app=await bootGeoTwin();
  try {
    assert.equal(app.window.location.hash,'');
    assert.equal(app.el('study-map').dataset.mapState,'empty');
    assert.equal(app.el('study-square').disabled,true);
    app.document.querySelector('[data-marker-world="Mars"][data-marker="arcadia-ap1"]').click();
    await app.waitFor(()=>app.el('study-map').dataset.mapState==='ready','initial study terrain');
    assert.equal(app.el('study-map-state').hidden,true);
    assert.equal(app.el('study-map-retry').hidden,true);
    assert.match(app.el('study-layer-credit').textContent,/m de grilla/);
    assert.ok(app.canvasPaint.terrainRects>100,'Terrain cells must actually reach the drawing code');
    const initial=app.canvasPaint.terrainRects;
    app.document.querySelector('button[data-world="Earth"]').click();
    assert.equal(app.el('study-map').dataset.mapState,'empty');
    app.document.querySelector('[data-marker-world="Earth"][data-marker="andagua"]').click();
    await app.waitFor(()=>app.el('study-map').dataset.mapState==='ready','Earth study terrain');
    assert.equal(app.window.location.hash,'');
    assert.ok(app.canvasPaint.terrainRects>initial);
    assert.doesNotMatch(app.el('draw-context').textContent,/Arcadia/);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('failed study map shows a recoverable message and paints after retry without losing the outline',async()=>{
  let fail=true;
  const app=await bootGeoTwin({assetResponse:url=>fail && url.pathname.endsWith('/relief-data/index.json')?
    new Response('Temporarily unavailable',{status:503}):undefined});
  try {
    app.document.querySelector('[data-marker-world="Mars"][data-marker="arcadia-ap1"]').click();
    await app.waitFor(()=>app.el('study-map').dataset.mapState==='error','map error');
    assert.equal(app.el('study-map-state').hidden,false);
    assert.match(app.el('study-map-state').textContent,/No se pudo cargar/);
    assert.equal(app.el('study-map-retry').hidden,false);
    app.click('study-square');
    assert.equal(app.el('study-clear').disabled,false);
    fail=false;app.click('study-map-retry');
    await app.waitFor(()=>app.el('study-map').dataset.mapState==='ready','retried study terrain');
    assert.equal(app.el('study-map-state').hidden,true);
    assert.equal(app.el('study-map-retry').hidden,true);
    assert.equal(app.el('study-clear').disabled,false);
    assert.ok(app.canvasPaint.terrainRects>100);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
