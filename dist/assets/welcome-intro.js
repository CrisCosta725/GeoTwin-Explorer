import {t} from './i18n.js';

const focusableSelector='a[href],button:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function bindWelcomeIntro() {
  const intro=document.getElementById('welcome-intro');
  const enter=intro.querySelector('[data-intro-dismiss="enter"]');
  const rocket=intro.querySelector('.welcome-rocket');
  const status=intro.querySelector('.welcome-launch-status');
  const background=[...document.querySelectorAll('[data-intro-background]')];
  const previousOverflow=document.body.style.overflow;
  let launching=false,launchTimeout;
  for (const element of background) element.inert=false;
  if (sessionStorage.getItem('geotwin-intro-dismissed')==='true') return;

  intro.hidden=false;
  intro.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  for (const element of background) element.inert=true;

  const dismiss=()=>{
    clearTimeout(launchTimeout);
    rocket.removeEventListener('animationend',finishLaunch);
    intro.hidden=true;
    intro.setAttribute('aria-hidden','true');
    intro.classList.remove('is-launching');
    enter.removeAttribute('aria-disabled');
    for (const element of background) element.inert=false;
    document.body.style.overflow=previousOverflow;
    sessionStorage.setItem('geotwin-intro-dismissed','true');
    document.getElementById('title').focus({preventScroll:true});
  };
  const finishLaunch=event=>{
    if(event.target===rocket && event.animationName==='welcome-liftoff')dismiss();
  };
  const launch=()=>{
    if(launching)return;
    launching=true;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      dismiss();
      return;
    }
    enter.setAttribute('aria-disabled','true');
    status.textContent=t('welcome.launch');
    rocket.addEventListener('animationend',finishLaunch);
    intro.classList.add('is-launching');
    launchTimeout=setTimeout(dismiss,4500);
  };
  intro.addEventListener('click',event=>{
    if (event.target.closest('[data-intro-dismiss]')) launch();
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
