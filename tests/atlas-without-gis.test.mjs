import test from "node:test";

import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";

import { SourceTextModule, runInNewContext } from "node:vm";

import { JSDOM } from "jsdom";

test('Globe relief textures retain native dimensions with a small preload payload',async()=>{
  const {default:sharp}=await import('sharp');
  const {stat}=await import('node:fs/promises');
  const html=JSDOM.fragment(await readFile('dist/index.html','utf8'));
  let bytes=0;
  for(const [body,width,height] of [['earth',4320,2161],['mars',2880,1440]]){
    const file='dist/assets/'+body+'-relief.webp';
    const metadata=await sharp(file).metadata();
    assert.equal(metadata.width,width);assert.equal(metadata.height,height);
    assert.equal(metadata.format,'webp');
    bytes+=(await stat(file)).size;
    assert.ok(html.querySelector('link[rel="preload"][href="assets/'+body+'-relief.webp"]'));
  }
  assert.ok(bytes<2_000_000);
});

test('Motion damping remains smooth across frame rates and longitude boundaries',async()=>{
  const {damp,angleDelta}=await import('../dist/assets/motion.js');
  const integrate=hz=>{
    let value=0;
    for(let i=0;i<hz;i++){
      const next=damp(value,1,1000/hz);
      assert.ok(next>=value&&next<=1);
      value=next;
    }
    return value;
  };
  assert.ok(Math.abs(integrate(30)-integrate(60))<1e-10);
  assert.ok(Math.abs(integrate(60)-integrate(120))<1e-10);
  assert.equal(angleDelta(170,-170),20);
  assert.equal(angleDelta(-170,170),-20);
  assert.equal(damp(0,1,0),0);
  assert.ok(damp(0,1,10000)<.34);
});

test("Earth satellite context has a verified image and offline entry for every site", async () => {
  const {createHash}=await import('node:crypto');
  const {PNG}=await import('pngjs');
  const {earthImagery}=await import('../dist/assets/earth-imagery.js');
  const {earthImage,satelliteZoom,bindEarthImage}=await import('../dist/assets/earth-image.js');
  const {analogs}=await import('../dist/assets/analogs.js');
  const worker=await readFile('dist/service-worker.js','utf8');
  const assets=runInNewContext(worker+'; APP_ASSETS',{self:{addEventListener(){}}});
  for(const asset of assets)if(asset!=='./')await readFile('dist/'+asset.replace(/^\.\//,''));
  assert.deepEqual(Object.keys(earthImagery).sort(),analogs.map(s=>s.id).sort());
  for(const site of analogs){
    const entry=earthImagery[site.id];
    const buffer=await readFile('dist/assets/'+entry.file);
    assert.equal(createHash('sha256').update(buffer).digest('hex'),entry.sha256);
    const image=PNG.sync.read(buffer);
    assert.equal(image.width,512);assert.equal(image.height,512);
    assert.ok(assets.includes('./assets/'+entry.file));
    assert.ok(Math.abs((entry.bbox[0]+entry.bbox[2])/2-site.lon)<1e-8);
    assert.ok(Math.abs((entry.bbox[1]+entry.bbox[3])/2-site.lat)<1e-8);
    for(const language of ['es','en']){
      const fragment=JSDOM.fragment(earthImage(site.id,language));
      assert.equal(fragment.querySelector('img').getAttribute('src'),'assets/'+entry.file);
      assert.ok(fragment.querySelector('.earth-image-scale'));
      assert.equal(fragment.querySelector('img').closest('details'),null);
      assert.match(fragment.querySelector('figcaption').textContent,/NASA/);
      const frame=fragment.querySelector('[data-google-satellite]');
      assert.ok(frame);
      const satellite=new URL(frame.src);
      assert.equal(satellite.hostname,'maps.google.com');
      assert.equal(satellite.searchParams.get('t'),'k');
      assert.equal(satellite.searchParams.get('hl'),language);
      const [lat,lon]=satellite.searchParams.get('ll').split(',').map(Number);
      assert.ok(Math.abs(lat-site.lat)<1e-8&&Math.abs(lon-site.lon)<1e-8);
      const zoom=Number(satellite.searchParams.get('z'));
      const spanM=156543.03392*Math.cos(lat*Math.PI/180)*320/2**zoom;
      assert.ok(spanM>700&&spanM<1420);
      frame.getBoundingClientRect=()=>({width:640});
      bindEarthImage(fragment);
      assert.equal(Number(new URL(frame.src).searchParams.get('z')),satelliteZoom(lat,640));
    }
  }
  assert.match(earthImagery.mcmurdo.layer,/MODIS/);
  const html=await readFile('dist/index.html','utf8');
  assert.equal(JSDOM.fragment(html).querySelector('#surface-view'),null);
});

test("NASADEM profiles cover catalog sites without filling missing terrain", async () => {
  const {earthProfiles: earthProfiles} = await (import("../dist/assets/earth-profiles.js"));
  const {earthProfile: earthProfile} = await (import("../dist/assets/earth-profile.js"));
  const {analogs: analogs} = await (import("../dist/assets/analogs.js"));
  assert.equal(Object.keys(earthProfiles).length, analogs.length);
  let covered = 0;
  for (const site of analogs) {
    const profile = earthProfiles[site.id];
    if (site.lat < -56 || site.lat >= 60) {
      assert.equal(profile.unavailable, "outside-coverage");
      continue;
    }
    covered++;
    assert.deepEqual(profile.center, [ site.lat, site.lon ]);
    for (const direction of [ "EW", "SN" ]) {
      assert.equal(profile[direction].length, 320);
      for (const [i, p] of profile[direction].entries()) {
        assert.ok(Number.isFinite(p.elevationM) && p.elevationM > -500 && p.elevationM < 9e3);
        assert.ok(Math.abs(p.distanceKm - (i + .5) * profile.stepKm) < 1e-5);
      }
    }
    assert.ok(profile.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256)));
    assert.match(earthProfile(site.id, "es"), /Perfiles del terreno NASADEM/);
    assert.match(earthProfile(site.id, "en"), /NASADEM terrain profiles/);
  }
  assert.equal(covered, 16);
  assert.ok(earthProfiles["la-joya"].sources.length > 1);
  assert.ok(earthProfiles.huambo.sources.length > 1);
});

