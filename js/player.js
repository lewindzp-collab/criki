const Player = (function(){
  let hls = null;
  let currentChannel = null;
  let hideTimer = null;
  let allChannels = [];

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    'volume-high': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a9 9 0 010 12"/></svg>',
    'volume-mute': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/></svg>',
    'fullscreen-exit': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v3a2 2 0 01-2 2H4M15 3v3a2 2 0 002 2h3M9 21v-3a2 2 0 00-2-2H4M15 21v-3a2 2 0 012-2h3"/></svg>',
    pip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"/></svg>'
  };

  const modalTitle = document.getElementById('modalTitle');
  const modalTags = document.getElementById('modalTags');
  const modalLogo = document.getElementById('modalLogo');
  const modalFavBtn = document.getElementById('modalFavBtn');
  const videoWrap = document.getElementById('videoWrap');
  const videoEl = document.getElementById('videoEl');
  const videoStatus = document.getElementById('videoStatus');
  const switcherWrap = document.getElementById('modalSwitcherWrap');
  const switcherEl = document.getElementById('modalSwitcher');

  const pcPlay = document.getElementById('pcPlay');
  const pcMute = document.getElementById('pcMute');
  const pcVolumeSlider = document.getElementById('pcVolumeSlider');
  const pcPip = document.getElementById('pcPip');
  const pcFullscreen = document.getElementById('pcFullscreen');
  const pcLive = document.getElementById('pcLive');
  const pcLiveOffset = document.getElementById('pcLiveOffset');
  const playerControls = document.getElementById('playerControls');
  const bufferIndicator = document.getElementById('bufferIndicator');
  const bufferIndicatorText = document.getElementById('bufferIndicatorText');
  const pcSeekTrack = document.getElementById('pcSeekTrack');
  const pcSeekFill = document.getElementById('pcSeekFill');
  const pcSeekThumb = document.getElementById('pcSeekThumb');

  let stallCount = 0;
  let stallStartedAt = null;
  let stallTickTimer = null;
  let seekMonitorTimer = null;
  let isScrubbing = false;
  let currentExtraTags = [];

  const FALLBACK_SECONDS = 6;
  let triedUrls = new Set();
  let fallbackCountdownInterval = null;

  const DEFAULT_TUNING_HTML = videoStatus.innerHTML;

  function setIcon(btn, key){ btn.innerHTML = ICONS[key]; btn.dataset.icon = key; }

  function open(channel, extraTags, isAutoFallback){
    clearFallbackCountdown();

    if (!isAutoFallback) triedUrls = new Set();

    currentChannel = channel;
    currentExtraTags = extraTags || [];

    const params = new URLSearchParams({ ch: channel.url });
    if (extraTags && extraTags.length) params.set('tag', extraTags.join(','));
    history.replaceState(null, '', 'player.html?' + params.toString());
    document.title = 'Criki — ' + channel.name;

    modalLogo.innerHTML = channel.logo
      ? `<img src="${escapeHTML(channel.logo)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'fallback\\'>${initials(channel.name)}</span>'">`
      : `<span class="fallback">${initials(channel.name)}</span>`;
    modalTitle.textContent = channel.name;
    const tags = [channel.country || '—', channel.group].concat(extraTags || []);
    if (isAutoFallback) tags.push('AUTO-SWITCHED');
    modalTags.innerHTML = tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('');
    updateFavBtn();
    modalFavBtn.onclick = () => { Favorites.toggle(channel); updateFavBtn(); };

    renderSwitcher(channel);

    videoStatus.innerHTML = DEFAULT_TUNING_HTML;
    videoStatus.style.display = 'flex';
    playerControls.style.display = 'none';
    videoWrap.classList.remove('controls-hidden');

    if (hls){ hls.destroy(); hls = null; }

    hideBuffering();
    stallCount = 0;
    startSeekMonitor();

    videoEl.volume = 1;
    videoEl.muted = false;
    updateVolumeIcon();
    setIcon(pcPlay, 'pause');

    const startPlayback = () => {
      videoEl.play().catch(()=>{});
      videoStatus.style.display = 'none';
      playerControls.style.display = 'flex';
      resetHideTimer();
    };

    if (window.Hls && Hls.isSupported()){
      hls = new Hls({ maxBufferLength: 30 });
      hls.loadSource(channel.url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, startPlayback);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal){ handleFailure(classifyHlsError(data)); }
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')){
      videoEl.src = channel.url;
      videoEl.addEventListener('loadedmetadata', startPlayback, { once:true });
      videoEl.addEventListener('error', () => handleFailure('dead'), { once:true });
    } else {
      videoStatus.innerHTML = `<span class="display">UNSUPPORTED</span><span class="video-status-sub">Your browser can't play this stream format.</span>`;
    }
  }

  function showBuffering(){
    videoWrap.classList.add('is-buffering');
    if (stallStartedAt == null){
      stallStartedAt = Date.now();
      stallCount += 1;
    }
    updateBufferText();
    clearInterval(stallTickTimer);
    stallTickTimer = setInterval(updateBufferText, 1000);
    bufferIndicator.style.display = 'flex';
  }

  function updateBufferText(){
    const secs = stallStartedAt ? Math.floor((Date.now() - stallStartedAt) / 1000) : 0;
    bufferIndicatorText.textContent = `BUFFERING… ${secs}s` + (stallCount > 1 ? ` · stall #${stallCount}` : '');
  }

  function hideBuffering(){
    videoWrap.classList.remove('is-buffering');
    stallStartedAt = null;
    clearInterval(stallTickTimer);
    bufferIndicator.style.display = 'none';
  }

  function getLiveEdge(){
    if (hls && hls.liveSyncPosition != null) return hls.liveSyncPosition;
    if (videoEl.seekable && videoEl.seekable.length) return videoEl.seekable.end(videoEl.seekable.length - 1);
    return videoEl.duration || 0;
  }

  function getSeekStart(){
    if (videoEl.seekable && videoEl.seekable.length) return videoEl.seekable.start(0);
    return 0;
  }

  function formatOffset(seconds){
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function updateSeekUI(){
    if (isScrubbing) return;
    const liveEdge = getLiveEdge();
    const start = getSeekStart();
    const cur = videoEl.currentTime;
    const range = Math.max(0.001, liveEdge - start);
    const pct = Math.max(0, Math.min(100, ((cur - start) / range) * 100));
    pcSeekFill.style.width = pct + '%';
    pcSeekThumb.style.left = pct + '%';

    const behind = Math.max(0, liveEdge - cur);
    const atLiveEdge = behind < 2;
    pcLiveOffset.textContent = atLiveEdge ? 'LIVE' : '-' + formatOffset(behind);
    pcLive.classList.toggle('behind', !atLiveEdge);
  }

  function startSeekMonitor(){
    clearInterval(seekMonitorTimer);
    seekMonitorTimer = setInterval(updateSeekUI, 500);
  }

  function stopSeekMonitor(){
    clearInterval(seekMonitorTimer);
  }

  function seekFromPointerX(clientX){
    const rect = pcSeekTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const start = getSeekStart();
    const liveEdge = getLiveEdge();
    const target = start + pct * (liveEdge - start);
    pcSeekFill.style.width = (pct * 100) + '%';
    pcSeekThumb.style.left = (pct * 100) + '%';
    return target;
  }

  function scrubStart(e){
    isScrubbing = true;
    clearTimeout(hideTimer);
    videoWrap.classList.remove('controls-hidden');
    scrubMove(e);
  }
  function scrubMove(e){
    if (!isScrubbing) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    videoEl.currentTime = seekFromPointerX(x);
  }
  function scrubEnd(){
    if (!isScrubbing) return;
    isScrubbing = false;
    videoEl.play().catch(()=>{});
    resetHideTimer();
  }

  pcSeekTrack.addEventListener('pointerdown', (e) => { pcSeekTrack.setPointerCapture(e.pointerId); scrubStart(e); });
  pcSeekTrack.addEventListener('pointermove', scrubMove);
  pcSeekTrack.addEventListener('pointerup', scrubEnd);
  pcSeekTrack.addEventListener('pointercancel', scrubEnd);

  function jumpToLive(){
    if (!currentChannel) return;
    const stuck = stallStartedAt != null && (Date.now() - stallStartedAt) > 6000;
    if (stuck){
      open(currentChannel, currentExtraTags);
      return;
    }
    videoEl.currentTime = getLiveEdge();
    videoEl.play().catch(()=>{});
    resetHideTimer();
  }

  function classifyHlsError(data){
    const code = data && data.response && data.response.code;
    if (code === 403 || code === 451) return 'geo';
    return 'dead';
  }

  function reasonText(reasonKey){
    return reasonKey === 'geo'
      ? 'This feed looks geo-restricted from your location.'
      : "This feed isn't responding right now.";
  }

  function findNextCandidate(channel){
    if (!channel) return null;
    const pool = allChannels.filter(c => c.url !== channel.url && !triedUrls.has(c.url));

    const sameCountry = channel.country && pool.find(c => c.country === channel.country);
    if (sameCountry) return sameCountry;
    const sameGroup = pool.find(c => c.group === channel.group);
    return sameGroup || null;
  }

  function clearFallbackCountdown(){
    clearInterval(fallbackCountdownInterval);
    fallbackCountdownInterval = null;
  }

  function handleFailure(reasonKey){
    hideBuffering();
    stopSeekMonitor();
    if (hls){ hls.destroy(); hls = null; }
    if (currentChannel) triedUrls.add(currentChannel.url);

    const next = findNextCandidate(currentChannel);
    if (next){
      startFallbackCountdown(next, reasonKey);
    } else {
      showError(reasonKey);
    }
  }

  function startFallbackCountdown(next, reasonKey){
    clearFallbackCountdown();
    let remaining = FALLBACK_SECONDS;

    videoStatus.style.display = 'flex';
    playerControls.style.display = 'none';

    const render = () => {
      videoStatus.innerHTML = `
        <span class="display">SIGNAL LOST</span>
        <span class="video-status-sub">${reasonText(reasonKey)} Switching to ${escapeHTML(next.name)} in ${remaining}s…</span>
        <div class="video-status-actions">
          <button class="retry-btn secondary" id="fallbackStayBtn" type="button">Stay here</button>
          <button class="retry-btn" id="fallbackNowBtn" type="button">Switch now</button>
        </div>`;
      const stayBtn = document.getElementById('fallbackStayBtn');
      const nowBtn = document.getElementById('fallbackNowBtn');
      if (stayBtn) stayBtn.onclick = () => { clearFallbackCountdown(); showError(reasonKey); };
      if (nowBtn) nowBtn.onclick = () => { clearFallbackCountdown(); open(next, currentExtraTags, true); };
    };

    render();
    fallbackCountdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0){
        clearFallbackCountdown();
        open(next, currentExtraTags, true);
        return;
      }
      render();
    }, 1000);
  }

  function showError(reasonKey){
    hideBuffering();
    stopSeekMonitor();
    clearFallbackCountdown();
    videoStatus.style.display = 'flex';
    playerControls.style.display = 'none';
    videoStatus.innerHTML = `
      <span class="display">SIGNAL LOST</span>
      <span class="video-status-sub">${reasonText(reasonKey)} Try another channel, or retry this one.</span>
      <div class="video-status-actions">
        <button class="retry-btn" id="retryBtn">Retry</button>
      </div>`;
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) retryBtn.onclick = () => { triedUrls.delete(currentChannel.url); open(currentChannel, currentExtraTags, true); };
  }

  function showNotFound(){
    hideBuffering();
    stopSeekMonitor();
    modalTitle.textContent = 'Channel not found';
    videoStatus.style.display = 'flex';
    playerControls.style.display = 'none';
    videoStatus.innerHTML = `
      <span class="display">NO SIGNAL</span>
      <span class="video-status-sub">This link doesn't match a channel in the current feed.</span>
      <a class="retry-btn" href="index.html" style="text-decoration:none; display:inline-block;">Back to channels</a>`;
  }

  function updateFavBtn(){
    const isFav = Favorites.has(currentChannel);
    modalFavBtn.textContent = isFav ? '★ Favorited' : '☆ Add to favorites';
  }

  function switchChipHTML(ch){
    return `
      <div class="switch-chip" data-url="${escapeHTML(ch.url)}" role="button" tabindex="0">
        <div class="card-logo">
          ${ch.logo
            ? `<img src="${escapeHTML(ch.logo)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'fallback\\'>${initials(ch.name)}</span>'">`
            : `<span class="fallback">${initials(ch.name)}</span>`}
        </div>
        <div class="switch-name">${escapeHTML(ch.name)}</div>
        <span class="switch-tag">${escapeHTML(ch.country || ch.group || '')}</span>
      </div>`;
  }

  function renderSwitcher(channel){
    const related = allChannels.filter(c =>
      c.url !== channel.url && (c.country === channel.country || c.group === channel.group)
    ).slice(0, 24);

    if (!related.length){
      switcherWrap.style.display = 'none';
      return;
    }

    switcherWrap.style.display = '';
    switcherEl.innerHTML = related.map(switchChipHTML).join('');
    switcherEl.querySelectorAll('.switch-chip').forEach((chip, i) => {
      chip.addEventListener('click', () => open(related[i]));
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          open(related[i]);
        }
      });
    });
  }

  function togglePlay(){
    if (videoEl.paused) videoEl.play().catch(()=>{});
    else videoEl.pause();
  }

  function updateVolumeIcon(){
    const muted = videoEl.muted || videoEl.volume === 0;
    setIcon(pcMute, muted ? 'volume-mute' : 'volume-high');
    pcVolumeSlider.value = muted ? 0 : videoEl.volume;
  }

  function toggleFullscreen(){
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsElement){
      const req = videoWrap.requestFullscreen || videoWrap.webkitRequestFullscreen;
      if (req) req.call(videoWrap);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function resetHideTimer(){
    videoWrap.classList.remove('controls-hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!videoEl.paused) videoWrap.classList.add('controls-hidden');
    }, 3000);
  }

  pcPlay.addEventListener('click', togglePlay);
  videoEl.addEventListener('click', togglePlay);
  videoEl.addEventListener('play', () => { setIcon(pcPlay, 'pause'); resetHideTimer(); });
  videoEl.addEventListener('pause', () => {
    setIcon(pcPlay, 'play');
    videoWrap.classList.remove('controls-hidden');
    clearTimeout(hideTimer);
  });

  pcMute.addEventListener('click', () => { videoEl.muted = !videoEl.muted; updateVolumeIcon(); });
  videoEl.addEventListener('waiting', showBuffering);
  videoEl.addEventListener('playing', hideBuffering);
  pcLive.addEventListener('click', jumpToLive);
  pcVolumeSlider.addEventListener('input', () => {
    videoEl.volume = parseFloat(pcVolumeSlider.value);
    videoEl.muted = videoEl.volume === 0;
    updateVolumeIcon();
  });
  videoEl.addEventListener('volumechange', updateVolumeIcon);

  if (!document.pictureInPictureEnabled){
    pcPip.style.display = 'none';
  } else {
    setIcon(pcPip, 'pip');
    pcPip.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await videoEl.requestPictureInPicture();
      } catch(e){  }
    });
  }

  setIcon(pcFullscreen, 'fullscreen');
  pcFullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    setIcon(pcFullscreen, (document.fullscreenElement) ? 'fullscreen-exit' : 'fullscreen');
  });

  videoWrap.addEventListener('mousemove', resetHideTimer);
  videoWrap.addEventListener('touchstart', resetHideTimer, { passive:true });
  playerControls.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  playerControls.addEventListener('mouseleave', resetHideTimer);

  function teardown(){
    if (hls){ hls.destroy(); hls = null; }
    clearTimeout(hideTimer);
    clearInterval(stallTickTimer);
    stopSeekMonitor();
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(()=>{});
  }
  window.addEventListener('pagehide', teardown);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.key === ' '){
      e.preventDefault();
      togglePlay();
    } else if (e.key.toLowerCase() === 'm'){
      videoEl.muted = !videoEl.muted;
      updateVolumeIcon();
    } else if (e.key.toLowerCase() === 'f'){
      toggleFullscreen();
    }
  });

  async function init(){
    const params = new URLSearchParams(location.search);
    const chParam = params.get('ch');
    const tagParam = params.get('tag');
    const extraTags = tagParam ? tagParam.split(',') : [];

    if (!chParam){
      showNotFound();
      return;
    }

    let stashed = null;
    try {
      const raw = sessionStorage.getItem('pitchside_pending_channel');
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && parsed.channel && parsed.channel.url === chParam) stashed = parsed.channel;
      }
    } catch (e){  }

    if (stashed) open(stashed, extraTags);

    const [list, idToCountry] = await Promise.all([
      fetchPlaylist(),
      fetchChannelCountries()
    ]);
    for (const ch of list){
      if (ch.id && idToCountry.has(ch.id)) ch.country = idToCountry.get(ch.id);
    }
    allChannels = list;
    const match = list.find(c => c.url === chParam);

    if (match){
      open(match, extraTags);
    } else if (!stashed){
      showNotFound();
    } else {

      renderSwitcher(stashed);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open };
})();
