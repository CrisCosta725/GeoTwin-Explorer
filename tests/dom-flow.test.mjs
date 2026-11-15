import test from 'node:test';
import assert from 'node:assert/strict';
import {bootGeoTwin} from './support/dom.mjs';

test('DOM flow: boot, calculate, edit, save, reload and export the real application',async()=>{
  let app=await bootGeoTwin();
  try {
    assert.ok(app.document.querySelectorAll('.result-card').length>0);
    assert.match(app.el('mission-context').textContent,/Arcadia/);
    app.click('showcase-run');
    await app.waitFor(()=>app.el('showcase-status').textContent.startsWith('Caso calculado'),'Peru case');
    assert.match(app.el('mission-context').textContent,/Andahua.*Ulysses/);
    assert.equal(app.el('showcase-results').querySelectorAll('tbody tr').length,5);
    app.click('mission-apply-case');
    assert.ok(Math.abs(Number(app.el('mission-observed').value)-60.625)<1e-9);
    assert.equal(app.el('mission-assessment').dataset.state,'not-met');
    app.input('mission-metric','Medición de prueba');
    assert.equal(app.el('mission-observed').value,'');
    app.input('mission-observed','0');
    app.input('mission-threshold','0');
    app.input('mission-notes','Nota con "comillas"\ny <img src=x onerror="alert(1)"> como texto.');
    assert.equal(app.el('mission-assessment').dataset.state,'met');
    app.click('mission-save');
    assert.match(app.el('mission-status').textContent,/guardados/);
    app.click('mission-export');
    const plan=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(plan.context.site.id,'andagua');
    assert.equal(plan.context.target.id,'ulysses');
    assert.equal(plan.plan.observed,0);
    assert.match(plan.plan.notes,/<img/);
    assert.equal(plan.assessment.status,'met');
    app.change('pilot-choice','huambo');
    assert.equal(app.el('mission-observed').value,'');
    app.change('pilot-choice','andagua');
    assert.equal(app.el('mission-observed').value,'0');
    assert.match(app.el('mission-notes').value,/comillas/);

    app.click('showcase-open');
    app.click('study-square');
    app.click('study-measure');
    await app.waitFor(()=>[...app.el('study-library').options].some(option=>option.value && /Andahua/.test(option.textContent)),'measured Earth polygon');
    app.click('study-save');
    assert.match(app.el('study-save-status').textContent,/Sesión guardada/);
    const storage=app.storage();
    await app.settle();
    assert.deepEqual(app.errors,[]);
    await app.close();
    app=await bootGeoTwin({storage});
    app.click('study-restore');
    assert.match(app.el('study-save-status').textContent,/recuperados/);
    assert.match(app.el('mission-context').textContent,/Andahua.*Ulysses/);
    assert.equal(app.el('mission-observed').value,'0');
    assert.match(app.el('mission-notes').value,/comillas/);
    assert.equal(app.document.querySelector('img[src="x"]'),null);
    assert.ok([...app.el('study-library').options].some(option=>/Andahua/.test(option.textContent)));
    app.click('study-export-earth');
    const geometry=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(geometry.type,'FeatureCollection');
    assert.ok(geometry.features.length>0);
    assert.equal(geometry.features[0].geometry.type,'Polygon');
    const ring=geometry.features[0].geometry.coordinates[0];
    assert.deepEqual(ring[0],ring.at(-1));
    app.click('study-export-report');
    assert.match(await app.downloads.at(-1).text(),/Planes de ensayo/);
    await app.settle();
    assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});

test('DOM sensitivity flow recalculates and exports the selected scenario and margins',async()=>{
  const app=await bootGeoTwin();
  try {
    app.change('validation-case','andahua-ulysses');
    app.submit('validation-form');
    await app.waitFor(()=>!app.el('validation-exports').hidden,'sensitivity ready');
    assert.equal(app.el('validation-priority').disabled,true);
    app.change('validation-width','5');
    app.change('validation-limit','20');
    app.change('validation-slope-margin','0.5');
    app.input('validation-note','Escenario revisado');
    app.click('validation-export-json');
    const payload=JSON.parse(await app.downloads.at(-1).text());
    assert.equal(payload.case,'andahua-ulysses');
    assert.equal(payload.parameters.windowKm,5);
    assert.equal(payload.parameters.slopeLimitDeg,20);
    assert.equal(payload.parameters.tolerances.slopeDeg,.5);
    assert.equal(payload.justification,'Escenario revisado');
    assert.equal(payload.scenarios.length,3);
    assert.ok(app.el('validation-matrix').querySelectorAll('[data-window]').length===9);
    await app.settle();
    assert.deepEqual(app.errors,[]);
  } finally {await app.close();}
});
