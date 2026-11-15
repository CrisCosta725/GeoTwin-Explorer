import test from 'node:test';
import assert from 'node:assert/strict';
import {bootGeoTwin} from './support/dom.mjs';
const key=(app,target,value,extra={})=>target.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra}));

test('expanded globe retains the live canvas, world selector, controls and focus when closed with Esc',async()=>{
  const app=await bootGeoTwin();
  try {
    const globe=app.el('map'),canvas=app.el('planet-canvas-earth'),parent=globe.parentElement;
    const worlds=app.document.querySelector('.atlas-bar .world-switch');
    app.click('globe-expand');
    assert.equal(app.el('viewer-dialog').open,true);
    assert.equal(app.el('viewer-dialog').dataset.viewer,'globe');
    assert.equal(app.el('globe-expand').getAttribute('aria-expanded'),'true');
    assert.equal(app.el('viewer-dialog-content').firstElementChild,globe);
    assert.equal(app.el('planet-canvas-earth'),canvas);
    assert.equal(app.el('viewer-dialog-tools').firstElementChild,worlds);
    assert.equal(app.document.activeElement,app.document.querySelector('[data-overview-world="Earth"]'));
    assert.equal(app.document.querySelector('main').hasAttribute('inert'),true);
    app.document.querySelector('.world-switch button[data-world="Moon"]').click();
    assert.equal(globe.dataset.world,'Moon');
    assert.equal(app.el('area-details').hidden,true);
    app.document.querySelector('[data-marker-world="Moon"][data-marker="malapert"]').click();
    await app.waitFor(()=>/Malapert/.test(app.el('viewer-dialog-context').textContent),'expanded globe context');
    app.click('zoom-in');
    key(app,app.document.querySelector('[data-globe="Moon"]'),'ArrowLeft');
    key(app,app.document.querySelector('[data-globe="Moon"]'),'Escape');
    assert.equal(app.el('viewer-dialog').open,false);
    assert.equal(globe.parentElement,parent);
    assert.equal(app.document.querySelector('.atlas-bar .world-switch'),worlds);
    assert.equal(globe.dataset.world,'Moon');
    assert.equal(app.el('planet-canvas-earth'),canvas);
    assert.equal(app.el('globe-expand').getAttribute('aria-expanded'),'false');
    assert.equal(app.document.activeElement,app.el('globe-expand'));
    assert.equal(app.document.querySelector('main').hasAttribute('inert'),false);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('expanded terrain resizes its drawing buffer and keeps the profile, exaggeration and image controls',async()=>{
  const app=await bootGeoTwin();
  try {
    app.document.querySelector('[data-marker-world="Mars"][data-marker="arcadia-ap1"]').click();
    await app.waitFor(()=>!app.el('terrain-measurements').hidden,'terrain ready');
    const viewer=app.el('area-viewer'),parent=viewer.parentElement,canvas=app.el('terrain-canvas');
    app.input('terrain-exaggeration',1.4);app.input('profile-position',9);
    const reading=app.el('profile-reading').textContent,point=app.el('terrain-point').textContent;
    let expanded=true;
    canvas.getBoundingClientRect=()=>({width:expanded?1200:320,height:expanded?600:166});
    app.el('terrain-profile').getBoundingClientRect=()=>({width:expanded?1160:320,height:expanded?70:49});
    app.click('terrain-expand');
    assert.equal(app.el('viewer-dialog').dataset.viewer,'terrain');
    assert.equal(app.el('viewer-dialog-content').firstElementChild,viewer);
    assert.equal(app.el('terrain-canvas'),canvas);
    assert.equal(canvas.width,1200);assert.equal(canvas.height,600);
    assert.equal(app.el('terrain-profile').width,1160);
    assert.equal(app.el('terrain-exaggeration').value,'1.4');
    assert.equal(app.el('profile-position').value,'9');
    assert.equal(app.el('profile-reading').textContent,reading);
    assert.equal(app.el('terrain-point').textContent,point);
    assert.equal(app.document.activeElement,canvas);
    app.document.querySelector('[data-view-mode="photo"]').click();
    assert.equal(app.el('terrain-scene').hidden,true);
    assert.equal(app.el('terrain-image').hidden,false);
    expanded=false;app.click('terrain-expand');
    assert.equal(app.el('viewer-dialog').open,false);
    assert.equal(viewer.parentElement,parent);
    assert.equal(app.el('terrain-expand').textContent,'Ampliar');
    assert.equal(app.document.activeElement,app.el('terrain-expand'));
    assert.equal(app.el('terrain-image').hidden,false);
    app.document.querySelector('[data-view-mode="relief"]').click();
    await app.waitFor(()=>!app.el('terrain-measurements').hidden,'restored terrain');
    assert.equal(app.el('terrain-exaggeration').value,'1.4');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('expanded view contains keyboard focus and restores page state on close and navigation',async()=>{
  const app=await bootGeoTwin();
  try {
    app.document.body.style.overflow='auto';
    app.click('globe-expand');
    const first=app.document.querySelector('#viewer-dialog-tools button'),last=app.el('reset-all-globes');
    first.focus();key(app,first,'Tab',{shiftKey:true});
    assert.equal(app.document.activeElement,last);
    key(app,last,'Tab');assert.equal(app.document.activeElement,first);
    app.click('viewer-dialog-close');
    assert.equal(app.document.body.style.overflow,'auto');
    app.click('globe-expand');
    app.window.location.hash='#delimitar';
    await app.waitFor(()=>!app.el('viewer-dialog').open,'close before navigation');
    assert.equal(app.el('map').closest('.workspace-page').hidden,false);
    assert.equal(app.document.querySelector('main').hasAttribute('inert'),false);
    assert.equal(app.document.body.style.overflow,'auto');
    assert.equal(app.document.querySelectorAll('.planet-canvas').length,3);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
