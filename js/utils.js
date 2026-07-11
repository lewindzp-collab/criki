function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function initials(name){
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

function extinfName(line){
  let inQuotes = false;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) return line.slice(i + 1).trim();
  }
  return 'Unknown channel';
}

function parseM3U(text){
  const lines = text.split(/\r?\n/);
  const out = [];
  let current = null;
  for (let raw of lines){
    const line = raw.trim();
    if (line.startsWith('#EXTINF')){
      const logo = (line.match(/tvg-logo="([^"]*)"/) || [, ''])[1];
      const group = (line.match(/group-title="([^"]*)"/) || [, ''])[1];
      const id = (line.match(/tvg-id="([^"]*)"/) || [, ''])[1];
      // tvg-country was dropped from iptv-org's m3u files — country gets
      // filled in later via fetchChannelCountries(), keyed off this id.
      const name = extinfName(line);
      current = {
        logo,
        group: group || 'General',
        id: id || '',
        country: '',
        name: name || 'Unknown channel'
      };
    } else if (line && !line.startsWith('#') && current){
      current.url = line;
      out.push(current);
      current = null;
    }
  }
  return out;
}

// Stashes a channel for instant paint on player.html, then navigates there.
// player.html still re-fetches the full playlist itself, so this is just a
// fast-path — direct/shared links to player.html work without it. Also
// stashes the current scroll position, one-shot, so the Back button can
// drop the user back where they were instead of the top of the page.
function openPlayer(channel, extraTags){
  try {
    sessionStorage.setItem('pitchside_pending_channel', JSON.stringify({ channel, extraTags: extraTags || [] }));
  } catch (e){ /* sessionStorage unavailable — player.html will just fetch fresh */ }
  try {
    sessionStorage.setItem('pitchside_scroll_y', String(window.scrollY));
    if (typeof Channels !== 'undefined' && Channels.getVisibleCount){
      sessionStorage.setItem('pitchside_visible_count', String(Channels.getVisibleCount()));
    }
  } catch (e){ /* ignore */ }
  const params = new URLSearchParams({ ch: channel.url });
  if (extraTags && extraTags.length) params.set('tag', extraTags.join(','));
  window.location.href = 'player.html?' + params.toString();
}

// Fetches CONFIG.PLAYLIST_SOURCES in order until one works
async function fetchPlaylist(){
  for (const url of CONFIG.PLAYLIST_SOURCES){
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const parsed = parseM3U(text);
      if (!parsed.length) throw new Error('Empty playlist');
      return parsed;
    } catch (err){
      // try next mirror
    }
  }
  return [];
}

// Generic "try each mirror URL until one returns valid JSON" fetcher —
// same fallback pattern as fetchPlaylist(), reused for the iptv-org API.
async function fetchJSON(urls){
  for (const url of urls){
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error('Empty response');
      return data;
    } catch (err){
      console.warn('[fetchJSON] mirror failed:', url, err.message || err);
    }
  }
  console.warn('[fetchJSON] all mirrors failed for:', urls);
  return [];
}

// Builds a tvg-id -> ISO-ish country code map from iptv-org's channels.json,
// used to backfill the `country` field parseM3U() can no longer set.
async function fetchChannelCountries(){
  const channels = await fetchJSON(CONFIG.CHANNELS_API_SOURCES);
  const map = new Map();
  for (const c of channels){
    if (c.id && c.country) map.set(c.id, c.country);
  }
  return map;
}

// Builds a country code -> { name, flag } map from iptv-org's countries.json,
// used to show a friendly label in the country dropdown instead of a raw code.
async function fetchCountryNames(){
  const countries = await fetchJSON(CONFIG.COUNTRIES_API_SOURCES);
  const map = new Map();
  for (const c of countries){
    if (c.code) map.set(c.code, { name: c.name || c.code, flag: c.flag || '' });
  }
  return map;
}

// Formats milliseconds remaining into "Dd HH:MM:SS" or "HH:MM:SS"
function formatCountdown(ms){
  if (ms <= 0) return 'LIVE';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
