import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {useLocalAssets} from '../scripts/local-assets.mjs';
import {calculateShowcase,targetForCase,caseMarkdown} from '../dist/assets/case-study.js';
import {prepareValidation,reproducibleCases,validationExport} from '../dist/assets/validation-model.js';

test('Peru case calculates and exports honest results using only packaged data',async()=>{
  const restore=useLocalAssets();
  try {
    const {payload,csv}=await calculateShowcase();
    assert.equal(payload.method,'geotwin-sensibilidad-2');
    assert.equal(payload.parameters.stepKm,.5);
    assert.equal(payload.geology,null);
    assert.equal(payload.target.world,'Mars');
    assert.equal(payload.terrestrial.features.length,4);
    const candidate=payload.terrestrial.features.find(feature=>feature.properties.id==='andagua');
    assert.equal(candidate.properties.resolution,90);
    assert.equal(payload.mission.assessment.status,'not-met');
    assert.ok(payload.mission.observed>60 && payload.mission.observed<61);
    assert.match(payload.mission.origin,/no es una prueba/);
    assert.equal(payload.leader,null);
    assert.ok(payload.limits.length>=3);
    assert.equal(payload.scenarios.length,3);
    assert.ok(payload.scenarios.flatMap(row=>row.results).some(row=>row.leader || row.equivalentCandidates.length));
    assert.match(csv,/margen_pendiente_grados/);
    assert.equal(csv.split('\r\n').length,6);
    for (const feature of payload.terrestrial.features) {
      assert.equal(feature.type,'Feature');
      assert.ok(feature.properties.source.url.startsWith('https://'));
      assert.ok(feature.properties.resolution<=payload.parameters.stepKm*1000);
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
      for (const polygon of polygons) for (const ring of polygon) assert.deepEqual(ring[0],ring.at(-1));
    }
    const packaged=JSON.parse(await readFile(new URL('../dist/examples/andahua-ulysses.json',import.meta.url),'utf8'));
    assert.deepEqual(packaged,JSON.parse(JSON.stringify(payload)));
    assert.match(caseMarkdown(payload),/60\.625/);
  } finally {restore();}
});

test('Moon and Mars legacy cases retain all scales and serialize current thresholds',async()=>{
  const restore=useLocalAssets();
  try {
    for (const key of ['marius-basalt','ulysses-scoria']) {
      const descriptor=reproducibleCases[key];
      const result=await prepareValidation(targetForCase(key),descriptor.sites,descriptor.trait,key);
      assert.deepEqual(Object.keys(result.scales),['5','10','20']);
      assert.equal(result.official.scale,'1:250 000');
      const {payload,csv}=validationExport(result,20,20,'geology','Nota con "comillas"\ny dos líneas.');
      assert.equal(payload.parameters.slopeLimitDeg,20);
      assert.equal(payload.terrestrial.features.length,4);
      const ref=result.scales[20].ref;
      assert.equal(payload.target.stats.pass,ref.slopes.filter(value=>value<=20).length/ref.slopes.length);
      for (const feature of payload.terrestrial.features) {
        assert.equal(feature.properties.stats.pass,feature.properties.pass);
        assert.ok(!Object.hasOwn(feature.properties,'slopes'));
      }
      assert.ok(csv.includes('""comillas""'));
    }
  } finally {restore();}
});
