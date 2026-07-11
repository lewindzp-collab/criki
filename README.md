# Criki — Live Sports Feed

A small, free, ad-free page that pulls together publicly available football and cricket streams and lines them up against today's fixtures. Criki doesn't host, encode, or own any video — it's a directory that points at streams already published elsewhere and does its best to match them to the right match.

**[Live demo →]([https://your-deployment-url-here](https://criki.vercel.app/))**

---

## Features

- **Live fixtures** — football (Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League, World Cup, Copa América) and cricket, pulled from free public APIs
- **Match → channel matching** — a best-effort heuristic pairs each fixture with a likely IPTV channel using channel name, country, and league keywords (not a licensed broadcast schedule — see [Data Sources](#data-sources--honest-disclaimer))
- **Live channel directory** — search and filter by sport, country, and live/offline status, with background health-checking of stream links
- **Favorites** — star channels to keep them handy, stored locally in your browser only
- **EPG (program guide)** — best-effort program info pulled from iptv-org's guide index, where available
- **In-page player** — HLS playback via [hls.js](https://github.com/video-dev/hls.js), with automatic fallback handling for dead links
- **No accounts, no backend, no tracking** — a fully static site; the only "storage" is `localStorage`/`sessionStorage` in your own browser
- **Custom error pages** — themed 404 / 500 / 503 pages

## Tech Stack

Plain HTML, CSS, and JavaScript — no framework, no build step, no backend.

| Purpose | Source |
|---|---|
| Live TV channels | [iptv-org/iptv](https://github.com/iptv-org/iptv) (with jsDelivr / Statically CDN mirrors as fallbacks) |
| Channel metadata (country, etc.) | [iptv-org/api](https://github.com/iptv-org/api) |
| Football fixtures | [TheSportsDB](https://www.thesportsdb.com/) |
| Cricket fixtures | [CricAPI](https://cricapi.com/) |
| Video playback | [hls.js](https://github.com/video-dev/hls.js) |
| Fonts | Big Shoulders Display, Inter, JetBrains Mono (Google Fonts) |

## Project Structure

```
.
├── index.html          # Main feed — matches, channels, favorites
├── about.html           # About / how it works / credits
├── terms.html            # Terms of Use
├── privacy.html          # Privacy Policy
├── player.html            # Standalone player modal markup
├── 404.html               # Page not found
├── 500.html               # Generic error page
├── 503.html               # Maintenance / service unavailable
├── css/
│   └── style.css         # All styling (single stylesheet, CSS custom properties)
└── js/
    ├── app.js             # Bootstrapping, clock, tab switching, footer year
    ├── config.js          # Data source URLs, league list, channel-hint heuristics
    ├── matches.js         # Fixture fetching + rendering
    ├── channels.js        # Channel list fetching, filtering, health checks
    ├── epg.js              # Best-effort program guide lookups
    ├── favorites.js       # localStorage favorites
    ├── player.js           # HLS player logic + failure handling
    ├── ticker.js           # Header ticker feed
    ├── backtotop.js       # Back-to-top button
    └── devcredit.js       # Developer credit popup
```

## Getting Started

No build step required — it's static HTML/CSS/JS.

```bash
git clone https://github.com/saikotportal/criki.git
cd criki
```

Then serve it with any static file server, for example:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` in your browser.

> Some data sources may block requests from `file://` or unrecognized origins due to CORS — serving over `http://localhost` (rather than opening the HTML file directly) is recommended.

## Configuration

All data source URLs, league IDs, and the match→channel hint tables live in `js/config.js`. Notably:

- `PLAYLIST_SOURCES` / `CHANNELS_API_SOURCES` / `COUNTRIES_API_SOURCES` / `GUIDES_API_SOURCES` each list a primary source plus CDN mirrors, tried in order
- `LEAGUES` controls which football competitions appear on the Matches tab
- `LEAGUE_CHANNEL_HINTS` and `CRICKET_CHANNEL_HINTS` are hand-tuned heuristics for guessing which channel is likely to carry a given match — expect to tune these over time as sources change

The `TheSportsDB` and `CricAPI` keys currently checked in are low-traffic public/personal keys, exposed client-side (this is a static site with no server to hide them behind).

### Social share previews

Every page has Open Graph and Twitter Card meta tags (title, description, image, url) for link previews in messaging apps like WhatsApp and Telegram. They currently point at a placeholder domain — search each HTML file for `https://your-deployment-url-here` and replace it with your real deployed URL once you have one, or the preview image/link won't resolve.

## Data Sources & Honest Disclaimer

Criki links to third-party streams it doesn't control, host, or verify the licensing of. Match-to-channel pairing is a best-effort guess, not a licensed broadcast schedule, and won't always be right. It's built for personal, non-commercial use.

If you're a rights holder with a concern about a specific listed source, please open an issue or reach out via GitHub.

## License

This project's own code is available under the [MIT License](LICENSE). It does not include a license for any third-party stream, channel, or data source it links to — those remain the property of their respective owners.

## Credits

Built and maintained by **[Saikot Islam Abir](https://saikot.dev)** — a web developer working on dark-themed, cyberpunk-flavored projects.

- Website: [saikot.dev](https://saikot.dev)
- GitHub: [@saikotportal](https://github.com/saikotportal)
