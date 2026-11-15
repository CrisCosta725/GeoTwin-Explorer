const worlds=new Set(['Earth','Moon','Mars']);
const formIds=new Set(['scan-lat','scan-lon','scan-slope','scan-geology','scan-source']);
export const projectFormat='geotwin-project';
export const projectLimit=24*1024*1024;
const fail=message=>{throw Error(message);};
const point=p=>p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat)<=90 && Math.abs(p.lon)<=180;

// Validate before replacing the working session. Imported text is always rendered as text.
export function validateState(state) {
  if (!state || ![1,2].includes(state.version) || !state.values || !state.form || !state.polygons) fail('El archivo no contiene una sesión de GeoTwin.');
  let nodes=0;
  const visit=(value,key='',depth=0)=>{
    if (++nodes>700000 || depth>32) fail('El proyecto excede los límites de tamaño.');
    if (typeof value==='string') {
      if (value.length>100000) fail('Un campo de texto es demasiado largo.');
      if (/(?:url|publication)$/i.test(key) && value) {
        try {if (!['https:','http:'].includes(new URL(value).protocol)) fail('Fuente inválida.');}
        catch {fail('Las fuentes deben usar direcciones HTTP o HTTPS.');}
      }
    } else if (typeof value==='number' && !Number.isFinite(value)) fail('Medición no válida.');
    else if (value && typeof value==='object') {
      for (const [name,item] of Object.entries(value)) {
        if (['__proto__','prototype','constructor'].includes(name)) fail('Estructura de proyecto no válida.');
        if (/source$/i.test(name) && typeof item==='string' && /^[a-z][a-z0-9+.-]*:/i.test(item) && !/^https?:\/\//i.test(item)) fail('Las fuentes deben usar direcciones HTTP o HTTPS.');
        visit(item,name,depth+1);
      }
    }
  };
  visit(state);
  if (!['Mars','Moon'].includes(state.values.config?.body) || typeof state.values.config.profile!=='string' || !Array.isArray(state.values.compared)) fail('Referencia de proyecto inválida.');
  if (state.values.atlasView!==undefined && !['overview','surface'].includes(state.values.atlasView)) fail('Vista del atlas inválida.');
  if (state.values.atlasFocus!=null && !worlds.has(state.values.atlasFocus)) fail('Planeta de inspección inválido.');
  if (state.values.atlasSpin!==undefined && typeof state.values.atlasSpin!=='boolean') fail('Configuración del giro de las esferas inválida.');
  for (const name of ['pilots','pilotNotes']) if (state.values[name] && (!Array.isArray(state.values[name]) || !state.values[name].every(pair=>Array.isArray(pair) && pair.length===2))) fail('Selección de piloto inválida.');
  for (const [world,view] of Object.entries(state.values.areaState??{})) if (!worlds.has(world) || !view || (view.point!==null && !point(view.point)) || (view.point===null && view.id!=null) || (view.draftLabel!=null && typeof view.draftLabel!=='string')) fail('Ubicación del atlas inválida.');
  for (const [world,camera] of Object.entries(state.values.atlasCameras??{})) if (!worlds.has(world) || !point(camera) || !Number.isFinite(camera.zoom) || camera.zoom<.8 || camera.zoom>2.4) fail('Cámara del atlas inválida.');
  for (const key of ['scan-lat','scan-lon','scan-slope']) {
    const n=Number(state.form[key]),range=key==='scan-lat'?90:key==='scan-lon'?180:90;
    if (state.form[key]!==undefined && (!Number.isFinite(n) || Math.abs(n)>range || (key==='scan-slope' && n<0))) fail('Parámetro fuera de rango.');
  }
  for (const [id,value] of Object.entries(state.form)) if (!formIds.has(id) || typeof value!=='string') fail('Parámetros de búsqueda inválidos.');
  const area=a=>{
    if (!a || !worlds.has(a.world) || typeof a.id!=='string' || typeof a.label!=='string' || !point(a.center) || (a.origin && !point(a.origin)) || !Number.isFinite(a.span) || a.span<=0 || a.span>85 || !Array.isArray(a.points) || a.points.length<3 || a.points.length>64 || !a.points.every(point) || !a.result || typeof a.result!=='object') fail('Un polígono del proyecto no es válido.');
    if (a.line && (!Array.isArray(a.line) || a.line.length!==2 || !a.line.every(point))) fail('Transecto inválido.');
  };
  if (state.library && (!Array.isArray(state.library) || state.library.length>500)) fail('Biblioteca demasiado grande.');
  for (const a of state.library ?? []) area(a);
  for (const [world,a] of Object.entries(state.polygons)) {if (!worlds.has(world) || a.world!==world) fail('Mundo inválido.');area(a);}
  if (state.library && new Set(state.library.map(a=>a.id)).size!==state.library.length) fail('Hay identificadores de polígonos duplicados.');
  if (state.drafts) {
    if (!Array.isArray(state.drafts) || state.drafts.length>500) fail('Borradores inválidos.');
    for (const [key,draft] of state.drafts) if (typeof key!=='string' || !draft || !Array.isArray(draft.points) || draft.points.length>64 || !draft.points.every(point) || !point(draft.mapCenter)) fail('Contorno en edición inválido.');
  }
  if (state.editor && (!worlds.has(state.editor.world) || !point(state.editor.center))) fail('Vista de edición inválida.');
  if (state.analysis && (!Array.isArray(state.analysis.found) || !point(state.analysis.center))) fail('Resultados de búsqueda inválidos.');
  if (state.values.missionPlans && (state.values.missionPlans.version!==1 || !state.values.missionPlans.plans || Array.isArray(state.values.missionPlans.plans) || typeof state.values.missionPlans.plans!=='object')) fail('Planes de ensayo inválidos.');
  if (state.cones?.result && (!Array.isArray(state.cones.result.measurements) || !Array.isArray(state.cones.result.limits))) fail('Mediciones de conos inválidas.');
  if (state.peruGeology?.result && (!state.peruGeology.result.measurement || !Array.isArray(state.peruGeology.result.measurement.units))) fail('Intersección geológica inválida.');
  return state;
}

export function projectDocument(state) {
  return {format:projectFormat,schemaVersion:1,appVersion:24,exportedAt:new Date().toISOString(),state};
}

export function parseProject(text) {
  if (typeof text!=='string' || text.length>projectLimit) fail('El proyecto supera el límite de 24 MB.');
  let file;
  try {file=JSON.parse(text);} catch {fail('El archivo no contiene JSON válido.');}
  if (file?.format!==projectFormat || file.schemaVersion!==1) fail('Selecciona un proyecto GeoTwin de versión compatible.');
  return validateState(file.state);
}

export function readTextFile(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}
