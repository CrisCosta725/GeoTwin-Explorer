import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogEvidence,summarizeEvidence} from '../dist/assets/evidence-quality.js';
import {ranking} from '../dist/assets/model.js';
import {assessMission,updateMissionPlan} from '../dist/assets/case-study.js';
import {rankScenario,comparisonReason} from '../dist/assets/validation-model.js';
import {summarizeScenarios} from '../dist/assets/validation-policy.js';

const reference={slope:5,slopeCoverage:1};
const area=(id,slope=5,extra={})=>({id,label:id,stats:{slope,samples:4},slopes:[1,2,3,4],...extra});

test('evidence coverage distinguishes requested traits, local sources, and unknowns',()=>{
  const site={id:'university',geology:['hielo'],terrain:['planicie']};
  const summary=summarizeEvidence(site,[{field:'geology',values:['hielo','jarosita']},{field:'terrain',values:['planicie']}]);
  assert.deepEqual([summary.local,summary.regional,summary.pending,summary.total,summary.coverage],[1,1,1,3,67]);
  assert.equal(catalogEvidence(site,'jarosita').level,'pending');
  assert.match(catalogEvidence(site,'jarosita').detail,/ausencia comprobada/);
});

test('catalog does not report full evidence coverage for every candidate',()=>{
  const rows=ranking({body:'Mars',profile:'arcadia-ap1'});
  assert.equal(rows.length,20);
  assert.ok(new Set(rows.map(row=>row.coverage)).size>1);
  const noIce=rows.find(row=>row.id==='atacama');
  assert.ok(noIce.evidenceSummary.pending>0);
  assert.equal(noIce.evidenceSummary.local,0);
});

test('scenario rejects insufficient reference coverage and excludes controls',()=>{
  assert.equal(rankScenario([area('a')],{...reference,slopeCoverage:.79},12,'terrain',false).leader,null);
  const outcome=rankScenario([area('a'),area('known'),area('control')],reference,12,'terrain',false);
  assert.deepEqual(outcome.choices.map(row=>row.id),['a']);
  assert.equal(outcome.controls.length,2);
});

test('scenario requires local footprint geology when a cartographic criterion is used',()=>{
  const outcome=rankScenario([area('missing'),area('partial',5,{geology:{status:'covered',coverage:.2,matched:.1,share:.1}}),
    area('supported',6,{geology:{status:'covered',coverage:1,matched:1,share:.2}})],reference,12,'geology',true);
  assert.equal(outcome.leader.id,'supported');
  assert.equal(outcome.choices.find(row=>row.id==='missing').eligible,false);
});

test('equivalence bands are deterministic for chained near-equal values',()=>{
  const rows=[area('a',5),area('b',5.08),area('c',5.16)];
  for (const indices of [[0,1,2],[2,1,0],[1,2,0],[1,0,2],[0,2,1],[2,0,1]]) {
    const outcome=rankScenario(indices.map(i=>rows[i]),reference,12,'terrain',false);
    assert.deepEqual(outcome.equivalent.map(row=>row.id),['a','b']);
    assert.match(comparisonReason(outcome,'terrain',false),/no hay un ganador único/);
  }
  const exact=rankScenario(rows,reference,12,'terrain',false,{slopeDeg:0});
  assert.deepEqual(exact.equivalent.map(row=>row.id),['a']);
});

test('missing measurements stay pending and zero is a valid observation',()=>{
  assert.equal(assessMission({threshold:10,operator:'<=',observed:null}).status,'pending');
  assert.equal(assessMission({threshold:10,operator:'<=',observed:0,unit:'%'}).status,'met');
  assert.equal(assessMission({threshold:75,operator:'>=',observed:60.625,unit:'%'}).status,'not-met');
  assert.equal(assessMission({threshold:10,operator:'<=',observed:150,unit:'%'}).status,'invalid');
});

test('scenario frequencies count ties and failures without implying probability',()=>{
  const tied=rankScenario([area('a'),area('b')],reference,12,'terrain',false);
  const none=rankScenario([area('a',5,{slopes:[20,20,20,20]})],reference,12,'terrain',false);
  const summary=summarizeScenarios([{outcomes:[tied,none,null]}]);
  assert.deepEqual([summary.computed,summary.tied,summary.withoutCandidate],[2,1,1]);
  assert.deepEqual(summary.firstOrEquivalent,{a:1,b:1});
  assert.match(summary.interpretation,/no es una probabilidad/);
});

test('a changed unit or protocol invalidates the observation and drops stale derived assessments',()=>{
  const previous={metric:'Fracción',unit:'%',protocol:'DEM',operator:'>=',threshold:75,observed:60.625,
    origin:'DEM regional',assessment:{status:'not-met'},screeningStatus:'old'};
  const changed=updateMissionPlan(previous,{...previous,unit:'m'},'unit');
  assert.equal(changed.observed,null);
  assert.equal(assessMission(changed).status,'pending');
  assert.ok(!Object.hasOwn(changed,'assessment'));
  const threshold=updateMissionPlan(previous,{...previous,threshold:50},'threshold');
  assert.equal(threshold.observed,60.625);
  assert.equal(threshold.origin,'DEM regional');
  assert.equal(assessMission(threshold).status,'met');
});
