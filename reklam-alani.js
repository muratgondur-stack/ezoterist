// Only placement preview. No ad request, tracking, popup or provider code before account setup.
(() => {
  const area=document.querySelector('[data-ad-placement="home-top"]');
  if(!area)return;
  if(new URLSearchParams(location.search).get('reklam-onizleme')==='1'){
    area.hidden=false;
    const slot=area.querySelector('[data-ad-slot]');slot.classList.add('home-ad-preview');
    const label=()=>{slot.textContent=window.matchMedia('(max-width:759px)').matches?'Banner alanı · 320 × 50':'Banner alanı · 728 × 90';};
    label();window.addEventListener('resize',label);
  }
})();
