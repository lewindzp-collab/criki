const App = (function(){
  let currentTab = 'matches';
  const TAB_KEY = 'pitchside_active_tab';

  const clockEl = document.getElementById('clock');
  const channelsGrid = document.getElementById('channelsGrid');
  const matchesGrid = document.getElementById('matchesGrid');
  const countrySelect = document.getElementById('countrySelect');
  const sportFilter = document.getElementById('sportFilter');
  const matchStateFilter = document.getElementById('matchStateFilter');
  const channelStatusFilter = document.getElementById('channelStatusFilter');
  const liveStripWrap = document.getElementById('liveStripWrap');
  const favCountEl = document.getElementById('favCount');
  const footerYearEl = document.getElementById('footerYear');

  const tabButtons = {
    matches: document.getElementById('tabMatches'),
    channels: document.getElementById('tabChannels'),
    favorites: document.getElementById('tabFavorites')
  };

  function activeMainTab(){ return currentTab; }

  function switchTab(tab){
    currentTab = tab;
    try { sessionStorage.setItem(TAB_KEY, tab); } catch (e){  }
    Object.entries(tabButtons).forEach(([key, btn]) => {
      btn.classList.toggle('active', key === tab);
    });

    const showMatches = tab === 'matches';
    const showChannels = tab === 'channels' || tab === 'favorites';

    matchesGrid.style.display = showMatches ? 'grid' : 'none';
    channelsGrid.style.display = showChannels ? 'grid' : 'none';
    sportFilter.style.display = showMatches ? '' : 'none';
    matchStateFilter.style.display = showMatches ? '' : 'none';
    countrySelect.style.display = showChannels ? '' : 'none';
    channelStatusFilter.style.display = showChannels ? '' : 'none';
    if (!showMatches) liveStripWrap.style.display = 'none';

    if (showMatches) Matches.render();
    if (showChannels) Channels.render();

    const statusText = document.getElementById('statusText');
    statusText.textContent = showMatches ? Matches.status() : Channels.status();
  }

  function updateClock(){
    const now = new Date();
    clockEl.innerHTML = now.toLocaleTimeString('en-GB', { hour12: false }) + ' <b>LOCAL</b>';
  }

  function updateFavCount(){
    const n = Favorites.count();
    favCountEl.textContent = n ? '(' + n + ')' : '';
  }

  function init(){
    if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();
    tabButtons.matches.addEventListener('click', () => switchTab('matches'));
    tabButtons.channels.addEventListener('click', () => switchTab('channels'));
    tabButtons.favorites.addEventListener('click', () => switchTab('favorites'));

    Favorites.onChange(updateFavCount);
    updateFavCount();

    updateClock();
    setInterval(updateClock, 1000);

    let savedTab = 'matches';
    try { savedTab = sessionStorage.getItem(TAB_KEY) || 'matches'; } catch (e){  }
    switchTab(savedTab);

    let savedScrollY = null;
    let savedVisibleCount = null;
    try {
      const rawScroll = sessionStorage.getItem('pitchside_scroll_y');
      if (rawScroll != null){
        savedScrollY = parseInt(rawScroll, 10);
        sessionStorage.removeItem('pitchside_scroll_y');
      }
      const rawVisible = sessionStorage.getItem('pitchside_visible_count');
      if (rawVisible != null){
        savedVisibleCount = parseInt(rawVisible, 10);
        sessionStorage.removeItem('pitchside_visible_count');
      }
    } catch (e){  }

    Promise.all([Channels.load(), Matches.load()]).then(() => {
      if (savedVisibleCount != null && !isNaN(savedVisibleCount)){

        Channels.restoreVisibleCount(savedVisibleCount);
      }
      if (savedScrollY != null && !isNaN(savedScrollY)){

        requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { activeMainTab, switchTab };
})();
