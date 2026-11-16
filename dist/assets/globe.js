import { currentLanguage, t } from "./i18n.js";
import {damp, angleDelta} from './motion.js';

const rad = Math.PI / 180;

const tau = 2 * Math.PI;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const worlds = {
  Earth: {
    get label() {
      return t("earth.open");
    },
    image: "earth-relief.webp",
    lon: -63,
    lat: 11,
    tint: [ 93, 166, 245 ],
    credit: "NOAA · ETOPO",
    source: "https://www.ncei.noaa.gov/products/etopo-global-relief-model"
  },
  Moon: {
    get label() {
      return t("moon.open");
    },
    image: "moon-globe.webp",
    lon: 8,
    lat: -46,
    tint: [ 169, 180, 217 ],
    credit: "NASA SVS · LRO",
    source: "https://svs.gsfc.nasa.gov/4720/"
  },
  Mars: {
    get label() {
      return t("mars.open");
    },
    image: "mars-relief.webp",
    lon: 53,
    lat: 15,
    tint: [ 252, 141, 88 ],
    credit: "NASA PDS · MOLA",
    source: "https://pds-geosciences.wustl.edu/missions/mgs/mola.html"
  }
};

function loadTexture(world) {
  return new Promise((resolve, reject) => {
    const image = new Image;
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.onerror = reject;
    image.onload = () => {
      const buffer = document.createElement("canvas");
      buffer.width = image.naturalWidth;
      buffer.height = image.naturalHeight;
      const ctx = buffer.getContext("2d");
      ctx.drawImage(image, 0, 0);
      resolve({
        width: buffer.width,
        height: buffer.height,
        pixels: ctx.getImageData(0, 0, buffer.width, buffer.height).data
      });
    };
    image.src = new URL(world.image, import.meta.url).href;
  });
}

const sphereGrids=new Map();

function sphereGrid(size) {
  if(sphereGrids.has(size))return sphereGrids.get(size);
  const coords = new Float32Array(size * size * 7);
  let cursor=0;
  const radius = (size - 2) / 2;
  const edge=(1+1/radius)**2;
  for (let row = 0; row < size; row++) {
    const y = (size / 2 - row - .5) / radius;
    for (let col = 0; col < size; col++) {
      const x = (col + .5 - size / 2) / radius;
      const distanceSquared=x*x+y*y;
      if (distanceSquared>edge) continue;
      const distance=Math.sqrt(distanceSquared);
      const z = Math.sqrt(Math.max(0, 1 - distanceSquared));
      const light = .3 + .75 * Math.max(0, -.37 * x + .46 * y + .807 * z);
      const edgeLight=1-z;
      const rim = edgeLight*edgeLight*edgeLight * Math.max(0, .52 - .3 * x + .32 * y);
      const alpha = Math.round(255 * clamp((1 - distance) * radius + .5, 0, 1));
      coords[cursor++]=4*(row*size+col);
      coords[cursor++]=x;
      coords[cursor++]=y;
      coords[cursor++]=z;
      coords[cursor++]=light;
      coords[cursor++]=rim;
      coords[cursor++]=alpha;
    }
  }
  const grid=coords.subarray(0,cursor);
  sphereGrids.set(size,grid);
  if(sphereGrids.size>3)sphereGrids.delete(sphereGrids.keys().next().value);
  return grid;
}

