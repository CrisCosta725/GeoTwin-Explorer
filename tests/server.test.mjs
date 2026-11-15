import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createGeoTwinServer,parseOptions} from '../iniciar_geotwin.mjs';

test('launcher validates ports, flags, and the existing Python-compatible options',()=>{
  assert.deepEqual(parseOptions(['--puerto','8001','--sin-abrir']),{port:8001,open:false,help:false});
  for (const args of [['--puerto','0'],['--puerto','8000.5'],['--puerto'],['--otro']]) assert.throws(()=>parseOptions(args));
});

test('local server serves modules, gzip data, and delivery examples with correct MIME types',async t=>{
  const server=await createGeoTwinServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const root='http://127.0.0.1:'+server.address().port;
  for (const [pathname,type] of [['/','text/html'],['/assets/app.js','text/javascript'],
    ['/assets/mission-panel.js','text/javascript'],['/examples/andahua-ulysses.json','application/json'],
    ['/examples/andahua-ulysses.csv','text/csv'],['/examples/GUIA_DEMO.md','text/plain']]) {
    const response=await fetch(root+pathname);
    assert.equal(response.status,200,pathname);
    assert.ok(response.headers.get('content-type').startsWith(type),pathname);
    assert.equal(response.headers.get('x-geotwin-app'),'geotwin-explorer-v24');
    await response.arrayBuffer();
  }
  const compressed=await fetch(root+'/assets/relief-data/hawaii-3dep.bin.gz');
  assert.equal(compressed.headers.get('content-encoding'),null);
  assert.deepEqual([...new Uint8Array(await compressed.arrayBuffer()).slice(0,2)],[31,139]);
  const head=await fetch(root+'/assets/style.css',{method:'HEAD'});
  assert.ok(Number(head.headers.get('content-length'))>0);
  assert.equal(await head.text(),'');
  assert.equal((await fetch(root+'/no-existe')).status,404);
  assert.equal((await fetch(root+'/%E0%A4%A')).status,400);
  assert.equal((await fetch(root+'/',{method:'POST'})).status,405);
  if (process.platform==='win32') assert.equal((await fetch(root+'/..%5cpackage.json')).status,403);
});

test('Windows double-click launcher selects the installed runtime and handles help', {skip:process.platform!=='win32'},()=>{
  const result=spawnSync('cmd.exe',['/d','/c','.\\Iniciar_GeoTwin.bat','--help'],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',windowsHide:true,timeout:10000});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stdout,/GeoTwin Explorer v24/);
  assert.match(result.stdout,/--puerto/);
});
