import test from 'node:test';
import assert from 'node:assert/strict';
import {PlanetViewer,worlds} from '../dist/assets/globe.js';
import {bootGeoTwin} from './support/dom.mjs';

function texture(uniform=false) {
  const width=360,height=180,pixels=new Uint8ClampedArray(width*height*4);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const i=4*(y*width+x);
    pixels.set(uniform?[120,120,120,255]:[x*255/359,y*255/179,255-x*255/359,255],i);
  }
  return {width,height,pixels};
}

function renderer(source=texture(),diameter=128) {
  const ctx={allocations:0,
    createImageData(width,height){this.allocations++;return {width,height,data:new Uint8ClampedArray(width*height*4)};},
    putImageData(image){this.output=image;}
  };
  const target={width:128,height:128,style:{},dataset:{},
    parentElement:{getBoundingClientRect:()=>({width:diameter,height:diameter})},getContext:()=>ctx};
  const viewer=Object.assign(Object.create(PlanetViewer.prototype),{
    canvas:{},world:'Earth',cameras:{Earth:{lon:0,lat:0,zoom:1}},
    textures:new Map([['Earth',{status:'ready',texture:source}]])
  });
  return {viewer,target,ctx};
}

const pixel=(image,x,y)=>[...image.data.slice(4*(y*image.width+x),4*(y*image.width+x)+4)];

test('sphere raster has a circular limb, lighting and geographic rotation',()=>{
  const {viewer,target,ctx}=renderer(texture(true));
  viewer.drawTexture(target);
  assert.equal(pixel(ctx.output,0,0)[3],0);
  assert.equal(pixel(ctx.output,64,64)[3],255);
  assert.equal(pixel(ctx.output,127,64)[3],0);
  assert.ok(pixel(ctx.output,64,64)[0]>pixel(ctx.output,115,64)[0]+35,'center receives more light than the limb');

  viewer.textures.get('Earth').texture=texture();
  viewer.drawTexture(target);const center=pixel(ctx.output,64,64);
  viewer.camera.lon=90;viewer.drawTexture(target);
  assert.ok(pixel(ctx.output,64,64)[0]>center[0]+40,'longitude brings another part of the map into view');
  viewer.camera.lat=50;viewer.drawTexture(target);
  assert.ok(pixel(ctx.output,64,64)[1]<center[1]-40,'latitude also changes the surface at the center');
});

test('overview sphere fits its container at desktop and mobile sizes, with zoom and reusable buffers',()=>{
  for (const diameter of [50,88,126,196]) {
    const {viewer,target,ctx}=renderer(texture(),diameter);
    assert.equal(viewer.drawTexture(target),true);
    assert.equal(target.style.width,'100%');assert.equal(target.style.height,'100%');
    assert.equal(target.width,Math.max(96,diameter));
    const image=ctx.output;
    viewer.camera.lon+=20;viewer.drawTexture(target);
    assert.equal(ctx.output,image);assert.equal(ctx.allocations,1);
    viewer.camera.zoom=1.5;viewer.drawTexture(target);
    assert.equal(target.style.width,'150%');assert.equal(target.style.height,'150%');
    assert.equal(target.width,Math.max(96,Math.round(diameter*1.5)));
  }
});

test('three overview spheres animate their pixels, pause for interaction and preserve the spin preference',async()=>{
  const app=await bootGeoTwin({manualAnimationFrames:true,textureFixture:texture()});
  const snapshot=async()=>{app.click('project-export');return JSON.parse(await app.downloads.at(-1).text());};
  const cameras=async()=>(await snapshot()).state.values.atlasCameras;
  try {
    for (const [world,size] of [['Earth',160],['Moon',96],['Mars',128]]) {
      app.document.querySelector('[data-overview-world="'+world+'"]').getBoundingClientRect=()=>({width:size,height:size,left:0,top:0});
    }
    await app.settle();
    app.window.dispatchEvent(new app.window.Event('resize'));
    app.animationFrame(0);
    const earth=app.document.querySelector('[data-overview-world="Earth"]');
    const canvas=earth.querySelector('canvas');
    const first=app.canvasImage(canvas);
    assert.equal(first.width,160);assert.equal(canvas.style.width,'100%');
    assert.equal(pixel(first,0,0)[3],0);assert.equal(pixel(first,80,80)[3],255);
    for (const control of app.document.querySelectorAll('[data-overview-world]')) {
      assert.equal(control.querySelector('canvas').dataset.ready,'true');
      assert.equal(control.querySelector('[data-overview-status]').hidden,true);
      assert.equal(control.getAttribute('aria-busy'),'false');
    }
    app.animationFrame(1000);
    let saved=await cameras();
    for (const world of Object.keys(worlds)) assert.equal(saved[world].lon,worlds[world].lon+4);
    assert.notDeepEqual(app.canvasImage(canvas).data,first.data,'surface pixels move on the sphere');

    earth.dispatchEvent(new app.window.Event('pointerenter'));
    app.animationFrame(2000);assert.deepEqual(await cameras(),saved);
    earth.dispatchEvent(new app.window.Event('pointerleave'));
    app.animationFrame(3000);app.animationFrame(4000);
    earth.focus();app.animationFrame(5000);
    saved=await cameras();assert.equal(saved.Earth.lon,worlds.Earth.lon+8);
    earth.dispatchEvent(new app.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    assert.equal((await cameras()).Earth.lon,saved.Earth.lon+12);

    app.el('overview-spin').focus();app.click('overview-spin');app.animationFrame(6000);
    const paused=await snapshot();
    assert.equal(paused.state.values.atlasSpin,false);
    assert.equal(paused.state.values.selected,null);
    assert.equal(app.el('overview-spin').textContent,'Activar giro');
    app.animationFrame(6500);assert.deepEqual(await cameras(),paused.state.values.atlasCameras);
    app.click('overview-spin');app.animationFrame(7000);app.animationFrame(8000);
    assert.equal((await cameras()).Earth.lon,paused.state.values.atlasCameras.Earth.lon+4);

    app.file('project-import',JSON.stringify(paused));
    await app.waitFor(()=>app.el('study-save-status').textContent.startsWith('Proyecto abierto'),'spin preference import');
    app.animationFrame(9000);app.animationFrame(10000);
    assert.equal(app.el('overview-spin').getAttribute('aria-pressed'),'false');
    assert.deepEqual(await cameras(),paused.state.values.atlasCameras);
    assert.equal(app.el('area-details').hidden,true);
    assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
