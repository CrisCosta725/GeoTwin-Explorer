import {readFile} from 'node:fs/promises';

/** Enable the same data readers in Node, with external requests forbidden. */
export function useLocalAssets() {
  const previous=globalThis.fetch;
  globalThis.fetch=async input=>{
    const url=input instanceof URL?input:new URL(String(input));
    if (url.protocol!=='file:') throw Error('La verificación sin conexión rechazó una petición externa: '+url.origin);
    try {return new Response(await readFile(url));}
    catch (error) {if (error.code==='ENOENT') return new Response('Not found',{status:404});throw error;}
  };
  return ()=>{globalThis.fetch=previous;};
}
