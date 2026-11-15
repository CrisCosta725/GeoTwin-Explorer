const installButton=document.getElementById('install-app');
let installPrompt;

if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true) installButton.hidden=true;

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  installButton.hidden=false;
});

window.addEventListener('appinstalled',()=>{
  installButton.hidden=true;
  installPrompt=undefined;
});

installButton.addEventListener('click',async()=>{
  if(!installPrompt)return;
  installButton.disabled=true;
  try {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt=undefined;
    installButton.hidden=true;
  } catch(error) {
    console.error('No se pudo iniciar la instalación de GeoTwin Explorer.',error);
  } finally {
    installButton.disabled=false;
  }
});

if('serviceWorker' in navigator) {
  const workerUrl=new URL('../service-worker.js',import.meta.url);
  const appScope=new URL('../',import.meta.url).pathname;
  navigator.serviceWorker.register(workerUrl,{scope:appScope}).catch(error=>{
    console.error('No se pudo registrar el modo sin conexión de GeoTwin Explorer.',error);
  });
}
