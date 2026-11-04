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
| `tips.html` | Practical running tips + keyword-based route Q&A |
| `about.html` | Project background and data sources |

## Architecture

```
index.html  ─┐
routes.html ─┼─ nav.html / nav.js      shared navigation
map.html    ─┤  styles.css            all styling (design tokens in :root)
tips.html   ─┤  qa.js                 keyword search over knowledge.js
about.html  ─┘  knowledge.js          the Q&A knowledge base (markdown-ish text)
                feedback.js           mailto feedback form
```

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
| `tools/cleanup.py` | Asset cleanup |

## Local development

```powershell
# Any static server works; the site also runs from file://
python -m http.server 8000
```

Then open <http://localhost:8000/>.

> Note: `map.html` fetches `gpx/*.gpx` at runtime. Some browsers block `fetch` on
> `file://` URLs, so a local server is recommended when testing the map page.
