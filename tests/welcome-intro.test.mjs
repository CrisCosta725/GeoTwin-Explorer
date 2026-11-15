import test from 'node:test';
import assert from 'node:assert/strict';
import {bootGeoTwin} from './support/dom.mjs';

const key=(app,target,value,extra={})=>target.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra}));

test('welcome intro traps focus and exits to the atlas with Escape',async()=>{
  const app=await bootGeoTwin({sessionStorage:{}});
  try {
    const intro=app.el('welcome-intro');
    const enter=intro.querySelector('[data-intro-dismiss="enter"]');
    const last=intro.querySelector('.welcome-attribution a:last-child');
    assert.equal(intro.hidden,false);
    assert.equal(intro.getAttribute('aria-hidden'),'false');
    assert.equal(app.el('contenido').inert,true);
    assert.equal(app.document.body.style.overflow,'hidden');
    assert.equal(app.document.activeElement,enter);
    assert.equal(intro.querySelectorAll('.welcome-planet img').length,3);
    assert.equal(intro.querySelectorAll('.welcome-attribution a').length,3);

    key(app,enter,'Tab',{shiftKey:true});
    assert.equal(app.document.activeElement,last);
    key(app,last,'Tab');
    assert.equal(app.document.activeElement,enter);

    key(app,enter,'Escape');
    assert.equal(intro.hidden,true);
    assert.equal(app.el('contenido').inert,false);
    assert.equal(app.document.body.style.overflow,'');
    assert.equal(app.document.activeElement,app.el('title'));
    assert.equal(app.window.sessionStorage.getItem('geotwin-intro-dismissed'),'true');
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('welcome intro can be skipped and remains dismissed for the tab session',async()=>{
  let app=await bootGeoTwin({sessionStorage:{}});
  try {
    app.document.querySelector('[data-intro-dismiss="skip"]').click();
    assert.equal(app.el('welcome-intro').hidden,true);
    assert.equal(app.document.body.style.overflow,'');
    const storage=Object.fromEntries(['geotwin-intro-dismissed'].map(key=>[key,app.window.sessionStorage.getItem(key)]));
    await app.close();
    app=await bootGeoTwin({sessionStorage:storage});
    assert.equal(app.el('welcome-intro').hidden,true);
    assert.equal(app.el('contenido').inert,false);
    await app.settle();assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
