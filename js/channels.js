const Channels = (function(){
  let channels = [];
  let dataLoaded = false;
  let statusMessage = 'CONNECTING TO FEED…';
  let countryNames = new Map();

  const PAGE_SIZE = CONFIG.CHANNELS_PAGE_SIZE;
  let visibleCount = PAGE_SIZE;

  const healthStatus = new Map();
  let healthQueue = [];
  let healthActive = 0;

  let statusFilter = 'all';
  let statusRerenderTimer = null;

  const grid = document.getElementById('channelsGrid');
  const searchInput = document.getElementById('searchInput');
  const countrySelect = document.getElementById('countrySelect');
  const statusFilterEl = document.getElementById('channelStatusFilter');
  const statusText = document.getElementById('statusText');
  const countText = document.getElementById('countText');
  const legendEl = document.getElementById('channelsLegend');
  const pagerEl = document.getElementById('channelsPager');

  function setStatus(msg){
    statusMessage = msg;
    const tab = App.activeMainTab();
    if (tab === 'channels' || tab === 'favorites') statusText.textContent = statusMessage;
  }

  function updateDot(url, status){
    const card = grid.querySelector(`.card[data-key="${CSS.escape(url)}"]`);
    if (!card) return;
    const dot = card.querySelector('.live-dot');
    if (!dot) return;
    dot.className = 'live-dot status-' + status;
    dot.title = statusTitle(status);
  }

  function probeChannel(ch){
    return new Promise(resolve => {
      if (!window.Hls || !Hls.isSupported()){
        resolve('unknown');
        return;
      }
      let settled = false;
      const probe = new Hls({ maxBufferLength: 1 });
      const finish = (status) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        probe.destroy();
        resolve(status);
      };
      const timer = setTimeout(() => finish('dead'), CONFIG.CHANNELS_HEALTH_TIMEOUT_MS);
      probe.on(Hls.Events.MANIFEST_PARSED, () => finish('ok'));
      probe.on(Hls.Events.ERROR, (event, data) => { if (data.fatal) finish('dead'); });
      try {
        probe.attachMedia(document.createElement('video'));
        probe.loadSource(ch.url);
      } catch (e){
        finish('dead');
      }
    });
  }

  function pumpHealthQueue(){
    while (healthActive < CONFIG.CHANNELS_HEALTH_CONCURRENCY && healthQueue.length){
      const ch = healthQueue.shift();
      healthActive++;
      probeChannel(ch).then(status => {
        healthStatus.set(ch.url, status);
        healthActive--;
        updateDot(ch.url, status);

        if (statusFilter !== 'all') scheduleStatusRerender();
        pumpHealthQueue();
      });
    }
  }

  function scheduleStatusRerender(){
    if (statusRerenderTimer) return;
    statusRerenderTimer = setTimeout(() => {
      statusRerenderTimer = null;
      const tab = App.activeMainTab();
      if (statusFilter !== 'all' && (tab === 'channels' || tab === 'favorites')) render();
    }, 400);
  }

  function queueHealthCheck(ch){
    if (healthStatus.has(ch.url)) return;
    healthStatus.set(ch.url, 'checking');
    healthQueue.push(ch);
    pumpHealthQueue();
  }

  function populateCountries(list){
    countrySelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
    const countries = [...new Set(list.map(c => c.country).filter(Boolean))].sort();
    for (const c of countries){
      const opt = document.createElement('option');
      opt.value = c;
      const info = countryNames.get(c);
      opt.textContent = info ? `${info.flag ? info.flag + ' ' : ''}${info.name}` : c;
      countrySelect.appendChild(opt);
    }
  }

  function statusTitle(status){
    if (status === 'ok') return 'Verified working';
    if (status === 'dead') return 'Not responding right now';
    if (status === 'unknown') return "Couldn't verify in this browser";
    return 'Checking…';
  }

  function cardHTML(ch){
    const isFav = Favorites.has(ch);
    const status = healthStatus.get(ch.url) || 'checking';
    const info = countryNames.get(ch.country) || {};
    const countryLabel = info.name || ch.country || ch.group;
    return `
      <div class="card broadcast-card" data-key="${escapeHTML(ch.url)}" role="button" tabindex="0">
        <div class="tile">
          ${ch.logo
            ? `<img class="tile-logo" src="${escapeHTML(ch.logo)}" alt="" loading="lazy" onerror="this.remove(); this.parentElement.classList.add('no-logo')">`
            : ''}
          <span class="tile-fallback display">${initials(ch.name)}</span>
          <span class="live-dot status-${status}" title="${escapeHTML(statusTitle(status))}" aria-hidden="true"></span>
          <button type="button" class="fav-btn tile-fav ${isFav ? 'active' : ''}" aria-label="Toggle favorite" data-fav="1">${isFav ? '★' : '☆'}</button>
          <div class="tile-hover" aria-hidden="true"><span class="tile-watch">▶ WATCH</span></div>
        </div>
        <div class="card-meta">
          <div class="card-name">${escapeHTML(ch.name)}</div>
          <span class="tag">${info.flag ? info.flag + ' ' : ''}${escapeHTML(countryLabel)}</span>
        </div>
      </div>`;
  }

  function loaderCardHTML(){
    return `
      <div class="skeleton-card" aria-hidden="true">
        <div class="tile"><span class="tile-loader" title="Checking stream…"></span></div>
        <div class="card-meta"><div class="skeleton-line"></div></div>
      </div>`;
  }

  function pagerHTML(shownCount, totalCount){
    const parts = [];
    if (shownCount < totalCount){
      parts.push('<button class="retry-btn" id="channelsShowMoreBtn" type="button">Show more</button>');
    }
    if (visibleCount > PAGE_SIZE){
      parts.push('<button class="retry-btn secondary" id="channelsShowLessBtn" type="button">Show less</button>');
    }
    if (!parts.length) return '';
    return `
      <div class="pager-btns">${parts.join('')}</div>
      <div class="pager-count">${shownCount} of ${totalCount} shown</div>`;
  }

  function render(){
    const q = searchInput.value.trim().toLowerCase();
    const country = countrySelect.value;
    const favOnly = App.activeMainTab() === 'favorites';
    const onChannelsOrFavs = App.activeMainTab() === 'channels' || favOnly;

    let list = channels;
    if (favOnly) list = list.filter(c => Favorites.has(c));
    if (country) list = list.filter(c => c.country === country);
    if (q) list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      ((countryNames.get(c.country) || {}).name || '').toLowerCase().includes(q)
    );

    let pending = [];
    if (statusFilter !== 'all'){
      list.forEach(queueHealthCheck);
      const matched = [];
      list.forEach(c => {
        const s = healthStatus.get(c.url);
        if (!s || s === 'checking'){ pending.push(c); return; }

        if (statusFilter === 'live' ? s === 'ok' : s === 'dead') matched.push(c);
      });
      list = matched;
    }

    if (onChannelsOrFavs){
      countText.textContent = list.length + ' CHANNEL' + (list.length === 1 ? '' : 'S') +
        (pending.length ? ` — checking ${pending.length} more…` : '');
    }

    if (!list.length && !pending.length){
      let msg;
      if (!dataLoaded){
        msg = 'Still trying to reach the channel feed. Sit tight, or hit retry below.';
      } else if (favOnly && statusFilter === 'all'){
        msg = 'No favorites yet. Star a channel from the grid to pin it here.';
      } else if (statusFilter === 'live'){
        msg = 'No verified-live channels match these filters right now. Try Offline or All.';
      } else if (statusFilter === 'offline'){
        msg = 'Nothing came back dead for these filters — everything checked out live or unverified.';
      } else {
        msg = 'Nothing matches that search. Try a different team, league, or country.';
      }
      grid.innerHTML = `
        <div class="empty-state">
          <div class="display">NO SIGNAL</div>
          <p>${msg}</p>
          ${!dataLoaded ? '<button class="retry-btn" id="channelsRetryBtn" style="margin-top:16px;">Retry connection</button>' : ''}
        </div>`;
      const retryBtn = document.getElementById('channelsRetryBtn');
      if (retryBtn) retryBtn.addEventListener('click', load);
      legendEl.style.display = 'none';
      pagerEl.style.display = 'none';
      pagerEl.innerHTML = '';
      return;
    }

    const shown = list.slice(0, visibleCount);

    const loaderCount = statusFilter !== 'all'
      ? Math.min(pending.length, Math.max(0, visibleCount - shown.length))
      : 0;
    grid.innerHTML = shown.map(cardHTML).join('') + Array(loaderCount).fill(loaderCardHTML()).join('');
    shown.forEach(queueHealthCheck);

    legendEl.style.display = onChannelsOrFavs ? '' : 'none';
    if (onChannelsOrFavs){
      pagerEl.style.display = '';
      pagerEl.innerHTML = pagerHTML(shown.length, list.length);
      const moreBtn = document.getElementById('channelsShowMoreBtn');
      const lessBtn = document.getElementById('channelsShowLessBtn');
      if (moreBtn) moreBtn.addEventListener('click', () => { visibleCount += PAGE_SIZE; render(); });
      if (lessBtn) lessBtn.addEventListener('click', () => {
        visibleCount = PAGE_SIZE;
        render();
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      pagerEl.style.display = 'none';
      pagerEl.innerHTML = '';
    }

    grid.querySelectorAll('.card').forEach((cardEl, i) => {
      const ch = shown[i];
      cardEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-fav]')) return;
        openPlayer(ch);
      });
      cardEl.addEventListener('keydown', (e) => {
        if (e.target.closest('[data-fav]')) return;
        if (e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openPlayer(ch);
        }
      });
      cardEl.querySelector('[data-fav]').addEventListener('click', (e) => {
        e.stopPropagation();
        Favorites.toggle(ch);
      });
    });
  }

  async function load(){
    dataLoaded = false;
    visibleCount = PAGE_SIZE;
    healthStatus.clear();
    healthQueue = [];
    setStatus('CONNECTING TO FEED…');
    grid.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');

    const [parsed, idToCountry, countryNameMap] = await Promise.all([
      fetchPlaylist(),
      fetchChannelCountries(),
      fetchCountryNames()
    ]);

    if (parsed.length){
      for (const ch of parsed){
        if (ch.id && idToCountry.has(ch.id)) ch.country = idToCountry.get(ch.id);
      }
      channels = parsed;
      countryNames = countryNameMap;
      dataLoaded = true;

      const matched = parsed.filter(c => c.country).length;
      if (!idToCountry.size){
        console.warn('[Channels] country lookup (channels.json) returned 0 entries — see fetchJSON warnings above for which mirror failed and why.');
      } else if (!matched){
        console.warn('[Channels] channels.json loaded (' + idToCountry.size + ' entries) but 0 playlist channels matched by tvg-id.',
          'Sample playlist ids:', parsed.slice(0, 5).map(c => c.id),
          'Sample channels.json ids:', [...idToCountry.keys()].slice(0, 5));
      } else {
        console.info('[Channels] country matched for ' + matched + '/' + parsed.length + ' channels.');
      }

      populateCountries(channels);
      setStatus('LIVE — SOURCE: IPTV-ORG/IPTV');
      Ticker.setChannels(channels);
      render();
      return;
    }

    setStatus('FEED UNAVAILABLE');
    render();
  }

  function all(){ return channels; }
  function isLoaded(){ return dataLoaded; }
  function status(){ return statusMessage; }
  function getVisibleCount(){ return visibleCount; }

  function restoreVisibleCount(n){
    if (typeof n === 'number' && n > visibleCount){
      visibleCount = n;
      render();
    }
  }

  function findCandidatesByHint(hint, limit){
    limit = limit || 3;
    if (!hint) return [];
    const names = hint.names || (hint.preferName ? [hint.preferName] : []);
    const out = [];
    const seen = new Set();
    const add = (list) => {
      for (const c of list){
        if (out.length >= limit) return;
        if (seen.has(c.url)) continue;
        seen.add(c.url);
        out.push(c);
      }
    };
    for (const n of names){
      if (out.length >= limit) break;
      const lower = n.toLowerCase();
      add(channels.filter(c => c.name.toLowerCase().includes(lower)));
    }
    if (out.length < limit && hint.countries){
      add(channels.filter(c => hint.countries.includes(c.country)));
    }
    if (out.length < limit && hint.group){
      const g = hint.group.toLowerCase();
      add(channels.filter(c => c.group.toLowerCase().includes(g)));
    }
    return out;
  }

  function findByHint(hint){
    return findCandidatesByHint(hint, 1)[0] || null;
  }

  function resetPageAndRender(){
    visibleCount = PAGE_SIZE;
    render();
  }

  searchInput.addEventListener('input', resetPageAndRender);
  countrySelect.addEventListener('change', resetPageAndRender);
  statusFilterEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    statusFilterEl.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b === btn));
    statusFilter = btn.dataset.status;
    resetPageAndRender();
  });
  Favorites.onChange(render);

  return { load, render, all, isLoaded, findByHint, findCandidatesByHint, status, getVisibleCount, restoreVisibleCount };
})();
