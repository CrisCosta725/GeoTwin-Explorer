import {analogs, profiles} from './analogs.js';
import {baseAssessments} from './base-assessment.js';
import {summarizeEvidence} from './evidence-quality.js';

export const initial = {body:'Mars',profile:'arcadia-ap1'};
export const bodyLabel = {Mars:'Marte',Moon:'Luna'};
export const getProfile = ({body,profile}) => profiles[body]?.find(item=>item.id===profile);
const levels = [{min:75,label:'Alta',className:'high'},{min:45,label:'Media',className:'mid'},{min:0,label:'Baja',className:'low'}];
export const category = score=>levels.find(level=>score>=level.min);

export function ranking(config, groups) {
  const profile=getProfile(config);
  const thematic=groups ?? [
    {field:'geology',label:'Geología',values:profile.geology},
    {field:'terrain',label:'Geomorfología y ambiente',values:profile.terrain}
  ];
  const curated=new Set([...Object.keys(baseAssessments[profile.id]?.pairs ?? {}),...(profile.earth ?? [])]);
  return analogs.map(site=>{
    const detail=thematic.filter(group=>group.values.length).map(group=>{
      const known=Array.isArray(site[group.field]) && site[group.field].length>0;
      const matches=group.values.filter(tag=>site[group.field]?.includes(tag));
      return {label:group.label,matches,missing:group.values.filter(tag=>!matches.includes(tag)),
        score:known ? 100*matches.length/group.values.length : null};
    });
    const known=detail.filter(criterion=>criterion.score!==null);
    const score=known.length ? Math.round(known.reduce((sum,criterion)=>sum+criterion.score,0)/known.length) : null;
    const evidenceSummary=summarizeEvidence(site,thematic);
    return {...site,detail,score,coverage:evidenceSummary.coverage,evidenceSummary,curated:curated.has(site.id)};
  }).sort((a,b)=>(b.score ?? -1)-(a.score ?? -1) || b.coverage-a.coverage || Number(b.curated)-Number(a.curated) || a.name.localeCompare(b.name,'es'));
}
