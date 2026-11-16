import { createAstronaut3D } from "./astronaut-3d.js";

let actor, root, model, drag = null, lastWorld = "Earth", pauseUntil = 0, travelRight = false;

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const bound = (n, min, max) => Math.max(min, Math.min(max, n));

function place(x, y) {
  const width=actor.offsetWidth||110,height=actor.offsetHeight||145;
  const bottom=Math.max(8,innerHeight-height-8);
  const top = Math.min(bottom,(document.querySelector(".appbar")?.getBoundingClientRect().bottom||0)+12);
  const ax = bound(x, 8, Math.max(8, innerWidth - width - 8));
  const ay = bound(y, top, bottom);
  actor.style.left = ax + "px";
  actor.style.top = ay + "px";
  if (root && !root.hidden) {
    const width = Math.min(350, innerWidth - 20);
    root.style.left = bound(ax > innerWidth / 2 ? ax - width : ax + 88, 10, Math.max(10, innerWidth - width - 10)) + "px";
    root.style.top = bound(ay - 40, top, Math.max(top, innerHeight - 320)) + "px";
  }
}

export function moveAstronaut(world = lastWorld) {
  if (!actor) return;
  lastWorld = world;
  const target = document.querySelector('[data-overview-world="' + world + '"]');
  const rect = target?.getBoundingClientRect();
  actor.hidden = false;
  pauseUntil=Date.now()+12000;
  actor.dataset.travel="manual";
  if (!rect?.width) {place(parseFloat(actor.style.left)||innerWidth*.7,parseFloat(actor.style.top)||innerHeight*.7);return;}
  actor.dataset.action = "flying";
  actor.dataset.world = world;
  place(rect.left + rect.width * .65, rect.top + rect.height * .65);
}

export function initAstronaut(panel) {
  root = panel;
  if (!actor) {
    actor = document.createElement("button");
    actor.type = "button";
    actor.className = "astronaut-rover";
    actor.title = document.documentElement.lang === "en" ? "Drag to move · Arrow keys to move · Scroll to rotate · Click to point · Double-click to visit another planet" : "Arrastra para mover · Flechas para mover · Rueda para girar · Clic para señalar · Doble clic para visitar otro planeta";
    document.body.append(actor);
    model = createAstronaut3D(actor);
    model.start();
    actor.hidden=false;
    actor.dataset.action="floating";
    place(innerWidth*.7,innerHeight*.7);
    window.setInterval(()=>{
      if(reduced()||document.hidden||drag||(root&&!root.hidden)||actor.matches(':hover, :focus')||Date.now()<pauseUntil)return;
      const width=actor.offsetWidth||110;
      actor.dataset.travel="auto";
      actor.dataset.action="flying";
      travelRight=!travelRight;
      place(travelRight?innerWidth-width-16:16,parseFloat(actor.style.top)||innerHeight*.7);
    },10000);
    actor.addEventListener("pointerenter", () => {
      pauseUntil=Date.now()+12000;
      if (!drag) actor.dataset.action = "waving";
    });
    actor.addEventListener("pointerleave", () => {
      if (!drag) actor.dataset.action = "floating";
    });
    actor.addEventListener("wheel", event => {
      event.preventDefault();
      model.rotate(event.deltaY * .005);
    }, {
      passive: false
    });
    actor.addEventListener("dblclick", () => {
      const worlds = [ "Earth", "Moon", "Mars" ];
      const next = worlds[(worlds.indexOf(lastWorld) + 1) % 3];
      document.querySelector('button[data-world="' + next + '"]').click();
    });
    actor.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const rect = actor.getBoundingClientRect();
      actor.style.left=rect.left+'px';
      actor.style.top=rect.top+'px';
      pauseUntil=Date.now()+20000;
      actor.dataset.travel="manual";
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: rect.left,
        top: rect.top,
        moved: false
      };
      actor.setPointerCapture?.(event.pointerId);
      actor.dataset.action = "dragging";
      if(root)root.dataset.dragging="true";
    });
    actor.addEventListener("pointermove", event => {
      if (drag?.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) place(drag.left + dx, drag.top + dy);
    });
    for (const type of [ "pointerup", "pointercancel", "lostpointercapture" ]) actor.addEventListener(type, event => {
      if (drag?.id !== event.pointerId) return;
      actor.dataset.suppressClick = String(drag.moved || type !== "pointerup");
      drag = null;
      if(root)delete root.dataset.dragging;
      actor.dataset.action = "floating";
    });
    actor.addEventListener("click", () => {
      if (actor.dataset.suppressClick === "true") {
        actor.dataset.suppressClick = "false";
        return;
      }
      const planet = document.querySelector('[data-overview-world="' + lastWorld + '"]');
      actor.dataset.action = "pointing";
      planet?.focus({
        preventScroll: true
      });
      if (!reduced()) planet?.animate?.([ {
        filter: "brightness(1)"
      }, {
        filter: "brightness(1.12)"
      }, {
        filter: "brightness(1)"
      } ], {
        duration: 900,
        easing: "ease-in-out"
      });
      const next = root?.querySelector('[data-guide-step="1"]');
      if (next && !next.disabled) next.click();
    });
    actor.addEventListener("keydown",event=>{
      const steps={ArrowLeft:[-50,0],ArrowRight:[50,0],ArrowUp:[0,-40],ArrowDown:[0,40]};
      const step=steps[event.key];
      if(!step)return;
      event.preventDefault();event.stopPropagation();
      pauseUntil=Date.now()+20000;
      actor.dataset.travel="manual";
      actor.dataset.action="dragging";
      place((parseFloat(actor.style.left)||8)+step[0],(parseFloat(actor.style.top)||100)+step[1]);
    });
    actor.addEventListener("transitionend", event => {
      if(event.target!==actor||!['left','top'].includes(event.propertyName))return;
      if (!drag) actor.dataset.action = "floating";
    });
    window.addEventListener("resize", () => {
      actor.dataset.travel="manual";
      place(parseFloat(actor.style.left)||8,parseFloat(actor.style.top)||100);
    });
  }
  actor.title = document.documentElement.lang === "en" ? "Drag to move · Arrow keys to move · Scroll to rotate · Click to point · Double-click to visit another planet" : "Arrastra para mover · Flechas para mover · Rueda para girar · Clic para señalar · Doble clic para visitar otro planeta";
  actor.setAttribute("aria-label",document.documentElement.lang==="en"?"Astronaut. Drag or use arrow keys to move. Click to point to the planet.":"Astronauta. Arrastra o usa las flechas para mover. Pulsa para señalar el planeta.");
}

export function animateAstronaut(panel, world) {
  initAstronaut(panel);
  moveAstronaut(world);
}