test("Polar profiles use real ellipsoidal elevation data and render gaps honestly", async () => {
  const {polarProfiles} = await import("../dist/assets/polar-profiles.js");
  const {earthProfile} = await import("../dist/assets/earth-profile.js");
  const {analogs} = await import("../dist/assets/analogs.js");
  const cases = {mcmurdo: ["REMA", 106], haughton: ["ArcticDEM", 130], askja: ["ArcticDEM", 1257], barrow: ["ArcticDEM", 3]};
  assert.deepEqual(Object.keys(polarProfiles).sort(), Object.keys(cases).sort());
  for (const [id, [dataset, centerHeight]] of Object.entries(cases)) {
    const profile = polarProfiles[id], site = analogs.find(item => item.id === id);
    assert.deepEqual(profile.center, [site.lat, site.lon]);
    assert.equal(profile.dataset, dataset);
    assert.equal(profile.verticalReference, "WGS84");
    assert.equal(profile.resolutionM, 32);
    assert.ok(profile.sources.length > 0);
    assert.ok(profile.sources.every(source => source.url.startsWith("https://pgc-opendata-dems.s3.us-west-2.amazonaws.com/")));
    for (const dir of ["EW", "SN"]) {
      assert.equal(profile[dir].length, 320);
      for (const [i, point] of profile[dir].entries()) {
        assert.ok(Number.isFinite(point.elevationM));
        assert.ok(Math.abs(point.distanceKm - (i + 0.5) * profile.stepKm) < 1e-5);
      }
    }
    assert.ok(Math.abs(profile.EW[159].elevationM - centerHeight) <= 5);
    for (const language of ["es", "en"]) {
      const fragment = JSDOM.fragment(earthProfile(id, language));
      assert.match(fragment.querySelector("figcaption").textContent, new RegExp(dataset));
      assert.match(fragment.querySelector("svg").textContent, /WGS84/);
      assert.doesNotMatch(fragment.textContent, /NASADEM|EGM96/);
      assert.equal(fragment.querySelectorAll("path[stroke-width='2']").length, 2);
    }
  }
  const worker = await readFile("dist/service-worker.js", "utf8");
  const assets = runInNewContext(worker + "; APP_ASSETS", {self: {addEventListener() {}}});
  assert.ok(assets.includes("./assets/polar-profiles.js"));

  const profile = polarProfiles.askja, original = profile.EW[100].elevationM;
  try {
    profile.EW[100].elevationM = null;
    const fragment = JSDOM.fragment(earthProfile("askja", "en"));
    const path = fragment.querySelector("path[stroke='#00ddeb']").getAttribute("d");
    assert.equal((path.match(/M/g) || []).length, 2);
    assert.doesNotMatch(path, /NaN/);
    assert.match(fragment.textContent, /Missing samples are shown as gaps/);
  } finally {
    profile.EW[100].elevationM = original;
  }
});

