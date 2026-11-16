import {createAstronaut3D} from './astronaut-3d.js';
let actor,drag=null,lastWorld='Earth',root,model;
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const bound=(n,min,max)=>Math.max(min,Math.min(max,n));
function place(x,y){
 const top=document.querySelector('.appbar').getBoundingClientRect().bottom+12;
 const ax=bound(x,8,Math.max(8,innerWidth-96));
 const ay=bound(y,top,Math.max(top,innerHeight-130));
 actor.style.left=ax+'px';actor.style.top=ay+'px';
 if(root && !root.hidden){
  const width=Math.min(350,innerWidth-20);
  root.style.left=bound(ax>innerWidth/2?ax-width:ax+88,10,Math.max(10,innerWidth-width-10))+'px';
  root.style.top=bound(ay-40,top,Math.max(top,innerHeight-320))+'px';
 }
}
export function moveAstronaut(world=lastWorld){
 if(!actor)return;lastWorld=world;
 const target=document.querySelector('[data-overview-world="'+world+'"]');
 const rect=target?.getBoundingClientRect();
 if(!rect?.width)return;
 actor.hidden=false;actor.dataset.action='flying';
 actor.dataset.world=world;
 place(rect.left+rect.width*.65,rect.top+rect.height*.65);
 actor.setAttribute('aria-label',document.documentElement.lang==='en'?'Astronaut: point to this planet. Drag to move.':'Astronauta: señalar este planeta. Arrastra para mover.');
}
export function animateAstronaut(panel,world){
 root=panel;
 const original=panel.querySelector('.astronaut-character');
 if(!actor){
  actor=document.createElement('button');actor.type='button';actor.className='astronaut-rover';
  actor.title=document.documentElement.lang==='en'?'Drag to move · Scroll to rotate · Click to point · Double-click to visit another planet':'Arrastra para mover · Rueda para girar · Clic para señalar · Doble clic para visitar otro planeta';
  document.body.append(actor);model=createAstronaut3D(actor);model.start();
  actor.addEventListener('pointerenter',()=>{if(!drag)actor.dataset.action='waving';});
  actor.addEventListener('pointerleave',()=>{if(!drag)actor.dataset.action='floating';});
  actor.addEventListener('wheel',event=>{event.preventDefault();model.rotate(event.deltaY*.005);},{passive:false});
  actor.addEventListener('dblclick',()=>{
   const worlds=['Earth','Moon','Mars'];const next=worlds[(worlds.indexOf(lastWorld)+1)%3];
   document.querySelector('button[data-world="'+next+'"]').click();
  });
  actor.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;
   const rect=actor.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
   actor.setPointerCapture?.(event.pointerId);actor.dataset.action='dragging';
  });
  actor.addEventListener('pointermove',event=>{
   if(drag?.id!==event.pointerId)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(Math.hypot(dx,dy)>5)drag.moved=true;
   if(drag.moved)place(drag.left+dx,drag.top+dy);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])actor.addEventListener(type,event=>{
   if(drag?.id!==event.pointerId)return;
   actor.dataset.suppressClick=String(drag.moved||type!=='pointerup');drag=null;actor.dataset.action='floating';
  });
  actor.addEventListener('click',()=>{
   if(actor.dataset.suppressClick==='true'){actor.dataset.suppressClick='false';return;}
   const planet=document.querySelector('[data-overview-world="'+lastWorld+'"]');
   actor.dataset.action='pointing';
   planet?.focus({preventScroll:true});
   if(!reduced())planet?.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.35)'},{filter:'brightness(1)'}],{duration:700});
   const next=root?.querySelector('[data-guide-step="1"]');if(next&&!next.disabled)next.click();
  });
  actor.addEventListener('transitionend',()=>{if(!drag)actor.dataset.action='floating';});
  window.addEventListener('resize',()=>moveAstronaut());
  new MutationObserver(()=>{actor.hidden=root.hidden;}).observe(panel,{attributes:true,attributeFilter:['hidden']});
 }
 actor.title=document.documentElement.lang==='en'?'Drag to move · Scroll to rotate · Click to point · Double-click to visit another planet':'Arrastra para mover · Rueda para girar · Clic para señalar · Doble clic para visitar otro planeta';
 original?.remove();moveAstronaut(world);
}
