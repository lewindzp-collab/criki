(function(){
  function setup(){
    const trigger = document.getElementById('devCreditTrigger');
    const overlay = document.getElementById('devOverlay');
    const closeBtn = document.getElementById('devCloseBtn');
    const card = document.getElementById('devCard');
    if (!trigger || !overlay || !closeBtn || !card) return;

    let lastFocused = null;

    function open(){
      lastFocused = document.activeElement;
      overlay.hidden = false;

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close(){
      overlay.classList.remove('open');
      document.body.style.overflow = '';

      setTimeout(() => { overlay.hidden = true; }, 250);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    trigger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) close();
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
