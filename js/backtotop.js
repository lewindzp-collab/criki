(function(){
  function setup(){
    const btn = document.getElementById('backToTopBtn');
    if (!btn) return;

    const SHOW_AFTER = 480;
    let ticking = false;

    function update(){
      btn.classList.toggle('visible', window.scrollY > SHOW_AFTER);
      ticking = false;
    }
    update();

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