test("welcome launch completes, supports Escape, and respects reduced motion", async () => {
  const html = await readFile("dist/index.html", "utf8");
  for (const mode of [ "animation", "escape", "reduced" ]) {
    const dom = new JSDOM(html, {
      url: "http://127.0.0.1:8000/",
      runScripts: "outside-only",
      pretendToBeVisual: true
    });
    const w = dom.window;
    w.matchMedia = () => ({
      matches: mode === "reduced"
    });
    const root = new URL("../dist/assets/", import.meta.url), modules = new Map;
    async function load(url) {
      if (!modules.has(url.href)) modules.set(url.href, new SourceTextModule(await readFile(url, "utf8"), {
        context: dom.getInternalVMContext(),
        identifier: url.href
      }));
      return modules.get(url.href);
    }
    try {
      const introModule = await load(new URL("welcome-intro.js", root));
      await introModule.link((specifier, mod) => load(new URL(specifier, mod.identifier)));
      await introModule.evaluate();
      introModule.namespace.bindWelcomeIntro();
      const intro = w.document.getElementById("welcome-intro");
      assert.equal(intro.querySelector(".welcome-brand .welcome-team").textContent, "Team - Project Artemis");
      assert.equal(intro.querySelector(".welcome-mission"), null);
      assert.equal(intro.hasAttribute("aria-describedby"), false);
      const enter = intro.querySelector('[data-intro-dismiss="enter"]');
      const background = w.document.querySelector("[data-intro-background]");
      assert.equal(intro.hidden, false);
      assert.equal(background.inert, true);
      enter.click();
      if (mode !== "reduced") {
        assert.equal(intro.hidden, false);
        assert.ok(intro.classList.contains("is-launching"));
        assert.equal(enter.getAttribute("aria-disabled"), "true");
        assert.match(intro.querySelector('[role="status"]').textContent, /Ignition/);
        enter.click();
        assert.equal(w.sessionStorage.getItem("geotwin-intro-dismissed"), null);
        if (mode === "escape") w.document.dispatchEvent(new w.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true
        })); else {
          const rocket = intro.querySelector(".welcome-rocket");
          const unrelated = new w.Event("animationend", {
            bubbles: true
          });
          Object.defineProperty(unrelated, "animationName", {
            value: "welcome-ignition"
          });
          rocket.dispatchEvent(unrelated);
          assert.equal(intro.hidden, false);
          const finish = new w.Event("animationend", {
            bubbles: true
          });
          Object.defineProperty(finish, "animationName", {
            value: "welcome-liftoff"
          });
          rocket.dispatchEvent(finish);
        }
      }
      assert.equal(intro.hidden, true);
      assert.equal(intro.getAttribute("aria-hidden"), "true");
      assert.equal(background.inert, false);
      assert.equal(w.sessionStorage.getItem("geotwin-intro-dismissed"), "true");
      assert.equal(w.document.activeElement.id, "title");
    } finally {
      dom.window.close();
    }
  }
});

