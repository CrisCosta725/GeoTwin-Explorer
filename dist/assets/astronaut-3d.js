import * as THREE from './three.module.min.js';
import {createAstronautModel,createProceduralTextures} from './astronaut-model.js';
import {createAstronaut3D as createFallback} from './astronaut-fallback.js';

export function createAstronaut3D(button){
 if(!window.WebGLRenderingContext){
  console.warn('WebGL is unavailable; using the simplified astronaut.');
  return createFallback(button);
 }
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
 }catch(error){
  console.warn('Could not initialize the 3D astronaut; using the simplified astronaut.',error);
  return createFallback(button);
 }
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setSize(140,185,false);
 renderer.setClearColor(0x000000,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.domElement.setAttribute('aria-hidden','true');
 button.replaceChildren(renderer.domElement);

 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(42,140/185,.1,100);
 camera.position.set(0,1.05,3.8);
 camera.lookAt(0,1.02,0);
 scene.add(new THREE.HemisphereLight(0xdbeafe,0x1e293b,1.2));
 const key=new THREE.DirectionalLight(0xfffbeb,2.2);key.position.set(2.8,4.2,3.4);scene.add(key);
 const rim=new THREE.DirectionalLight(0x38bdf8,1.45);rim.position.set(-3,2.5,-2.5);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xe0f2fe,.65);fill.position.set(-2.5,1,2.5);scene.add(fill);
 const astronaut=createAstronautModel(createProceduralTextures());
 scene.add(astronaut.root);
 let frame=0,last=0,yaw=0;
 function draw(time){
  frame=0;
  if(button.hidden||document.hidden)return;
  if(time-last<33){frame=requestAnimationFrame(draw);return;}
  last=time;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
  const t=reduced?0:time/1000;
  const action=button.dataset.action??'floating';
  const flying=action==='flying'||action==='dragging';
  const pointing=action==='pointing'||action==='scanning';
  const waving=action==='waving';
  const j=astronaut.joints;
  astronaut.root.rotation.y=yaw+(reduced?0:Math.sin(t*.7)*.15);
  j.pelvis.position.y=1.02+(reduced?0:Math.sin(t*1.8)*.04);
  j.pelvis.rotation.z=flying?-.14:Math.sin(t*.9)*.06;
  j.rightShoulder.rotation.z=waving?-1.95:pointing?-1.45:flying?-.9:-.55;
  j.rightShoulder.rotation.x=-.18;
  j.rightElbow.rotation.x=waving?-.65+Math.cos(t*3.2)*.18:-.45;
  j.rightWrist.rotation.y=waving?.35+Math.sin(t*3.2)*.2:0;
  j.leftShoulder.rotation.z=flying?1.0:.55;
  j.leftElbow.rotation.x=-.35;
  j.rightHip.rotation.x=-.28+Math.sin(t*1.2)*.1;
  j.rightKnee.rotation.x=.45+Math.cos(t*1.2)*.1;
  j.leftHip.rotation.x=-.15-Math.sin(t*1.2)*.1;
  j.leftKnee.rotation.x=.35;
  astronaut.setHandCurl('right',waving?.08:.35);
  astronaut.setHandCurl('left',.3);
  for(const thruster of astronaut.bootThrusters){
   thruster.flameGroup.visible=flying;
   thruster.jetLight.intensity=flying?.7:0;
   if(flying)thruster.flameGroup.scale.y=.8+Math.sin(t*20+thruster.phaseOffset)*.12;
  }
  renderer.render(scene,camera);
  if(!reduced)frame=requestAnimationFrame(draw);
 }
 const start=()=>{if(!frame&&!button.hidden)frame=requestAnimationFrame(draw);};
 new MutationObserver(start).observe(button,{attributes:true,attributeFilter:['hidden','data-action']});
 document.addEventListener('visibilitychange',start);
 return {start,rotate(amount){yaw+=amount;start();}};
}
