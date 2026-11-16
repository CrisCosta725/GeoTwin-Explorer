import {damp} from './motion.js';

const white = [ 222, 235, 244 ], dark = [ 24, 49, 70 ], gold = [ 203, 151, 64 ], cyan = [ 34, 222, 232 ];

const turn = ([x, y, z], a) => [ x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a) ];

export function astronautMesh(time = 0, action = "floating") {
  const faces = [];
  const add = (vertices, color) => faces.push({
    vertices: vertices,
    color: color
  });
  function box(x, y, z, w, h, d, color) {
    const v = [ [ -1, -1, -1 ], [ 1, -1, -1 ], [ 1, 1, -1 ], [ -1, 1, -1 ], [ -1, -1, 1 ], [ 1, -1, 1 ], [ 1, 1, 1 ], [ -1, 1, 1 ] ].map(([a, b, c]) => [ x + a * w / 2, y + b * h / 2, z + c * d / 2 ]);
    for (const indexes of [ [ 0, 1, 2, 3 ], [ 4, 7, 6, 5 ], [ 0, 4, 5, 1 ], [ 3, 2, 6, 7 ], [ 1, 5, 6, 2 ], [ 0, 3, 7, 4 ] ]) add(indexes.map(i => v[i]), color);
  }
  function sphere(x, y, z, rx, ry, rz, color) {
    const point = (i, j) => {
      const a = i * Math.PI / 8, b = j * Math.PI / 8;
      return [ x + rx * Math.sin(a) * Math.cos(b), y + ry * Math.cos(a), z + rz * Math.sin(a) * Math.sin(b) ];
    };
    for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) add([ point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1) ], color);
  }
  const t = time / 1e3;
  const fly = action === "flying" || action === "dragging";
  const wave = action === "waving";
  const point = action === "pointing" || action === "scanning";
  box(0, .05, -.3, .8, 1.1, .5, dark);
  sphere(0, .15, 0, .5, .7, .34, white);
  sphere(0, 1.08, 0, .65, .65, .56, white);
  sphere(0, 1.08, .39, .49, .43, .25, gold);
  sphere(-.15, 1.25, .58, .2, .08, .025, [ 240, 250, 255 ]);
  box(0, .18, .35, .45, .35, .12, dark);
  box(-.12, .2, .425, .08, .08, .03, cyan);
  box(.1, .2, .425, .12, .035, .03, white);
  for (const side of [ -1, 1 ]) {
    const raised = side === 1 && (wave || point);
    const angle = raised ? wave ? 1.9 + Math.sin(t * 9) * .35 : 1.25 : fly ? .9 : Math.sin(t * 2 + side) * .12;
    const joint = [ side * .43, .52, 0 ];
    const end = [ joint[0] + side * Math.sin(angle) * .62, joint[1] - Math.cos(angle) * .62, .12 ];
    sphere(...joint, .19, .2, .2, white);
    sphere((joint[0] + end[0]) / 2, (joint[1] + end[1]) / 2, .07, .19, Math.abs(joint[1] - end[1]) / 2 + .19, .19, white);
    sphere(...end, .2, .21, .2, white);
    const kick = fly ? Math.sin(t * 7 + side) * .12 : Math.sin(t * 2 + side) * .05;
    sphere(side * .25, -.7, 0, .24, .45, .25, white);
    sphere(side * .27, -1.12, kick, .22, .32, .23, white);
    box(side * .27, -1.4, .12 + kick, .43, .22, .65, dark);
  }
  if (fly) for (const side of [ -1, 1 ]) sphere(side * .3, -.62, -.5, .09, .3 + Math.sin(t * 20) * .06, .09, cyan);
  return faces;
}

export function createAstronaut3D(button) {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 360;
  canvas.setAttribute("aria-hidden", "true");
  button.replaceChildren(canvas);
  const ctx = canvas.getContext("2d");
  let frame = 0, last = 0, yaw = 0, renderedYaw = 0, previousMesh = null;
  function draw(time) {
    frame = 0;
    if (button.hidden || document.hidden) return;
    const elapsed=last?Math.min(50,time-last):16;
    last = time;
    if (typeof ctx.clearRect !== "function") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const action = button.dataset.action ?? "floating";
    renderedYaw=reduced?yaw:damp(renderedYaw,yaw,elapsed);
    const angle = renderedYaw + (reduced ? 0 : Math.sin(time * 7e-4) * .22);
    const mesh=astronautMesh(reduced ? 0 : time, action);
    if(previousMesh&&!reduced)for(const [i,face] of mesh.entries())if(previousMesh[i])face.vertices=face.vertices.map((vertex,j)=>vertex.map((value,k)=>damp(previousMesh[i].vertices[j][k],value,elapsed,120)));
    previousMesh=mesh;
    const faces = mesh.map(face => ({
      ...face,
      vertices: face.vertices.map(v => turn(v, angle))
    }));
    faces.sort((a, b) => a.vertices.reduce((n, v) => n + v[2], 0) - b.vertices.reduce((n, v) => n + v[2], 0));
    ctx.clearRect(0, 0, 280, 360);
    for (const face of faces) {
      const [a, b, c] = face.vertices, u = b.map((v, i) => v - a[i]), v = c.map((n, i) => n - a[i]);
      const normal = [ u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0] ];
      const length = Math.hypot(...normal) || 1;
      const light = .4 + .6 * Math.abs((normal[0] * -.4 + normal[1] * .6 + normal[2] * .7) / length);
      ctx.fillStyle = "rgb(" + face.color.map(n => Math.round(Math.min(255, n * light))).join(",") + ")";
      ctx.beginPath();
      face.vertices.forEach(([x, y, z], i) => {
        const scale = 80 * 5 / (5 - z);
        const px = 140 + x * scale, py = 181 - y * scale;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
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
