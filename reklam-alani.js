// Adsterra approved ezoter.ist units; load exactly one banner per page view.
(() => {
  const area=document.querySelector('[data-ad-placement="home-top"]');
  if(!area)return;
  const slot=area.querySelector('[data-ad-slot]');
  const mobile=window.matchMedia('(max-width:759px)').matches;
  if(new URLSearchParams(location.search).get('reklam-onizleme')==='1'){
    area.hidden=false;slot.classList.add('home-ad-preview');
    slot.textContent=mobile?'Banner alanı · 320 × 50':'Banner alanı · 728 × 90';return;
  }
  // A 320px banner must fit without cropping, scaling or covering navigation.
  if(mobile&&innerWidth<352)return;
  const unit=mobile?{key:'3ed9134d61d70ffb7ba88c5a7a70fe71',width:320,height:50}:{key:'e2d647daab550303412d89f89a39eecb',width:728,height:90};
  // Keep the format and script URL exactly as supplied by the publisher dashboard.
  window.atOptions={...unit,format:'iframe',params:{}};
  let loaded=false;
  const observer=new MutationObserver(()=>{
    for(const frame of slot.querySelectorAll('iframe')){
      if(frame.dataset.bannerObserved)continue;frame.dataset.bannerObserved='1';
      // The supplied embed writes into an about:blank iframe whose initial load may
      // precede observer delivery. Reveal on insertion so viewability can initialize.
      loaded=true;area.hidden=false;observer.disconnect();
    }
  });
  observer.observe(slot,{childList:true,subtree:true});
  setTimeout(()=>{observer.disconnect();if(!loaded)area.hidden=true;},15000);
  // Parser-time insertion retains Adsterra's synchronous embed/document.write behavior.
  document.write('<script src="https://bauval.org/22/'+unit.key+'"><\/script>');
})();
