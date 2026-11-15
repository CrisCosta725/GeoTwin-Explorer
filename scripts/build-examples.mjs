import {mkdir,writeFile} from 'node:fs/promises';
import {useLocalAssets} from './local-assets.mjs';
import {calculateShowcase,caseMarkdown} from '../dist/assets/case-study.js';

const restore=useLocalAssets();
try {
  const {payload,csv}=await calculateShowcase();
  const directory=new URL('../dist/examples/',import.meta.url);
  await mkdir(directory,{recursive:true});
  const files=[['andahua-ulysses.json',JSON.stringify(payload,null,2)+'\n'],
    ['andahua-ulysses.csv',csv],['andahua-ulysses.md',caseMarkdown(payload)],
    ['andahua-terrestre.geojson',JSON.stringify(payload.terrestrial,null,2)+'\n']];
  for (const [name,contents] of files) await writeFile(new URL(name,directory),contents,'utf8');
  console.log('Ejemplo peruano recalculado sin conexión: '+files.map(([name])=>name).join(', '));
} finally {restore();}
