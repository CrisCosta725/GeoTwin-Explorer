export const defaultTolerances=Object.freeze({slopeDeg:.1,geologyFraction:.01,terrainFraction:.01});

export function normalizeTolerances(values={}) {
  return Object.fromEntries(Object.entries(defaultTolerances).map(([key,fallback])=>{
    const value=values[key];
    return [key,Number.isFinite(value) && value>=0?Math.min(key==='slopeDeg'?90:1,value):fallback];
  }));
}

// Each band is anchored to its best value. This produces a transitive ordering;
// a pairwise "within tolerance" sort comparator would not.
function bands(rows,criteria) {
  let groups=[rows];
  for (const {read,descending,tolerance} of criteria) {
    groups=groups.flatMap(group=>{
      const sorted=[...group].sort((a,b)=>{
        const x=read(a),y=read(b);
        return Number(!Number.isFinite(x))-Number(!Number.isFinite(y)) ||
          (Number.isFinite(x)&&Number.isFinite(y)?(descending?y-x:x-y):0) || a.id.localeCompare(b.id,'es',{numeric:true});
      });
      const result=[];
      let anchor;
      for (const row of sorted) {
        const value=read(row);
        const same=result.length && (Number.isFinite(anchor)&&Number.isFinite(value)?
          Math.abs(value-anchor)<=tolerance+1e-12:!Number.isFinite(anchor)&&!Number.isFinite(value));
        if (!same) {result.push([]);anchor=value;}
        result.at(-1).push(row);
      }
      return result;
    });
  }
  return groups.map(group=>group.sort((a,b)=>a.id.localeCompare(b.id,'es',{numeric:true})));
}

export function rankWithPolicy(areas,reference,limit,priority,hasGeology,options) {
  const tolerances=normalizeTolerances(options);
  const referenceComparable=Number.isFinite(reference.slope) && reference.slopeCoverage>=.8;
  const rows=areas.map(area=>{
    const data=area.stats;
    const slopes=area.slopes.filter(Number.isFinite);
    const coverage=data.samples?slopes.length/data.samples:0;
    const pass=slopes.length?slopes.filter(slope=>slope<=limit).length/slopes.length:null;
    const delta=Number.isFinite(data.slope)&&referenceComparable?Math.abs(data.slope-reference.slope):null;
    const geologyComparable=!hasGeology || (area.geology?.status==='covered' && area.geology.coverage>=.8 && area.geology.matched>0);
    const exclusions=[];
    if (!referenceComparable) exclusions.push('Referencia sin pendiente o cobertura comparable');
    if (coverage<.8) exclusions.push('Cobertura de pendiente inferior al 80 %');
    if (pass==null || pass<.75) exclusions.push('Menos del 75 % de las celdas evaluables bajo el umbral');
    if (delta==null && referenceComparable) exclusions.push('Sin pendiente mediana comparable');
    if (!geologyComparable) exclusions.push('Sin rasgo respaldado por cartografía suficiente en la huella');
    return {...area,stats:{...data,pass},coverage,pass,delta,exclusions,eligible:exclusions.length===0};
  });
  const isControl=row=>row.id==='known'||row.id==='control';
  const choices=rows.filter(row=>!isControl(row));
  const terrain={read:row=>row.delta,tolerance:tolerances.slopeDeg};
  const geology={read:row=>row.geology?.share,descending:true,tolerance:tolerances.geologyFraction};
  const fraction={read:row=>row.pass,descending:true,tolerance:tolerances.terrainFraction};
  const criteria=priority==='geology'&&hasGeology?[geology,terrain,fraction]:[terrain,...(hasGeology?[geology]:[]),fraction];
  const eligible=bands(choices.filter(row=>row.eligible),criteria);
  const excluded=bands(choices.filter(row=>!row.eligible),criteria);
  const ordered=[...eligible,...excluded].flat();
  const equivalent=eligible[0] ?? [];
  const leader=equivalent[0] ?? null;
  return {choices:ordered,controls:rows.filter(isControl),leader,equivalent,tolerances,
    alternative:leader?ordered.find(row=>row!==leader)??null:null};
}

export function reasonWithPolicy(outcome,priority,hasGeology) {
  const {leader,alternative,equivalent,tolerances}=outcome;
  if (!leader) return 'Ningún candidato cumple los mínimos de cobertura, pendiente y evidencia exigidos en este escenario.';
  if (equivalent.length>1) return 'Equivalencia entre '+equivalent.map(row=>row.label).join(' y ')+
    '. Las diferencias quedan dentro de los márgenes de decisión. El identificador fija el orden de presentación; no hay un ganador único.';
  if (!alternative) return leader.label+' es el único candidato que cumple los mínimos de este escenario.';
  if (!alternative.eligible) return leader.label+' cumple los mínimos. '+alternative.label+' queda fuera: '+alternative.exclusions.join('; ')+'.';
  const significantGeology=hasGeology && leader.geology.share-alternative.geology.share>tolerances.geologyFraction;
  if (priority==='geology' && significantGeology) return leader.label+' encabeza el orden por la superficie cartografiada del rasgo, por encima del margen de decisión.';
  if (alternative.delta-leader.delta>tolerances.slopeDeg) return leader.label+' tiene una pendiente mediana más cercana a la referencia, por encima del margen de decisión.';
  if (significantGeology) return leader.label+' tiene más superficie cartografiada del rasgo con pendientes equivalentes dentro del margen.';
  return leader.label+' tiene una mayor fracción de terreno bajo el umbral entre candidatos equivalentes en los criterios anteriores.';
}

export function summarizeScenarios(grid) {
  const counts=new Map();
  let computed=0,withoutCandidate=0,tied=0;
  for (const {outcomes} of grid) for (const outcome of outcomes) {
    if (!outcome) continue;
    computed++;
    if (!outcome.leader) {withoutCandidate++;continue;}
    if (outcome.equivalent.length>1) tied++;
    for (const row of outcome.equivalent) counts.set(row.id,(counts.get(row.id) ?? 0)+1);
  }
  return {computed,withoutCandidate,tied,firstOrEquivalent:Object.fromEntries(counts),
    interpretation:'Frecuencia dentro de los escenarios calculados; no es una probabilidad ni un intervalo de confianza.'};
}
