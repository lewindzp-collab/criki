const Matches = (function(){
  let matches = [];
  let dataLoaded = false;
  let countdownTimer = null;
  let stateFilter = 'all';
  let statusMessage = 'CONNECTING TO FEED…';

  const confirmedChannel = new Map();
  let epgQueued = new Set();

  const grid = document.getElementById('matchesGrid');
  const statusText = document.getElementById('statusText');
  const countText = document.getElementById('countText');
  const sportFilter = document.getElementById('sportFilter');
  const liveStripWrap = document.getElementById('liveStripWrap');
  const liveStrip = document.getElementById('liveStrip');
  const stateFilterEl = document.getElementById('matchStateFilter');

  function setStatus(msg){
    statusMessage = msg;
    if (App.activeMainTab() === 'matches') statusText.textContent = statusMessage;
  }

  function isLiveMatch(m){

    if (m.sport === 'cricket') return !!m.cricketLive;
    const diff = m.kickoff - new Date();
    return diff <= 0 && diff > -3 * 60 * 60 * 1000;
  }

  function hintFor(m){
    if (m.sport === 'cricket') return m.cricketHint;
    return CONFIG.LEAGUE_CHANNEL_HINTS[m.leagueId];
  }

  function candidatesFor(m){
    return Channels.findCandidatesByHint(hintFor(m), 3);
  }

  function liveLabel(m){
    return (m.sport === 'cricket' && m.cricketStatus) ? m.cricketStatus : 'LIVE NOW';
  }

  function cricketChannelHint(ev){
    const name = (ev.name || '').toLowerCase();
    const byKeyword = CONFIG.CRICKET_CHANNEL_HINTS.find(h => h.keywords.some(k => name.includes(k)));
    if (byKeyword) return { countries: byKeyword.countries, group: byKeyword.group };

    const teams = (ev.teams || []).map(t => (t || '').toLowerCase().replace(/(\s+(women|u-?\d{2}))+$/i, '').trim());
    const countries = new Set();
    teams.forEach(t => {
      const code = CONFIG.CRICKET_TEAM_COUNTRY[t];
      if (code) countries.add(code);
    });
    return countries.size ? { countries: Array.from(countries), group: 'Sports' } : null;
  }

  function cricketBadge(ev){
    const name = (ev.name || '').toLowerCase();
    const match = CONFIG.CRICKET_BADGES.find(b => b.keywords.some(k => name.includes(k)));
    return match ? { label: match.label, marquee: match.marquee } : null;
  }

  function cricketTeamFlag(name){
    const key = (name || '').toLowerCase().replace(/(\s+(women|u-?\d{2}))+$/i, '').trim();
    const code = CONFIG.CRICKET_TEAM_FLAGS[key];
    return code ? `https://flagcdn.com/${code}.svg` : null;
  }

  function badgeFor(m){
    if (m.sport === 'cricket') return m.cricketBadge;
    return CONFIG.LEAGUE_BADGES[m.leagueId] || null;
  }

  async function fetchLeague(league){
    const url = `${CONFIG.SPORTSDB_BASE}/eventsnextleague.php?id=${league.id}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const events = data.events || [];
    return events.map(ev => ({
      id: ev.idEvent,
      sport: league.sport,
      competition: ev.strLeague || league.name,
      leagueId: league.id,
      home: { name: ev.strHomeTeam, badge: ev.strHomeTeamBadge },
      away: { name: ev.strAwayTeam, badge: ev.strAwayTeamBadge },
      kickoff: ev.strTimestamp ? new Date(ev.strTimestamp) : new Date(`${ev.dateEvent}T${ev.strTime || '00:00:00'}Z`)
    })).filter(m => m.home.name && m.away.name && !isNaN(m.kickoff.getTime()));
  }

  function mapCricketEvent(ev){
    const home = ev.teamInfo && ev.teamInfo[0];
    const away = ev.teamInfo && ev.teamInfo[1];
    const homeName = (home && home.name) || (ev.teams && ev.teams[0]) || '';
    const awayName = (away && away.name) || (ev.teams && ev.teams[1]) || '';
    return {
      id: ev.id,
      sport: 'cricket',
      competition: ev.name,
      leagueId: null,
      cricketHint: cricketChannelHint(ev),
      cricketBadge: cricketBadge(ev),
      cricketLive: !!ev.matchStarted && !ev.matchEnded,
      cricketStatus: ev.status,
      home: { name: homeName, badge: cricketTeamFlag(homeName) || (home && home.img) },
      away: { name: awayName, badge: cricketTeamFlag(awayName) || (away && away.img) },

      kickoff: ev.dateTimeGMT ? new Date(ev.dateTimeGMT + 'Z') : new Date(NaN)
    };
  }

  async function fetchCricAPI(endpoint){
    const url = `${CONFIG.CRICAPI_BASE}/${endpoint}?apikey=${CONFIG.CRICAPI_KEY}&offset=0`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.status !== 'success') throw new Error((data.info && data.info.reason) || 'CricAPI error');
    return data.data || [];
  }

  async function fetchCricket(){
    if (!CONFIG.CRICAPI_KEY) return [];

    const [current, upcoming] = await Promise.allSettled([
      fetchCricAPI('currentMatches'),
      fetchCricAPI('matches')
    ]);
    const events = [];
    const seen = new Set();
    [current, upcoming].forEach(r => {
      if (r.status !== 'fulfilled') return;
      r.value.forEach(ev => {
        if (seen.has(ev.id)) return;
        seen.add(ev.id);
        events.push(ev);
      });
    });

    return events
      .filter(ev => !ev.matchEnded)
      .map(mapCricketEvent)
      .filter(m => m.home.name && m.away.name && !isNaN(m.kickoff.getTime()));
  }

  async function load(){
    dataLoaded = false;
    setStatus('CONNECTING TO FEED…');
    grid.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');

    const results = await Promise.allSettled([...CONFIG.LEAGUES.map(fetchLeague), fetchCricket()]);
    const combined = [];
    results.forEach(r => { if (r.status === 'fulfilled') combined.push(...r.value); });

    combined.sort((a, b) => a.kickoff - b.kickoff);
    matches = combined;
    dataLoaded = true;

    if (!matches.length){
      setStatus('FEED UNAVAILABLE');
    } else {
      setStatus('LIVE — SOURCE: THESPORTSDB + CRICAPI');
    }

    Ticker.setMatches(matches);
    render();
    startCountdowns();
  }

  function cardHTML(m){
    const diff = m.kickoff - new Date();
    const isLive = isLiveMatch(m);
    const candidates = candidatesFor(m);
    const confirmed = confirmedChannel.get(m.id);
    const primary = confirmed || candidates[0] || null;
    const badge = badgeFor(m);

    const watchLabel = !primary ? 'Find channel' : (confirmed ? 'Watch' : 'Watch (best guess)');
    const showPicker = !confirmed && candidates.length > 1;

    return `
      <div class="card match-card" data-id="${m.id}">
        <div class="match-comp">
          <div class="match-comp-left">
            <span class="tag">${escapeHTML(m.competition)}</span>
            ${badge ? `<span class="comp-badge${badge.marquee ? ' marquee' : ''}">${escapeHTML(badge.label)}</span>` : ''}
          </div>
          ${isLive ? '<span class="live-badge">● LIVE</span>' : ''}
        </div>
        <div class="match-teams">
          <div class="team">
            ${m.home.badge ? `<img src="${escapeHTML(m.home.badge)}" alt="" loading="lazy">` : `<span class="fallback">${initials(m.home.name)}</span>`}
            <span>${escapeHTML(m.home.name)}</span>
          </div>
          <span class="vs">VS</span>
          <div class="team">
            ${m.away.badge ? `<img src="${escapeHTML(m.away.badge)}" alt="" loading="lazy">` : `<span class="fallback">${initials(m.away.name)}</span>`}
            <span>${escapeHTML(m.away.name)}</span>
          </div>
        </div>
        <div class="match-meta">
          <span class="countdown mono" data-id="${m.id}" data-kickoff="${m.kickoff.toISOString()}">${isLive ? liveLabel(m) : 'Starts in ' + formatCountdown(diff)}</span>
          <div class="watch-wrap">
            <button class="tab-btn watch-btn" data-id="${m.id}">${watchLabel}</button>
            ${showPicker ? `<button class="tab-btn picker-toggle" data-id="${m.id}" aria-label="Other channel options" aria-expanded="false">▾</button>` : ''}
          </div>
        </div>
        ${showPicker ? `
        <div class="channel-picker" data-id="${m.id}" hidden>
          <div class="channel-picker-label">Not sure which one? Pick a channel:</div>
          ${candidates.map(c => `<button class="picker-btn" data-id="${m.id}" data-url="${escapeHTML(c.url)}">${escapeHTML(c.name)}</button>`).join('')}
        </div>` : ''}
      </div>`;
  }

  function watchMatch(m, explicitChannel){
    const channel = explicitChannel || confirmedChannel.get(m.id) || candidatesFor(m)[0];
    if (channel){
      openPlayer(channel, [m.competition]);
    } else {

      const hint = hintFor(m);
      App.switchTab('channels');
      const countrySelect = document.getElementById('countrySelect');
      if (hint && hint.countries && hint.countries.length){
        countrySelect.value = hint.countries[0];
      }
      Channels.render();
    }
  }

  function confirmLiveMatches(list){
    const live = list.filter(isLiveMatch);
    for (const m of live){
      if (epgQueued.has(m.id) || confirmedChannel.has(m.id)) continue;
      epgQueued.add(m.id);
      const candidates = candidatesFor(m).slice(0, CONFIG.EPG_MAX_CANDIDATES_CHECKED);
      (async () => {
        for (const c of candidates){
          let ok = false;
          try { ok = await EPG.confirm(c, m); } catch (e){ ok = false; }
          if (ok){
            confirmedChannel.set(m.id, c);
            break;
          }
        }

        const card = grid.querySelector(`.match-card[data-id="${CSS.escape(String(m.id))}"]`);
        if (card && confirmedChannel.has(m.id)) render();
      })();
    }
  }

  function liveChipHTML(m){
    const badge = badgeFor(m);
    return `
      <div class="live-chip" data-id="${m.id}">
        <div class="live-chip-info">
          <div class="team-mini">
            ${m.home.badge ? `<img src="${escapeHTML(m.home.badge)}" alt="" loading="lazy">` : ''}
            <span>${escapeHTML(m.home.name)}</span>
            <span class="vs-mini">vs</span>
            <span>${escapeHTML(m.away.name)}</span>
            ${m.away.badge ? `<img src="${escapeHTML(m.away.badge)}" alt="" loading="lazy">` : ''}
          </div>
          <div class="live-chip-comp">${escapeHTML(m.competition)}${badge ? ` <span class="comp-badge${badge.marquee ? ' marquee' : ''}">${escapeHTML(badge.label)}</span>` : ''}</div>
        </div>
      </div>`;
  }

  function renderLiveStrip(){
    const sport = sportFilter.value;
    let live = matches.filter(isLiveMatch);
    if (sport) live = live.filter(m => m.sport === sport);

    if (App.activeMainTab() !== 'matches' || !live.length){
      liveStripWrap.style.display = 'none';
      return;
    }

    liveStripWrap.style.display = '';
    liveStrip.innerHTML = live.map(liveChipHTML).join('');
    liveStrip.querySelectorAll('.live-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const m = live.find(x => String(x.id) === chip.dataset.id);
        if (m) watchMatch(m);
      });
    });
  }

  function render(){
    const sport = sportFilter.value;
    let list = matches;
    if (sport) list = list.filter(m => m.sport === sport);
    if (stateFilter === 'live') list = list.filter(isLiveMatch);
    if (stateFilter === 'upcoming') list = list.filter(m => !isLiveMatch(m) && m.kickoff > new Date());

    if (App.activeMainTab() === 'matches'){
      countText.textContent = list.length + ' MATCH' + (list.length === 1 ? '' : 'ES');
    }

    renderLiveStrip();

    if (!list.length){
      const msg = !dataLoaded
        ? 'Still trying to reach the fixtures feed. Sit tight, or hit retry below.'
        : 'No fixtures found for this filter right now — check back closer to matchday.';
      grid.innerHTML = `
        <div class="empty-state">
          <div class="display">NO FIXTURES</div>
          <p>${msg}</p>
          ${!dataLoaded ? '<button class="retry-btn" id="matchesRetryBtn" style="margin-top:16px;">Retry connection</button>' : ''}
        </div>`;
      const retryBtn = document.getElementById('matchesRetryBtn');
      if (retryBtn) retryBtn.addEventListener('click', load);
      return;
    }

    grid.innerHTML = list.map(cardHTML).join('');

    grid.querySelectorAll('.watch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = list.find(x => String(x.id) === btn.dataset.id);
        if (m) watchMatch(m);
      });
    });

    grid.querySelectorAll('.picker-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = grid.querySelector(`.channel-picker[data-id="${CSS.escape(btn.dataset.id)}"]`);
        if (!panel) return;
        const open = panel.hasAttribute('hidden');
        panel.toggleAttribute('hidden', !open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    grid.querySelectorAll('.picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = list.find(x => String(x.id) === btn.dataset.id);
        const channel = Channels.all().find(c => c.url === btn.dataset.url);
        if (m && channel) watchMatch(m, channel);
      });
    });

    confirmLiveMatches(list);
  }

  function startCountdowns(){
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      if (App.activeMainTab() !== 'matches') return;
      document.querySelectorAll('.countdown[data-kickoff]').forEach(el => {
        const m = matches.find(x => String(x.id) === el.dataset.id);
        if (!m) return;
        const diff = m.kickoff - new Date();
        el.textContent = isLiveMatch(m) ? liveLabel(m) : 'Starts in ' + formatCountdown(diff);
      });
      renderLiveStrip();
    }, 1000);
  }

  sportFilter.addEventListener('change', render);

  stateFilterEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    stateFilterEl.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b === btn));
    stateFilter = btn.dataset.filter;
    render();
  });

  function status(){ return statusMessage; }

  return { load, render, all: () => matches, status };
})();
