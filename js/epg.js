const EPG = (function(){
  let guidesByChannelId = null;
  let loadingPromise = null;

  const confirmCache = new Map();

  async function loadGuides(){
    if (guidesByChannelId) return guidesByChannelId;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      const map = new Map();
      for (const url of CONFIG.GUIDES_API_SOURCES){
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          if (!Array.isArray(data) || !data.length) throw new Error('Empty guide index');
          for (const entry of data){
            if (!entry.channel || !Array.isArray(entry.sources) || !entry.sources.length) continue;
            const existing = map.get(entry.channel) || [];
            map.set(entry.channel, existing.concat(entry.sources));
          }
          guidesByChannelId = map;
          return map;
        } catch (err){

        }
      }
      guidesByChannelId = map;
      return map;
    })();

    return loadingPromise;
  }

  async function withTimeout(fn, ms){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fn(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  function significantToken(teamName){
    const cleaned = (teamName || '')
      .replace(/\(.*?\)/g, '')
      .replace(/\b(women|u-?\d{2})\b/gi, '')
      .trim();

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
    return longest.length >= 4 ? longest.toLowerCase() : null;
  }

  function parseXMLTVTime(str){
    if (!str) return null;
    const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, tz] = m;
    let ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    if (tz){
      const sign = tz[0] === '-' ? -1 : 1;
      const offH = +tz.slice(1, 3), offM = +tz.slice(3, 5);
      ms -= sign * (offH * 60 + offM) * 60000;
    }
    return new Date(ms);
  }

  function titleMatches(text, tokens){
    const lower = (text || '').toLowerCase();
    return tokens.every(t => lower.includes(t));
  }

  async function checkSource(source, tokens){
    try {
      const res = await withTimeout(
        (signal) => fetch(source.url, { cache: 'no-store', signal }),
        CONFIG.EPG_FETCH_TIMEOUT_MS
      );
      if (!res || !res.ok) return false;
      const now = new Date();

      if ((source.format || '').toUpperCase() === 'JSON'){
        const data = await res.json();
        const programmes = Array.isArray(data) ? data : (data.programmes || []);
        return programmes.some(p => {
          const start = new Date(p.start), stop = new Date(p.stop || p.end);
          if (isNaN(start) || isNaN(stop) || now < start || now > stop) return false;
          return titleMatches((p.title || '') + ' ' + (p.description || ''), tokens);
        });
      }

      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) return false;
      const programmes = [...doc.querySelectorAll('programme')];
      return programmes.some(p => {
        const start = parseXMLTVTime(p.getAttribute('start'));
        const stop = parseXMLTVTime(p.getAttribute('stop'));
        if (!start || !stop || now < start || now > stop) return false;
        const title = p.querySelector('title') ? p.querySelector('title').textContent : '';
        const desc = p.querySelector('desc') ? p.querySelector('desc').textContent : '';
        return titleMatches(title + ' ' + desc, tokens);
      });
    } catch (err){
      return false;
    }
  }

  async function confirm(channel, m){
    if (!channel || !channel.id) return false;
    const cacheKey = channel.url + '::' + m.id;
    if (confirmCache.has(cacheKey)) return confirmCache.get(cacheKey);

    const tokens = [significantToken(m.home && m.home.name), significantToken(m.away && m.away.name)].filter(Boolean);
    if (tokens.length < 2){ confirmCache.set(cacheKey, false); return false; }

    const guides = await loadGuides();
    const sources = guides.get(channel.id);
    if (!sources || !sources.length){ confirmCache.set(cacheKey, false); return false; }

    let result = false;
    for (const source of sources.slice(0, 2)){
      if (await checkSource(source, tokens)){ result = true; break; }
    }
    confirmCache.set(cacheKey, result);
    return result;
  }

  return { confirm };
})();
