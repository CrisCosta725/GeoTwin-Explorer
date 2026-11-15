import {profiles} from './analogs.js';
import {activePlanetaryAreas} from './areas.js';

// Compare recorded traits only. An operational association is not a measured match.
export function planetaryMatches(site) {
  return Object.fromEntries(['Moon','Mars'].map(world=>[world,site.originStatus==='unverified'?[]:
    activePlanetaryAreas(world).map(area=>{
      const profile=profiles[world].find(item=>item.id===area.profile);
      const matches=['geology','terrain'].flatMap(field=>(profile?.[field]??[])
        .filter(tag=>site[field]?.includes(tag)).map(tag=>({field,tag})));
      const missing=['geology','terrain'].flatMap(field=>(profile?.[field]??[])
        .filter(tag=>!site[field]?.includes(tag)));
      return {area,matches,missing,associated:profile?.earth?.includes(site.id)??false};
    }).filter(row=>row.matches.length>0)
      .sort((a,b)=>Number(b.associated)-Number(a.associated)||b.matches.length-a.matches.length||a.missing.length-b.missing.length)
      .slice(0,3)]));
}

export function terrestrialMatches(world,areaId,earthSites) {
  return earthSites.filter(site=>planetaryMatches(site)[world].some(match=>match.area.id===areaId))
    .map(site=>site.id);
}
