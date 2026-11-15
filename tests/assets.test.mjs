import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=new URL('../dist/',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);

test('document has unique IDs, live fragment links, labels, and local download targets',async()=>{
  assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ID');
  for (const [,id] of html.matchAll(/(?:href="#|for=")([^"#]+)"/g)) assert.ok(ids.includes(id),'Missing HTML target: '+id);
  for (const [,ref] of html.matchAll(/(?:src|href)="((?:assets|examples)\/[^"#]+)"/g)) await access(new URL(ref,root));
});

test('Earth uses its own icon without replacing the GeoTwin brand mark',()=>{
  assert.match(html,/<symbol id="i-earth"/);
  assert.match(html,/<span><svg aria-hidden="true"><use href="#i-earth"\/><\/svg>Tierra<\/span>/);
  assert.match(html,/<button[^>]*data-world="Earth"[^>]*><svg aria-hidden="true"><use href="#i-earth"\/>/);
  assert.match(html,/<span class="brand-icon"><svg aria-hidden="true"><use href="#i-brand"\/>/);
});

test('browser modules parse and their literal UI targets and imports exist',async()=>{
  const files=(await readdir(new URL('assets/',root))).filter(name=>name.endsWith('.js'));
  const scripts=await Promise.all(files.map(file=>readFile(new URL('assets/'+file,root),'utf8')));
  const allIds=new Set([...ids,...scripts.flatMap(script=>[...script.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]))]);
  for (const [i,file] of files.entries()) {
    const url=new URL('assets/'+file,root);
    const script=scripts[i];
    const checked=spawnSync(process.execPath,['--check',fileURLToPath(url)],{encoding:'utf8',windowsHide:true});
    assert.equal(checked.status,0,file+': '+checked.stderr);
    for (const [,id] of script.matchAll(/(?:\bbyId|\bid|\bgetElementById)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      assert.ok(allIds.has(id),file+' refers to missing element '+id);
    }
    for (const [,ref] of script.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) await access(new URL(ref,url));
  }
});

test('all elevation tiles declared by the data index are packaged',async()=>{
  const index=JSON.parse(await readFile(new URL('assets/relief-data/index.json',root),'utf8'));
  let checked=0;
  for (const {base,local} of Object.values(index)) {
    for (let y=0;y<Math.ceil(base.height/base.chunk);y++) for (let x=0;x<Math.ceil(base.width/base.chunk);x++) {
      await access(new URL('assets/relief-data/'+base.file+'-'+x+'-'+y+'.bin.gz',root));checked++;
    }
    for (const tile of local) {await access(new URL('assets/relief-data/'+tile.file+'.bin.gz',root));checked++;}
  }
  assert.equal(checked,164);
});