test("main atlas boots and selects lunar markers without loading GIS", async () => {
  const html = await readFile("dist/index.html", "utf8");
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1:8000/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const w = dom.window;
  w.sessionStorage.setItem("geotwin-intro-dismissed", "true");
  w.localStorage.setItem("geotwin-language", "es");
  const elevationBytes = await readFile("dist/assets/mars-elevation.bin");
  w.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => elevationBytes.buffer.slice(elevationBytes.byteOffset, elevationBytes.byteOffset + elevationBytes.byteLength)
  });
  w.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => ({});
  const modules = new Map;
  const root = new URL("../dist/assets/", import.meta.url);
  async function load(url) {
    if (!modules.has(url.href)) modules.set(url.href, new SourceTextModule(await readFile(url, "utf8"), {
      context: dom.getInternalVMContext(),
      identifier: url.href,
      initializeImportMeta: m => m.url = url.href
    }));
    return modules.get(url.href);
  }
  try {
    const app = await load(new URL("atlas-app.js", root));
    await app.link((s, m) => load(new URL(s, m.identifier)));
    await app.evaluate();
    const savedMedia=w.matchMedia;
    w.matchMedia=()=>({matches:false});
    const planetRenderer=modules.get(new URL('globe.js',root).href).namespace;
    const smoothCamera=new planetRenderer.PlanetViewer(w.document.createElement('div'),()=>{});
    smoothCamera.camera.lon=170;
    smoothCamera.center(30,-170,2);
    assert.equal(smoothCamera.camera.zoom,1);
    smoothCamera.stepCamera(16);
    assert.ok(smoothCamera.camera.lon>170&&smoothCamera.camera.lon<190);
    assert.ok(smoothCamera.camera.zoom>1&&smoothCamera.camera.zoom<2);
    for(let i=0;i<150;i++)smoothCamera.stepCamera(16);
    assert.equal(smoothCamera.camera.zoom,2);
    w.matchMedia=()=>({matches:true});
    smoothCamera.center(0,0,1);
    smoothCamera.stepCamera(16);
    assert.equal(smoothCamera.camera.zoom,1);
    w.matchMedia=savedMedia;
    const persistentAstronaut=w.document.querySelector('.astronaut-rover');
    assert.ok(persistentAstronaut);
    assert.equal(persistentAstronaut.hidden,false);
    assert.equal(w.document.getElementById('location-analogs').hidden,true);
    const initialAstronautX=parseFloat(persistentAstronaut.style.left);
    persistentAstronaut.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.equal(parseFloat(persistentAstronaut.style.left),initialAstronautX-50);
    persistentAstronaut.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert.equal(parseFloat(persistentAstronaut.style.left),initialAstronautX);
    assert.equal(w.document.documentElement.lang, "en");
    assert.equal(w.document.getElementById("language-toggle").textContent, "ES");
    const modelModule = modules.get(new URL("astronaut-model.js", root).href).namespace;
    const model = modelModule.createAstronautModel(Object.fromEntries([ "suitMap", "suitBump", "suitRough", "rubberBump", "rubberRough", "hoseBump", "visorEnvMap" ].map(name => [ name, null ])));
    assert.ok(model.joints.rightShoulder && model.joints.rightElbow && model.joints.leftKnee);
    assert.equal(model.bootThrusters.length, 4);
    const finger = model.joints.rightHandFingers.fourFingers[0].phalanges[0];
    const initialCurl = finger.rotation.z;
    model.setHandCurl("right", .8);
    assert.notEqual(finger.rotation.z, initialCurl);
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.documentElement.lang, "es");
    assert.equal(modules.get(new URL("i18n.js", root).href).namespace.currentLanguage(), "es");
    const readout = w.document.querySelector(".orbital-readout");
    assert.ok(w.document.querySelector(".overview-heading").contains(readout));
    assert.equal(w.document.getElementById("orbital-lat").textContent, "—");
    assert.equal(w.document.getElementById("orbital-lon").textContent, "—");
    const globe = modules.get(new URL("globe.js", root).href).namespace;
    const overview = w.document.createElement("div");
    const control = w.document.createElement("div");
    control.dataset.overviewWorld = "Earth";
    Object.defineProperties(control, {
      clientWidth: {
        value: 200
      },
      clientHeight: {
        value: 200
      }
    });
    const layer = w.document.createElement("div");
    layer.dataset.overviewLocations = "Earth";
    const nearbySites = [ {
      id: "nearby-a",
      name: "Nearby A",
      lat: 0,
      lon: -2
    }, {
      id: "nearby-b",
      name: "Nearby B",
      lat: 0,
      lon: 0
    }, {
      id: "nearby-c",
      name: "Nearby C",
      lat: 0,
      lon: 2
    } ];
    const markers = nearbySites.map(site => {
      const marker = w.document.createElement("button");
      marker.dataset.overviewLocation = site.id;
      marker.setAttribute("aria-label", site.name);
      layer.append(marker);
      return marker;
    });
    overview.append(control, layer);
    const overviewViewer = {
      camera: {
        zoom: 1
      },
      textures: new Map,
      project: (lat, lon) => ({
        x: 100 + lon,
        y: 100 + lat,
        z: 1
      })
    };
    globe.PlanetAtlas.prototype.drawOverview.call({
      syncSceneLabel() {},
      drawOverviewConnections() {},
      isOverview: true,
      viewport: overview,
      planets: new Map([ [ "Earth", overviewViewer ] ]),
      overviewLocations: {
        Earth: nearbySites
      },
      overviewZoomLimit: () => 2
    }, "Earth");
    assert.ok(markers.every(marker => !marker.hidden && marker.classList.contains("cluster-spread")));
    assert.ok(markers.every(marker => !marker.classList.contains("cluster-member") && !marker.hasAttribute("data-cluster-count")));
    assert.deepEqual(markers.map(marker => marker.getAttribute("aria-label")), nearbySites.map(site => site.name));
    assert.equal(new Set(markers.map(marker => marker.style.getPropertyValue("--cluster-x") + "," + marker.style.getPropertyValue("--cluster-y"))).size, 3);
    const connectorRoot = w.document.createElement("div");
    const connectorNetwork = w.document.createElement("div");
    connectorNetwork.className = "planet-network";
    Object.defineProperties(connectorNetwork, {
      clientWidth: {
        value: 300
      },
      clientHeight: {
        value: 150
      }
    });
    connectorNetwork.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 300,
      height: 150
    });
    const connectionLayer = w.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    connectionLayer.dataset.overviewConnections = "";
    connectorNetwork.append(connectionLayer);
    const connectorMarkers = {};
    for (const [world, id, left, top, hidden] of [ [ "Earth", "source", 100, 40, false ], [ "Moon", "moon-match", 30, 80, false ], [ "Mars", "mars-match", 240, 70, true ] ]) {
      let layer = connectorNetwork.querySelector(`[data-overview-locations="${world}"]`);
      if (!layer) {
        layer = w.document.createElement("span");
        layer.dataset.overviewLocations = world;
        connectorNetwork.append(layer);
      }
      const marker = w.document.createElement("button");
      marker.dataset.overviewLocation = id;
      marker.hidden = hidden;
      marker.getBoundingClientRect = () => ({
        left: left,
        top: top,
        width: 12,
        height: 12
      });
      layer.append(marker);
      connectorMarkers[id] = marker;
    }
    connectorRoot.append(connectorNetwork);
    const connectorAtlas = {
      viewport: connectorRoot,
      connectionLayer: connectionLayer,
      isOverview: true,
      overviewConnections: [],
      connectionPaths: [],
      connectionTargets: [],
      connectionOrigin: null
    };
    const connections = [ {
      fromWorld: "Earth",
      fromId: "source",
      toWorld: "Moon",
      toId: "moon-match"
    }, {
      fromWorld: "Earth",
      fromId: "source",
      toWorld: "Mars",
      toId: "mars-match"
    } ];
    globe.PlanetAtlas.prototype.setOverviewConnections.call(connectorAtlas, connections);
    globe.PlanetAtlas.prototype.drawOverviewConnections.call(connectorAtlas);
    assert.equal(connectionLayer.querySelectorAll("path").length, 2);
    assert.equal(connectionLayer.hidden, false);
    assert.notEqual(connectionLayer.querySelector("path").getAttribute("d"), null);
    assert.equal(connectionLayer.querySelectorAll('path[style*="display: none"]').length, 1);
    assert.equal(w.document.querySelector("#gis"), null);
    assert.equal(w.document.querySelector('a[href="#gis"]'), null);
    assert.ok([ ...modules.keys() ].every(p => !/study\.js|relief\.js|area-viewer\.js/.test(p)));
    assert.equal(w.document.querySelectorAll('[data-overview-locations="Moon"]>*').length, 17);
    for (const [id, diameter, depth, ratio, morphology, period] of [ [ "csn215", "21,29 km", "1,929 km", "0,091", "Tazón", "Nectárico" ], [ "cse37", "11,92 km", "1,369 km", "0,115", "Tazón", "Eratosteniano" ], [ "csc13", "63,02 km", "3,479 km", "0,055", "Tazón", "Copernicano" ] ]) {
      w.document.querySelector(`[data-overview-location="${id}"]`).click();
      const panel = w.document.getElementById("location-analogs");
      assert.equal(panel.querySelector(".study-rationale"), null);
      assert.doesNotMatch(panel.textContent, /Matriz geológica aportada/);
      const evaluation = panel.querySelector(".site-evaluation");
      const field = name => [ ...evaluation.querySelectorAll("dt") ].find(dt => dt.textContent === name)?.nextElementSibling.textContent ?? "";
      assert.ok(field("Diámetro").includes(diameter), `language=${w.document.documentElement.lang}; field=${field("Diámetro")}; expected=${diameter}`);
      assert.ok(field("Profundidad").includes(depth));
      assert.ok(field("Relación profundidad/diámetro (d/D)").includes(ratio));
      assert.ok(field("Estructuras").includes(morphology));
      assert.ok(field("Diámetro").includes("Datos aportados"));
      assert.doesNotMatch(field("Diámetro") + " " + field("Profundidad") + " " + field("Relación profundidad/diámetro (d/D)"), /verificación pendiente/);
      assert.ok(field("Estructuras").includes("Datos aportados · " + period + " · verificación pendiente"));
    }
    let evidence = w.document.querySelector(".guide-evidence");
    assert.equal(evidence.open, false);
    assert.equal(evidence.firstElementChild.tagName, "SUMMARY");
    assert.ok(evidence.firstElementChild.nextElementSibling.matches(".crater-profile"));
    assert.ok(evidence.querySelector(".crater-profile"));
    evidence.querySelector("summary").click();
    assert.equal(evidence.open, true);
    w.document.getElementById("language-toggle").click();
    evidence = w.document.querySelector(".guide-evidence");
    assert.equal(evidence.open, true);
    assert.match(evidence.querySelector(".crater-profile").textContent, /LOLA topographic transects/);
    w.document.querySelector('[data-overview-location="cse37"]').click();
    assert.equal(w.document.querySelector(".guide-evidence").open, false);
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.querySelector(".guide-evidence").open, false);
    w.document.querySelector('a[href="#catalogo"]').click();
    assert.equal(w.document.getElementById("catalogo").hidden, false);
    w.document.querySelector('[data-site="cse16"][data-site-world="Moon"]').click();
    assert.match(w.document.getElementById("guide-speech").textContent, /período Eratosteniano.*contrastar esa clasificación/);
    w.document.getElementById("language-toggle").click();
    assert.match(w.document.getElementById("guide-speech").textContent, /classified as Eratosthenian.*verify that classification/);
    w.document.getElementById("language-toggle").click();
    w.document.querySelector('[data-site="lava-beds"][data-site-world="Earth"]').click();
    assert.equal(w.document.querySelector(".guide-evidence").open, false);
    const details = w.document.getElementById("location-analogs").textContent;
    const selectedLatitude = w.document.getElementById("orbital-lat").textContent;
    const selectedLongitude = w.document.getElementById("orbital-lon").textContent;
    assert.notEqual(selectedLatitude, "—");
    assert.notEqual(selectedLongitude, "—");
    w.document.querySelector('[data-overview-world="Earth"]').dispatchEvent(new w.KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true
    }));
    assert.equal(w.document.getElementById("orbital-lat").textContent, selectedLatitude);
    assert.equal(w.document.getElementById("orbital-lon").textContent, selectedLongitude);
    assert.match(details, /Lava Beds/);
    assert.doesNotMatch(details, /Justificación estratégica para Geo Twin|Es prioritario para estudiar geofísica|Fuente: Cuadro comparativo de los análogos terrestres\.docx/);
    const activeLocations = () => [ ...w.document.querySelectorAll("[data-overview-location]") ].map(node => node.dataset.overviewLocation + ":" + node.classList.contains("inactive")).sort();
    const relationships = activeLocations();
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.documentElement.lang, "en");
    evidence = w.document.querySelector(".guide-evidence");
    assert.equal(evidence.open, false);
    const satelliteFrame = evidence.querySelector("[data-google-satellite]");
    satelliteFrame.getBoundingClientRect = () => ({width: 640});
    evidence.querySelector("summary").click();
    assert.equal(evidence.open, true);
    await new Promise(resolve => setTimeout(resolve, 20));
    const satelliteZoom = modules.get(new URL("earth-image.js", root).href).namespace.satelliteZoom;
    assert.equal(Number(new URL(satelliteFrame.src).searchParams.get("z")), satelliteZoom(Number(satelliteFrame.dataset.lat), 640));
    assert.equal(w.document.querySelector(".atlas-catalog-head h2").textContent, "ANALOG CATALOG");
    assert.equal(w.document.querySelector("#atlas-overview-view").textContent.trim(), "Atlas 3D");
    assert.equal(w.document.querySelector("#atlas-overview-view").getAttribute("aria-label"), "Return to Atlas 3D");
    assert.equal(w.document.querySelector(".rotation-indicator"), null);
    const headerControls = w.document.querySelector(".atlas-header-controls");
    for (const selector of [".planet-switcher", "#atlas-overview-view", 'a[href="#catalogo"]', "#language-toggle"]) {
      assert.ok(headerControls.querySelector(selector), `Missing control: ${selector}`);
    }
    assert.equal(w.document.querySelector(".workspace-footer"), null);
    assert.ok(w.document.querySelectorAll("#atlas-sites .catalog-meta").length > 0);
    assert.equal(w.document.querySelectorAll("#atlas-sites .catalog-meta small").length, 0);
    assert.match(w.document.getElementById("location-analogs").textContent, /Application: Lava tubes and subsurface/);
    assert.doesNotMatch(w.document.getElementById("location-analogs").textContent, /Aplicación:|Los investigadores de NASA han cartografiado/);
    assert.deepEqual(activeLocations(), relationships);
    const environments = [ ...w.document.querySelectorAll("#atlas-environment option") ].map(option => option.textContent);
    assert.ok(environments.includes("Possible impact structure · origin unverified"));
    assert.ok(environments.includes("Crater · Nectarian period"));
    assert.doesNotMatch(environments.join(" "), /Posible estructura|Nectárico/);
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.documentElement.lang, "es");
    assert.equal(w.document.querySelector(".guide-evidence").open, true);
    assert.equal(w.document.querySelector("#atlas-overview-view").textContent.trim(), "Atlas 3D");
    assert.equal(w.document.querySelector("#atlas-overview-view").getAttribute("aria-label"), "Volver a Atlas 3D");
    assert.equal(w.document.querySelector(".rotation-indicator"), null);
    assert.equal(w.document.querySelector(".workspace-footer"), null);
    assert.ok(w.document.querySelectorAll("#atlas-sites .catalog-meta").length > 0);
    assert.equal(w.document.querySelectorAll("#atlas-sites .catalog-meta small").length, 0);
    assert.match(w.document.getElementById("location-analogs").textContent, /Aplicación: Tubos de lava y subsuelo/);
    w.document.querySelector('[data-site="csc13"][data-site-world="Moon"]').click();
    assert.equal(w.document.querySelector(".guide-evidence").open, false);
    assert.match(w.document.getElementById("location-analogs").textContent, /Justificación de selección lunar/);
    assert.match(w.document.getElementById("guide-speech").textContent, /¿Cómo podríamos saber.*pico central.*imágenes.*Ver observaciones, fuentes y datos/);
    assert.doesNotMatch(w.document.getElementById("guide-speech").textContent, /Estos rasgos aún deben verificarse/);
    assert.doesNotMatch(w.document.getElementById("guide-speech").textContent, /propuestos por el usuario/);
    w.document.getElementById("language-toggle").click();
    assert.match(w.document.getElementById("location-analogs").textContent, /Lunar site-selection rationale/);
    assert.match(w.document.getElementById("guide-speech").textContent, /How could we tell.*central peak.*images.*View observations, sources and data/);
    assert.doesNotMatch(w.document.getElementById("guide-speech").textContent, /proposed by the user/);
    assert.doesNotMatch(w.document.getElementById("location-analogs").textContent, /Coordenadas aportadas|Copernicano/);
    w.document.querySelector('[data-site="arcadia-ap1"][data-site-world="Mars"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(w.document.getElementById("orbital-elevation-group").hidden, false);
    assert.match(w.document.getElementById("orbital-elevation").textContent, /^≈ [\d,−-]+ m$/);
    assert.match(w.document.querySelector(".mars-profile figcaption").textContent, /Topographic transects/);
    assert.equal(w.document.querySelectorAll(".mars-profile svg circle").length, 82);
    w.document.querySelector(".guide-evidence").open = true;
    assert.match(w.document.getElementById("location-analogs").textContent, /High study priority/);
    assert.doesNotMatch(w.document.getElementById("location-analogs").textContent, /Justificación|Aterrizaje:|verificación operativa/);
    assert.equal(w.document.querySelector(".site-evaluation"), null);
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.documentElement.lang, "es");
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(w.document.querySelector(".guide-evidence").open, true);
    assert.match(w.document.querySelector(".mars-profile figcaption").textContent, /Transectos topográficos/);
    w.document.querySelector('[data-site="lava-beds"][data-site-world="Earth"]').click();
    assert.equal(w.document.getElementById("orbital-elevation-group").hidden, true);
    assert.equal(w.document.querySelectorAll('#atlas-sites .catalog-site[aria-pressed="true"]').length, 1);
    w.document.querySelector("[data-close-info]").click();
    assert.equal(persistentAstronaut.hidden,false);
    assert.equal(w.document.getElementById("location-analogs").hidden, true);
    assert.equal(w.document.getElementById("orbital-lat").textContent, "—");
    assert.equal(w.document.getElementById("orbital-lon").textContent, "—");
    assert.equal(w.document.querySelectorAll('#atlas-sites .catalog-site[aria-pressed="true"]').length, 0);
    assert.equal(w.document.querySelectorAll("[data-overview-location].selected").length, 0);
    w.document.querySelector('[data-site="lava-beds"][data-site-world="Earth"]').click();
    w.document.dispatchEvent(new w.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    }));
    assert.equal(w.document.getElementById("location-analogs").hidden, true);
    assert.equal(w.document.querySelectorAll('#atlas-sites .catalog-site[aria-pressed="true"]').length, 0);
    const {earthSummaries: earthSummaries, earthSummaryLabels: earthSummaryLabels} = modules.get(new URL("earth-summary.js", root).href).namespace;
    const earthIds = [ ...w.document.querySelectorAll('[data-overview-locations="Earth"] [data-overview-location]') ].map(node => node.dataset.overviewLocation).sort();
    assert.deepEqual(Object.keys(earthSummaries).sort(), earthIds);
    assert.equal(earthSummaries["meteor-crater"].es[2], "Diámetro aprox. 1,2 km; profundidad aprox. 180 m; d/D ≈ 0,15");
    assert.equal(earthSummaries.mcmurdo.en[5], "Annual mean −15 to −30 °C in parts of the valleys");
    for (const lang of [ "en", "es" ]) {
      if (w.document.documentElement.lang !== lang) w.document.getElementById("language-toggle").click();
      for (const id of [ ...w.document.querySelectorAll("[data-overview-location]") ].map(n => n.dataset.overviewLocation)) {
        w.document.querySelector('[data-overview-location="' + id + '"]').click();
        const panel = w.document.getElementById("location-analogs");
        const summary = panel.querySelector(".earth-summary");
        if (earthSummaries[id]) {
          assert.ok(summary, `Missing terrestrial summary: ${id}`);
          if (id === "isabella-choten") {
            assert.equal(panel.querySelector(".astronaut-speech h3").textContent, "Isabella–San Juan");
            assert.match(panel.textContent, /San Juan/);
            assert.doesNotMatch(panel.textContent, /Chotén/);
            const marker = w.document.querySelector('[data-overview-location="isabella-choten"]');
            assert.match(marker.getAttribute("aria-label"), /Isabella–San Juan/);
            const catalogEntry = w.document.querySelector('[data-site="isabella-choten"][data-site-world="Earth"]');
            assert.match(catalogEntry.textContent, /San Juan/);
            assert.doesNotMatch(catalogEntry.textContent, /Chotén/);
          }
          const rationale = panel.querySelector(".study-rationale");
          assert.ok(rationale, `Missing selection rationale: ${id}`);
          assert.ok([ ...rationale.querySelectorAll("h5") ].every(heading => heading.textContent !== "No." && heading.textContent !== "N.º"));
          assert.ok(rationale.querySelectorAll("h5").length > 0);
          const rows = [ ...summary.querySelectorAll("dl>div") ];
          const hiddenIndexes = id === "isabella-choten" ? [ 2, 3, 4, 5 ] : id === "sucre" ? [ 2, 3, 4, 5, 6 ] : [];
          assert.deepEqual(rows.map(row => row.querySelector("dt").textContent), [ ...earthSummaryLabels[lang] ].filter((_, index) => !hiddenIndexes.includes(index)));
          assert.deepEqual(rows.map(row => row.querySelector("dd").textContent), [ ...earthSummaries[id][lang] ].filter((_, index) => !hiddenIndexes.includes(index)));
          if (id === "andagua") assert.match(summary.textContent, /60 × 25 km[\s\S]*60 × 60 km/);
        } else assert.equal(summary, null);
        if (lang === "en") {
          assert.doesNotMatch(panel.textContent, /\b(?:Tierra|Luna|Marte|Aplicación|Pendiente de datos|Cota aportada|verificación pendiente|Estructuras|Iluminación|Morfometría|Base humana|Profundidad|Exploremos)\b/, "Mixed English panel: " + id);
          assert.match(w.document.querySelector(".astronaut-rover").title, /Drag to move/);
        }
        for (const evaluation of panel.querySelectorAll(".site-evaluation:not(.earth-summary)")) {
          assert.doesNotMatch(evaluation.textContent, /Sin datos|No data|Pendiente de datos|Data pending/);
          assert.ok([ ...evaluation.querySelectorAll("details") ].every(section => section.querySelector("dl>div")));
        }
        for (let i = 0; i < 3; i++) {
          const speech = w.document.getElementById("guide-speech").textContent;
          assert.ok(speech.trim().length > 0);
          assert.doesNotMatch(speech, /\b(?:undefined|null)\b/);
          if (lang === "en") assert.doesNotMatch(speech, /Referencia para estudiar|Comparar la profundidad|Incorporar una morfología|Investigar pico central|Estudiar morfología|Estas observaciones/, "Mixed English guide: " + id);
          const next = w.document.querySelector('[data-guide-step="1"]');
          if (!next.disabled) next.click();
        }
      }
    }
    w.document.querySelector('[data-overview-location="isabella-choten"]').click();
    w.document.querySelector('[data-guide-step="1"]').click();
    assert.match(w.document.getElementById("guide-speech").textContent, /no se ha confirmado el origen/);
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.getElementById("guide-progress").textContent, "2 / 3");
    assert.match(w.document.getElementById("guide-speech").textContent, /origin.*not yet been confirmed/);
    w.document.querySelector('[data-overview-location="csc13"]').click();
    w.document.querySelector('[data-guide-step="1"]').click();
    assert.match(w.document.getElementById("guide-speech").textContent, /63\.02 km.*3\.479 km.*Choose another crater/);
    w.document.getElementById("language-toggle").click();
    assert.match(w.document.getElementById("guide-speech").textContent, /63,02 km.*3,479 km.*Elige otro cráter/);
    w.document.querySelector('[data-guide-step="1"]').click();
    assert.doesNotMatch(w.document.getElementById("guide-speech").textContent, /dimensiones.*contrastarse/);
    assert.match(w.document.getElementById("guide-speech").textContent, /¿Quieres seguir explorando\?.*Ver observaciones, fuentes y datos/);
    w.document.getElementById("language-toggle").click();
    assert.match(w.document.getElementById("guide-speech").textContent, /Want to explore further\?.*View observations, sources and data/);
    w.document.querySelector('[data-overview-location="arcadia-ap1"]').click();
    w.document.querySelector('[data-guide-step="1"]').click();
    assert.match(w.document.getElementById("guide-speech").textContent, /High study priority.*Ice and resources.*verified/);
    w.document.querySelector('[data-guide-step="1"]').click();
    assert.match(w.document.getElementById("guide-speech").textContent, /Before drawing conclusions/);
    w.document.getElementById("reset-all-globes").click();
    w.document.querySelector('[data-overview-world="Earth"]').dispatchEvent(new w.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true
    }));
    assert.match(w.document.getElementById("guide-speech").textContent, /Selected point.*don’t have a specific profile/);
    w.document.querySelector('[data-guide-step="1"]').click();
    w.document.getElementById("language-toggle").click();
    assert.equal(w.document.getElementById("guide-progress").textContent, "2 / 3");
    assert.equal(w.document.querySelector(".astronaut-speech h3").textContent, "Punto seleccionado");
    assert.match(w.document.getElementById("guide-speech").textContent, /elige una ubicación del catálogo/);
  } finally {
    dom.window.close();
  }
});

