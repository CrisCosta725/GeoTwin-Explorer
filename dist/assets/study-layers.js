const geographicLayer = (file)=>{
  let pending;
  return ()=>pending ??= fetch(new URL(file,import.meta.url)).then(response=>{
    if (!response.ok) throw Error('Capa no disponible');
    return response.json();
  }).catch(error=>{pending=null;throw error});
};

export const landLayer = geographicLayer('natural-earth-surface.json');
export const volcanoLayer = geographicLayer('gvp-holocene.json');

function inside(ring,lon,lat) {
  let included=false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [x,y]=ring[i];
    const [prevX,prevY]=ring[j];
    if ((y>lat)!==(prevY>lat) && lon<(prevX-x)*(lat-y)/(prevY-y)+x) included=!included;
  }
  return included;
}

function covered(polygons,{lon,lat}) {
  return polygons.some(([west,south,east,north,[outer,...holes]])=>
    lon>=west && lon<=east && lat>=south && lat<=north &&
    inside(outer,lon,lat) && !holes.some(hole=>inside(hole,lon,lat)));
}

export function isLand(mask,point) {
  return covered(mask.land,point) && !covered(mask.lakes,point);
}

const thematic = {
  'árido':{
    file:'dry-climate',
    name:'Beck et al. · Köppen–Geiger 1980–2016',
    label:'Clima desértico o estepario',
    scope:'Malla de 0,083° (~9 km en el ecuador). Describe el clima terrestre y deja la salinidad por verificar.',
    codes:[1,2]
  },
  polar:{
    file:'permafrost',
    name:'NSIDC · Brown et al., mapa circunártico v2',
    label:'Permafrost continuo o discontinuo',
    scope:'Derivado ILAMB de ~0,25°. La cobertura es circunártica y deja por verificar el hielo somero y los tipos esporádico y aislado.',
    codes:[1,2]
  }
};

const points = {
  cueva:[{
    name:'Tubo de lava de Mojave',lat:35.216319,lon:-115.751506,
    url:'https://www.nps.gov/places/the-lava-tube-at-mojave.htm',
    detail:'Tubo volcánico documentado por NPS'
  }],
  'mineralógico':[
    {name:'Río Tinto · Berrocal',lat:37.592575,lon:-6.550511,
      url:'https://doi.org/10.3390/life8040061',detail:'Jarosita analizada por espectroscopía'},
    {name:'Peña de Hierro · Río Tinto',lat:37.724918,lon:-6.553717,
      url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8563943/',detail:'Óxidos de hierro documentados en una muestra del gossan'}
  ]
};

const rasterCache=new Map();

export async function evidenceLayer(trait) {
  const config=thematic[trait];
  if (!config) return {points:points[trait] ?? []};
  if (!rasterCache.has(trait)) {
    const load=async()=>{
      const responses=await Promise.all(['.json','.bin.gz'].map(ext=>fetch(new URL(config.file+ext,import.meta.url))));
      if (responses.some(response=>!response.ok)) throw Error('Capa no disponible');
      const [grid,buffer]=await Promise.all([responses[0].json(),
        new Response(responses[1].body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()]);
      const cells=new Uint8Array(buffer);
      if (cells.length!==grid.width*grid.height) throw Error('Capa incompleta');
      return {...config,url:grid.url,points:[],sample({lat,lon}){
        const x=Math.floor((lon-grid.west)/grid.dx), y=Math.floor((lat-grid.north)/grid.dy);
        if (x<0 || x>=grid.width || y<0 || y>=grid.height) return null;
        const value=cells[y*grid.width+x];
        return value===255 ? null : config.codes.includes(value);
      }};
    };
    const pending=load();
    rasterCache.set(trait,pending);
    pending.catch(()=>rasterCache.delete(trait));
  }
  return rasterCache.get(trait);
}