export class PlanetViewer {
  constructor(viewport, onTextureReady) {
    this.viewport = viewport;
    this.onTextureReady = onTextureReady;
    this.cameras = Object.fromEntries(Object.entries(worlds).map(([id, world]) => [ id, {
      lon: world.lon,
      lat: world.lat,
      zoom: 1
    } ]));
    this.textures = new Map;
    this.world = "Earth";
    this.frame = 0;
  }
  get camera() {
    return this.cameras[this.world];
  }
  show(id) {
    this.world = id;
    if (!this.textures.has(id)) {
      this.textures.set(id, {
        status: "loading"
      });
      loadTexture(worlds[id]).then(texture => {
        this.textures.set(id, {
          status: "ready",
          texture: texture
        });
        this.requestDraw();
        this.onTextureReady?.();
      }).catch(() => {
        this.textures.set(id, {
          status: "error"
        });
        this.requestDraw();
        this.onTextureReady?.();
      });
    }
    this.requestDraw();
  }
  center(lat, lon, zoom = this.camera.zoom) {
    this.targetCamera = {
      lat: clamp(lat, -90, 90),
      lon: lon,
      zoom: zoom
    };
    this.requestDraw();
  }
  reset() {
    const world = worlds[this.world];
    this.targetCamera = {
      lat: world.lat,
      lon: world.lon,
      zoom: 1
    };
    this.requestDraw();
  }
  zoom(amount, maxZoom = 2.4) {
    this.targetCamera={...(this.targetCamera??this.camera),zoom:clamp((this.targetCamera??this.camera).zoom+amount,.8,maxZoom)};
    this.requestDraw();
  }
  rotate(lon, lat) {
    const from=this.targetCamera??this.camera;
    this.targetCamera={...from,lon:(from.lon+lon+540)%360-180,lat:clamp(from.lat+lat,-90,90)};
    this.requestDraw();
  }
  stepCamera(elapsedMs) {
    const target=this.targetCamera;
    if(!target)return false;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
    if(reduced){Object.assign(this.camera,target);this.targetCamera=null;return false;}
    this.camera.lon=damp(this.camera.lon,this.camera.lon+angleDelta(this.camera.lon,target.lon),elapsedMs);
    this.camera.lat=damp(this.camera.lat,target.lat,elapsedMs);
    this.camera.zoom=damp(this.camera.zoom,target.zoom,elapsedMs);
    if(Math.abs(angleDelta(this.camera.lon,target.lon))<.015&&Math.abs(this.camera.lat-target.lat)<.015&&Math.abs(this.camera.zoom-target.zoom)<.001){Object.assign(this.camera,target);this.targetCamera=null;return false;}
    return true;
  }
  requestDraw() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.onTextureReady?.();
    });
  }
  renderSphere(texture, target, camera = this.camera) {
    const {width: width, height: height, pixels: pixels} = texture;
    const targetCtx = target.getContext("2d");
    const size = target.width;
    this.sphereTargets ??= new WeakMap;
    let cached = this.sphereTargets.get(target);
    if (cached?.size !== size) {
      cached = {
        size: size,
        grid: sphereGrid(size),
        image: targetCtx.createImageData(size, size)
      };
      this.sphereTargets.set(target, cached);
    }
    const grid = cached.grid;
    const image = cached.image;
    const dest = image.data;
    const lon = camera.lon * rad;
    const lat = camera.lat * rad;
    const sin = Math.sin(lat);
    const cos = Math.cos(lat);
    const [red, green, blue] = worlds[this.world].tint;
    for (let i = 0; i < grid.length; i += 7) {
      const offset = grid[i], x = grid[i + 1], y = grid[i + 2], z = grid[i + 3];
      const longitude = Math.atan2(x, z * cos - y * sin) + lon;
      const latitude = Math.asin(clamp(y * cos + z * sin, -1, 1));
      const col = Math.floor((longitude / tau + 1.5) * width) % width;
      const row = Math.min(height - 1, Math.floor((.5 - latitude / Math.PI) * height));
      const source = (row * width + col) * 4;
      const light = grid[i + 4], rim = grid[i + 5] * (this.world === "Earth" ? .77 : .2);
      dest[offset] = pixels[source] * light + red * rim;
      dest[offset + 1] = pixels[source + 1] * light + green * rim;
      dest[offset + 2] = pixels[source + 2] * light + blue * rim;
      dest[offset + 3] = grid[i + 6];
    }
    targetCtx.putImageData(image, 0, 0);
  }
  drawTexture(target) {
    const entry = this.textures.get(this.world);
    if (entry?.status !== "ready") return false;
    const orb = target.parentElement;
    orb.style.setProperty("--globe-scale", String(this.camera.zoom));
    const rect = orb.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const desired = Math.min(960, Math.max(96, Math.ceil(Math.min(rect.width, rect.height) * Math.min(globalThis.devicePixelRatio || 1, 1.4)/32)*32));
    const firstPaint=target.dataset.ready!=='true';
    if(firstPaint)target.dataset.previewUntil=String(performance.now()+120);
    const size=performance.now()<Number(target.dataset.previewUntil)?Math.min(256,desired):desired;
    if (target.width !== size || target.height !== size) target.width = target.height = size;
    target.style.width = "100%";
    target.style.height = "100%";
    this.renderSphere(entry.texture, target, this.camera);
    target.dataset.ready = "true";
    if(firstPaint)window.setTimeout(()=>this.onTextureReady?.(),140);
    return true;
  }
  project(lat, lon, {radius: radius, width: width, height: height}) {
    const phi = lat * rad;
    const delta = (lon - this.camera.lon) * rad;
    const tilt = this.camera.lat * rad;
    const x = Math.cos(phi) * Math.sin(delta);
    const y = Math.sin(phi) * Math.cos(tilt) - Math.cos(phi) * Math.cos(delta) * Math.sin(tilt);
    const z = Math.sin(phi) * Math.sin(tilt) + Math.cos(phi) * Math.cos(delta) * Math.cos(tilt);
    return {
      x: width / 2 + x * radius,
      y: height / 2 - y * radius,
      z: z
    };
  }
  unproject(x, y, view = this.view) {
    if (!view) return null;
    const u = (x - view.width / 2) / view.radius;
    const v = (view.height / 2 - y) / view.radius;
    const d = u * u + v * v;
    if (d > 1) return null;
    const z = Math.sqrt(1 - d);
    const lat = this.camera.lat * rad;
    const sin = Math.sin(lat), cos = Math.cos(lat);
    const latitude = Math.asin(clamp(v * cos + z * sin, -1, 1)) / rad;
    const longitude = Math.atan2(u, z * cos - v * sin) / rad + this.camera.lon;
    return {
      lat: latitude,
      lon: (longitude + 540) % 360 - 180
    };
  }
}