test("service worker revalidates assets and retains offline fallback", async () => {
  const code = await readFile("dist/service-worker.js", "utf8");
  const handlers = {};
  const cached = {
    cached: true
  };
  let fetchOptions, installed = [], offline = false, fetchCalls=0;
  const cache = {
    addAll: async requests => {
      installed = requests;
    },
    put: async () => {}
  };
  const self = {
    location: {
      origin: "http://localhost"
    },
    registration: {
      scope: "http://localhost/"
    },
    clients: {
      claim: async () => {}
    },
    skipWaiting: async () => {},
    addEventListener: (name, handler) => {
      handlers[name] = handler;
    }
  };
  const caches = {
    open: async () => cache,
    match: async () => cached
  };
  const fetch = async (_request, options) => {
    fetchCalls++;
    fetchOptions = options;
    if (offline) throw new Error("offline");
    return {
      ok: true,
      clone() {
        return this;
      }
    };
  };
  class Request {
    constructor(url, options) {
      this.url = url;
      this.cache = options.cache;
    }
  }
  runInNewContext(code, {
    self: self,
    caches: caches,
    fetch: fetch,
    Request: Request,
    URL: URL
  });
  let install;
  handlers.install({
    waitUntil: promise => {
      install = promise;
    }
  });
  await install;
  assert.ok(installed.length > 0 && installed.every(request => request.cache === "reload"));
  const request = {
    method: "GET",
    url: "http://localhost/assets/study-rationale-map.js"
  };
  let response;
  handlers.fetch({
    request: request,
    respondWith: promise => {
      response = promise;
    }
  });
  await response;
  assert.equal(fetchOptions.cache, "no-cache");
  offline = true;
  handlers.fetch({
    request: request,
    respondWith: promise => {
      response = promise;
    }
  });
  assert.equal(await response, cached);
  offline=false;
  const callsBeforeTexture=fetchCalls;
  handlers.fetch({request:{method:'GET',url:'http://localhost/assets/earth-relief.webp'},respondWith:promise=>{response=promise;}});
  assert.equal(await response,cached);
  assert.equal(fetchCalls,callsBeforeTexture);
});
