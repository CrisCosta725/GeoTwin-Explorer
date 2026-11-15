import test from 'node:test';
import assert from 'node:assert/strict';
import {measureCone,validateCone} from '../dist/assets/cone-metrics.js';
import {localPoint} from '../dist/assets/study-metrics.js';
import {offsetPoint} from '../dist/assets/relief.js';

const center={lat:0,lon:0};
const circle=(radius,id,world='Earth')=>({id,label:id,world,points:Array.from({length:64},(_,i)=>offsetPoint(world,center,radius*Math.cos(i*Math.PI/32),radius*Math.sin(i*Math.PI/32)))});
const base=circle(1.5,'base'),crater=circle(.4,'crater');
const model=(tilt=0,resolution=20)=>({resolution,source:'copernicus30',sample:point=>{
  const {x,y}=localPoint('Earth',center,point),r=Math.hypot(x,y);
  const cone=r>=1.5?0:r>=.4?300*(1.5-r)/1.1:300-120*(1-r/.4);
  return 1000+tilt*(30*x-20*y)+cone;
}});

test('individual cone recovers known diameters, height and crater depth on tilted ground',async()=>{
  const flat=await measureCone(base,crater,{model:model()});
  const tilted=await measureCone(base,crater,{model:model(1)});
  assert.equal(tilted.resolved,true);
  assert.equal(tilted.crater.resolved,true);
  assert.ok(Math.abs(tilted.diameterKm-3)<.004);
  assert.ok(Math.abs(tilted.heightM-300)<7,JSON.stringify(tilted));
  assert.ok(Math.abs(tilted.crater.depthM-120)<7);
  assert.ok(Math.abs(tilted.heightM-flat.heightM)<.001);
  assert.ok(Math.abs(tilted.crater.depthM-flat.crater.depthM)<.001);
  assert.ok(tilted.slopeMedianDeg>5 && tilted.slopeMedianDeg<25);
  assert.ok(tilted.heightDiameter>.09 && tilted.heightDiameter<.11);
  assert.equal(tilted.stepM,20);
});

test('individual cone with coarse DEM, missing heights or tiny crater withholds unsupported metrics',async()=>{
  const coarse=await measureCone(base,crater,{model:model(0,600)});
  assert.equal(coarse.resolved,false);
  assert.equal(coarse.heightM,null);
  assert.equal(coarse.crater.depthM,null);
  const small=await measureCone(base,circle(.03,'tiny'),{model:model()});
  assert.equal(small.resolved,true);
  assert.equal(small.crater.resolved,false);
  assert.equal(small.crater.depthM,null);
  const missing=await measureCone(base,crater,{model:{resolution:30,source:'copernicus30',sample:()=>null}});
  assert.equal(missing.coverage,0);
  assert.equal(missing.heightM,null);
  assert.equal(missing.slopeMedianDeg,null);
});

test('crater must be a distinct nested contour in the same world',()=>{
  assert.throws(()=>validateCone(base,base),/distintos/);
  assert.throws(()=>validateCone(base,circle(.4,'mars','Mars')),/mundo/);
  assert.throws(()=>validateCone(base,circle(2,'outside')),/dentro/);
});