export class PlanetAtlas {
  constructor(root, onPick, onActivate) {
    this.viewport = root;
    this.world = "Earth";
    this.viewMode = "overview";
    this.autoRotate = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.overviewFrame = 0;
    this.overviewLast = null;
    this.focusedWorld = null;
    this.overviewLocations = Object.fromEntries(Object.keys(worlds).map(world => [ world, [] ]));
    this.overviewConnections = [];
    this.connectionLayer = root.querySelector("[data-overview-connections]");
    this.connectionPaths = [];
    this.connectionTargets = [];
    this.connectionOrigin = null;
    this.onActivate = onActivate;
    this.planets = new Map;
    for (const world of Object.keys(worlds)) {
      const viewport = root.querySelector('[data-overview-world="' + world + '"]');
      const viewer = new PlanetViewer(viewport, () => {
        this.drawOverview();
        this.requestOverviewDraw();
      });
      viewer.show(world);
      this.planets.set(world, viewer);
      this.bindOverviewControls(world, viewer, onPick, onActivate);
    }
    document.addEventListener("visibilitychange", () => {
      this.overviewLast = null;
      this.requestOverviewDraw();
    });
    this.showOverview();
    window.addEventListener("resize", () => this.requestDraw());
  }
  get active() {
    return this.planets.get(this.world);
  }
  get isOverview() {
    return this.viewMode === "overview";
  }
  get camera() {
    return this.active.camera;
  }
  setOverviewConnections(connections) {
    this.overviewConnections = connections;
    if (!this.connectionLayer) return;
    const namespace = "http://www.w3.org/2000/svg";
    this.connectionPaths = connections.map(connection => {
      const path = document.createElementNS(namespace, "path");
      path.classList.add("overview-connection", "overview-connection-" + connection.toWorld.toLowerCase());
      return path;
    });
    this.connectionOrigin = connections.length ? document.createElementNS(namespace, "circle") : null;
    this.connectionOrigin?.classList.add("overview-connection-origin");
    this.connectionTargets = connections.map(connection => {
      const target = document.createElementNS(namespace, "circle");
      target.classList.add("overview-connection-target", "overview-connection-target-" + connection.toWorld.toLowerCase());
      target.setAttribute("r", "4");
      return target;
    });
    this.connectionLayer.replaceChildren(...this.connectionPaths, ...this.connectionOrigin ? [ this.connectionOrigin ] : [], ...this.connectionTargets);
  }
  setOverviewWorld(world) {
    if (!this.isOverview || !this.planets.has(world)) return;
    if (this.world !== world) this.onActivate(world);
    this.world = world;
    this.syncControls();
  }
  setOverviewLocations(locations) {
    this.overviewLocations = locations;
    for (const world of Object.keys(worlds)) {
      const layer = this.viewport.querySelector('[data-overview-locations="' + world + '"]');
      const sites = locations[world] ?? [];
      const existing = [ ...layer.children ].map(node => node.dataset.overviewLocation);
      if (existing.join("\0") !== sites.map(site => site.id).join("\0")) layer.replaceChildren(...sites.map(site => {
        const marker = document.createElement("button");
        marker.type = "button";
        marker.className = "overview-location-point " + site.tone;
        marker.dataset.overviewLocation = site.id;
        marker.setAttribute("aria-label", site.name ?? site.id);
        marker.title = site.name ?? site.id;
        const activate = event => {
          event.preventDefault();
          event.stopPropagation();
          this.focusWorld(world);
          this.viewport.dispatchEvent(new CustomEvent("atlas-location-pick", {
            bubbles: true,
            detail: {
              world: world,
              id: site.id,
              lat: site.lat,
              lon: site.lon
            }
          }));
        };
        marker.addEventListener("pointerdown", event => event.stopPropagation());
        marker.addEventListener("pointerup", event => event.stopPropagation());
        marker.addEventListener("click", activate);
        marker.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") activate(event); else event.stopPropagation();
        });
        marker.hidden = true;
        return marker;
      }));
      sites.forEach((site, index) => layer.children[index].classList.toggle("selected", site.selected));
    }
    this.drawOverview();
  }
  bindOverviewControls(world, viewer, onPick, onActivate) {
    const control = this.viewport.querySelector('[data-overview-world="' + world + '"]');
    if (!control) return;
    let drag = null, suppressClick = false;
    const selectPoint = (x, y) => {
      const rect = control.getBoundingClientRect();
      const width = control.clientWidth, height = control.clientHeight;
      if (!rect.width || !rect.height || !width || !height) return;
      const scale = rect.width / width;
      const view = {
        world: world,
        zoom: viewer.camera.zoom,
        radius: Math.min(width, height) / 2,
        width: width,
        height: height
      };
      const point = viewer.unproject((x - rect.left) / scale, (y - rect.top) / scale, view);
      if (!point) return;
      this.setOverviewWorld(world);
      this.focusWorld(world, () => {
        onActivate(world);
        onPick(point, world);
      });
    };
    control.addEventListener("focus", () => this.setOverviewWorld(world));
    control.addEventListener("wheel", event => {
      event.preventDefault();
      if (this.focusedWorld !== world) this.focusWorld(world);
      this.setOverviewWorld(world);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      this.zoom(clamp(-delta * .003, -.5, .5));
    }, {
      passive: false
    });
    control.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      this.setOverviewWorld(world);
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false
      };
      control.setPointerCapture(event.pointerId);
      control.classList.add("dragging");
    });
    control.addEventListener("pointermove", event => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      const speed = .33 / viewer.camera.zoom;
      viewer.rotate(-dx * speed, dy * speed);
      Object.assign(drag, {
        x: event.clientX,
        y: event.clientY
      });
      this.drawOverview(world);
    });
    for (const name of [ "pointerup", "pointercancel", "lostpointercapture" ]) control.addEventListener(name, event => {
      if (drag?.id !== event.pointerId) return;
      const pick = name === "pointerup" && !drag.moved;
      suppressClick = drag.moved;
      drag = null;
      control.classList.remove("dragging");
      if (pick) selectPoint(event.clientX, event.clientY);
    });
    control.addEventListener("click", event => {
      if (event.detail === 0) suppressClick = false;
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      if (event.detail !== 0) return;
      this.setOverviewWorld(world);
      this.focusWorld(world, () => {
        onActivate(world);
        onPick({
          lat: viewer.camera.lat,
          lon: viewer.camera.lon
        }, world);
      });
    });
    control.addEventListener("keydown", event => {
      const actions = {
        ArrowLeft: () => viewer.rotate(-12, 0),
        ArrowRight: () => viewer.rotate(12, 0),
        ArrowUp: () => viewer.rotate(0, 12),
        ArrowDown: () => viewer.rotate(0, -12),
        "+": () => this.zoom(.2),
        "=": () => this.zoom(.2),
        "-": () => this.zoom(-.2),
        Home: () => viewer.reset()
      };
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.setOverviewWorld(world);
        this.focusWorld(world, () => {
          onActivate(world);
          onPick({
            lat: viewer.camera.lat,
            lon: viewer.camera.lon
          }, world);
        });
        return;
      }
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      this.setOverviewWorld(world);
      action();
      this.drawOverview(world);
      this.syncControls();
    });
  }
  show(world) {
    this.world = world;
    this.viewMode = "overview";
    for (const [name, viewer] of this.planets) viewer.viewport.dataset.active = String(name === world);
    this.syncMode();
    this.requestDraw();
  }
  syncMode() {
    this.viewport.dataset.mode = this.viewMode;
    this.viewport.querySelector("#planet-overview").hidden = !this.isOverview;
    this.viewport.querySelector(".planet-network").dataset.focusedWorld = this.focusedWorld ?? "";
    this.viewport.dataset.focusedWorld = this.focusedWorld ?? "";
    this.overviewLast = null;
    this.syncControls();
  }
  syncControls() {
    this.syncSceneLabel();
    document.getElementById("active-globe-label").textContent = worlds[this.world].label;
    document.getElementById("zoom-in").disabled = this.camera.zoom >= this.overviewZoomLimit(this.world) - .005;
    document.getElementById("zoom-out").disabled = this.camera.zoom <= .8;
    this.viewport.querySelectorAll("[data-overview-card]").forEach(card => {
      card.dataset.active = String(card.dataset.overviewCard === this.world);
      card.dataset.inspecting = String(card.dataset.overviewCard === this.focusedWorld);
    });
  }
  drawOverview(onlyWorld = null) {
    this.syncSceneLabel();
    if (!this.isOverview) return;
    for (const [world, viewer] of this.planets) {
      if (onlyWorld && onlyWorld !== world) continue;
      const control = this.viewport.querySelector('[data-overview-world="' + world + '"]');
      const layer = this.viewport.querySelector('[data-overview-locations="' + world + '"]');
      if (!control || !layer) continue;
      const zoomLimit=this.overviewZoomLimit(world);
      if(viewer.camera.zoom>zoomLimit)viewer.targetCamera={...(viewer.targetCamera??viewer.camera),zoom:zoomLimit};
      const canvas = this.viewport.querySelector('[data-overview-texture="' + world + '"]');
      if (canvas) {
        viewer.drawTexture(canvas);
        const entry = viewer.textures.get(world), control = canvas.parentElement, status = control.querySelector("[data-overview-status]");
        control.setAttribute("aria-busy", String(entry?.status === "loading"));
        status.hidden = entry?.status === "ready";
        status.textContent = entry?.status === "error" ? t("globe.unavailable") : t("loading.sphere");
      }
      const width = control.clientWidth, height = control.clientHeight;
      const radius = Math.min(width, height) / 2;
      if (!radius) continue;
      const view = {
        world: world,
        zoom: viewer.camera.zoom,
        radius: radius,
        width: width,
        height: height
      };
      viewer.view = view;
      const visible = [];
      for (const [index, site] of (this.overviewLocations[world] ?? []).entries()) {
        const point = viewer.project(site.lat, site.lon, view);
        const marker = layer.children[index];
        const active = site.active !== false, label = site.name ?? site.id;
        marker.hidden = point.z <= .06 || point.x < 0 || point.y < 0 || point.x > width || point.y > height;
        marker.classList.remove("cluster", "cluster-member", "cluster-spread");
        marker.classList.toggle("inactive", !active);
        marker.classList.toggle("selected", Boolean(site.selected));
        marker.removeAttribute("data-cluster-count");
        marker.style.removeProperty("--cluster-x");
        marker.style.removeProperty("--cluster-y");
        marker.setAttribute("aria-label", active ? label : label + " · " + t("marker.unrelated"));
        marker.title = active ? label : label + " · " + t("marker.unrelated");
        if (!marker.hidden) {
          marker.style.left = point.x + "px";
          marker.style.top = point.y + "px";
          if (active) visible.push({
            marker: marker,
            point: point
          });
        }
      }
      const clusters = [];
      for (const item of visible) {
        const cluster = clusters.find(group => group.every(other => Math.hypot(item.point.x - other.point.x, item.point.y - other.point.y) <= 18));
        if (cluster) cluster.push(item); else clusters.push([ item ]);
      }
      for (const cluster of clusters) {
        if (cluster.length < 2) continue;
        const center = cluster.reduce((sum, item) => ({
          x: sum.x + item.point.x / cluster.length,
          y: sum.y + item.point.y / cluster.length
        }), {
          x: 0,
          y: 0
        });
        const spreadRadius = Math.max(8, 15 / (2 * Math.sin(Math.PI / cluster.length)));
        const orbitCenter = {
          x: width / 2,
          y: height / 2
        };
        const centerDistance = Math.hypot(center.x - orbitCenter.x, center.y - orbitCenter.y);
        const maxCenterDistance = Math.max(0, radius - spreadRadius - 16);
        const shift = Math.max(0, centerDistance - maxCenterDistance);
        const adjustedCenter = centerDistance > 0 ? {
          x: center.x - (center.x - orbitCenter.x) * shift / centerDistance,
          y: center.y - (center.y - orbitCenter.y) * shift / centerDistance
        } : center;
        cluster.forEach((item, index) => {
          const angle = -Math.PI / 2 + index * tau / cluster.length;
          item.marker.classList.add("cluster-spread");
          item.marker.style.setProperty("--cluster-x", adjustedCenter.x + spreadRadius * Math.cos(angle) - item.point.x + "px");
          item.marker.style.setProperty("--cluster-y", adjustedCenter.y + spreadRadius * Math.sin(angle) - item.point.y + "px");
        });
      }
    }
    this.drawOverviewConnections();
  }
  drawOverviewConnections() {
    const layer = this.connectionLayer;
    const network = this.viewport.querySelector(".planet-network");
    if (!layer || !network) return;
    const width = network.clientWidth, height = network.clientHeight, rect = network.getBoundingClientRect();
    if (!width || !height || !rect.width || !rect.height || !this.isOverview || !this.overviewConnections.length) {
      layer.hidden = true;
      return;
    }
    layer.setAttribute("viewBox", "0 0 " + width + " " + height);
    const position = (world, id) => {
      const markerLayer = this.viewport.querySelector('[data-overview-locations="' + world + '"]');
      const marker = [ ...markerLayer?.children ?? [] ].find(node => node.dataset.overviewLocation === id);
      if (!marker || marker.hidden) return null;
      const markerRect = marker.getBoundingClientRect();
      const scaleX = width / rect.width, scaleY = height / rect.height;
      return {
        x: (markerRect.left + markerRect.width / 2 - rect.left) * scaleX,
        y: (markerRect.top + markerRect.height / 2 - rect.top) * scaleY
      };
    };
    let visible = 0, origin = null;
    for (const [index, connection] of this.overviewConnections.entries()) {
      const from = position(connection.fromWorld, connection.fromId);
      const to = position(connection.toWorld, connection.toId);
      const path = this.connectionPaths[index], target = this.connectionTargets[index];
      if (!from || !to) {
        path.style.display = "none";
        target.style.display = "none";
        continue;
      }
      visible++;
      origin ??= from;
      path.style.display = "";
      target.style.display = "";
      const bend = Math.min(36, Math.abs(to.x - from.x) * .1);
      path.setAttribute("d", "M " + from.x + " " + from.y + " Q " + (from.x + to.x) / 2 + " " + ((from.y + to.y) / 2 - bend) + " " + to.x + " " + to.y);
      target.setAttribute("cx", String(to.x));
      target.setAttribute("cy", String(to.y));
    }
    layer.hidden = visible === 0;
    if (origin && this.connectionOrigin) {
      this.connectionOrigin.style.display = "";
      this.connectionOrigin.setAttribute("cx", String(origin.x));
      this.connectionOrigin.setAttribute("cy", String(origin.y));
    } else if (this.connectionOrigin) this.connectionOrigin.style.display = "none";
  }
  syncSceneLabel() {
    const label = document.getElementById("scene-world-label");
    if (label) label.textContent = worlds[this.world].label.toLocaleUpperCase(currentLanguage());
  }
  setSelectedCoordinates(lat, lon) {
    const decimal = new Intl.NumberFormat(currentLanguage(), {
      maximumFractionDigits: 5
    });
    for (const [id, value] of [ [ "orbital-lat", lat ], [ "orbital-lon", lon ] ]) {
      const output = document.getElementById(id);
      if (output) output.textContent = decimal.format(value) + "°";
    }
  }
  clearSelectedCoordinates() {
    for (const id of [ "orbital-lat", "orbital-lon" ]) {
      const output = document.getElementById(id);
      if (output) output.textContent = "—";
    }
  }
  requestOverviewDraw() {
    if (this.overviewFrame) return;
    this.overviewFrame = requestAnimationFrame(time => {
      this.overviewFrame = 0;
      const visible = this.isOverview && !document.hidden && this.viewport.isConnected && !this.viewport.closest("[hidden]") && [ ...this.viewport.querySelectorAll("[data-overview-world]") ].some(node => node.getBoundingClientRect().width > 0);
      if (!visible) {
        this.overviewLast = null;
        return;
      }
      const ready = [ ...this.planets.values() ].some(viewer => viewer.textures.get(viewer.world)?.status === "ready");
      const moving = this.autoRotate && ready;
      const elapsed=this.overviewLast===null?16:Math.min(50,Math.max(0,time-this.overviewLast));
      let settling=false;
      for(const viewer of this.planets.values())settling=viewer.stepCamera(elapsed)||settling;
      if (moving && this.overviewLast !== null) {
        const degrees = elapsed * .004;
        for (const viewer of this.planets.values()) if(!viewer.targetCamera)viewer.camera.lon = (viewer.camera.lon + degrees + 540) % 360 - 180;
      }
      this.overviewLast = moving || settling ? time : null;
      this.drawOverview();
      if (moving || settling) this.requestOverviewDraw();
    });
  }
  showOverview() {
    this.focusedWorld = null;
    this.viewMode = "overview";
    this.syncMode();
    this.drawOverview();
    this.requestDraw();
  }
  overviewZoomLimit(world = this.world) {
    if (this.focusedWorld === world) return 6;
    const control = this.viewport.querySelector('[data-overview-world="' + world + '"]');
    const network = control?.closest(".planet-network");
    if (!control || !network) return 2.4;
    const bounds = network.getBoundingClientRect(), rect = control.getBoundingClientRect();
    const width = control.offsetWidth, height = control.offsetHeight;
    if (!bounds.width || !bounds.height || !width || !height) return 2.4;
    const centerX = rect.left + rect.width / 2 - bounds.left;
    const centerY = rect.top + rect.height / 2 - bounds.top;
    const margin = 12;
    const availableWidth = 2 * Math.min(centerX, bounds.width - centerX) - margin * 2;
    const availableHeight = 2 * Math.min(centerY, bounds.height - centerY) - margin * 2;
    return clamp(Math.min(availableWidth / width, availableHeight / height), 1, 2.4);
  }
  focusWorld(world = this.world, afterFocus) {
    if (!this.planets.has(world)) return;
    this.focusedWorld = world;
    this.show(world);
    this.drawOverview();
    afterFocus?.();
  }
  requestDraw() {
    for (const viewer of this.planets.values()) viewer.requestDraw();
    if (this.isOverview) this.requestOverviewDraw();
  }
  center(lat, lon, zoom) {
    this.active.center(lat, lon, zoom);
    this.focusWorld();
    this.requestOverviewDraw();
  }
  zoom(amount) {
    if (amount > 0 && this.focusedWorld !== this.world) this.focusWorld(this.world);
    this.active.zoom(amount, this.overviewZoomLimit(this.world));
    this.refreshOverviewControls();
  }
  reset() {
    this.active.reset();
    this.refreshOverviewControls();
  }
  resetAll() {
    for (const viewer of this.planets.values()) viewer.reset();
    this.requestDraw();
    if (this.isOverview) this.drawOverview();
    this.syncControls();
  }
  refreshOverviewControls() {
    if (this.isOverview) {
      this.drawOverview(this.world);
      this.syncControls();
    }
  }
}
