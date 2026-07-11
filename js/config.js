const CONFIG = {

  PLAYLIST_SOURCES: [
    'https://iptv-org.github.io/iptv/categories/sports.m3u',
    'https://cdn.jsdelivr.net/gh/iptv-org/iptv@gh-pages/categories/sports.m3u',
    'https://cdn.statically.io/gh/iptv-org/iptv/gh-pages/categories/sports.m3u'
  ],

  CHANNELS_API_SOURCES: [
    'https://iptv-org.github.io/api/channels.json',
    'https://cdn.jsdelivr.net/gh/iptv-org/api@master/channels.json',
    'https://cdn.statically.io/gh/iptv-org/api/master/channels.json'
  ],
  COUNTRIES_API_SOURCES: [
    'https://iptv-org.github.io/api/countries.json',
    'https://cdn.jsdelivr.net/gh/iptv-org/api@master/countries.json',
    'https://cdn.statically.io/gh/iptv-org/api/master/countries.json'
  ],

  GUIDES_API_SOURCES: [
    'https://iptv-org.github.io/api/guides.json',
    'https://cdn.jsdelivr.net/gh/iptv-org/api@master/guides.json',
    'https://cdn.statically.io/gh/iptv-org/api/master/guides.json'
  ],

  EPG_FETCH_TIMEOUT_MS: 4000,

  EPG_MAX_CANDIDATES_CHECKED: 2,

  SPORTSDB_BASE: 'https://www.thesportsdb.com/api/v1/json/123',

  LEAGUES: [
    { id: 4328, name: 'Premier League', sport: 'football' },
    { id: 4335, name: 'La Liga', sport: 'football' },
    { id: 4332, name: 'Serie A', sport: 'football' },
    { id: 4331, name: 'Bundesliga', sport: 'football' },
    { id: 4334, name: 'Ligue 1', sport: 'football' },
    { id: 4480, name: 'UEFA Champions League', sport: 'football' },
    { id: 4481, name: 'UEFA Europa League', sport: 'football' },
    { id: 4429, name: 'FIFA World Cup', sport: 'football' },
    { id: 4499, name: 'Copa America', sport: 'football' }
  ],

  CRICAPI_BASE: 'https://api.cricapi.com/v1',
  CRICAPI_KEY: '541e617a-7728-451a-920d-c1a688e59ef5',

  CRICKET_CHANNEL_HINTS: [
    { keywords: ['indian premier league', ' ipl'], countries: ['IN'], group: 'Sports', names: ['star sports', 'jio cinema'] },
    { keywords: ['big bash'], countries: ['AU'], group: 'Sports', names: ['fox cricket', 'channel 7'] },
    { keywords: ['t20 blast', 'county championship', 'the hundred'], countries: ['UK'], group: 'Sports', names: ['sky sports cricket'] },
    { keywords: ['pakistan super league', ' psl'], countries: ['PK'], group: 'Sports', names: ['ptv sports', 'a sports'] },
    { keywords: ['bangladesh premier league', ' bpl'], countries: ['BD'], group: 'Sports', names: ['gtv', 't sports'] },
    { keywords: ['ashes'], countries: ['UK', 'AU'], group: 'Sports', names: ['sky sports cricket', 'fox cricket'] },
    { keywords: ['world cup'], countries: ['UK', 'US'], group: 'Sports', names: ['star sports', 'sky sports cricket', 'willow'] }
  ],

  CRICKET_TEAM_COUNTRY: {
    'india': 'IN', 'australia': 'AU', 'england': 'UK', 'pakistan': 'PK',
    'south africa': 'ZA', 'new zealand': 'NZ', 'sri lanka': 'LK',
    'bangladesh': 'BD', 'afghanistan': 'AF', 'zimbabwe': 'ZW', 'ireland': 'IE'
  },

  // Team name -> ISO 3166-1 alpha-2 code (lowercase, flagcdn.com format) used
  // to render a crisp, flat flag instead of CricAPI's own low-res team badge
  // image. Covers ICC full members plus the associate nations most likely to
  // show up in qualifiers/ICC events. England/Scotland/Wales/Northern Ireland
  // use flagcdn's UK subdivision codes rather than the generic union flag.
  // Any team not listed here just falls back to CricAPI's own badge image.
  CRICKET_TEAM_FLAGS: {
    'india': 'in', 'australia': 'au', 'england': 'gb-eng', 'pakistan': 'pk',
    'south africa': 'za', 'new zealand': 'nz', 'sri lanka': 'lk',
    'bangladesh': 'bd', 'afghanistan': 'af', 'zimbabwe': 'zw', 'ireland': 'ie',
    'scotland': 'gb-sct', 'wales': 'gb-wls', 'northern ireland': 'gb-nir',

    'usa': 'us', 'united states': 'us', 'canada': 'ca', 'bermuda': 'bm',
    'cayman islands': 'ky', 'argentina': 'ar', 'belize': 'bz', 'panama': 'pa',
    'brazil': 'br', 'chile': 'cl', 'mexico': 'mx', 'peru': 'pe',
    'suriname': 'sr', 'bahamas': 'bs', 'costa rica': 'cr',

    'kenya': 'ke', 'namibia': 'na', 'uganda': 'ug', 'nigeria': 'ng',
    'tanzania': 'tz', 'botswana': 'bw', 'ghana': 'gh', 'sierra leone': 'sl',
    'rwanda': 'rw', 'malawi': 'mw', 'mozambique': 'mz', 'eswatini': 'sz',
    'lesotho': 'ls', 'gambia': 'gm', 'cameroon': 'cm', 'morocco': 'ma',
    'seychelles': 'sc',

    'uae': 'ae', 'united arab emirates': 'ae', 'nepal': 'np', 'oman': 'om',
    'hong kong': 'hk', 'malaysia': 'my', 'singapore': 'sg', 'kuwait': 'kw',
    'qatar': 'qa', 'saudi arabia': 'sa', 'bahrain': 'bh', 'bhutan': 'bt',
    'maldives': 'mv', 'thailand': 'th', 'myanmar': 'mm', 'cambodia': 'kh',
    'iran': 'ir',

    'papua new guinea': 'pg', 'vanuatu': 'vu', 'fiji': 'fj', 'samoa': 'ws',
    'cook islands': 'ck', 'japan': 'jp', 'indonesia': 'id',
    'philippines': 'ph', 'south korea': 'kr', 'china': 'cn',

    'netherlands': 'nl', 'germany': 'de', 'denmark': 'dk', 'norway': 'no',
    'italy': 'it', 'france': 'fr', 'spain': 'es', 'jersey': 'je',
    'guernsey': 'gg', 'gibraltar': 'gi', 'austria': 'at', 'belgium': 'be',
    'czech republic': 'cz', 'finland': 'fi', 'sweden': 'se', 'hungary': 'hu',
    'turkey': 'tr', 'bulgaria': 'bg', 'romania': 'ro', 'serbia': 'rs',
    'croatia': 'hr', 'greece': 'gr', 'israel': 'il', 'luxembourg': 'lu',
    'malta': 'mt', 'switzerland': 'ch', 'portugal': 'pt', 'estonia': 'ee',
    'isle of man': 'im'
  },

  LEAGUE_CHANNEL_HINTS: {

    4328: { countries: ['UK'], group: 'Sports', names: ['sky sports football', 'sky sports main event', 'nbc sports', 'premier league', 'sky sports'] },
    4335: { countries: ['ES'], group: 'Sports', names: ['movistar laliga', 'laliga tv', 'la liga', 'espn deportes'] },
    4332: { countries: ['IT'], group: 'Sports', names: ['dazn', 'sky sport italia', 'sky sport calcio'] },
    4331: { countries: ['DE'], group: 'Sports', names: ['sky sport bundesliga', 'sky sport', 'dazn'] },
    4334: { countries: ['FR'], group: 'Sports', names: ['canal+ sport', 'canal+ foot', 'bein sports france'] },
    4480: { countries: ['UK', 'ES', 'IT', 'DE'], group: 'Sports', names: ['bt sport', 'tnt sports', 'movistar champions', 'sky sport uefa'] },

    4429: { countries: ['US', 'UK'], group: 'Sports', names: ['fifa+', 'fox sports', 'itv sport'] },
    4481: { countries: ['UK', 'ES', 'IT', 'DE'], group: 'Sports', names: ['tnt sports', 'bt sport'] },

    4499: { countries: ['US', 'UK'], group: 'Sports', names: ['espn', 'directv sports'] }
  },

  LEAGUE_BADGES: {
    4328: { label: 'EPL', marquee: false },
    4335: { label: 'LALIGA', marquee: false },
    4332: { label: 'SERIE A', marquee: false },
    4331: { label: 'BUNDESLIGA', marquee: false },
    4334: { label: 'LIGUE 1', marquee: false },
    4480: { label: 'UCL', marquee: true },
    4481: { label: 'UEL', marquee: false },
    4429: { label: 'FIFA', marquee: true },
    4499: { label: 'COPA', marquee: true }
  },

  CRICKET_BADGES: [
    { keywords: ['indian premier league', ' ipl'], label: 'IPL', marquee: true },
    { keywords: ['big bash'], label: 'BBL', marquee: false },
    { keywords: ['t20 blast', 'county championship'], label: 'T20', marquee: false },
    { keywords: ['the hundred'], label: 'HUNDRED', marquee: false },
    { keywords: ['pakistan super league', ' psl'], label: 'PSL', marquee: false },
    { keywords: ['bangladesh premier league', ' bpl'], label: 'BPL', marquee: false },
    { keywords: ['ashes'], label: 'ASHES', marquee: true },
    { keywords: ['world cup'], label: 'ICC', marquee: true }
  ],

  FAV_KEY: 'pitchside_favorites_v1',

  CHANNELS_PAGE_SIZE: 24,
  CHANNELS_HEALTH_CONCURRENCY: 4,
  CHANNELS_HEALTH_TIMEOUT_MS: 8000
};
