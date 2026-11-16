import * as THREE from "./three.module.min.js";

function createProceduralTextures() {
  const suitSize = 512;
  const suitColorCanvas = document.createElement("canvas");
  const suitBumpCanvas = document.createElement("canvas");
  const suitRoughCanvas = document.createElement("canvas");
  suitColorCanvas.width = suitBumpCanvas.width = suitRoughCanvas.width = suitSize;
  suitColorCanvas.height = suitBumpCanvas.height = suitRoughCanvas.height = suitSize;
  const cCtx = suitColorCanvas.getContext("2d");
  const bCtx = suitBumpCanvas.getContext("2d");
  const rCtx = suitRoughCanvas.getContext("2d");
  cCtx.fillStyle = "#f2efe9";
  cCtx.fillRect(0, 0, suitSize, suitSize);
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, suitSize, suitSize);
  rCtx.fillStyle = "#9e9e9e";
  rCtx.fillRect(0, 0, suitSize, suitSize);
  for (let y = 0; y < suitSize; y += 2) for (let x = 0; x < suitSize; x += 2) {
    const weave = (x + y) % 4 === 0 ? 8 : -8;
    const noise = (Math.random() - .5) * 10;
    const bVal = Math.max(0, Math.min(255, 128 + weave + noise));
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(x, y, 2, 2);
    const cShade = Math.max(225, Math.min(248, 241 + weave * .35 + noise * .3));
    cCtx.fillStyle = `rgb(${cShade}, ${cShade - 3}, ${cShade - 8})`;
    cCtx.fillRect(x, y, 2, 2);
  }
  for (let i = 0; i < 45; i++) {
    const wx = Math.random() * suitSize;
    const wy = Math.random() * suitSize;
    const rad = 18 + Math.random() * 45;
    const grad = cCtx.createRadialGradient(wx, wy, 2, wx, wy, rad);
    grad.addColorStop(0, "rgba(185, 178, 168, 0.09)");
    grad.addColorStop(1, "rgba(185, 178, 168, 0)");
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, suitSize, suitSize);
    const rGrad = rCtx.createRadialGradient(wx, wy, 2, wx, wy, rad);
    rGrad.addColorStop(0, "rgba(220, 220, 220, 0.18)");
    rGrad.addColorStop(1, "rgba(150, 150, 150, 0)");
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(0, 0, suitSize, suitSize);
  }
  cCtx.strokeStyle = "rgba(175, 168, 156, 0.55)";
  cCtx.lineWidth = 2;
  cCtx.setLineDash([ 6, 4 ]);
  bCtx.strokeStyle = "#303030";
  bCtx.lineWidth = 2.5;
  bCtx.setLineDash([ 6, 4 ]);
  [ 64, 256, 448 ].forEach(pos => {
    cCtx.beginPath();
    cCtx.moveTo(pos, 0);
    cCtx.lineTo(pos, suitSize);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(pos, 0);
    bCtx.lineTo(pos, suitSize);
    bCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(0, pos);
    cCtx.lineTo(suitSize, pos);
    cCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, pos);
    bCtx.lineTo(suitSize, pos);
    bCtx.stroke();
  });
  const suitMap = new THREE.CanvasTexture(suitColorCanvas);
  const suitBump = new THREE.CanvasTexture(suitBumpCanvas);
  const suitRough = new THREE.CanvasTexture(suitRoughCanvas);
  [ suitMap, suitBump, suitRough ].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
  });
  suitMap.colorSpace = THREE.SRGBColorSpace;
  const rubberSize = 256;
  const rubberBumpCanvas = document.createElement("canvas");
  const rubberRoughCanvas = document.createElement("canvas");
  rubberBumpCanvas.width = rubberRoughCanvas.width = rubberSize;
  rubberBumpCanvas.height = rubberRoughCanvas.height = rubberSize;
  const rbCtx = rubberBumpCanvas.getContext("2d");
  const rrCtx = rubberRoughCanvas.getContext("2d");
  rbCtx.fillStyle = "#808080";
  rbCtx.fillRect(0, 0, rubberSize, rubberSize);
  rrCtx.fillStyle = "#787878";
  rrCtx.fillRect(0, 0, rubberSize, rubberSize);
  for (let y = 0; y < rubberSize; y++) for (let x = 0; x < rubberSize; x++) {
    const grain = (Math.random() - .5) * 22;
    const rib = Math.sin(y * .45) * 10;
    const v = Math.max(0, Math.min(255, 128 + grain + rib));
    rbCtx.fillStyle = `rgb(${v},${v},${v})`;
    rbCtx.fillRect(x, y, 1, 1);
    const rv = Math.max(80, Math.min(200, 120 + grain * 1.4));
    rrCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rrCtx.fillRect(x, y, 1, 1);
  }
  const rubberBump = new THREE.CanvasTexture(rubberBumpCanvas);
  const rubberRough = new THREE.CanvasTexture(rubberRoughCanvas);
  [ rubberBump, rubberRough ].forEach(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
  });
  const hoseCanvas = document.createElement("canvas");
  hoseCanvas.width = hoseCanvas.height = 128;
  const hCtx = hoseCanvas.getContext("2d");
  hCtx.fillStyle = "#707070";
  hCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    hCtx.fillStyle = "#d0d0d0";
    hCtx.fillRect(0, y, 128, 4);
    for (let x = 0; x < 128; x += 8) {
      hCtx.fillStyle = (x + y) % 16 === 0 ? "#909090" : "#505050";
      hCtx.fillRect(x, y, 4, 8);
    }
  }
  const hoseBump = new THREE.CanvasTexture(hoseCanvas);
  hoseBump.wrapS = hoseBump.wrapT = THREE.RepeatWrapping;
  hoseBump.repeat.set(2, 16);
  const envCanvas = document.createElement("canvas");
  envCanvas.width = 1024;
  envCanvas.height = 512;
  const eCtx = envCanvas.getContext("2d");
  const spaceGrad = eCtx.createLinearGradient(0, 0, 0, 512);
  spaceGrad.addColorStop(0, "#02040a");
  spaceGrad.addColorStop(.45, "#071329");
  spaceGrad.addColorStop(.75, "#0c2447");
  spaceGrad.addColorStop(1, "#02050d");
  eCtx.fillStyle = spaceGrad;
  eCtx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 450; i++) {
    const sx = Math.random() * 1024;
    const sy = Math.random() * 340;
    const sr = Math.random() * 1.4;
    eCtx.fillStyle = `rgba(255, 255, 255, ${.4 + Math.random() * .6})`;
    eCtx.beginPath();
    eCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    eCtx.fill();
  }
  const earthX = 512;
  const earthY = 430;
  const earthR = 230;
  const atmoGrad = eCtx.createRadialGradient(earthX, earthY, earthR * .88, earthX, earthY, earthR * 1.15);
  atmoGrad.addColorStop(0, "rgba(56, 189, 248, 0.85)");
  atmoGrad.addColorStop(.4, "rgba(14, 165, 233, 0.45)");
  atmoGrad.addColorStop(1, "rgba(2, 132, 199, 0)");
  eCtx.fillStyle = atmoGrad;
  eCtx.beginPath();
  eCtx.arc(earthX, earthY, earthR * 1.15, 0, Math.PI * 2);
  eCtx.fill();
  eCtx.save();
  eCtx.beginPath();
  eCtx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
  eCtx.clip();
  const oceanGrad = eCtx.createRadialGradient(earthX - 50, earthY - 80, 20, earthX, earthY, earthR);
  oceanGrad.addColorStop(0, "#38bdf8");
  oceanGrad.addColorStop(.5, "#0369a1");
  oceanGrad.addColorStop(1, "#082f49");
  eCtx.fillStyle = oceanGrad;
  eCtx.fillRect(earthX - earthR, earthY - earthR, earthR * 2, earthR * 2);
  eCtx.fillStyle = "#4d7c5b";
  eCtx.beginPath();
  eCtx.ellipse(earthX - 65, earthY - 95, 55, 32, -.3, 0, Math.PI * 2);
  eCtx.fill();
  eCtx.fillStyle = "#8c7a5b";
  eCtx.beginPath();
  eCtx.ellipse(earthX + 55, earthY - 75, 65, 40, .25, 0, Math.PI * 2);
  eCtx.fill();
  eCtx.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (let c = 0; c < 38; c++) {
    const cx = earthX + (Math.random() - .5) * earthR * 1.6;
    const cy = earthY - 30 - Math.random() * (earthR * .85);
    const cw = 25 + Math.random() * 65;
    const ch = 6 + Math.random() * 14;
    eCtx.beginPath();
    eCtx.ellipse(cx, cy, cw, ch, (Math.random() - .5) * .4, 0, Math.PI * 2);
    eCtx.fill();
  }
  eCtx.restore();
  const sunGrad = eCtx.createRadialGradient(330, 175, 4, 330, 175, 95);
  sunGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  sunGrad.addColorStop(.25, "rgba(254, 240, 138, 0.75)");
  sunGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
  eCtx.fillStyle = sunGrad;
  eCtx.fillRect(0, 0, 1024, 512);
  const visorEnvMap = new THREE.CanvasTexture(envCanvas);
  visorEnvMap.mapping = THREE.EquirectangularReflectionMapping;
  visorEnvMap.colorSpace = THREE.SRGBColorSpace;
  return {
    suitMap: suitMap,
    suitBump: suitBump,
    suitRough: suitRough,
    rubberBump: rubberBump,
    rubberRough: rubberRough,
    hoseBump: hoseBump,
    visorEnvMap: visorEnvMap
  };
}

