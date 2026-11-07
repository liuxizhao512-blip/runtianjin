# Run Tianjin

A static running-route guide for Tianjin. No build step, no framework, no server — open
`index.html` in a browser and it works.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Landing page: what the guide is, why it exists, where to start |
| `routes.html` | Route listing, quick comparison table, weekly plan board |
| `map.html` | Interactive map, route recommendation engine, training dashboard |
| `detail.html` | Per-route detail page (`detail.html?route=haihe`) |
| `tips.html` | Practical running tips + route Q&A (BYOK AI, keyword fallback) |
| `about.html` | Project background and data sources |

## Accessibility and metadata

- Every page has a skip link, a single `<h1>`, and labelled landmarks.
- The current page is marked with `aria-current="page"` in the shared nav.
- `index.html` carries JSON-LD (`WebSite` + `ItemList` of the four routes) so search
  engines can read the route list without scraping.
- `map.html` carries Open Graph and Twitter card tags pointing at
  `run-tianjin-share-card.jpg`.
- Every page declares a `rel="canonical"` URL and an absolute `og:image`, so shared
  links resolve correctly from any host.
- `sitemap.xml` lists all nine indexable URLs (six pages plus the four route
  variants of `detail.html`); `robots.txt` points crawlers at it.

## Route Q&A (bring your own key)

`tips.html` has an "Ask the route guide" box. It runs in two modes:

1. **BYOK (bring your own key)** — the visitor opens the *AI answers* panel, picks a
   provider (Groq / OpenAI / Gemini), and pastes their own API key. The key is kept in
   `localStorage` under `runtianjin:ai` and sent **directly from the browser to the
   provider**. There is no backend, so the site works from `file://` and GitHub Pages
   with no server, no secrets in the repo, and no cost to the site owner.
2. **Keyword fallback** — with no key set (or if the provider call fails), `qa.js`
   matches the question against `knowledge.js` and answers from the site guide.

The AI is instructed to answer only from `knowledge.js`, so it will not invent routes
or distances. A rejected key, a rate limit, or a timeout all fall back to the local
guide with a short note explaining why.

`worker/ai-proxy.js` is an optional alternative: a Cloudflare Worker that holds one
shared key so visitors do not need their own. It is **not required** — see
`worker/README.md` if you want that model instead.

## Analytics

`analytics.js` loads [GoatCounter](https://www.goatcounter.com/) — cookieless, no
fingerprinting, so no consent banner is needed. The site code lives in one constant
at the top of the file:

```js
var GOATCOUNTER_CODE = '';   // e.g. 'runtianjin' for runtianjin.goatcounter.com
```

While it is empty nothing loads and no request is made. The loader also skips
`file://`, `localhost`, and private LAN addresses, so local previews never pollute
the stats.

## Architecture

```
index.html  ─┐
routes.html ─┼─ nav.html / nav.js      shared navigation (injected at runtime)

tips.html   ─┤  styles.css            critical styling (design tokens in :root)
about.html  ─┘  styles-extra.css      deferred: touch targets, content-visibility, print
                analytics.js          GoatCounter loader (no-op until a site code is set)
                qa.js                 route Q&A: BYOK AI, keyword fallback
                knowledge.js          the Q&A knowledge base (markdown-ish text)
                feedback.js           mailto feedback form
```

### Stylesheets

`styles.css` is loaded synchronously because it carries the design tokens and the
above-the-fold layout. `styles-extra.css` is loaded with `rel="preload"` +
`onload` swap so it never blocks first paint. It holds three things that are not
needed for the initial render:

- larger touch targets for `.match-chip` on coarse pointers
- `content-visibility: auto` on long lists (route cards, FAQ entries, landmark cards)
- the full `@media print` ruleset

### Images

Every raster image ships as a WebP pair (`-480.webp` / `-960.webp`) next to the
original JPEG/PNG. Markup uses `<picture>` with a `srcset`/`sizes` pair so the browser
picks the right width and format; the original file is the `<img>` fallback. Landmark
photos are CSS backgrounds, so `map-app.js` builds an `image-set()` value instead.

`map.html` holds the interactive logic in one inline `<script>`. It is organised in
labelled sections:

- **Route configs** — the four routes, their tags, distances, and GPX file paths
- **Mini maps** — four independent Leaflet instances, one per route card
- **Crowding** — time-of-day estimate (see *Data honesty* below)
- **Weather** — Open-Meteo forecast + air quality
- **Elevation** — real `<ele>` values parsed from the GPX tracks
- **Share card** — 1080脳1080 PNG rendered on a canvas
- **Analysis** — distance, difficulty, pace, suitability
- **Training** — target config, weekly plan, fatigue estimate
- **Recommendation** — additive tag scoring across the four routes

## Data honesty

This project deliberately avoids inventing numbers. Where a value cannot be measured,
the UI says so instead of showing a plausible-looking fake.

| Value | Source |
| --- | --- |
| Route distance | Haversine over real GPX coordinates |
| Elevation profile | Real `<ele>` tags in `gpx/*.gpx` |
| Temperature / wind / conditions | Open-Meteo forecast API |
| AQI | Open-Meteo air-quality API — **omitted entirely if the request fails** |
| Pace | The runner's own input, or real `<time>` stamps in an uploaded GPX |
| Route score | Computed from distance fit, climb per km, and turn density |
| Crowd level | **Estimated** from typical time-of-day patterns — labelled `(est.)` in the UI |

## Dependencies

- **Inter** — self-hosted in `vendor/fonts/` (latin subset, variable weight 100–900,
  ~48KB woff2). Loaded via `vendor/fonts/inter.css` with `font-display: swap`. CJK
  glyphs are intentionally not bundled and fall through to the system stack
  (`PingFang SC` / `Microsoft YaHei`).
- **Leaflet 1.9.4** — vendored locally in `vendor/leaflet/` so the map still loads when
  a CDN is blocked.
- **Map tiles** — three OSM mirrors tried in order; the map degrades to a plain canvas
  only when all three fail.
- **Open-Meteo** — the only runtime network dependency. The page works without it; the
  weather chips simply show "unavailable".

## Python tooling

`tools/` and the root-level `*.py` scripts generate static assets. They are not needed
to run the site.

| Script | Output |
| --- | --- |
| `gen_gpx.py` | Route GPX files (OSRM foot routing) |
| `make_about_map.py` | `tianjin-routes-map.png` |
| `make_share_card.py` | `run-tianjin-share-card.jpg` |
| `tools/make_icons.py` | Favicons and app icons |
| `tools/make_poster.py` | Social poster |
| `tools/resample_gpx.py` | GPX point thinning |
| `tools/fetch_landmarks.py` | Landmark photos |
| `tools/compress_images.py` | WebP variants (`-480.webp` / `-960.webp`) for every raster image |
| `tools/cleanup.py` | Asset cleanup |
| `tools/check_site.py` | Static self-check: links, assets, meta tags, structure |

## Local development

```powershell
# Any static server works; the site also runs from file://
python -m http.server 8000
```

Then open <http://localhost:8000/>.

> Note: `map.html` fetches `gpx/*.gpx` at runtime. Some browsers block `fetch` on
> `file://` URLs, so a local server is recommended when testing the map page.
