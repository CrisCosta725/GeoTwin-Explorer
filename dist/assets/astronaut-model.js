import * as THREE from './three.module.min.js';

function createProceduralTextures() {
    // A. TEXTURA DE TELA DE TRAJE ESPACIAL (Nylon Balístico / Gore-Tex Blanco Crema)
    const suitSize = 512;
    const suitColorCanvas = document.createElement('canvas');
    const suitBumpCanvas = document.createElement('canvas');
    const suitRoughCanvas = document.createElement('canvas');
    suitColorCanvas.width = suitBumpCanvas.width = suitRoughCanvas.width = suitSize;
    suitColorCanvas.height = suitBumpCanvas.height = suitRoughCanvas.height = suitSize;

    const cCtx = suitColorCanvas.getContext('2d');
    const bCtx = suitBumpCanvas.getContext('2d');
    const rCtx = suitRoughCanvas.getContext('2d');

    // Base blanco roto / crema cálido como en la referencia
    cCtx.fillStyle = '#f2efe9';
    cCtx.fillRect(0, 0, suitSize, suitSize);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, suitSize, suitSize);

    rCtx.fillStyle = '#9e9e9e'; // Rugosidad base mate-satinada (~0.62)
    rCtx.fillRect(0, 0, suitSize, suitSize);

    // Micro-tejido ripstop / nylon balístico cruzado
    for (let y = 0; y < suitSize; y += 2) {
        for (let x = 0; x < suitSize; x += 2) {
            const weave = ((x + y) % 4 === 0) ? 8 : -8;
            const noise = (Math.random() - 0.5) * 10;
            const bVal = Math.max(0, Math.min(255, 128 + weave + noise));
            bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
            bCtx.fillRect(x, y, 2, 2);

            const cShade = Math.max(225, Math.min(248, 241 + weave * 0.35 + noise * 0.3));
            cCtx.fillStyle = `rgb(${cShade}, ${cShade - 3}, ${cShade - 8})`;
            cCtx.fillRect(x, y, 2, 2);
        }
    }

    // Pliegues suaves y desgaste sutil por polvo lunar
    for (let i = 0; i < 45; i++) {
        const wx = Math.random() * suitSize;
        const wy = Math.random() * suitSize;
        const rad = 18 + Math.random() * 45;
        const grad = cCtx.createRadialGradient(wx, wy, 2, wx, wy, rad);
        grad.addColorStop(0, 'rgba(185, 178, 168, 0.09)');
        grad.addColorStop(1, 'rgba(185, 178, 168, 0)');
        cCtx.fillStyle = grad;
        cCtx.fillRect(0, 0, suitSize, suitSize);

        const rGrad = rCtx.createRadialGradient(wx, wy, 2, wx, wy, rad);
        rGrad.addColorStop(0, 'rgba(220, 220, 220, 0.18)');
        rGrad.addColorStop(1, 'rgba(150, 150, 150, 0)');
        rCtx.fillStyle = rGrad;
        rCtx.fillRect(0, 0, suitSize, suitSize);
    }

    // Costuras reforzadas dobles
    cCtx.strokeStyle = 'rgba(175, 168, 156, 0.55)';
    cCtx.lineWidth = 2;
    cCtx.setLineDash([6, 4]);
    bCtx.strokeStyle = '#303030';
    bCtx.lineWidth = 2.5;
    bCtx.setLineDash([6, 4]);

    [64, 256, 448].forEach(pos => {
        cCtx.beginPath(); cCtx.moveTo(pos, 0); cCtx.lineTo(pos, suitSize); cCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(pos, 0); bCtx.lineTo(pos, suitSize); bCtx.stroke();
        cCtx.beginPath(); cCtx.moveTo(0, pos); cCtx.lineTo(suitSize, pos); cCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(0, pos); bCtx.lineTo(suitSize, pos); bCtx.stroke();
    });

    const suitMap = new THREE.CanvasTexture(suitColorCanvas);
    const suitBump = new THREE.CanvasTexture(suitBumpCanvas);
    const suitRough = new THREE.CanvasTexture(suitRoughCanvas);
    [suitMap, suitBump, suitRough].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, 2);
    });
    suitMap.colorSpace = THREE.SRGBColorSpace;

    // B. TEXTURA DE GOMA / SILICONA INDUSTRIAL (Anillos Beige/Tostado y Guantes/Ribetes Azul Pizarra)
    const rubberSize = 256;
    const rubberBumpCanvas = document.createElement('canvas');
    const rubberRoughCanvas = document.createElement('canvas');
    rubberBumpCanvas.width = rubberRoughCanvas.width = rubberSize;
    rubberBumpCanvas.height = rubberRoughCanvas.height = rubberSize;

    const rbCtx = rubberBumpCanvas.getContext('2d');
    const rrCtx = rubberRoughCanvas.getContext('2d');

    rbCtx.fillStyle = '#808080';
    rbCtx.fillRect(0, 0, rubberSize, rubberSize);
    rrCtx.fillStyle = '#787878'; // Semimate (~0.47)
    rrCtx.fillRect(0, 0, rubberSize, rubberSize);

    // Grano fino de polímero industrial y micro-surcos de agarre
    for (let y = 0; y < rubberSize; y++) {
        for (let x = 0; x < rubberSize; x++) {
            const grain = (Math.random() - 0.5) * 22;
            const rib = Math.sin(y * 0.45) * 10;
            const v = Math.max(0, Math.min(255, 128 + grain + rib));
            rbCtx.fillStyle = `rgb(${v},${v},${v})`;
            rbCtx.fillRect(x, y, 1, 1);

            const rv = Math.max(80, Math.min(200, 120 + grain * 1.4));
            rrCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
            rrCtx.fillRect(x, y, 1, 1);
        }
    }

    const rubberBump = new THREE.CanvasTexture(rubberBumpCanvas);
    const rubberRough = new THREE.CanvasTexture(rubberRoughCanvas);
    [rubberBump, rubberRough].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(3, 3);
    });

    // C. TEXTURA DE MANGUERAS TEXTILES TRENZADAS (Mochila a Torso)
    const hoseCanvas = document.createElement('canvas');
    hoseCanvas.width = hoseCanvas.height = 128;
    const hCtx = hoseCanvas.getContext('2d');
    hCtx.fillStyle = '#707070';
    hCtx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) {
        hCtx.fillStyle = '#d0d0d0';
        hCtx.fillRect(0, y, 128, 4);
        for (let x = 0; x < 128; x += 8) {
            hCtx.fillStyle = ((x + y) % 16 === 0) ? '#909090' : '#505050';
            hCtx.fillRect(x, y, 4, 8);
        }
    }
    const hoseBump = new THREE.CanvasTexture(hoseCanvas);
    hoseBump.wrapS = hoseBump.wrapT = THREE.RepeatWrapping;
    hoseBump.repeat.set(2, 16);

    // D. ENVMAP PROCEDURAL DE LA TIERRA Y EL ESPACIO PARA EL VISOR POLARIZADO
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 1024;
    envCanvas.height = 512;
    const eCtx = envCanvas.getContext('2d');

    // Fondo espacio profundo con nebulosa sutil
    const spaceGrad = eCtx.createLinearGradient(0, 0, 0, 512);
    spaceGrad.addColorStop(0, '#02040a');
    spaceGrad.addColorStop(0.45, '#071329');
    spaceGrad.addColorStop(0.75, '#0c2447');
    spaceGrad.addColorStop(1, '#02050d');
    eCtx.fillStyle = spaceGrad;
    eCtx.fillRect(0, 0, 1024, 512);

    // Estrellas nítidas en el reflejo
    for (let i = 0; i < 450; i++) {
        const sx = Math.random() * 1024;
        const sy = Math.random() * 340;
        const sr = Math.random() * 1.4;
        eCtx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.6})`;
        eCtx.beginPath();
        eCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        eCtx.fill();
    }

    // Gran planeta Tierra reflejado en el visor (parte inferior-frontal)
    const earthX = 512;
    const earthY = 430;
    const earthR = 230;

    // Halo atmosférico brillante azul cyan
    const atmoGrad = eCtx.createRadialGradient(earthX, earthY, earthR * 0.88, earthX, earthY, earthR * 1.15);
    atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
    atmoGrad.addColorStop(0.4, 'rgba(14, 165, 233, 0.45)');
    atmoGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    eCtx.fillStyle = atmoGrad;
    eCtx.beginPath();
    eCtx.arc(earthX, earthY, earthR * 1.15, 0, Math.PI * 2);
    eCtx.fill();

    // Océanos de la Tierra
    eCtx.save();
    eCtx.beginPath();
    eCtx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
    eCtx.clip();

    const oceanGrad = eCtx.createRadialGradient(earthX - 50, earthY - 80, 20, earthX, earthY, earthR);
    oceanGrad.addColorStop(0, '#38bdf8');
    oceanGrad.addColorStop(0.5, '#0369a1');
    oceanGrad.addColorStop(1, '#082f49');
    eCtx.fillStyle = oceanGrad;
    eCtx.fillRect(earthX - earthR, earthY - earthR, earthR * 2, earthR * 2);

    // Continentes estilizados realistas (tonos tierra/verde/ocre)
    eCtx.fillStyle = '#4d7c5b';
    eCtx.beginPath();
    eCtx.ellipse(earthX - 65, earthY - 95, 55, 32, -0.3, 0, Math.PI * 2);
    eCtx.fill();

    eCtx.fillStyle = '#8c7a5b';
    eCtx.beginPath();
    eCtx.ellipse(earthX + 55, earthY - 75, 65, 40, 0.25, 0, Math.PI * 2);
    eCtx.fill();

    // Remolinos de nubes blancas sobre la Tierra
    eCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let c = 0; c < 38; c++) {
        const cx = earthX + (Math.random() - 0.5) * earthR * 1.6;
        const cy = earthY - 30 - Math.random() * (earthR * 0.85);
        const cw = 25 + Math.random() * 65;
        const ch = 6 + Math.random() * 14;
        eCtx.beginPath();
        eCtx.ellipse(cx, cy, cw, ch, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
        eCtx.fill();
    }
    eCtx.restore();

    // Destello solar lateral en el horizonte
    const sunGrad = eCtx.createRadialGradient(330, 175, 4, 330, 175, 95);
    sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sunGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.75)');
    sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    eCtx.fillStyle = sunGrad;
    eCtx.fillRect(0, 0, 1024, 512);

    const visorEnvMap = new THREE.CanvasTexture(envCanvas);
    visorEnvMap.mapping = THREE.EquirectangularReflectionMapping;
    visorEnvMap.colorSpace = THREE.SRGBColorSpace;

    return {
        suitMap,
        suitBump,
        suitRough,
        rubberBump,
        rubberRough,
        hoseBump,
        visorEnvMap
    };
}

/**
 * ============================================================================
 * 2. CONSTRUCCIÓN DEL MODELO 3D ARTICULADO (PROPORCIONES DE REFERENCIA)
 * ============================================================================
 */
function createAstronautModel(textures) {
    const root = new THREE.Group();
    const joints = {};
    const boneHelpers = [];

    // --- MATERIALES PBR ---
    // 1. Traje blanco roto / crema (Nylon balístico / Gore-Tex)
    const suitCreamMat = new THREE.MeshStandardMaterial({
        color: 0xf4f1ea,
        map: textures.suitMap,
        bumpMap: textures.suitBump,
        bumpScale: 0.008,
        roughnessMap: textures.suitRough,
        roughness: 0.68,
        metalness: 0.04
    });

    // 2. Anillos de articulación y borde de visor beige / tostado mate
    const tanTrimMat = new THREE.MeshStandardMaterial({
        color: 0xb0936d,
        bumpMap: textures.rubberBump,
        bumpScale: 0.006,
        roughnessMap: textures.rubberRough,
        roughness: 0.52,
        metalness: 0.12
    });

    // 3. Ribetes, cinturón, guantes y suelas azul pizarra / acero
    const slateBlueMat = new THREE.MeshStandardMaterial({
        color: 0x4b6b88,
        bumpMap: textures.rubberBump,
        bumpScale: 0.007,
        roughnessMap: textures.rubberRough,
        roughness: 0.55,
        metalness: 0.15
    });

    // 4. Botones azul cobalto brillante del módulo pectoral
    const cobaltButtonMat = new THREE.MeshPhysicalMaterial({
        color: 0x1d63b8,
        roughness: 0.25,
        metalness: 0.1,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2
    });

    // 5. Metal cepillado oscuro para tornillos, conectores y rejillas
    const darkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x2a3340,
        roughness: 0.38,
        metalness: 0.82
    });

    // 6. Visor oscuro/ahumado polarizado con reflejo de la Tierra y clearcoat
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x162030,
        emissive: 0x050b16,
        emissiveIntensity: 0.18,
        metalness: 0.15,
        roughness: 0.04,
        transmission: 0.72,
        ior: 1.52,
        thickness: 0.18,
        attenuationColor: new THREE.Color(0x1b365d),
        attenuationDistance: 0.35,
        envMap: textures.visorEnvMap,
        envMapIntensity: 2.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        reflectivity: 1.0
    });

    // 6b. Interior acolchado técnico oscuro detrás del visor y almohadillas de palma
    const innerHelmetMat = new THREE.MeshStandardMaterial({
        color: 0x111722,
        bumpMap: textures.rubberBump,
        bumpScale: 0.01,
        roughness: 0.85,
        metalness: 0.15
    });

    const gloveGripPadMat = new THREE.MeshStandardMaterial({
        color: 0x2b3e52,
        bumpMap: textures.rubberBump,
        bumpScale: 0.014,
        roughnessMap: textures.rubberRough,
        roughness: 0.72,
        metalness: 0.12
    });

    // 7. Mangueras textiles corrugadas
    const hoseMat = new THREE.MeshStandardMaterial({
        color: 0x8d8982,
        bumpMap: textures.hoseBump,
        bumpScale: 0.015,
        roughness: 0.78,
        metalness: 0.08
    });

    // 8. Materiales para propulsores de botas (toberas, plasma y chispas)
    const thrusterNozzleMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
        metalness: 0.88
    });

    const thrusterGlowRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8
    });

    const jetOuterFlameMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const jetCoreFlameMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const bootThrusters = [];

    // Helper para crear hueso visual del rig
    function attachBoneHelper(parentJoint, length = 0.25) {
        const boneGroup = new THREE.Group();
        boneGroup.visible = false;

        const jointSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.022, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false, transparent: true, opacity: 0.9 })
        );
        boneGroup.add(jointSphere);

        if (length !== 0) {
            const absLen = Math.abs(length);
            const dir = Math.sign(length);
            const boneCone = new THREE.Mesh(
                new THREE.ConeGeometry(0.016, absLen, 8),
                new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, depthTest: false, transparent: true, opacity: 0.75 })
            );
            boneCone.position.y = dir * (absLen * 0.5);
            if (dir < 0) boneCone.rotation.x = Math.PI;
            boneGroup.add(boneCone);
        }

        parentJoint.add(boneGroup);
        boneHelpers.push(boneGroup);
    }

    // --- JERARQUÍA DEL ESQUELETO (RIGGING) ---
    // 1. Pelvis / Cadera raíz
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.95, 0);
    root.add(pelvis);
    joints.pelvis = pelvis;
    attachBoneHelper(pelvis, 0.22);

    const pelvisMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.21, 0.22, 32),
        suitCreamMat
    );
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    pelvis.add(pelvisMesh);

    const pelvisBottomCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
        suitCreamMat
    );
    pelvisBottomCap.position.y = -0.11;
    pelvisBottomCap.scale.set(1, 0.65, 0.95);
    pelvis.add(pelvisBottomCap);

    // Cinturón azul pizarra con hebilla
    const beltRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.238, 0.026, 16, 40),
        slateBlueMat
    );
    beltRing.rotation.x = Math.PI / 2;
    beltRing.position.y = 0.09;
    pelvis.add(beltRing);

    // 2. Torso / Columna
    const spine = new THREE.Group();
    spine.position.set(0, 0.12, 0);
    pelvis.add(spine);
    joints.spine = spine;
    attachBoneHelper(spine, 0.34);

    const torsoMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.245, 0.36, 32),
        suitCreamMat
    );
    torsoMesh.position.y = 0.18;
    torsoMesh.scale.set(1.04, 1, 0.92);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    spine.add(torsoMesh);

    // Pechera / Collarín superior azul pizarra
    const chestCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.028, 16, 40),
        slateBlueMat
    );
    chestCollar.rotation.x = Math.PI / 2 + 0.18;
    chestCollar.position.set(0, 0.34, 0.02);
    spine.add(chestCollar);

    // Módulo de Control Pectoral (Caja blanca con 2 botones azul cobalto)
    const chestUnit = new THREE.Group();
    chestUnit.position.set(0, 0.19, 0.245);
    chestUnit.rotation.x = -0.08;
    spine.add(chestUnit);

    const chestBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.13, 0.055),
        suitCreamMat
    );
    chestBox.castShadow = true;
    chestUnit.add(chestBox);

    const chestBezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.232, 0.142, 0.02),
        tanTrimMat
    );
    chestBezel.position.z = -0.015;
    chestUnit.add(chestBezel);

    [-0.055, 0.055].forEach((bx, idx) => {
        const btnRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.034, 0.02, 24),
            darkMetalMat
        );
        btnRing.rotation.x = Math.PI / 2;
        btnRing.position.set(bx, 0, 0.03);
        chestUnit.add(btnRing);

        const btnCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.026, 20, 16),
            cobaltButtonMat
        );
        btnCap.position.set(bx, idx === 0 ? -0.004 : 0.004, 0.038);
        btnCap.scale.set(1, 1, 0.65);
        chestUnit.add(btnCap);
    });

    // Mochila de Soporte Vital (PLSS)
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 0.22, -0.25);
    spine.add(backpackGroup);

    const packMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.42, 0.16),
        suitCreamMat
    );
    packMain.castShadow = true;
    packMain.receiveShadow = true;
    backpackGroup.add(packMain);

    const packTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.06, 0.175),
        slateBlueMat
    );
    packTrim.position.y = 0.14;
    backpackGroup.add(packTrim);

    // Tanques laterales y mangueras corrugadas conectadas al torso
    [-0.14, 0.14].forEach(hx => {
        const hoseCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(hx, 0.16, 0.04),
            new THREE.Vector3(hx * 1.15, 0.24, 0.16),
            new THREE.Vector3(hx * 0.95, 0.18, 0.28)
        ]);
        const hoseMesh = new THREE.Mesh(
            new THREE.TubeGeometry(hoseCurve, 20, 0.022, 12, false),
            hoseMat
        );
        hoseMesh.castShadow = true;
        backpackGroup.add(hoseMesh);
    });

    // 3. Cuello y Casco
    const neck = new THREE.Group();
    neck.position.set(0, 0.37, 0.01);
    spine.add(neck);
    joints.neck = neck;
    attachBoneHelper(neck, 0.28);

    const neckRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.07, 32),
        tanTrimMat
    );
    neck.add(neckRing);

    // Grupo del Casco (Proporción grande y redondeada como la referencia)
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0, 0.27, 0.01);
    joints.neck.add(helmetGroup);

    // Esfera principal del casco blanco crema (con apertura frontal real)
    const helmetMain = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 48, 40, Math.PI * 0.28, Math.PI * 1.44, 0, Math.PI),
        suitCreamMat
    );
    helmetMain.rotation.y = Math.PI * 0.5;
    helmetMain.scale.set(1.03, 1.0, 1.04);
    helmetMain.castShadow = true;
    helmetMain.receiveShadow = true;
    helmetGroup.add(helmetMain);

    // Interior acolchado técnico oscuro visible sutilmente detrás del cristal
    const helmetInterior = new THREE.Mesh(
        new THREE.SphereGeometry(0.305, 32, 28),
        innerHelmetMat
    );
    helmetInterior.position.set(0, 0, -0.02);
    helmetGroup.add(helmetInterior);

    // Anillo interior HUD / soporte óptico sutil dentro del casco
    const innerHudRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.008, 12, 36),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 })
    );
    innerHudRing.position.set(0, 0.01, 0.195);
    innerHudRing.scale.set(1.06, 0.92, 1);
    helmetGroup.add(innerHudRing);

    // Franja superior longitudinal beige/crema sobre la coronilla del casco
    const crestGeo = new THREE.TorusGeometry(0.341, 0.032, 16, 48, Math.PI * 1.15);
    const crestMesh = new THREE.Mesh(crestGeo, tanTrimMat);
    crestMesh.rotation.y = Math.PI / 2;
    crestMesh.rotation.z = -Math.PI * 0.08;
    crestMesh.scale.set(1.04, 1.01, 1.4);
    helmetGroup.add(crestMesh);

    // Sello de goma oscura entre el casco y el marco del visor
    const visorRubberSeal = new THREE.Mesh(
        new THREE.TorusGeometry(0.256, 0.014, 16, 48),
        innerHelmetMat
    );
    visorRubberSeal.position.set(0, 0.01, 0.214);
    visorRubberSeal.scale.set(1.09, 0.95, 1);
    helmetGroup.add(visorRubberSeal);

    // Marco grueso beige/bronce mate del visor
    const visorFrame = new THREE.Mesh(
        new THREE.TorusGeometry(0.245, 0.036, 24, 48),
        tanTrimMat
    );
    visorFrame.position.set(0, 0.01, 0.225);
    visorFrame.scale.set(1.08, 0.94, 1);
    visorFrame.castShadow = true;
    helmetGroup.add(visorFrame);

    // Micro-remaches metálicos alrededor del marco del visor
    for (let r = 0; r < 12; r++) {
        const ang = (r / 12) * Math.PI * 2;
        const rivet = new THREE.Mesh(
            new THREE.SphereGeometry(0.007, 8, 8),
            darkMetalMat
        );
        rivet.position.set(
            Math.cos(ang) * 0.245 * 1.08,
            0.01 + Math.sin(ang) * 0.245 * 0.94,
            0.258
        );
        helmetGroup.add(rivet);
    }

    // Cúpula de cristal polarizado curvo con reflejo de la Tierra y transmisión real
    const visorDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.254, 48, 36, -Math.PI * 0.43, Math.PI * 0.86, Math.PI * 0.19, Math.PI * 0.58),
        visorGlassMat
    );
    visorDome.rotation.y = -Math.PI / 2;
    visorDome.position.set(0, 0.01, 0.112);
    visorDome.scale.set(1.06, 0.94, 1.08);
    helmetGroup.add(visorDome);

    // Detalles de tornillos y rejillas de ventilación inferiores en el casco
    [-0.07, 0.07].forEach(vx => {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.036, 0.014, 0.02),
            darkMetalMat
        );
        vent.position.set(vx, -0.25, 0.23);
        vent.rotation.x = 0.45;
        helmetGroup.add(vent);
    });

    // Orejeras / Comunicadores laterales del casco
    [-0.35, 0.35].forEach(ex => {
        const earPad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.085, 0.045, 24),
            tanTrimMat
        );
        earPad.rotation.z = Math.PI / 2;
        earPad.position.set(ex, 0.01, 0.02);
        earPad.castShadow = true;
        helmetGroup.add(earPad);

        const earCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.052, 0.058, 0.052, 24),
            slateBlueMat
        );
        earCap.rotation.z = Math.PI / 2;
        earCap.position.set(ex + Math.sign(ex) * 0.01, 0.01, 0.02);
        helmetGroup.add(earCap);
    });

    // --- 4. CONSTRUCCIÓN DE BRAZOS Y MANOS ARTICULADAS ---
    function buildArm(isRight) {
        const side = isRight ? -1 : 1;
        const prefix = isRight ? 'right' : 'left';

        // Hombro
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 0.30, 0.29, 0);
        spine.add(shoulder);
        joints[prefix + 'Shoulder'] = shoulder;
        attachBoneHelper(shoulder, -0.22);

        const shoulderCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.105, 24, 20),
            suitCreamMat
        );
        shoulderCap.castShadow = true;
        shoulder.add(shoulderCap);

        const upperArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.095, 0.088, 0.20, 24),
            suitCreamMat
        );
        upperArm.position.y = -0.10;
        upperArm.castShadow = true;
        shoulder.add(upperArm);

        // Codo
        const elbow = new THREE.Group();
        elbow.position.set(0, -0.21, 0);
        shoulder.add(elbow);
        joints[prefix + 'Elbow'] = elbow;
        attachBoneHelper(elbow, -0.20);

        const elbowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.086, 0.018, 16, 28),
            tanTrimMat
        );
        elbowRing.rotation.x = Math.PI / 2;
        elbow.add(elbowRing);

        const forearm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.088, 0.082, 0.19, 24),
            suitCreamMat
        );
        forearm.position.y = -0.10;
        forearm.castShadow = true;
        elbow.add(forearm);

        // Muñeca
        const wrist = new THREE.Group();
        wrist.position.set(0, -0.20, 0);
        elbow.add(wrist);
        joints[prefix + 'Wrist'] = wrist;
        attachBoneHelper(wrist, -0.10);

        // Anillo de acople giratorio beige/bronce + fuelle azul pizarra
        const wristSwivelRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.088, 0.016, 16, 28),
            tanTrimMat
        );
        wristSwivelRing.rotation.x = Math.PI / 2;
        wristSwivelRing.position.y = 0.008;
        wrist.add(wristSwivelRing);

        const cuffRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.082, 0.022, 16, 28),
            slateBlueMat
        );
        cuffRing.rotation.x = Math.PI / 2;
        cuffRing.position.y = -0.014;
        wrist.add(cuffRing);

        // Palma anatómica esculpida (Guante presurizado azul pizarra)
        const palmGroup = new THREE.Group();
        palmGroup.position.set(0, -0.056, 0.004);
        wrist.add(palmGroup);

        // Cuerpo orgánico de la palma con curvatura anatómica
        const palmCore = new THREE.Mesh(
            new THREE.SphereGeometry(0.054, 24, 20),
            slateBlueMat
        );
        palmCore.scale.set(0.68, 0.92, 1.06);
        palmCore.castShadow = true;
        palmGroup.add(palmCore);

        // Eminencia tenar (músculo base del pulgar) y borde hipotenar en la palma
        const thenarPad = new THREE.Mesh(
            new THREE.SphereGeometry(0.028, 18, 14),
            gloveGripPadMat
        );
        thenarPad.position.set(-side * 0.024, 0.004, 0.026);
        thenarPad.scale.set(0.75, 1.15, 0.95);
        palmGroup.add(thenarPad);

        const hypothenarPad = new THREE.Mesh(
            new THREE.SphereGeometry(0.024, 18, 14),
            gloveGripPadMat
        );
        hypothenarPad.position.set(-side * 0.022, -0.008, -0.026);
        hypothenarPad.scale.set(0.7, 1.25, 0.85);
        palmGroup.add(hypothenarPad);

        // Almohadilla central de agarre texturizada de silicona en la palma (lado medial: -side)
        const palmGripPad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.032, 0.012, 20),
            gloveGripPadMat
        );
        palmGripPad.rotation.z = Math.PI / 2;
        palmGripPad.position.set(-side * 0.031, -0.006, 0.002);
        palmGripPad.scale.set(1.0, 1.0, 1.18);
        palmGroup.add(palmGripPad);

        // Barra rígida de restricción de presión (wrist/palm restraint bar) típica de trajes EVA
        const restraintBar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.098, 12),
            darkMetalMat
        );
        restraintBar.rotation.x = Math.PI / 2;
        restraintBar.position.set(side * 0.034, 0.006, 0.002);
        palmGroup.add(restraintBar);

        // Placa dorsal articulada en el dorso de la mano (lado lateral: +side)
        const dorsalPlate = new THREE.Mesh(
            new THREE.SphereGeometry(0.044, 20, 16),
            tanTrimMat
        );
        dorsalPlate.position.set(side * 0.024, 0.002, 0.002);
        dorsalPlate.scale.set(0.45, 0.88, 1.05);
        palmGroup.add(dorsalPlate);

        // Contenedor de los 5 dedos articulados por falanges
        const handFingers = {
            fourFingers: [],
            thumb: []
        };
        joints[prefix + 'HandFingers'] = handFingers;

        // Helper para crear un dedo realista con falanges anatómicas, fuelles y yemas táctiles
        function createFinger(basePos, lengths, radius, isThumb = false) {
            const fRoot = new THREE.Group();
            fRoot.position.copy(basePos);
            wrist.add(fRoot);

            const phalanges = [];
            let parentNode = fRoot;

            lengths.forEach((len, pIdx) => {
                const jointNode = new THREE.Group();
                if (pIdx > 0) {
                    jointNode.position.set(0, -lengths[pIdx - 1], 0);
                }
                parentNode.add(jointNode);
                attachBoneHelper(jointNode, -len);

                const rTop = radius * (1 - pIdx * 0.13);
                const rBot = radius * (1 - (pIdx + 1) * 0.13);

                // Falange orgánica ligeramente ovalada (más ancha que gruesa)
                const segMesh = new THREE.Mesh(
                    new THREE.CylinderGeometry(rTop, rBot, len, 16),
                    slateBlueMat
                );
                segMesh.position.y = -len * 0.5;
                segMesh.scale.set(0.88, 1.0, 1.08);
                segMesh.castShadow = true;
                jointNode.add(segMesh);

                // Fuelle / pliegue acordeón en la articulación del nudillo
                const accordionBellow = new THREE.Mesh(
                    new THREE.TorusGeometry(rTop * 0.94, rTop * 0.22, 10, 20),
                    pIdx === 0 ? tanTrimMat : darkMetalMat
                );
                accordionBellow.rotation.x = Math.PI / 2;
                accordionBellow.scale.set(0.92, 1.08, 1.0);
                jointNode.add(accordionBellow);

                // Almohadilla interior de agarre en cada falange (lado de la palma: -side)
                const phalanxGrip = new THREE.Mesh(
                    new THREE.BoxGeometry(rTop * 0.35, len * 0.68, rTop * 1.15),
                    gloveGripPadMat
                );
                phalanxGrip.position.set(-side * (rTop * 0.78), -len * 0.5, 0);
                jointNode.add(phalanxGrip);

                // Yema distal anatómica con almohadilla táctil y detalle dorsal de uña/sensor
                if (pIdx === lengths.length - 1) {
                    const tip = new THREE.Mesh(
                        new THREE.SphereGeometry(rBot, 16, 12),
                        slateBlueMat
                    );
                    tip.position.y = -len;
                    tip.scale.set(0.86, 1.12, 1.06);
                    jointNode.add(tip);

                    // Almohadilla táctil de silicona en la yema
                    const fingertipPad = new THREE.Mesh(
                        new THREE.SphereGeometry(rBot * 0.78, 12, 10),
                        gloveGripPadMat
                    );
                    fingertipPad.position.set(-side * (rBot * 0.36), -len * 0.95, 0);
                    fingertipPad.scale.set(0.65, 1.05, 0.95);
                    jointNode.add(fingertipPad);

                    // Placa dorsal del dedal presurizado (lado opuesto a la palma: +side)
                    const nailCap = new THREE.Mesh(
                        new THREE.SphereGeometry(rBot * 0.65, 12, 10),
                        tanTrimMat
                    );
                    nailCap.position.set(side * (rBot * 0.42), -len * 0.88, 0);
                    nailCap.scale.set(0.45, 0.95, 0.85);
                    jointNode.add(nailCap);
                }

                phalanges.push(jointNode);
                parentNode = jointNode;
            });

            return { root: fRoot, phalanges, isThumb };
        }

        // 4 Dedos principales (Índice, Medio, Anular, Meñique) en arco metacarpiano natural
        const fingerSpecs = [
            { x: 0.003, y: -0.095, z: 0.041, lengths: [0.025, 0.020, 0.016], rad: 0.0122 }, // Índice
            { x: 0.005, y: -0.099, z: 0.014, lengths: [0.028, 0.022, 0.017], rad: 0.0128 }, // Medio
            { x: 0.003, y: -0.096, z: -0.014, lengths: [0.026, 0.020, 0.016], rad: 0.0120 }, // Anular
            { x: -0.002, y: -0.090, z: -0.040, lengths: [0.021, 0.016, 0.014], rad: 0.0106 } // Meñique
        ];

        fingerSpecs.forEach(spec => {
            const fingerObj = createFinger(
                new THREE.Vector3(spec.x, spec.y, spec.z),
                spec.lengths,
                spec.rad,
                false
            );
            handFingers.fourFingers.push(fingerObj);
        });

        // Pulgar anatómico oponible con articulación carpometacarpiana y 2 falanges
        const thumbObj = createFinger(
            new THREE.Vector3(-side * 0.034, -0.046, 0.046),
            [0.027, 0.022],
            0.0142,
            true
        );
        thumbObj.root.rotation.x = 0.56;
        thumbObj.root.rotation.z = side * 0.45;
        handFingers.thumb.push(thumbObj);
    }

    buildArm(true);  // Brazo derecho
    buildArm(false); // Brazo izquierdo

    // Función auxiliar para flexionar anatómicamente todos los dedos y falanges de una mano
    function setHandCurl(prefix, curlAmount) {
        const hand = joints[prefix + 'HandFingers'];
        if (!hand) return;
        const side = prefix === 'right' ? -1 : 1;
        hand.curlValue = curlAmount;

        // Flexión progresiva de las 3 falanges de los 4 dedos hacia la palma (-side)
        hand.fourFingers.forEach((finger, fIdx) => {
            const spread = (1.5 - fIdx) * 0.045 * (1 - curlAmount);
            finger.root.rotation.x = spread;
            finger.phalanges.forEach((phal, pIdx) => {
                const weight = pIdx === 0 ? 0.85 : pIdx === 1 ? 1.05 : 0.75;
                phal.rotation.z = side * curlAmount * weight;
            });
        });

        // Flexión oponible de las 2 falanges del pulgar
        hand.thumb.forEach(thumb => {
            thumb.phalanges.forEach((phal, pIdx) => {
                phal.rotation.z = side * (0.42 - curlAmount * (pIdx === 0 ? 0.65 : 0.85));
                phal.rotation.x = pIdx === 0 ? curlAmount * 0.45 : curlAmount * 0.35;
            });
        });
    }

    // Inicializar manos abiertas naturalmente
    setHandCurl('right', 0.12);
    setHandCurl('left', 0.25);

    // --- 5. CONSTRUCCIÓN DE PIERNAS Y BOTAS LUNARES ---
    function buildLeg(isRight) {
        const side = isRight ? -1 : 1;
        const prefix = isRight ? 'right' : 'left';

        // Cadera
        const hip = new THREE.Group();
        hip.position.set(side * 0.13, -0.11, 0);
        pelvis.add(hip);
        joints[prefix + 'Hip'] = hip;
        attachBoneHelper(hip, -0.26);

        const hipJointRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.115, 0.018, 16, 28),
            tanTrimMat
        );
        hipJointRing.rotation.x = Math.PI / 2;
        hipJointRing.rotation.y = side * 0.15;
        hip.add(hipJointRing);

        const thigh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.122, 0.108, 0.25, 24),
            suitCreamMat
        );
        thigh.position.y = -0.13;
        thigh.castShadow = true;
        hip.add(thigh);

        // Rodilla
        const knee = new THREE.Group();
        knee.position.set(0, -0.26, 0);
        hip.add(knee);
        joints[prefix + 'Knee'] = knee;
        attachBoneHelper(knee, -0.24);

        const kneePad = new THREE.Mesh(
            new THREE.TorusGeometry(0.106, 0.02, 16, 28),
            tanTrimMat
        );
        kneePad.rotation.x = Math.PI / 2;
        knee.add(kneePad);

        const shin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.108, 0.102, 0.22, 24),
            suitCreamMat
        );
        shin.position.y = -0.11;
        shin.castShadow = true;
        knee.add(shin);

        // Tobillo y Bota Lunar
        const ankle = new THREE.Group();
        ankle.position.set(0, -0.23, 0);
        knee.add(ankle);
        joints[prefix + 'Ankle'] = ankle;
        attachBoneHelper(ankle, -0.10);

        const bootCollar = new THREE.Mesh(
            new THREE.TorusGeometry(0.102, 0.016, 16, 28),
            tanTrimMat
        );
        bootCollar.rotation.x = Math.PI / 2;
        ankle.add(bootCollar);

        const bootUpper = new THREE.Mesh(
            new THREE.BoxGeometry(0.17, 0.09, 0.24),
            suitCreamMat
        );
        bootUpper.position.set(0, -0.045, 0.035);
        bootUpper.castShadow = true;
        ankle.add(bootUpper);

        const bootToe = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 20, 16),
            suitCreamMat
        );
        bootToe.position.set(0, -0.045, 0.145);
        bootToe.scale.set(1.0, 0.55, 1.1);
        ankle.add(bootToe);

        // Suela gruesa azul pizarra
        const bootSole = new THREE.Mesh(
            new THREE.BoxGeometry(0.185, 0.036, 0.29),
            slateBlueMat
        );
        bootSole.position.set(0, -0.095, 0.045);
        bootSole.castShadow = true;
        ankle.add(bootSole);

        // Propulsores de chorro RCS integrados en la suela de la bota (talón y antepié)
        [-0.035, 0.115].forEach((tz, idx) => {
            const thrusterUnit = new THREE.Group();
            thrusterUnit.position.set(0, -0.113, tz);
            ankle.add(thrusterUnit);

            // Collar metálico de anclaje en la suela
            const mountCollar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.034, 0.038, 0.012, 20),
                darkMetalMat
            );
            thrusterUnit.add(mountCollar);

            // Tobera cónica abierta hacia abajo
            const nozzle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.022, 0.031, 0.024, 20, 1, true),
                thrusterNozzleMat
            );
            nozzle.position.y = -0.016;
            nozzle.material.side = THREE.DoubleSide;
            thrusterUnit.add(nozzle);

            // Anillo térmico incandescente interior de la tobera
            const glowRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.022, 0.0035, 10, 20),
                thrusterGlowRingMat
            );
            glowRing.rotation.x = Math.PI / 2;
            glowRing.position.y = -0.022;
            thrusterUnit.add(glowRing);

            // Grupo animado de llama de plasma
            const flameGroup = new THREE.Group();
            flameGroup.position.y = -0.024;
            thrusterUnit.add(flameGroup);

            // Cono exterior de plasma azul eléctrico
            const outerFlameGeo = new THREE.ConeGeometry(0.032, 0.24, 18, 1, true);
            outerFlameGeo.translate(0, -0.12, 0);
            const outerFlame = new THREE.Mesh(outerFlameGeo, jetOuterFlameMat.clone());
            flameGroup.add(outerFlame);

            // Núcleo interior blanco-cyan intenso
            const innerFlameGeo = new THREE.ConeGeometry(0.016, 0.14, 14);
            innerFlameGeo.translate(0, -0.07, 0);
            const innerFlame = new THREE.Mesh(innerFlameGeo, jetCoreFlameMat.clone());
            flameGroup.add(innerFlame);

            // Luz puntual dinámica bajo la bota para iluminar la plataforma
            const jetLight = new THREE.PointLight(0x38bdf8, idx === 0 ? 0.65 : 0.35, 1.4);
            jetLight.position.y = -0.06;
            flameGroup.add(jetLight);

            bootThrusters.push({
                flameGroup,
                outerFlame,
                innerFlame,
                jetLight,
                phaseOffset: (isRight ? 0 : 1.7) + idx * 0.9
            });
        });
    }

    buildLeg(true);
    buildLeg(false);

    return { root, joints, boneHelpers, setHandCurl, bootThrusters };
}

export {createProceduralTextures, createAstronautModel};
