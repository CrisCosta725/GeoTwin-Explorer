import {elevation, loadRelief, offsetPoint, reliefSources} from './relief.js';
import {quantile,terrainIndicators} from './study-metrics.js';
import {hasCoordinates} from './coordinates.js';

export const terrainWindowKm = 20;
export const terrainStepKm = 2;
const metricCache = new Map();

export function summarizeTerrain(world, point, tile) {
  // Cap the source grid spacing at the comparison step, even where east–west
  // cells are narrower at high latitudes.
  if (tile.resolution>terrainStepKm*1000) return null;
  const intervals = terrainWindowKm/terrainStepKm;
  const samples = Array.from({length:intervals+1},(_,row)=>Array.from({length:intervals+1},(_,column)=>{
    const east = column*terrainStepKm-terrainWindowKm/2;
    const north = terrainWindowKm/2-row*terrainStepKm;
    return elevation(tile,offsetPoint(world,point,east,north));
  }));
  const heights = samples.flat();
  if (heights.some(z=>z===null)) return null;
  const cells = [];
  const slopes = [];
  const baseline = 2*terrainStepKm*1000;
  for (let y=0;y<=intervals;y++) {
    for (let x=0;x<=intervals;x++) {
      const cell={row:y,col:x,z:samples[y][x],slope:null};
      cells.push(cell);
      if (x===0 || y===0 || x===intervals || y===intervals) continue;
      const east = (samples[y][x+1]-samples[y][x-1])/baseline;
      const north = (samples[y-1][x]-samples[y+1][x])/baseline;
      cell.slope=Math.atan(Math.hypot(east,north))*180/Math.PI;
      slopes.push(cell.slope);
    }
  }
  return {...terrainIndicators(cells,terrainStepKm,4),relief:quantile(heights,.9)-quantile(heights,.1),slope:quantile(slopes,.5)};
}

export function terrainMetrics(world,point) {
  if (!hasCoordinates(point)) return Promise.reject(Error('Ubicación pendiente: no se puede calcular relieve sin coordenadas.'));
  const key = [world,point.lat,point.lon].join(',');
  if (!metricCache.has(key)) {
    const pending = loadRelief(world,point,terrainWindowKm).then(tile=>({
      metrics:summarizeTerrain(world,point,tile),
      resolution:tile.resolution,
      source:reliefSources[tile.source]
    }));
    metricCache.set(key,pending);
    pending.catch(()=>metricCache.delete(key));
  }
  return metricCache.get(key);
}
