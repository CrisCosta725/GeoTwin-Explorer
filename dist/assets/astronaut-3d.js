import * as THREE from "./three.module.min.js";
import {damp} from './motion.js';

import { createAstronautModel, createProceduralTextures } from "./astronaut-model.js";

import { createAstronaut3D as createFallback } from "./astronaut-fallback.js";

export function createAstronaut3D(button) {
  if (!window.WebGLRenderingContext) {
    console.warn("WebGL is unavailable; using the simplified astronaut.");
    return createFallback(button);
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
  } catch (error) {
    console.warn("Could not initialize the 3D astronaut; using the simplified astronaut.", error);
    return createFallback(button);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(140, 185, false);
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute("aria-hidden", "true");
  button.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene;
  const camera = new THREE.PerspectiveCamera(42, 140 / 185, .1, 100);
  camera.position.set(0, 1.05, 3.8);
  camera.lookAt(0, 1.02, 0);
  scene.add(new THREE.HemisphereLight(14412542, 1976635, 1.2));
  const key = new THREE.DirectionalLight(16776171, 2.2);
  key.position.set(2.8, 4.2, 3.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(3718648, 1.45);
  rim.position.set(-3, 2.5, -2.5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(14742270, .65);
  fill.position.set(-2.5, 1, 2.5);
  scene.add(fill);
  const astronaut = createAstronautModel(createProceduralTextures());
  scene.add(astronaut.root);
  let frame = 0, last = 0, yaw = 0, renderedYaw = 0, handCurl = .35, power = 0;
  function draw(time) {
    frame = 0;
    if (button.hidden || document.hidden) return;
    const elapsed=last?Math.min(50,time-last):16;
    last = time;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const t = reduced ? 0 : time / 1e3;
    const action = button.dataset.action ?? "floating";
    const flying = action === "flying" || action === "dragging";
    const pointing = action === "pointing" || action === "scanning";
    const waving = action === "waving";
    const j = astronaut.joints;
    const blend=(object,key,target)=>{object[key]=reduced?target:damp(object[key],target,elapsed,140);};
    renderedYaw=reduced?yaw:damp(renderedYaw,yaw,elapsed,150);
    astronaut.root.rotation.y = renderedYaw + (reduced ? 0 : Math.sin(t * .7) * .15);
    j.pelvis.position.y = 1.02 + (reduced ? 0 : Math.sin(t * 1.8) * .04);
    blend(j.pelvis.rotation,'z',flying ? -.14 : Math.sin(t * .9) * .06);
    blend(j.rightShoulder.rotation,'z',waving ? -1.95 : pointing ? -1.45 : flying ? -.9 : -.55);
    j.rightShoulder.rotation.x = -.18;
    blend(j.rightElbow.rotation,'x',waving ? -.65 + Math.cos(t * 3.2) * .18 : -.45);
    blend(j.rightWrist.rotation,'y',waving ? .35 + Math.sin(t * 3.2) * .2 : 0);
    blend(j.leftShoulder.rotation,'z',flying ? 1 : .55);
    j.leftElbow.rotation.x = -.35;
    j.rightHip.rotation.x = -.28 + Math.sin(t * 1.2) * .1;
    j.rightKnee.rotation.x = .45 + Math.cos(t * 1.2) * .1;
    j.leftHip.rotation.x = -.15 - Math.sin(t * 1.2) * .1;
    j.leftKnee.rotation.x = .35;
    handCurl=reduced?(waving ? .08 : .35):damp(handCurl,waving ? .08 : .35,elapsed,140);
    astronaut.setHandCurl("right", handCurl);
    astronaut.setHandCurl("left", .3);
    power=reduced?Number(flying):damp(power,Number(flying),elapsed,180);
    for (const thruster of astronaut.bootThrusters) {
      thruster.flameGroup.visible = power>.01;
      thruster.jetLight.intensity = power*.7;
      thruster.flameGroup.scale.y = power*(.8 + Math.sin(t * 9 + thruster.phaseOffset) * .05);
    }
    renderer.render(scene, camera);
    if (!reduced) frame = requestAnimationFrame(draw);
  }
  const start = () => {
    if (!frame && !button.hidden) frame = requestAnimationFrame(draw);
  };
  new MutationObserver(start).observe(button, {
    attributes: true,
    attributeFilter: [ "hidden", "data-action" ]
  });
  document.addEventListener("visibilitychange", start);
  return {
    start: start,
    rotate(amount) {
      yaw += amount;
      start();
    }
  };
}
