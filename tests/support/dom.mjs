import {readFile} from 'node:fs/promises';
import {SourceTextModule} from 'node:vm';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=new URL('../../dist/',import.meta.url);

/** Isolated DOM environment. Optional texture fixtures capture raster output;
 * native canvas painting and layout remain excluded. */
export async function bootGeoTwin({storage={},sessionStorage={'geotwin-intro-dismissed':'true'},assetResponse,manualAnimationFrames=false,textureFixture}={}) {
  const html=await readFile(new URL('index.html',root),'utf8');
  const errors=[];
  const virtualConsole=new VirtualConsole();
  virtualConsole.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(html,{url:'http://127.0.0.1:8000/',runScripts:'outside-only',
    pretendToBeVisual:true,virtualConsole});
  const {window}=dom;
  for (const [key,value] of Object.entries(sessionStorage)) window.sessionStorage.setItem(key,value);
  const pending=new Set();
  const blobs=new Map();
  const downloads=[];
  const canvasImages=new WeakMap();
  window.addEventListener('error',event=>{errors.push(event.error ?? Error(event.message));event.preventDefault();});
  Object.assign(window,{Response,DecompressionStream,TextDecoder,TextEncoder});
  const animationFrames=new Map();let animationId=0;
  if (manualAnimationFrames) {
    window.requestAnimationFrame=callback=>{const id=++animationId;animationFrames.set(id,callback);return id;};
    window.cancelAnimationFrame=id=>animationFrames.delete(id);
  }
  if (textureFixture) {
    const NativeImage=window.Image;
    const source=Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype,'src');
    window.Image=function(...args) {
      const image=new NativeImage(...args);
      Object.defineProperty(image,'src',{get(){return source.get.call(this);},set(value){
        if (/(earth|moon|mars)-globe\.webp$/.test(String(value))) {
          Object.defineProperties(this,{
            naturalWidth:{configurable:true,value:textureFixture.width},
            naturalHeight:{configurable:true,value:textureFixture.height}
          });
          this.testTexture=textureFixture;
          queueMicrotask(()=>this.onload?.());
        } else source.set.call(this,value);
      }});
      return image;
    };
  }
  window.crypto.randomUUID=randomUUID;
  window.fetch=input=>{
    const url=new URL(String(input));
    const job=(async()=>{
      if (url.protocol!=='file:' || !url.href.startsWith(root.href)) throw Error('External resource blocked in DOM test: '+url.href);
      const injected=await assetResponse?.(url);
      if (injected) return injected;
      try {return new Response(await readFile(url));}
      catch (error) {if(error.code==='ENOENT') return new Response('Not found',{status:404});throw error;}
    })();
    pending.add(job);
    job.finally(()=>pending.delete(job)).catch(()=>{});
    return job;
  };
  // jsdom does not implement layout or canvas painting. These stubs keep that
  // boundary explicit while the actual application, DOM, events and models run.
  window.ResizeObserver=class {observe(){} disconnect(){} unobserve(){}};
  window.scrollTo=()=>{};
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  const contexts=new WeakMap();
  const canvasPaint={terrainRects:0};
  window.HTMLCanvasElement.prototype.getContext=function(type) {
    if (type!=='2d') throw Error('Unexpected graphics API in DOM test: '+type);
    if (!contexts.has(this)) contexts.set(this,new Proxy({canvas:this,
      fillRect(){if (this.canvas.id==='study-map' && String(this.fillStyle).startsWith('hsl(')) canvasPaint.terrainRects++;},
      createImageData:(width,height)=>({width,height,data:new window.Uint8ClampedArray(width*height*4)}),
      drawImage(image){this.testTexture=image.testTexture;},
      getImageData(x,y,width,height){return {data:this.testTexture?.pixels??new window.Uint8ClampedArray(width*height*4)};},
      putImageData(image){if(textureFixture) canvasImages.set(this.canvas,{width:image.width,height:image.height,data:new Uint8ClampedArray(image.data)});},
      measureText:text=>({width:String(text).length*6}),
      createLinearGradient:()=>({addColorStop(){}}),
      createRadialGradient:()=>({addColorStop(){}})
    },{get:(object,name)=>name in object?object[name]:()=>{}}));
    return contexts.get(this);
  };
  window.URL.createObjectURL=blob=>{
    const url='blob:http://127.0.0.1:8000/'+blobs.size;blobs.set(url,blob);return url;
  };
  window.URL.revokeObjectURL=url=>blobs.delete(url);
  window.HTMLAnchorElement.prototype.click=function() {
    const blob=blobs.get(this.href);
    downloads.push({name:this.download,href:this.href,blob,text:()=>new Promise((resolve,reject)=>{
      const reader=new window.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(blob);
    })});
  };
  for (const [key,value] of Object.entries(storage)) window.localStorage.setItem(key,value);
  const modules=new Map();
  const context=dom.getInternalVMContext();
  const load=url=>{
    if (!url.href.startsWith(root.href)) throw Error('Unexpected module outside application: '+url.href);
    if (!modules.has(url.href)) modules.set(url.href,readFile(url,'utf8').then(code=>new SourceTextModule(code,{
      context,identifier:url.href,initializeImportMeta:meta=>{meta.url=url.href;}
    })));
    return modules.get(url.href);
  };
  const entry=await load(new URL('assets/app.js',root));
  await entry.link((specifier,module)=>load(new URL(specifier,module.identifier)));
  await entry.evaluate();
  const el=id=>{
    const found=window.document.getElementById(id);
    if (!found) throw Error('Missing DOM element '+id);return found;
  };
  async function settle() {
    // A finished fetch can still be decoding a compressed DEM. Wait for the
    // application's loading state before tearing down its document.
    let quiet=0;
    const started=Date.now();
    while (quiet<5) {
      await Promise.allSettled([...pending]);await delay(25);
      const terrainLoading=!el('area-details').hidden && !el('terrain-scene').hidden &&
        !el('terrain-status').hidden && el('terrain-status').textContent.startsWith('Cargando');
      const profilesLoading=el('study-profile').textContent.startsWith('Cargando perfiles');
      const busy=el('study-map').dataset.mapState==='loading' || terrainLoading || profilesLoading || el('study-pair-result').textContent.startsWith('Calculando');
      quiet=pending.size || busy?0:quiet+1;
      if (Date.now()-started>30000) throw Error('Application did not finish its terrain work before DOM teardown.');
    }
  }
  return {window,document:window.document,el,errors,downloads,canvasPaint,canvasImage:canvas=>canvasImages.get(canvas),
    animationFrame:time=>{const callbacks=[...animationFrames.values()];animationFrames.clear();for (const callback of callbacks) callback(time);},
    click:id=>el(id).click(),
    input:(id,value)=>{el(id).value=String(value);el(id).dispatchEvent(new window.Event('input',{bubbles:true}));},
    change:(id,value)=>{el(id).value=String(value);el(id).dispatchEvent(new window.Event('change',{bubbles:true}));},
    file:(id,text,name='project.geotwin.json')=>{
      Object.defineProperty(el(id),'files',{configurable:true,value:[new window.File([text],name,{type:'application/json'})]});
      el(id).dispatchEvent(new window.Event('change',{bubbles:true}));
    },
    submit:id=>el(id).dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})),
    storage:()=>Object.fromEntries(Array.from({length:window.localStorage.length},(_,i)=>{
      const key=window.localStorage.key(i);return [key,window.localStorage.getItem(key)];
    })),
    waitFor:async(predicate,label)=>{
      const start=Date.now();
      while (!predicate()) {if(Date.now()-start>10000) throw Error('Timed out: '+label+'\n'+errors.map(e=>e.stack).join('\n'));await delay(20);}
    },
    settle,close:async()=>{await settle();dom.window.close();}
  };
}
