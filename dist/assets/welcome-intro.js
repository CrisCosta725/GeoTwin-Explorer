const focusableSelector='a[href],button:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function bindWelcomeIntro() {
  const intro=document.getElementById('welcome-intro');
  const enter=intro.querySelector('[data-intro-dismiss="enter"]');
  const background=[...document.querySelectorAll('[data-intro-background]')];
  const previousOverflow=document.body.style.overflow;
  for (const element of background) element.inert=false;
  if (sessionStorage.getItem('geotwin-intro-dismissed')==='true') return;

  intro.hidden=false;
  intro.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  for (const element of background) element.inert=true;

  const dismiss=()=>{
    intro.hidden=true;
    intro.setAttribute('aria-hidden','true');
    for (const element of background) element.inert=false;
    document.body.style.overflow=previousOverflow;
    sessionStorage.setItem('geotwin-intro-dismissed','true');
    document.getElementById('title').focus({preventScroll:true});
  };
  intro.addEventListener('click',event=>{
    if (event.target.closest('[data-intro-dismiss]')) dismiss();
  });
  document.addEventListener('keydown',event=>{
    if (intro.hidden) return;
    if (event.key==='Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key!=='Tab') return;
    const focusable=[...intro.querySelectorAll(focusableSelector)];
    const first=focusable[0],last=focusable.at(-1);
    if (event.shiftKey && document.activeElement===first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement===last) {
      event.preventDefault();
      first.focus();
    }
  });
  enter.focus({preventScroll:true});
}