function createAstronautModel(textures) {
  const root = new THREE.Group;
  const joints = {};
  const boneHelpers = [];
  const suitCreamMat = new THREE.MeshStandardMaterial({
    color: 16052714,
    map: textures.suitMap,
    bumpMap: textures.suitBump,
    bumpScale: .008,
    roughnessMap: textures.suitRough,
    roughness: .68,
    metalness: .04
  });
  const tanTrimMat = new THREE.MeshStandardMaterial({
    color: 11572077,
    bumpMap: textures.rubberBump,
    bumpScale: .006,
    roughnessMap: textures.rubberRough,
    roughness: .52,
    metalness: .12
  });
  const slateBlueMat = new THREE.MeshStandardMaterial({
    color: 4942728,
    bumpMap: textures.rubberBump,
    bumpScale: .007,
    roughnessMap: textures.rubberRough,
    roughness: .55,
    metalness: .15
  });
  const cobaltButtonMat = new THREE.MeshPhysicalMaterial({
    color: 1926072,
    roughness: .25,
    metalness: .1,
    clearcoat: .6,
    clearcoatRoughness: .2
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 2765632,
    roughness: .38,
    metalness: .82
  });
  const visorGlassMat = new THREE.MeshPhysicalMaterial({
    color: 1450032,
    emissive: 330518,
    emissiveIntensity: .18,
    metalness: .15,
    roughness: .04,
    transmission: .72,
    ior: 1.52,
    thickness: .18,
    attenuationColor: new THREE.Color(1783389),
    attenuationDistance: .35,
    envMap: textures.visorEnvMap,
    envMapIntensity: 2.1,
    clearcoat: 1,
    clearcoatRoughness: .03,
    reflectivity: 1
  });
  const innerHelmetMat = new THREE.MeshStandardMaterial({
    color: 1120034,
    bumpMap: textures.rubberBump,
    bumpScale: .01,
    roughness: .85,
    metalness: .15
  });
  const gloveGripPadMat = new THREE.MeshStandardMaterial({
    color: 2834002,
    bumpMap: textures.rubberBump,
    bumpScale: .014,
    roughnessMap: textures.rubberRough,
    roughness: .72,
    metalness: .12
  });
  const hoseMat = new THREE.MeshStandardMaterial({
    color: 9275778,
    bumpMap: textures.hoseBump,
    bumpScale: .015,
    roughness: .78,
    metalness: .08
  });
  const thrusterNozzleMat = new THREE.MeshStandardMaterial({
    color: 1976635,
    roughness: .3,
    metalness: .88
  });
  const thrusterGlowRingMat = new THREE.MeshBasicMaterial({
    color: 3718648
  });
  const jetOuterFlameMat = new THREE.MeshBasicMaterial({
    color: 959977,
    transparent: true,
    opacity: .72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const jetCoreFlameMat = new THREE.MeshBasicMaterial({
    color: 14742270,
    transparent: true,
    opacity: .92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const bootThrusters = [];
  function attachBoneHelper(parentJoint, length = .25) {
    const boneGroup = new THREE.Group;
    boneGroup.visible = false;
    const jointSphere = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 12), new THREE.MeshBasicMaterial({
      color: 3718648,
      depthTest: false,
      transparent: true,
      opacity: .9
    }));
    boneGroup.add(jointSphere);
    if (length !== 0) {
      const absLen = Math.abs(length);
      const dir = Math.sign(length);
      const boneCone = new THREE.Mesh(new THREE.ConeGeometry(.016, absLen, 8), new THREE.MeshBasicMaterial({
        color: 3462041,
        wireframe: true,
        depthTest: false,
        transparent: true,
        opacity: .75
      }));
      boneCone.position.y = dir * (absLen * .5);
      if (dir < 0) boneCone.rotation.x = Math.PI;
      boneGroup.add(boneCone);
    }
    parentJoint.add(boneGroup);
    boneHelpers.push(boneGroup);
  }
  const pelvis = new THREE.Group;
  pelvis.position.set(0, .95, 0);
  root.add(pelvis);
  joints.pelvis = pelvis;
  attachBoneHelper(pelvis, .22);
  const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(.24, .21, .22, 32), suitCreamMat);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  pelvis.add(pelvisMesh);
  const pelvisBottomCap = new THREE.Mesh(new THREE.SphereGeometry(.21, 32, 16, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), suitCreamMat);
  pelvisBottomCap.position.y = -.11;
  pelvisBottomCap.scale.set(1, .65, .95);
  pelvis.add(pelvisBottomCap);
  const beltRing = new THREE.Mesh(new THREE.TorusGeometry(.238, .026, 16, 40), slateBlueMat);
  beltRing.rotation.x = Math.PI / 2;
  beltRing.position.y = .09;
  pelvis.add(beltRing);
  const spine = new THREE.Group;
  spine.position.set(0, .12, 0);
  pelvis.add(spine);
  joints.spine = spine;
  attachBoneHelper(spine, .34);
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(.27, .245, .36, 32), suitCreamMat);
  torsoMesh.position.y = .18;
  torsoMesh.scale.set(1.04, 1, .92);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  spine.add(torsoMesh);
  const chestCollar = new THREE.Mesh(new THREE.TorusGeometry(.22, .028, 16, 40), slateBlueMat);
  chestCollar.rotation.x = Math.PI / 2 + .18;
  chestCollar.position.set(0, .34, .02);
  spine.add(chestCollar);
  const chestUnit = new THREE.Group;
  chestUnit.position.set(0, .19, .245);
  chestUnit.rotation.x = -.08;
  spine.add(chestUnit);
  const chestBox = new THREE.Mesh(new THREE.BoxGeometry(.22, .13, .055), suitCreamMat);
  chestBox.castShadow = true;
  chestUnit.add(chestBox);
  const chestBezel = new THREE.Mesh(new THREE.BoxGeometry(.232, .142, .02), tanTrimMat);
  chestBezel.position.z = -.015;
  chestUnit.add(chestBezel);
  [ -.055, .055 ].forEach((bx, idx) => {
    const btnRing = new THREE.Mesh(new THREE.CylinderGeometry(.032, .034, .02, 24), darkMetalMat);
    btnRing.rotation.x = Math.PI / 2;
    btnRing.position.set(bx, 0, .03);
    chestUnit.add(btnRing);
    const btnCap = new THREE.Mesh(new THREE.SphereGeometry(.026, 20, 16), cobaltButtonMat);
    btnCap.position.set(bx, idx === 0 ? -.004 : .004, .038);
    btnCap.scale.set(1, 1, .65);
    chestUnit.add(btnCap);
  });
  const backpackGroup = new THREE.Group;
  backpackGroup.position.set(0, .22, -.25);
  spine.add(backpackGroup);
  const packMain = new THREE.Mesh(new THREE.BoxGeometry(.36, .42, .16), suitCreamMat);
  packMain.castShadow = true;
  packMain.receiveShadow = true;
  backpackGroup.add(packMain);
  const packTrim = new THREE.Mesh(new THREE.BoxGeometry(.38, .06, .175), slateBlueMat);
  packTrim.position.y = .14;
  backpackGroup.add(packTrim);
  [ -.14, .14 ].forEach(hx => {
    const hoseCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(hx, .16, .04), new THREE.Vector3(hx * 1.15, .24, .16), new THREE.Vector3(hx * .95, .18, .28) ]);
    const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 20, .022, 12, false), hoseMat);
    hoseMesh.castShadow = true;
    backpackGroup.add(hoseMesh);
  });
  const neck = new THREE.Group;
  neck.position.set(0, .37, .01);
  spine.add(neck);
  joints.neck = neck;
  attachBoneHelper(neck, .28);
  const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .07, 32), tanTrimMat);
  neck.add(neckRing);
  const helmetGroup = new THREE.Group;
  helmetGroup.position.set(0, .27, .01);
  joints.neck.add(helmetGroup);
  const helmetMain = new THREE.Mesh(new THREE.SphereGeometry(.34, 48, 40, Math.PI * .28, Math.PI * 1.44, 0, Math.PI), suitCreamMat);
  helmetMain.rotation.y = Math.PI * .5;
  helmetMain.scale.set(1.03, 1, 1.04);
  helmetMain.castShadow = true;
  helmetMain.receiveShadow = true;
  helmetGroup.add(helmetMain);
  const helmetInterior = new THREE.Mesh(new THREE.SphereGeometry(.305, 32, 28), innerHelmetMat);
  helmetInterior.position.set(0, 0, -.02);
  helmetGroup.add(helmetInterior);
  const innerHudRing = new THREE.Mesh(new THREE.TorusGeometry(.21, .008, 12, 36), new THREE.MeshBasicMaterial({
    color: 3718648,
    transparent: true,
    opacity: .22
  }));
  innerHudRing.position.set(0, .01, .195);
  innerHudRing.scale.set(1.06, .92, 1);
  helmetGroup.add(innerHudRing);
  const crestGeo = new THREE.TorusGeometry(.341, .032, 16, 48, Math.PI * 1.15);
  const crestMesh = new THREE.Mesh(crestGeo, tanTrimMat);
  crestMesh.rotation.y = Math.PI / 2;
  crestMesh.rotation.z = -Math.PI * .08;
  crestMesh.scale.set(1.04, 1.01, 1.4);
  helmetGroup.add(crestMesh);
  const visorRubberSeal = new THREE.Mesh(new THREE.TorusGeometry(.256, .014, 16, 48), innerHelmetMat);
  visorRubberSeal.position.set(0, .01, .214);
  visorRubberSeal.scale.set(1.09, .95, 1);
  helmetGroup.add(visorRubberSeal);
  const visorFrame = new THREE.Mesh(new THREE.TorusGeometry(.245, .036, 24, 48), tanTrimMat);
  visorFrame.position.set(0, .01, .225);
  visorFrame.scale.set(1.08, .94, 1);
  visorFrame.castShadow = true;
  helmetGroup.add(visorFrame);
  for (let r = 0; r < 12; r++) {
    const ang = r / 12 * Math.PI * 2;
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 8), darkMetalMat);
    rivet.position.set(Math.cos(ang) * .245 * 1.08, .01 + Math.sin(ang) * .245 * .94, .258);
    helmetGroup.add(rivet);
  }
  const visorDome = new THREE.Mesh(new THREE.SphereGeometry(.254, 48, 36, -Math.PI * .43, Math.PI * .86, Math.PI * .19, Math.PI * .58), visorGlassMat);
  visorDome.rotation.y = -Math.PI / 2;
  visorDome.position.set(0, .01, .112);
  visorDome.scale.set(1.06, .94, 1.08);
  helmetGroup.add(visorDome);
  [ -.07, .07 ].forEach(vx => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(.036, .014, .02), darkMetalMat);
    vent.position.set(vx, -.25, .23);
    vent.rotation.x = .45;
    helmetGroup.add(vent);
  });
  [ -.35, .35 ].forEach(ex => {
    const earPad = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .045, 24), tanTrimMat);
    earPad.rotation.z = Math.PI / 2;
    earPad.position.set(ex, .01, .02);
    earPad.castShadow = true;
    helmetGroup.add(earPad);
    const earCap = new THREE.Mesh(new THREE.CylinderGeometry(.052, .058, .052, 24), slateBlueMat);
    earCap.rotation.z = Math.PI / 2;
    earCap.position.set(ex + Math.sign(ex) * .01, .01, .02);
    helmetGroup.add(earCap);
  });
  function buildArm(isRight) {
    const side = isRight ? -1 : 1;
    const prefix = isRight ? "right" : "left";
    const shoulder = new THREE.Group;
    shoulder.position.set(side * .3, .29, 0);
    spine.add(shoulder);
    joints[prefix + "Shoulder"] = shoulder;
    attachBoneHelper(shoulder, -.22);
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 20), suitCreamMat);
    shoulderCap.castShadow = true;
    shoulder.add(shoulderCap);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(.095, .088, .2, 24), suitCreamMat);
    upperArm.position.y = -.1;
    upperArm.castShadow = true;
    shoulder.add(upperArm);
    const elbow = new THREE.Group;
    elbow.position.set(0, -.21, 0);
    shoulder.add(elbow);
    joints[prefix + "Elbow"] = elbow;
    attachBoneHelper(elbow, -.2);
    const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(.086, .018, 16, 28), tanTrimMat);
    elbowRing.rotation.x = Math.PI / 2;
    elbow.add(elbowRing);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(.088, .082, .19, 24), suitCreamMat);
    forearm.position.y = -.1;
    forearm.castShadow = true;
    elbow.add(forearm);
    const wrist = new THREE.Group;
    wrist.position.set(0, -.2, 0);
    elbow.add(wrist);
    joints[prefix + "Wrist"] = wrist;
    attachBoneHelper(wrist, -.1);
    const wristSwivelRing = new THREE.Mesh(new THREE.TorusGeometry(.088, .016, 16, 28), tanTrimMat);
    wristSwivelRing.rotation.x = Math.PI / 2;
    wristSwivelRing.position.y = .008;
    wrist.add(wristSwivelRing);
    const cuffRing = new THREE.Mesh(new THREE.TorusGeometry(.082, .022, 16, 28), slateBlueMat);
    cuffRing.rotation.x = Math.PI / 2;
    cuffRing.position.y = -.014;
    wrist.add(cuffRing);
    const palmGroup = new THREE.Group;
    palmGroup.position.set(0, -.056, .004);
    wrist.add(palmGroup);
    const palmCore = new THREE.Mesh(new THREE.SphereGeometry(.054, 24, 20), slateBlueMat);
    palmCore.scale.set(.68, .92, 1.06);
    palmCore.castShadow = true;
    palmGroup.add(palmCore);
    const thenarPad = new THREE.Mesh(new THREE.SphereGeometry(.028, 18, 14), gloveGripPadMat);
    thenarPad.position.set(-side * .024, .004, .026);
    thenarPad.scale.set(.75, 1.15, .95);
    palmGroup.add(thenarPad);
    const hypothenarPad = new THREE.Mesh(new THREE.SphereGeometry(.024, 18, 14), gloveGripPadMat);
    hypothenarPad.position.set(-side * .022, -.008, -.026);
    hypothenarPad.scale.set(.7, 1.25, .85);
    palmGroup.add(hypothenarPad);
    const palmGripPad = new THREE.Mesh(new THREE.CylinderGeometry(.036, .032, .012, 20), gloveGripPadMat);
    palmGripPad.rotation.z = Math.PI / 2;
    palmGripPad.position.set(-side * .031, -.006, .002);
    palmGripPad.scale.set(1, 1, 1.18);
    palmGroup.add(palmGripPad);
    const restraintBar = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .098, 12), darkMetalMat);
    restraintBar.rotation.x = Math.PI / 2;
    restraintBar.position.set(side * .034, .006, .002);
    palmGroup.add(restraintBar);
    const dorsalPlate = new THREE.Mesh(new THREE.SphereGeometry(.044, 20, 16), tanTrimMat);
    dorsalPlate.position.set(side * .024, .002, .002);
    dorsalPlate.scale.set(.45, .88, 1.05);
    palmGroup.add(dorsalPlate);
    const handFingers = {
      fourFingers: [],
      thumb: []
    };
    joints[prefix + "HandFingers"] = handFingers;
    function createFinger(basePos, lengths, radius, isThumb = false) {
      const fRoot = new THREE.Group;
      fRoot.position.copy(basePos);
      wrist.add(fRoot);
      const phalanges = [];
      let parentNode = fRoot;
      lengths.forEach((len, pIdx) => {
        const jointNode = new THREE.Group;
        if (pIdx > 0) jointNode.position.set(0, -lengths[pIdx - 1], 0);
        parentNode.add(jointNode);
        attachBoneHelper(jointNode, -len);
        const rTop = radius * (1 - pIdx * .13);
        const rBot = radius * (1 - (pIdx + 1) * .13);
        const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 16), slateBlueMat);
        segMesh.position.y = -len * .5;
        segMesh.scale.set(.88, 1, 1.08);
        segMesh.castShadow = true;
        jointNode.add(segMesh);
        const accordionBellow = new THREE.Mesh(new THREE.TorusGeometry(rTop * .94, rTop * .22, 10, 20), pIdx === 0 ? tanTrimMat : darkMetalMat);
        accordionBellow.rotation.x = Math.PI / 2;
        accordionBellow.scale.set(.92, 1.08, 1);
        jointNode.add(accordionBellow);
        const phalanxGrip = new THREE.Mesh(new THREE.BoxGeometry(rTop * .35, len * .68, rTop * 1.15), gloveGripPadMat);
        phalanxGrip.position.set(-side * (rTop * .78), -len * .5, 0);
        jointNode.add(phalanxGrip);
        if (pIdx === lengths.length - 1) {
          const tip = new THREE.Mesh(new THREE.SphereGeometry(rBot, 16, 12), slateBlueMat);
          tip.position.y = -len;
          tip.scale.set(.86, 1.12, 1.06);
          jointNode.add(tip);
          const fingertipPad = new THREE.Mesh(new THREE.SphereGeometry(rBot * .78, 12, 10), gloveGripPadMat);
          fingertipPad.position.set(-side * (rBot * .36), -len * .95, 0);
          fingertipPad.scale.set(.65, 1.05, .95);
          jointNode.add(fingertipPad);
          const nailCap = new THREE.Mesh(new THREE.SphereGeometry(rBot * .65, 12, 10), tanTrimMat);
          nailCap.position.set(side * (rBot * .42), -len * .88, 0);
          nailCap.scale.set(.45, .95, .85);
          jointNode.add(nailCap);
        }
        phalanges.push(jointNode);
        parentNode = jointNode;
      });
      return {
        root: fRoot,
        phalanges: phalanges,
        isThumb: isThumb
      };
    }
    const fingerSpecs = [ {
      x: .003,
      y: -.095,
      z: .041,
      lengths: [ .025, .02, .016 ],
      rad: .0122
    }, {
      x: .005,
      y: -.099,
      z: .014,
      lengths: [ .028, .022, .017 ],
      rad: .0128
    }, {
      x: .003,
      y: -.096,
      z: -.014,
      lengths: [ .026, .02, .016 ],
      rad: .012
    }, {
      x: -.002,
      y: -.09,
      z: -.04,
      lengths: [ .021, .016, .014 ],
      rad: .0106
    } ];
    fingerSpecs.forEach(spec => {
      const fingerObj = createFinger(new THREE.Vector3(spec.x, spec.y, spec.z), spec.lengths, spec.rad, false);
      handFingers.fourFingers.push(fingerObj);
    });
    const thumbObj = createFinger(new THREE.Vector3(-side * .034, -.046, .046), [ .027, .022 ], .0142, true);
    thumbObj.root.rotation.x = .56;
    thumbObj.root.rotation.z = side * .45;
    handFingers.thumb.push(thumbObj);
  }
  buildArm(true);
  buildArm(false);
  function setHandCurl(prefix, curlAmount) {
    const hand = joints[prefix + "HandFingers"];
    if (!hand) return;
    const side = prefix === "right" ? -1 : 1;
    hand.curlValue = curlAmount;
    hand.fourFingers.forEach((finger, fIdx) => {
      const spread = (1.5 - fIdx) * .045 * (1 - curlAmount);
      finger.root.rotation.x = spread;
      finger.phalanges.forEach((phal, pIdx) => {
        const weight = pIdx === 0 ? .85 : pIdx === 1 ? 1.05 : .75;
        phal.rotation.z = side * curlAmount * weight;
      });
    });
    hand.thumb.forEach(thumb => {
      thumb.phalanges.forEach((phal, pIdx) => {
        phal.rotation.z = side * (.42 - curlAmount * (pIdx === 0 ? .65 : .85));
        phal.rotation.x = pIdx === 0 ? curlAmount * .45 : curlAmount * .35;
      });
    });
  }
  setHandCurl("right", .12);
  setHandCurl("left", .25);
  function buildLeg(isRight) {
    const side = isRight ? -1 : 1;
    const prefix = isRight ? "right" : "left";
    const hip = new THREE.Group;
    hip.position.set(side * .13, -.11, 0);
    pelvis.add(hip);
    joints[prefix + "Hip"] = hip;
    attachBoneHelper(hip, -.26);
    const hipJointRing = new THREE.Mesh(new THREE.TorusGeometry(.115, .018, 16, 28), tanTrimMat);
    hipJointRing.rotation.x = Math.PI / 2;
    hipJointRing.rotation.y = side * .15;
    hip.add(hipJointRing);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.122, .108, .25, 24), suitCreamMat);
    thigh.position.y = -.13;
    thigh.castShadow = true;
    hip.add(thigh);
    const knee = new THREE.Group;
    knee.position.set(0, -.26, 0);
    hip.add(knee);
    joints[prefix + "Knee"] = knee;
    attachBoneHelper(knee, -.24);
    const kneePad = new THREE.Mesh(new THREE.TorusGeometry(.106, .02, 16, 28), tanTrimMat);
    kneePad.rotation.x = Math.PI / 2;
    knee.add(kneePad);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(.108, .102, .22, 24), suitCreamMat);
    shin.position.y = -.11;
    shin.castShadow = true;
    knee.add(shin);
    const ankle = new THREE.Group;
    ankle.position.set(0, -.23, 0);
    knee.add(ankle);
    joints[prefix + "Ankle"] = ankle;
    attachBoneHelper(ankle, -.1);
    const bootCollar = new THREE.Mesh(new THREE.TorusGeometry(.102, .016, 16, 28), tanTrimMat);
    bootCollar.rotation.x = Math.PI / 2;
    ankle.add(bootCollar);
    const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(.17, .09, .24), suitCreamMat);
    bootUpper.position.set(0, -.045, .035);
    bootUpper.castShadow = true;
    ankle.add(bootUpper);
    const bootToe = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 16), suitCreamMat);
    bootToe.position.set(0, -.045, .145);
    bootToe.scale.set(1, .55, 1.1);
    ankle.add(bootToe);
    const bootSole = new THREE.Mesh(new THREE.BoxGeometry(.185, .036, .29), slateBlueMat);
    bootSole.position.set(0, -.095, .045);
    bootSole.castShadow = true;
    ankle.add(bootSole);
    [ -.035, .115 ].forEach((tz, idx) => {
      const thrusterUnit = new THREE.Group;
      thrusterUnit.position.set(0, -.113, tz);
      ankle.add(thrusterUnit);
      const mountCollar = new THREE.Mesh(new THREE.CylinderGeometry(.034, .038, .012, 20), darkMetalMat);
      thrusterUnit.add(mountCollar);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .031, .024, 20, 1, true), thrusterNozzleMat);
      nozzle.position.y = -.016;
      nozzle.material.side = THREE.DoubleSide;
      thrusterUnit.add(nozzle);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(.022, .0035, 10, 20), thrusterGlowRingMat);
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.y = -.022;
      thrusterUnit.add(glowRing);
      const flameGroup = new THREE.Group;
      flameGroup.position.y = -.024;
      thrusterUnit.add(flameGroup);
      const outerFlameGeo = new THREE.ConeGeometry(.032, .24, 18, 1, true);
      outerFlameGeo.translate(0, -.12, 0);
      const outerFlame = new THREE.Mesh(outerFlameGeo, jetOuterFlameMat.clone());
      flameGroup.add(outerFlame);
      const innerFlameGeo = new THREE.ConeGeometry(.016, .14, 14);
      innerFlameGeo.translate(0, -.07, 0);
      const innerFlame = new THREE.Mesh(innerFlameGeo, jetCoreFlameMat.clone());
      flameGroup.add(innerFlame);
      const jetLight = new THREE.PointLight(3718648, idx === 0 ? .65 : .35, 1.4);
      jetLight.position.y = -.06;
      flameGroup.add(jetLight);
      bootThrusters.push({
        flameGroup: flameGroup,
        outerFlame: outerFlame,
        innerFlame: innerFlame,
        jetLight: jetLight,
        phaseOffset: (isRight ? 0 : 1.7) + idx * .9
      });
    });
  }
  buildLeg(true);
  buildLeg(false);
  return {
    root: root,
    joints: joints,
    boneHelpers: boneHelpers,
    setHandCurl: setHandCurl,
    bootThrusters: bootThrusters
  };
}

export { createProceduralTextures, createAstronautModel };
