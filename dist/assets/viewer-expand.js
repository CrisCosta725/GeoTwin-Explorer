const id=value=>document.getElementById(value);

// Move the live viewer into a dialog, retaining its canvas, listeners and camera.
export function bindViewerExpansion(entries) {
  const dialog=id('viewer-dialog'),content=id('viewer-dialog-content'),tools=id('viewer-dialog-tools');
  const backdrop=id('viewer-backdrop'),closeButton=id('viewer-dialog-close');
  let active=null;
  const context=()=>{if (active) id('viewer-dialog-context').textContent=active.entry.context?.()??'';};
  const focusViewer=()=>{
    if (!active) return;
    (active.entry.focus?.()??closeButton).focus({preventScroll:true});
  };
  function close({restoreFocus=true}={}) {
    if (!active) return;
    const state=active;active=null;
    for (const {node,placeholder} of state.moved) placeholder.replaceWith(node);
    delete state.entry.target.dataset.expanded;
    state.entry.button.setAttribute('aria-expanded','false');
    state.entry.button.setAttribute('aria-label',state.entry.label);
    state.entry.button.title=state.entry.label;
    state.entry.button.querySelector('[data-expand-label]').textContent='Ampliar';
    if (state.native && dialog.open) dialog.close();else dialog.removeAttribute('open');
    backdrop.hidden=true;
    for (const {node,wasInert} of state.background) if (!wasInert) node.removeAttribute('inert');
    document.body.style.overflow=state.overflow;
    delete dialog.dataset.viewer;
    state.entry.resize();
    if (restoreFocus && state.entry.button.isConnected) state.entry.button.focus({preventScroll:true});
  }
  function open(name,entry) {
    if (active?.name===name) {close();return;}
    close({restoreFocus:false});
    const moved=[];
    const move=(node,destination)=>{
      const placeholder=document.createComment('viewer:'+name);
      node.replaceWith(placeholder);destination.append(node);moved.push({node,placeholder});
    };
    move(entry.target,content);
    if (entry.tools) move(entry.tools,tools);
    tools.hidden=!entry.tools;
    const state={name,entry,moved,overflow:document.body.style.overflow,background:[],native:false};
    active=state;
    dialog.dataset.viewer=name;
    entry.target.dataset.expanded='true';
    entry.button.setAttribute('aria-expanded','true');
    entry.button.setAttribute('aria-label','Reducir vista');entry.button.title='Reducir vista';
    entry.button.querySelector('[data-expand-label]').textContent='Reducir';
    id('viewer-dialog-title').textContent=entry.title;
    context();
    document.body.style.overflow='hidden';
    if (typeof dialog.showModal==='function') {
      try {dialog.showModal();state.native=true;} catch { /* Use the accessible overlay when native dialogs are unavailable. */ }
    }
    if (!state.native) {dialog.setAttribute('open','');backdrop.hidden=false;}
    for (const node of document.body.children) {
      if (node===dialog || node===backdrop) continue;
      state.background.push({node,wasInert:node.hasAttribute('inert')});node.setAttribute('inert','');
    }
    entry.resize();focusViewer();
    requestAnimationFrame(()=>{if (active===state) entry.resize();});
  }
  for (const [name,entry] of Object.entries(entries)) entry.button.addEventListener('click',()=>open(name,entry));
  closeButton.addEventListener('click',()=>close());
  backdrop.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{if (!dialog.open) close();});
  dialog.addEventListener('click',event=>{
    if (event.target!==dialog) return;
    const r=dialog.getBoundingClientRect();
    if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) close();
  });
  document.addEventListener('keydown',event=>{
    if (!active) return;
    if (event.key==='Escape') {event.preventDefault();event.stopPropagation();close();return;}
    if (event.key!=='Tab') return;
    const focusable=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])')].filter(node=>{
      if (node.closest('[hidden],[inert]')) return false;
      const details=node.closest('details:not([open])');
      return (!details || node===details.querySelector('summary')) && getComputedStyle(node).display!=='none';
    });
    const first=focusable[0],last=focusable.at(-1);
    if (event.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && (document.activeElement===last || !dialog.contains(document.activeElement))) {event.preventDefault();first?.focus();}
  });
  document.addEventListener('focusin',event=>{if (active && !dialog.contains(event.target)) focusViewer();});
  new MutationObserver(context).observe(id('draw-context'),{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',()=>active?.entry.resize());
  return {close};
}
