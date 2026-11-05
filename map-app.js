// Interactive logic for map.html: Leaflet mini maps, weather, route
// analysis, training plans, and the share card. Depends on the globals
// declared in map-data.js.


      function renderSceneryMarkers(route, layer) {
        const spots = sceneryData[route.id];
        if (!spots || !spots.length) return;

        spots.forEach((spot, index) => {
          const marker = L.circleMarker([spot.lat, spot.lon], {
            radius: 4,
            color: '#ffffff',
            weight: 1.6,
            fillColor: '#d86b39',
            fillOpacity: 1,
            isScenery: true
          }).addTo(layer);

          const art = sceneryArt[spot.art] || sceneryArt.hill;
          marker.bindPopup(`
            <div class="scenery-popup">
              <div class="scenery-art">
                <svg viewBox="0 0 40 40" role="img" aria-label="${spot.name} illustration">${art}</svg>
              </div>
              <div class="scenery-body">
                <span class="scenery-kind">${spot.kind} ${index + 1}</span>
                <strong>${spot.name}</strong>
                ${spot.when ? `<span class="scenery-when">Best: ${spot.when}</span>` : ''}
                <p>${spot.note}</p>
                <button class="scenery-more" type="button" data-route="${route.id}" data-index="${index}">
                  Open photo card
                </button>
              </div>
            </div>
          `, { maxWidth: 260, className: 'scenery-popup-wrap' });

          marker.on('click', () => {
            highlightSceneryCard(route.id, index);
          });
        });
      }

      /* ---------- Landmark drawer ----------
         Clicking a landmark marker or chip slides a photo card in from the
         right. The drawer is a single shared element so only one card is ever
         open, and it is rebuilt from sceneryData on each open.
         The nodes live after this script tag, so they are looked up lazily. */
      let lastDrawerTrigger = null;

      /* Landmark photos are CSS backgrounds, so they cannot use <picture>.
         image-set() lets the browser pick the WebP variant and fall back to
         the original JPEG/PNG when WebP is unsupported. */
      function landmarkPhotoCss(spot) {
        const base = spot.photo;
        const stem = base.replace(/\.(jpe?g|png)$/i, '');
        const webp = `${stem}-960.webp`;
        const fallbackType = /\.png$/i.test(base) ? 'image/png' : 'image/jpeg';
        return `image-set(url('${webp}') type('image/webp'), url('${base}') type('${fallbackType}'))`;
      }

      function getDrawer() {
        return document.getElementById('landmark-drawer');
      }

      function getScrim() {
        return document.getElementById('landmark-scrim');
      }

      function openLandmarkDrawer(routeId, index, trigger) {
        const spots = sceneryData[routeId];
        const spot = spots && spots[index];
        const drawer = getDrawer();
        if (!spot || !drawer) return;

        lastDrawerTrigger = trigger || null;

        const facts = (spot.facts || [])
          .map(([label, value]) => `
            <div class="landmark-fact">
              <small>${label}</small>
              <strong>${value}</strong>
            </div>
          `)
          .join('');

        drawer.innerHTML = `
          <button class="landmark-close" type="button" aria-label="Close landmark card">&times;</button>
          <div class="landmark-photo" style="background-image: ${landmarkPhotoCss(spot)}; background-position: ${spot.photoPos || 'center'};">
            <span class="landmark-photo-tag">${spot.kind}</span>
          </div>
          <div class="landmark-content">
            <span class="landmark-eyebrow">${spot.when ? 'Best: ' + spot.when : 'Along the route'}</span>
            <h2>${spot.name}</h2>
            <p class="landmark-lede">${spot.note}</p>
            ${facts ? `<div class="landmark-facts">${facts}</div>` : ''}
            <p class="landmark-detail">${spot.detail || ''}</p>
            ${spot.runTip ? `
              <div class="landmark-tip">
                <span>Runner's note</span>
                <p>${spot.runTip}</p>
              </div>
            ` : ''}
          </div>
        `;

        drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        const scrim = getScrim();
        if (scrim) scrim.classList.add('is-open');

        const closeBtn = drawer.querySelector('.landmark-close');
        closeBtn.addEventListener('click', closeLandmarkDrawer);
        closeBtn.focus();
      }

      function closeLandmarkDrawer() {
        const drawer = getDrawer();
        if (!drawer) return;
        // Move focus out before hiding the drawer, otherwise the browser warns
        // about aria-hidden being applied to an ancestor of the focused node.
        const trigger = lastDrawerTrigger;
        lastDrawerTrigger = null;
        if (trigger && typeof trigger.focus === 'function') {
          trigger.focus();
        } else if (drawer.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        const scrim = getScrim();
        if (scrim) scrim.classList.remove('is-open');
      }

      document.addEventListener('click', (event) => {
        if (event.target.closest('#landmark-scrim')) {
          closeLandmarkDrawer();
          return;
        }
        const btn = event.target.closest('.scenery-more');
        if (btn) {
          openLandmarkDrawer(btn.dataset.route, Number(btn.dataset.index), btn);
        }
      });

      document.addEventListener('keydown', (event) => {
        const drawer = getDrawer();
        if (event.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
          closeLandmarkDrawer();
        }
      });

      function highlightSceneryCard(routeId, index) {
        const card = document.querySelector(`.mini-map-card[data-route-id="${routeId}"]`);
        if (!card) return;
        card.querySelectorAll('.scenery-chip').forEach((chip, i) => {
          chip.classList.toggle('is-active', i === index);
        });
      }

      function renderSceneryChips(route) {
        const card = document.querySelector(`.mini-map-card[data-route-id="${route.id}"]`);
        if (!card) return;
        const spots = sceneryData[route.id];
        const host = card.querySelector('.mini-map-scenery');
        if (!host) return;

        if (!spots || !spots.length) {
          host.innerHTML = '';
          return;
        }

        host.innerHTML = spots
          .map((spot, index) => `
            <button class="scenery-chip" type="button" data-index="${index}" title="${spot.when ? 'Best: ' + spot.when : spot.name}">
              <span class="scenery-chip-dot"></span>${spot.name}
              ${spot.when ? `<span class="scenery-chip-when">${spot.when}</span>` : ''}
            </button>
          `)
          .join('');

        host.querySelectorAll('.scenery-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            const index = Number(chip.dataset.index);
            const spot = spots[index];
            const map = miniMaps[route.id];
            if (!map || !spot) return;
            map.setView([spot.lat, spot.lon], Math.max(map.getZoom(), 15), { animate: true });
            highlightSceneryCard(route.id, index);
            openLandmarkDrawer(route.id, index, chip);
          });
        });
      }

      const savedPlansKey = 'run-tianjin-saved-plans';

      /* ---------- In-page toast (replaces native alert) ---------- */
      function showToast(message, tone) {
        const host = document.getElementById('toast-host');
        if (!host) return;
        const toast = document.createElement('div');
        toast.className = `toast${tone ? ` toast--${tone}` : ''}`;
        toast.textContent = message;
        host.appendChild(toast);
        // Force a frame so the entry transition runs.
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        window.setTimeout(() => {
          toast.classList.remove('is-visible');
          window.setTimeout(() => toast.remove(), 300);
        }, 3200);
      }

      /* ---------- Four independent mini maps ---------- */
      const miniMaps = {};
      const miniLayers = {};

      function createMiniMap(routeId) {
        const host = document.getElementById(`map-${routeId}`);
        if (!host) return null;

        const instance = L.map(host, {
          zoomControl: false,
          scrollWheelZoom: false,
          dragging: true,
          attributionControl: false,
          doubleClickZoom: false
        });

        // Tile sources are tried in order. tile.openstreetmap.de is the German
        // OSM mirror (reachable where tile.openstreetmap.org is blocked); the
        // others are fallbacks so a single dead host does not blank the map.
        const tileSources = [
          'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
          'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
          'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
        ];
        let tileSourceIndex = 0;

        const tiles = L.tileLayer(tileSources[tileSourceIndex], {
          maxZoom: 19,
          detectRetina: true,
          crossOrigin: true
        }).addTo(instance);

        // Offline / blocked network fallback: after repeated tile errors, swap
        // to the next mirror; only give up (plain canvas) when all are dead.
        let tileFailures = 0;
        let fallbackShown = false;
        tiles.on('tileerror', () => {
          tileFailures += 1;
          if (fallbackShown || tileFailures < 3) return;
          tileFailures = 0;
          if (tileSourceIndex < tileSources.length - 1) {
            tileSourceIndex += 1;
            tiles.setUrl(tileSources[tileSourceIndex]);
            return;
          }
          fallbackShown = true;
          host.classList.add('is-offline');
        });

        const layer = L.layerGroup().addTo(instance);
        miniMaps[routeId] = instance;
        miniLayers[routeId] = layer;
        return instance;
      }

      routeConfigs.forEach((route) => createMiniMap(route.id));

      function ensureCustomMiniMap(route) {
        const grid = document.getElementById('map-grid');
        if (!grid || document.getElementById(`map-${route.id}`)) return;

        const card = document.createElement('article');
        card.className = 'mini-map-card is-custom';
        card.dataset.routeId = route.id;
        card.innerHTML = `
          <div class="mini-map" id="map-${route.id}" aria-label="${route.name} route map"></div>
          <div class="mini-map-info">
            <div class="mini-map-head">
              <h3>${route.name}</h3>
              <span class="mini-map-badge">${route.distance.toFixed(1)} km</span>
            </div>
            <p class="mini-map-summary">${route.summary}</p>
            <div class="mini-map-stats">
              <div><small>Best time</small><strong>${route.bestTime}</strong></div>
              <div><small>Crowd</small><strong class="mini-crowd">—</strong></div>
              <div><small>Surface</small><strong>${route.surface}</strong></div>
            </div>
            <div class="mini-map-scenery" aria-label="Scenery along ${route.name}"></div>
          </div>
        `;
        grid.appendChild(card);
        createMiniMap(route.id);
      }

      let currentFilter = 'all';
      let recommendedRouteId = 'haihe';
      let uploadedRoute = null;
      let overlayAllRoutes = false;

      /* ---------- Innovation 1: time-of-day crowding ---------- */
      const heatHourInput = document.getElementById('heat-hour');
      const heatHourLabel = document.getElementById('heat-hour-label');
      const heatSummary = document.getElementById('heat-summary');

      function getCrowdLevel(hour, route) {
        const isPark = route.tags.includes('park');
        const isRiver = route.tags.includes('river');
        const isCoastal = route.id === 'coastal';

        let level = 2;
        if (hour >= 6 && hour < 8) level = isPark ? 4 : 3;
        else if (hour >= 8 && hour < 11) level = isPark ? 3 : 2;
        else if (hour >= 11 && hour < 16) level = 1;
        else if (hour >= 16 && hour < 18) level = isPark ? 3 : 2;
        else if (hour >= 18 && hour < 21) level = isRiver ? 5 : isPark ? 4 : 3;
        else if (hour >= 21 && hour < 23) level = isRiver ? 3 : 2;
        else level = 1;

        if (isCoastal) level = Math.max(1, level - 1);
        return Math.min(5, Math.max(1, level));
      }

      const crowdWords = ['Empty', 'Quiet', 'Moderate', 'Busy', 'Packed'];

      function describeHour(hour) {
        if (hour < 7) return 'Early morning';
        if (hour < 10) return 'Morning';
        if (hour < 12) return 'Late morning';
        if (hour < 16) return 'Midday';
        if (hour < 18) return 'Afternoon';
        if (hour < 21) return 'Evening peak';
        return 'Late evening';
      }

      function updateHeatOverlay() {
        const hour = Number(heatHourInput.value);
        if (heatHourLabel) heatHourLabel.textContent = `${String(hour).padStart(2, '0')}:00`;

        const routes = getAllRoutes();
        const selected = routes.find(route => route.id === recommendedRouteId) || routes[0];
        const level = getCrowdLevel(hour, selected);

        if (heatSummary) {
          const advice = level >= 4
            ? 'Expect company — go early or pick a quieter park loop.'
            : level === 3
              ? 'Comfortable but not empty. Keep left and watch crossings.'
              : 'Good window — paths should be open and easy to run.';
          heatSummary.textContent = `${describeHour(hour)} · ${selected.name} is ${crowdWords[level - 1].toLowerCase()} (est.). ${advice}`;
        }

        // Update each mini map card's crowd label and line opacity.
        routes.forEach((route) => {
          const routeLevel = getCrowdLevel(hour, route);
          const card = document.querySelector(`.mini-map-card[data-route-id="${route.id}"]`);
          if (card) {
            const crowdEl = card.querySelector('.mini-crowd');
            if (crowdEl) {
              crowdEl.textContent = `${crowdWords[routeLevel - 1]} (est.)`;
              crowdEl.dataset.level = String(routeLevel);
            }
          }

          const layer = miniLayers[route.id];
          if (!layer) return;
          const opacity = routeLevel >= 4 ? 1 : routeLevel === 3 ? 0.85 : 0.68;
          layer.eachLayer((item) => {
            if (item instanceof L.Polyline) item.setStyle({ opacity });
          });
        });
      }

      /* ---------- Innovation 2: weather + air quality ---------- */
      const weatherHost = document.getElementById('map-weather');

      function renderWeather(data) {
        if (!weatherHost) return;
        if (!data) {
          weatherHost.innerHTML = '<span class="weather-loading">Live conditions unavailable — check your local forecast before heading out.</span>';
          return;
        }

        // AQI is optional: only shown when the air-quality endpoint actually answered.
        const hasAqi = Number.isFinite(data.aqi);
        const aqiWarn = hasAqi && data.aqi > 100;
        const heatWarn = data.temp >= 30;
        const coldWarn = data.temp <= 0;
        const advice = aqiWarn
          ? 'Air quality is poor — keep the run short and easy, or move indoors.'
          : heatWarn
            ? 'Hot conditions — run early or late, carry water, and slow the pace.'
            : coldWarn
              ? 'Cold air — extend the warm-up and cover hands and ears.'
              : 'Conditions look good for an outdoor run.';

        weatherHost.innerHTML = `
          <span class="weather-chip">${data.temp}°C · ${data.desc}</span>
          ${hasAqi ? `<span class="weather-chip ${aqiWarn ? 'is-warn' : ''}">AQI ${data.aqi}</span>` : ''}
          <span class="weather-chip">Wind ${data.wind} km/h</span>
          <p class="weather-advice">${advice}</p>
        `;
      }

      async function loadWeather() {
        const codeMap = {
          0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
          45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
          61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Snow',
          80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm'
        };

        // Weather and air quality are two independent Open-Meteo endpoints.
        // Air quality is best-effort: if it fails we simply omit the AQI chip
        // instead of inventing a number.
        const weatherRequest = fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=39.13&longitude=117.20&current=temperature_2m,wind_speed_10m,weather_code&timezone=Asia%2FShanghai',
          { cache: 'no-store' }
        ).then((response) => {
          if (!response.ok) throw new Error('weather request failed');
          return response.json();
        });

        const airRequest = fetch(
          'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=39.13&longitude=117.20&current=european_aqi,us_aqi&timezone=Asia%2FShanghai',
          { cache: 'no-store' }
        ).then((response) => {
          if (!response.ok) throw new Error('air quality request failed');
          return response.json();
        }).catch(() => null);

        try {
          const [payload, airPayload] = await Promise.all([weatherRequest, airRequest]);
          const current = payload.current || {};
          const airCurrent = (airPayload && airPayload.current) || {};
          const aqiValue = Number.isFinite(airCurrent.us_aqi)
            ? airCurrent.us_aqi
            : Number.isFinite(airCurrent.european_aqi)
              ? airCurrent.european_aqi
              : null;

          renderWeather({
            temp: Math.round(current.temperature_2m ?? 0),
            wind: Math.round(current.wind_speed_10m ?? 0),
            desc: codeMap[current.weather_code] || 'Mixed',
            aqi: aqiValue === null ? null : Math.round(aqiValue)
          });
        } catch (error) {
          renderWeather(null);
        }
      }

      /* ---------- Innovation 3: elevation profile (real GPX <ele> data) ---------- */
      function renderRouteProfile(route) {
        const host = document.getElementById('route-profile');
        if (!host) return;

        const coords = route.coords || [];
        if (coords.length < 3) {
          host.innerHTML = '<span class="route-profile-caption">Profile loads with route geometry</span>';
          return;
        }

        // Real elevation comes from the <ele> tags in the GPX track. Tianjin is
        // flat (roughly 1–9 m), so the vertical scale is exaggerated for
        // readability — the caption states the true min/max in metres.
        const elevations = (route.elevations || []).filter(value => Number.isFinite(value));
        if (elevations.length < 3) {
          host.innerHTML = '<span class="route-profile-caption">No elevation data in this track</span>';
          return;
        }

        const samples = 40;
        const step = Math.max(1, Math.floor(elevations.length / samples));
        const points = [];
        for (let i = 0; i < elevations.length; i += step) {
          points.push(elevations[i]);
        }
        if (points.length < 2) return;

        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = Math.max(0.5, max - min);
        const width = 100;
        const height = 32;
        const path = points
          .map((value, index) => {
            const x = (index / (points.length - 1)) * width;
            const y = height - ((value - min) / range) * (height - 4) - 2;
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ');

        const gain = points.reduce((total, value, index) => {
          if (index === 0) return total;
          const delta = value - points[index - 1];
          return delta > 0 ? total + delta : total;
        }, 0);

        host.innerHTML = `
          <span class="route-profile-caption">Elevation · ${min.toFixed(1)}–${max.toFixed(1)} m · +${gain.toFixed(1)} m gain</span>
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img"
               aria-label="Elevation profile from ${min.toFixed(1)} to ${max.toFixed(1)} metres, ${gain.toFixed(1)} metres of climb">
            <path d="${path} L${width},${height} L0,${height} Z" fill="rgba(45,118,215,0.14)" stroke="none"></path>
            <path d="${path}" fill="none" stroke="#2d76d7" stroke-width="1.4" stroke-linejoin="round"></path>
          </svg>
        `;
      }

      /* ---------- Innovation 4: navigate to start ---------- */
      function navigateToStart() {
        const routes = getAllRoutes();
        const route = routes.find(item => item.id === recommendedRouteId) || routes[0];
        const start = route.coords && route.coords[0];
        if (!start) {
          showToast('Route geometry is still loading. Try again in a moment.', 'warn');
          return;
        }
        const [lat, lon] = start;
        const url = `https://uri.amap.com/marker?position=${lon},${lat}&name=${encodeURIComponent(route.name)}&src=run-tianjin&coordinate=gaode&callnative=1`;
        window.open(url, '_blank', 'noopener');
      }

      /* ---------- Innovation 5: run history overlay ---------- */
      function renderHistoryOverlay() {
        const history = getTrainingHistory();
        const routes = getAllRoutes();

        routes.forEach((route) => {
          const layer = miniLayers[route.id];
          if (!layer) return;
          layer.eachLayer((item) => {
            if (item.options && item.options.isHistory) layer.removeLayer(item);
          });
        });

        if (!history.length) return;

        history.slice(0, 6).forEach((record) => {
          const route = routes.find(item => item.name === record.route);
          if (!route || !route.coords || !route.coords.length) return;
          const layer = miniLayers[route.id];
          if (!layer) return;

          L.circleMarker(route.coords[0], {
            radius: 5 + Math.min(6, Number(record.distance || 0) / 2),
            color: '#d86b39',
            fillColor: '#d86b39',
            fillOpacity: 0.35,
            weight: 1.5,
            dashArray: '3 3',
            isHistory: true
          })
            .bindPopup(`<div class="route-popup"><strong>${record.route}</strong><p>${record.distance} km · ${record.status}</p><small>${record.savedAt}</small></div>`)
            .addTo(layer);
        });
      }

      /* ---------- Innovation 6: share card ---------- */
      const shareModal = document.getElementById('share-modal');
      const sharePreview = document.getElementById('share-card-preview');
      const shareStatus = document.getElementById('share-status');

      function buildShareCard() {
        const routes = getAllRoutes();
        const route = routes.find(item => item.id === recommendedRouteId) || routes[0];
        const analysis = route.analysis || buildRouteAnalysis(route);
        const hour = Number(heatHourInput?.value || 19);
        const level = getCrowdLevel(hour, route);

        return {
          route,
          html: `
            <div class="share-card">
              <div class="share-card-top">
                <span class="share-card-brand">Run Tianjin</span>
                <span class="share-card-hour">${String(hour).padStart(2, '0')}:00</span>
              </div>
              <h3>${route.name}</h3>
              <p>${route.summary}</p>
              <div class="share-card-stats">
                <div><small>Distance</small><strong>${analysis.distance.toFixed(1)} km</strong></div>
                <div><small>Best time</small><strong>${analysis.bestTime}</strong></div>
                <div><small>Crowd</small><strong>${crowdWords[level - 1]}</strong></div>
              </div>
              <div class="share-card-foot">
                <span>${route.surface}</span>
                <span>${analysis.difficulty}</span>
              </div>
            </div>
          `,
          text: `${route.name} — ${analysis.distance.toFixed(1)} km, ${analysis.bestTime}, ${crowdWords[level - 1].toLowerCase()} at ${String(hour).padStart(2, '0')}:00. ${route.summary}`
        };
      }

      function openShareCard() {
        if (!shareModal) return;
        const card = buildShareCard();
        sharePreview.innerHTML = card.html;
        shareModal.hidden = false;
        if (shareStatus) shareStatus.textContent = '';
      }

      function closeShareCard() {
        if (shareModal) shareModal.hidden = true;
      }

      async function copyShareSummary() {
        const card = buildShareCard();
        try {
          await navigator.clipboard.writeText(card.text);
          if (shareStatus) shareStatus.textContent = 'Summary copied to clipboard.';
        } catch {
          if (shareStatus) shareStatus.textContent = 'Copy failed — select the text manually.';
        }
      }

      /* Same stack as --font-sans in styles.css, so the exported PNG matches
         the page instead of falling back to a bare Arial. */
      const SHARE_FONT = '"Segoe UI", "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif';

      function downloadShareCard() {
        const card = buildShareCard();
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f5f2ee';
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(60, 60, 960, 960);

        ctx.fillStyle = '#d86b39';
        ctx.font = "bold 30px ${SHARE_FONT}";
        ctx.fillText('RUN TIANJIN', 120, 170);

        ctx.fillStyle = '#1f2429';
        ctx.font = "bold 64px ${SHARE_FONT}";
        ctx.fillText(card.route.name.slice(0, 22), 120, 280);

        ctx.fillStyle = '#5d6570';
        ctx.font = "30px ${SHARE_FONT}";
        const words = card.route.summary.split(' ');
        let line = '';
        let y = 350;
        words.forEach((word) => {
          const test = `${line}${word} `;
          if (ctx.measureText(test).width > 800) {
            ctx.fillText(line, 120, y);
            line = `${word} `;
            y += 44;
          } else {
            line = test;
          }
        });
        ctx.fillText(line, 120, y);

        ctx.fillStyle = '#102b52';
        ctx.font = "bold 46px ${SHARE_FONT}";
        ctx.fillText(`${card.route.analysis.distance.toFixed(1)} km`, 120, 620);
        ctx.fillText(card.route.analysis.bestTime, 120, 700);

        ctx.fillStyle = '#5d6570';
        ctx.font = "26px ${SHARE_FONT}";
        ctx.fillText(`${card.route.surface} · ${card.route.analysis.difficulty}`, 120, 780);

        ctx.fillStyle = '#d86b39';
        ctx.fillRect(120, 860, 840, 6);

        const link = document.createElement('a');
        link.download = `${card.route.id}-run-tianjin.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        if (shareStatus) shareStatus.textContent = 'Image downloaded.';
      }

      /* ---------- Innovation 7: overlay all routes ---------- */
      function applyOverlayMode() {
        // With four dedicated mini maps, "overlay" simply re-renders every card
        // so each map always shows its own route at full detail.
        renderRoutes(currentFilter, recommendedRouteId);
        updateHeatOverlay();
      }

      function formatPaceFromSeconds(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
      }

      // Pace is only reported when it can be derived from real data:
      //   1. the GPX track carries <time> stamps (actual recorded run), or
      //   2. the runner typed their own pace in the pace input.
      // Otherwise we return null and the UI shows "—" instead of a guess.
      function getRunnerPaceSeconds() {
        const input = document.getElementById('runner-pace');
        if (!input) return null;
        const raw = String(input.value || '').trim();
        const match = raw.match(/^(\d{1,2})\s*[:：]\s*(\d{1,2})$/);
        if (!match) return null;
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) return null;
        const total = minutes * 60 + seconds;
        return total > 0 ? total : null;
      }

      function getAveragePaceFromCoords(coords, route) {
        const runnerPace = getRunnerPaceSeconds();
        if (runnerPace) return `${formatPaceFromSeconds(runnerPace)} / km`;

        const gpxStats = route.rawGpxText ? getGpxStats(route.rawGpxText) : null;
        const distance = route.distance || calculateRouteDistance(coords || []);
        if (gpxStats && gpxStats.durationMinutes && distance > 0) {
          const paceSeconds = Math.round((gpxStats.durationMinutes * 60) / distance);
          return `${formatPaceFromSeconds(paceSeconds)} / km`;
        }

        return null;
      }

      // Route score is derived from measurable properties of the track instead
      // of a fixed number: distance fit, elevation gain, and how many sharp
      // turns the path contains. Every input is computed from the GPX itself.
      function computeRouteScore(route) {
        const distance = Number(route.distance || 0);
        const elevations = (route.elevations || []).filter(value => Number.isFinite(value));
        const coords = route.coords || [];

        // Distance component: 3–8 km is the sweet spot for a city running guide.
        let distanceScore = 0;
        if (distance >= 3 && distance <= 8) distanceScore = 40;
        else if (distance > 8 && distance <= 12) distanceScore = 32;
        else if (distance > 12) distanceScore = 22;
        else if (distance >= 1.5) distanceScore = 26;
        else distanceScore = 12;

        // Climb component: flat is easier, so a flat route scores higher.
        let gain = 0;
        for (let i = 1; i < elevations.length; i += 1) {
          const delta = elevations[i] - elevations[i - 1];
          if (delta > 0) gain += delta;
        }
        const gainPerKm = distance > 0 ? gain / distance : 0;
        let climbScore = 30;
        if (gainPerKm > 20) climbScore = 10;
        else if (gainPerKm > 10) climbScore = 18;
        else if (gainPerKm > 5) climbScore = 24;

        // Continuity component: fewer sharp turns means a smoother run.
        let sharpTurns = 0;
        for (let i = 1; i < coords.length - 1; i += 1) {
          const [aLat, aLon] = coords[i - 1];
          const [bLat, bLon] = coords[i];
          const [cLat, cLon] = coords[i + 1];
          const bearing1 = Math.atan2(bLon - aLon, bLat - aLat);
          const bearing2 = Math.atan2(cLon - bLon, cLat - bLat);
          let diff = Math.abs(bearing2 - bearing1);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (diff > Math.PI / 2) sharpTurns += 1;
        }
        const turnDensity = coords.length > 1 ? sharpTurns / coords.length : 0;
        let flowScore = 30;
        if (turnDensity > 0.25) flowScore = 12;
        else if (turnDensity > 0.15) flowScore = 20;
        else if (turnDensity > 0.08) flowScore = 26;

        return Math.max(0, Math.min(100, Math.round(distanceScore + climbScore + flowScore)));
      }

      function getGpxStats(gpxText) {
        const pointMatches = [...gpxText.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g)];
        const timestamps = pointMatches
          .map(match => {
            const body = match[3] || '';
            const timeMatch = body.match(/<time>([^<]+)<\/time>/i);
            return timeMatch ? new Date(timeMatch[1]).getTime() : null;
          })
          .filter(value => Number.isFinite(value));

        const durationMinutes = timestamps.length >= 2
          ? ((timestamps[timestamps.length - 1] - timestamps[0]) / 60000)
          : null;

        const coords = pointMatches.map(match => [Number(match[1]), Number(match[2])]);

        return { coords, durationMinutes };
      }

      function getRouteSegments(route, distance) {
        if (!route.coords || route.coords.length < 2) {
          return [
            { title: 'Start', detail: 'Warm up calmly and settle into a relaxed rhythm.' },
            { title: 'Middle', detail: 'Hold an even effort and stay smooth through the core section.' },
            { title: 'Finish', detail: 'Finish with a controlled push, not a hard sprint.' }
          ];
        }

        const startLabel = distance >= 7 ? 'Start: 0–35%' : 'Start: 0–30%';
        const midLabel = distance >= 7 ? 'Middle: 35–70%' : 'Middle: 30–65%';
        const finishLabel = distance >= 7 ? 'Finish: 70–100%' : 'Finish: 65–100%';

        return [
          { title: startLabel, detail: 'Take the first section easy and build rhythm without forcing speed.' },
          { title: midLabel, detail: 'Settle into a smoother, controlled effort and keep form stable.' },
          { title: finishLabel, detail: 'Finish strong but controlled; use the final section to sharpen focus.' }
        ];
      }

      function getSuitability(route) {
        const distance = Number(route.distance || 0);
        const tags = route.tags || [];
        const weekLong = distance >= 7 || tags.includes('distance');
        const beginner = distance <= 5 && (tags.includes('beginner') || route.nearCenter || tags.includes('park'));
        const nightRun = tags.includes('night') || (distance <= 8 && route.nearCenter && route.bestTime === 'dusk');

        return {
          beginner,
          weekendLongRun: weekLong,
          nightRun,
          beginnerText: beginner ? 'Yes — suitable for beginners' : 'Better for steady runners',
          weekendText: weekLong ? 'Yes — a good weekend long run' : 'Better as a shorter weekday session',
          nightText: nightRun ? 'Yes — night-friendly route' : 'Avoid late-night use if you prefer lighted streets'
        };
      }

      function buildRouteAnalysis(route) {
        const distance = Number(route.distance || calculateRouteDistance(route.coords || []));
        const safeDistance = Number.isFinite(distance) ? distance : 0;

        let difficulty = 'Easy';
        if (safeDistance >= 8) {
          difficulty = 'Moderate';
        } else if (safeDistance >= 5) {
          difficulty = 'Easy-medium';
        }

        // Pace is never invented. It comes from the runner's own input or from
        // real <time> stamps inside an uploaded GPX track; otherwise it is null
        // and the UI renders "—".
        const averagePace = getAveragePaceFromCoords(route.coords || [], route);
        const paceRange = averagePace || '—';

        const audience = safeDistance >= 8
          ? 'Intermediate and endurance runners'
          : safeDistance >= 4
            ? 'Steady runners and active beginners'
            : 'Beginner and recovery runners';

        const bestTime = safeDistance >= 8
          ? 'Early morning or weekend'
          : route.bestTime === 'dusk'
            ? 'Dusk run'
            : route.bestTime === 'morning'
              ? 'Morning run'
              : 'Flexible';

        const riskText = safeDistance >= 8
          ? 'Moderate risk: watch heat, hydration, and fatigue near the final 2 km.'
          : safeDistance >= 4
            ? 'Low-medium risk: pay attention to traffic crossing points and heat.'
            : 'Low risk: good for short runs, but still check traffic and lighting.';

        const suitability = getSuitability(route);
        route.analysis = {
          distance: safeDistance,
          paceRange,
          averagePace,
          difficulty,
          audience,
          bestTime,
          riskText,
          segments: getRouteSegments(route, safeDistance),
          suitability
        };

        route.distance = safeDistance;
        route.difficulty = route.difficulty || difficulty;
        route.audience = route.audience || audience;
        route.risk = route.risk || riskText;

        return route.analysis;
      }

      function formatRouteDetail(route) {
        const analysis = route.analysis || buildRouteAnalysis(route);
        const routeTags = [
          analysis.bestTime || route.bestTime === 'dusk' ? 'Dusk friendly' : route.bestTime === 'morning' ? 'Morning fit' : 'Weekend rhythm',
          route.distance >= 6 ? 'Distance ready' : 'Short loop',
          route.nearCenter ? 'City access' : 'Open space'
        ];

        const card = document.getElementById('active-route-card');
        if (!card) return;

        // Sections live inside this card, so they must be rendered here:
        // replacing innerHTML would otherwise delete the #route-breakdown host.
        const sections = route.sections || [
          { label: 'Main section', distance: `${analysis.distance.toFixed(1)} km`, note: 'Core running area' }
        ];
        const breakdownHtml = sections
          .map((section) => `
            <div class="breakdown-item">
              <strong>${section.label}</strong>
              <span>${section.distance}</span>
              <small>${section.note}</small>
            </div>
          `)
          .join('');

        const detailText = `
          <h3>${route.name}</h3>
          <div class="detail-metrics">
            <span>${analysis.distance.toFixed(1)} km</span>
            <span>${route.nearCenter ? 'City center' : 'Outer city'}</span>
          </div>
          <p>${route.summary}</p>
          <div class="detail-status-row">
            <span>Heat: ${route.heat}</span>
            <span>Score: ${route.score}</span>
          </div>
          <ul class="detail-tags">
            ${routeTags.map(tag => `<li>${tag}</li>`).join('')}
          </ul>
          <div class="route-analysis-box">
            <div class="analysis-row">
              <span>Pace</span>
              <strong>${analysis.paceRange}</strong>
            </div>
            <div class="analysis-row">
              <span>Best time</span>
              <strong>${analysis.bestTime}</strong>
            </div>
            <div class="analysis-row">
              <span>Difficulty</span>
              <strong id="route-difficulty">${analysis.difficulty || route.difficulty || 'Easy'}</strong>
            </div>
            <div class="analysis-row">
              <span>Suitable for</span>
              <strong id="route-audience">${analysis.audience || route.audience || 'General runners'}</strong>
            </div>
            <div class="analysis-row analysis-row--wide">
              <span>Risk</span>
              <strong id="route-risk">${analysis.riskText || route.risk || 'Low'}</strong>
            </div>
          </div>
          <div id="route-breakdown" class="route-breakdown">${breakdownHtml}</div>
        `;

        card.innerHTML = detailText;
      }

      function parseGpxTrack(gpxText) {
        const matches = [...gpxText.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"\s*\/?>/g)];
        return matches.map((match) => [Number(match[1]), Number(match[2])]);
      }

      // Elevation is parsed separately so the coordinate array keeps its
      // [lat, lon] shape used by Leaflet and the distance calculation.
      function parseGpxElevations(gpxText) {
        const matches = [...gpxText.matchAll(/<trkpt\b[^>]*>([\s\S]*?)<\/trkpt>/g)];
        return matches
          .map((match) => {
            const eleMatch = (match[1] || '').match(/<ele>\s*([-\d.]+)\s*<\/ele>/i);
            return eleMatch ? Number(eleMatch[1]) : null;
          })
          .filter((value) => Number.isFinite(value));
      }

      function getAllRoutes() {
        return uploadedRoute ? [...routeConfigs, uploadedRoute] : routeConfigs;
      }

      function calculateRouteDistance(coords) {
        if (coords.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < coords.length; i += 1) {
          const prev = coords[i - 1];
          const curr = coords[i];
          const earthRadiusKm = 6371;
          const dLat = ((curr[0] - prev[0]) * Math.PI) / 180;
          const dLon = ((curr[1] - prev[1]) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((prev[0] * Math.PI) / 180) * Math.cos((curr[0] * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          total += earthRadiusKm * c;
        }
        return Number(total.toFixed(1));
      }

      async function loadRouteGeometry() {
        for (const route of routeConfigs) {
          try {
            const response = await fetch(route.gpxFile, { cache: 'no-store' });
            const text = await response.text();
            route.coords = parseGpxTrack(text);
            route.elevations = parseGpxElevations(text);
            if (!route.coords.length) {
              route.coords = [[39.115, 117.29]];
            }
          } catch (error) {
            route.coords = [[39.115, 117.29]];
            route.elevations = [];
          }

          buildRouteAnalysis(route);
        }

        renderRoutes();
        updateRecommendation();
        renderHistoryOverlay();
        updateHeatOverlay();
      }

      function renderRouteBreakdown(route) {
        const breakdownRoot = document.getElementById('route-breakdown');
        if (!breakdownRoot) return;

        const analysis = route.analysis || buildRouteAnalysis(route);
        const sections = route.sections || [
          { label: 'Main section', distance: `${analysis.distance.toFixed(1)} km`, note: 'Core running area' }
        ];

        breakdownRoot.innerHTML = sections
          .map((section) => `
            <div class="breakdown-item">
              <strong>${section.label}</strong>
              <span>${section.distance}</span>
              <small>${section.note}</small>
            </div>
          `)
          .join('');

        document.getElementById('route-difficulty').textContent = analysis.difficulty || route.difficulty || 'Easy';
        document.getElementById('route-audience').textContent = analysis.audience || route.audience || 'General runners';
        document.getElementById('route-risk').textContent = analysis.riskText || route.risk || 'Low';
      }

      function getSavedPlans() {
        try {
          return JSON.parse(localStorage.getItem(savedPlansKey)) || [];
        } catch {
          return [];
        }
      }

      function getTrainingHistory() {
        try {
          return JSON.parse(localStorage.getItem('run-tianjin-training-history')) || [];
        } catch {
          return [];
        }
      }

      function buildSmartRecommendation(history) {
        const recent = history.slice(0, 4);
        const avgDistance = recent.length
          ? recent.reduce((total, record) => total + Number(record.distance || 0), 0) / recent.length
          : 0;

        const mixed = avgDistance >= 4 && avgDistance <= 10;
        const race = avgDistance >= 7 || recent.some(record => (record.goal || '').includes('Race'));
        const fatLoss = avgDistance >= 3 && avgDistance <= 8 && recent.some(record => (record.goal || '').includes('Fat loss'));

        return {
          mixed: {
            label: 'Mixed run',
            ok: mixed,
            detail: mixed ? 'Suitable for balanced endurance and rhythm work, giving a more even training load.' : 'Current volume is too one-dimensional; add a wider mix of intensities.'
          },
          race: {
            label: 'Race prep',
            ok: race,
            detail: race ? 'Your current load is a good match for race pacing and finishing strength work.' : 'You are not yet in a race-prep phase; build endurance first.'
          },
          fatLoss: {
            label: 'Fat loss',
            ok: fatLoss,
            detail: fatLoss ? 'This suits calorie-burning work while keeping effort smooth enough to avoid unnecessary fatigue.' : 'The current structure leans more toward intensity; add more low-intensity aerobic work.'
          }
        };
      }

      function renderHistoryDashboard() {
        const host = document.getElementById('history-dashboard');
        if (!host) return;

        const history = getTrainingHistory();
        if (!history.length) {
          host.innerHTML = `
            <div class="history-stats">
              <div class="history-stat"><small>Sessions</small><strong>0</strong></div>
              <div class="history-stat"><small>Avg km</small><strong>0.0</strong></div>
              <div class="history-stat"><small>Longest</small><strong>0.0 km</strong></div>
              <div class="history-stat"><small>Goal</small><strong>—</strong></div>
            </div>
            <div class="history-list"><div class="history-item"><strong>No records yet</strong><span>Save your next run to activate personal stats.</span></div></div>
          `;
          return;
        }

        const totalDistance = history.reduce((sum, record) => sum + Number(record.distance || 0), 0);
        const avgDistance = history.length ? (totalDistance / history.length).toFixed(1) : '0.0';
        const longestRun = Math.max(...history.map(record => Number(record.distance || 0))).toFixed(1);
        const mostRecent = history[0];
        const recentRuns = history.slice(0, 4);
        const maxTrendValue = Math.max(...recentRuns.map(record => Number(record.distance || 0)), 8);
        const smartSummary = buildSmartRecommendation(history);

        host.innerHTML = `
          <div class="history-stats">
            <div class="history-stat"><small>Sessions</small><strong>${history.length}</strong></div>
            <div class="history-stat"><small>Avg km</small><strong>${avgDistance} km</strong></div>
            <div class="history-stat"><small>Longest</small><strong>${longestRun} km</strong></div>
            <div class="history-stat"><small>Last goal</small><strong>${mostRecent.goal || 'General'}</strong></div>
          </div>

          <div class="trend-card">
            <div class="trend-header">
              <strong>Recent 4 runs</strong>
              <span>Distance trend</span>
            </div>
            <div class="trend-chart">
              ${recentRuns.map((record) => `
                <div class="trend-bar-wrap">
                  <div class="trend-bar" style="height: ${(Number(record.distance || 0) / maxTrendValue) * 100}%"></div>
                  <small>${Number(record.distance || 0).toFixed(0)}km</small>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="smart-summary-card">
            <div class="smart-summary-header">
              <strong>Training fit</strong>
              <span>AI summary</span>
            </div>
            <div class="smart-ops">
              ${Object.values(smartSummary).map((item) => `
                <div class="smart-item ${item.ok ? 'is-good' : 'is-warn'}">
                  <strong>${item.label}</strong>
                  <span>${item.detail}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="history-list">
            ${recentRuns.map((record) => `
              <div class="history-item">
                <strong>${record.route}</strong>
                <span>${record.distance} km · ${record.status}</span>
                <small>${record.savedAt} · ${record.goal || 'General'}</small>
              </div>
            `).join('')}
          </div>
        `;
      }

      function savePlan() {
        const selected = routeConfigs.find(route => route.id === recommendedRouteId) || routeConfigs[0];
        const plans = getSavedPlans();
        const history = getTrainingHistory();
        const target = document.getElementById('training-target')?.value || 'fatloss';
        const note = document.getElementById('plan-notes').value.trim() || 'Keep a steady pace';
        const savedDistance = Number(document.getElementById('plan-distance').value) || selected.distance;
        const savedAt = new Date().toLocaleDateString();
        const record = {
          id: Date.now(),
          route: selected.name,
          status: document.getElementById('plan-status').value,
          distance: savedDistance,
          note,
          goal: getTrainingTargetConfig(target).label,
          savedAt
        };

        plans.unshift(record);
        history.unshift(record);
        localStorage.setItem(savedPlansKey, JSON.stringify(plans.slice(0, 5)));
        localStorage.setItem('run-tianjin-training-history', JSON.stringify(history.slice(0, 10)));
        renderSavedPlans();
        renderHistoryDashboard();
      }

      function renderSavedPlans() {
        const list = document.getElementById('saved-plans');
        if (!list) return;

        const plans = getSavedPlans();
        if (!plans.length) {
          list.innerHTML = '<li class="empty-plan">No saved plans yet.</li>';
          return;
        }

        list.innerHTML = plans
          .map((plan) => `
            <li class="saved-plan-item">
              <strong>${plan.route}</strong>
              <span>${plan.status} · ${plan.distance} km</span>
              <small>${plan.note}</small>
            </li>
          `)
          .join('');
      }

      function getTrainingTargetConfig(target = 'fatloss') {
        const configs = {
          fatloss: {
            label: 'Fat loss',
            workoutType: 'Fat-loss aerobic run',
            focus: 'Keep the effort controlled and stay consistent enough to accumulate mileage without burnout.',
            targetPace: 'Easy to moderate pace',
            weeklyGoal: 'Build weekly consistency and keep your effort sustainable.',
            paceOffset: 1.12,
            hr: ['60-68%', '65-72%', '68-75%']
          },
          speed: {
            label: 'Speed',
            workoutType: 'Speed-focused session',
            focus: 'Drive turnover and increase rhythm while preserving relaxed form through the middle.',
            targetPace: 'Tempo to threshold pace',
            weeklyGoal: 'Shorter repetitions, quicker turnover, and stronger final acceleration.',
            paceOffset: 0.92,
            hr: ['70-76%', '75-82%', '82-88%']
          },
          race: {
            label: 'Race prep',
            workoutType: 'Race-prep long run',
            focus: 'Hold pacing discipline and finish strong without drifting into uncontrolled fatigue.',
            targetPace: 'Race rhythm pace',
            weeklyGoal: 'Build confidence for long blocks, strong finishes, and controlled pace management.',
            paceOffset: 0.88,
            hr: ['72-78%', '78-84%', '82-88%']
          },
          recovery: {
            label: 'Recovery / easy',
            workoutType: 'Recovery rhythm run',
            focus: 'Prioritize form, low effort, and easy recovery to lower stress and improve consistency.',
            targetPace: 'Recovery pace',
            weeklyGoal: 'Keep movement high while leaving enough energy for the next training block.',
            paceOffset: 1.2,
            hr: ['55-64%', '60-68%', '62-70%']
          }
        };

        return configs[target] || configs.fatloss;
      }

      function generateTrainingSuggestion(route) {
        const analysis = route.analysis || buildRouteAnalysis(route);
        const distance = analysis.distance || route.distance || 0;
        const level = document.getElementById('runner-level')?.value || 'steady';
        const target = document.getElementById('training-target')?.value || 'fatloss';
        const paceBand = getPaceBand(route, level, target);
        const audience = analysis.audience || 'General runners';
        const timeWindow = analysis.bestTime || route.bestTime || 'Flexible';
        const suitability = analysis.suitability || getSuitability(route);
        const goalConfig = getTrainingTargetConfig(target);

        let workoutType = goalConfig.workoutType;
        let focus = goalConfig.focus;
        let targetPace = goalConfig.targetPace;
        let watch = 'Keep the effort smooth and do not chase pace in the first third.';

        if (distance >= 8) {
          workoutType = goalConfig.label === 'Race prep' ? 'Race-prep endurance block' : goalConfig.label === 'Speed' ? 'Long speed endurance block' : 'Long aerobic block';
          focus = goalConfig.focus;
          targetPace = goalConfig.targetPace;
          watch = 'Hydrate early and protect form through the final 2 km.';
        } else if (distance >= 5) {
          workoutType = goalConfig.label === 'Speed' ? 'Threshold rhythm block' : 'Steady aerobic block';
          focus = goalConfig.focus;
          targetPace = goalConfig.targetPace;
          watch = 'Keep the effort honest and resist the temptation to surge early.';
        }

        const suggestion = {
          workoutType,
          focus,
          targetPace,
          pace: paceBand.label,
          paceIdeal: paceBand.idealLabel,
          audience,
          timeWindow,
          watch,
          suitability,
          goalConfig,
          segments: analysis.segments || getRouteSegments(route, distance),
          summary: `${workoutType} for ${distance.toFixed(1)} km with a target pace around ${paceBand.idealLabel} based on your route.`
        };

        route.trainingSuggestion = suggestion;
        return suggestion;
      }

      function renderTrainingSuggestion(route) {
        const card = document.getElementById('training-suggestion-card');
        if (!card) return;

        const target = document.getElementById('training-target')?.value || 'fatloss';
        const suggestion = generateTrainingSuggestion(route);
        const dashboardTarget = getTrainingTargetConfig(target).label;
        card.innerHTML = `
          <div class="suggestion-header">
            <span class="goal-badge">Goal · ${dashboardTarget}</span>
            <span class="suggestion-pill">${suggestion.workoutType}</span>
            <strong>${route.name}</strong>
          </div>
          <p class="suggestion-summary">${suggestion.summary}</p>
          <div class="suggestion-grid">
            <div>
              <small>Pace band</small>
              <strong>${suggestion.pace}</strong>
            </div>
            <div>
              <small>Target pace</small>
              <strong>${suggestion.paceIdeal}</strong>
            </div>
            <div>
              <small>Ideal time</small>
              <strong>${suggestion.timeWindow}</strong>
            </div>
            <div>
              <small>Runner fit</small>
              <strong>${suggestion.audience}</strong>
            </div>
          </div>
          <div class="segment-card">
            ${suggestion.segments.map((segment) => `
              <div class="segment-row">
                <strong>${segment.title}</strong>
                <span>${segment.detail}</span>
              </div>
            `).join('')}
          </div>
          <div class="suitability-card">
            <div><strong>Beginner</strong><span>${suggestion.suitability.beginnerText}</span></div>
            <div><strong>Weekend long run</strong><span>${suggestion.suitability.weekendText}</span></div>
            <div><strong>Night run</strong><span>${suggestion.suitability.nightText}</span></div>
          </div>
          <div class="suggestion-note">
            <strong>Watch for:</strong>
            <span>${suggestion.watch}</span>
          </div>
        `;
      }

      function getPaceBand(route, level = 'steady', target = 'fatloss') {
        const distance = Number(route.distance || 0) || 5;
        const basePace = level === 'advanced' ? 4.5 : level === 'beginner' ? 6.2 : 5.3;
        const factor = {
          fatloss: 1.18,
          speed: 0.9,
          race: 0.84,
          recovery: 1.28
        }[target] || 1;

        const minPace = (basePace * factor) * 0.96;
        const maxPace = (basePace * factor) * 1.12;
        const targetPace = distance >= 8 ? minPace * 1.04 : minPace;

        return {
          min: Number(minPace.toFixed(1)),
          ideal: Number(targetPace.toFixed(1)),
          max: Number(maxPace.toFixed(1)),
          label: `${Number(minPace.toFixed(1))}–${Number(maxPace.toFixed(1))} min/km`,
          idealLabel: `${Number(targetPace.toFixed(1))} min/km`
        };
      }

      function getLevelPlan(level) {
        const baseLevel = level || 'steady';
        const settings = {
          beginner: {
            label: 'Beginner plan',
            summary: 'Start controlled, build rhythm, and finish relaxed without pushing the final kilometers.',
            paceMultiplier: 1.2,
            effort: ['Easy', 'Easy-moderate', 'Steady'],
            hr: ['60-68%', '65-72%', '68-75%'],
            feel: ['RPE 2-3', 'RPE 3-4', 'RPE 4-5'],
            priority: 'Consistency and confidence',
            focus: 'Keep the effort sustainable and avoid an aggressive first push.'
          },
          steady: {
            label: 'Steady runner plan',
            summary: 'Use a smooth aerobic base and keep your effort stable through the middle section.',
            paceMultiplier: 1,
            effort: ['Smooth', 'Comfortable', 'Strong but controlled'],
            hr: ['65-72%', '70-78%', '75-82%'],
            feel: ['RPE 3', 'RPE 4', 'RPE 5-6'],
            priority: 'Build aerobic durability',
            focus: 'Hold rhythm over the middle, then finish with a controlled lift.'
          },
          advanced: {
            label: 'Advanced plan',
            summary: 'Hold a precise rhythm and push the final section with a strong but sustainable finish.',
            paceMultiplier: 0.82,
            effort: ['Controlled', 'Strong', 'Fast finish'],
            hr: ['70-76%', '78-85%', '82-90%'],
            feel: ['RPE 4', 'RPE 6', 'RPE 7-8'],
            priority: 'Efficiency and late-race strength',
            focus: 'Balance early control with an efficient final surge.'
          }
        };

        return settings[baseLevel] || settings.steady;
      }

      function estimateFatigue(route) {
        const distance = Number(route.distance || 0);
        const intensity = route.tags && route.tags.includes('distance') ? 18 : 10;
        const terrainPenalty = route.nearCenter ? 6 : 12;
        const total = distance * 4 + intensity + terrainPenalty;

        if (total >= 60) {
          return { label: 'High fatigue risk', detail: 'This route is demanding enough to need careful pacing and a smoother end.' };
        }
        if (total >= 35) {
          return { label: 'Moderate fatigue risk', detail: 'A steady rhythm will keep you fresh and reduce late-session fatigue.' };
        }
        return { label: 'Low fatigue risk', detail: 'This route is suitable for a relaxed effort and easier pacing.' };
      }

      function generateTrainingPlan(route) {
        const level = document.getElementById('runner-level')?.value || 'steady';
        const target = document.getElementById('training-target')?.value || 'fatloss';
        const config = getLevelPlan(level);
        const goalConfig = getTrainingTargetConfig(target);
        const paceBand = getPaceBand(route, level, target);
        const distance = Number(route.distance || 0) || 5;
        const fatigue = estimateFatigue(route);

        const blockOne = Number((distance * 0.3).toFixed(1));
        const blockTwo = Number((distance * 0.4).toFixed(1));
        const blockThree = Number((distance - blockOne - blockTwo).toFixed(1));

        const paceBase = level === 'advanced' ? 4.6 : level === 'beginner' ? 6.1 : 5.2;
        const targetOffset = goalConfig.paceOffset || 1;
        const paceStart = (paceBase * config.paceMultiplier * targetOffset) * 1.08;
        const paceMid = (paceBase * 0.94) * config.paceMultiplier * targetOffset;
        const paceFinish = (paceBase * 0.88) * config.paceMultiplier * targetOffset * 0.97;

        const segments = [
          {
            label: 'Start steady',
            distance: `${blockOne} km`,
            pace: `${paceStart.toFixed(1)} min/km`,
            hr: goalConfig.hr[0],
            feel: config.feel[0],
            note: goalConfig.label === 'Speed'
              ? 'Settle your cadence first, then open rhythm and stride smoothly before the pace gets sharper.'
              : goalConfig.label === 'Race prep'
                ? 'Keep the first section controlled and avoid letting the finish begin too early.'
                : goalConfig.label === 'Recovery / easy'
                  ? 'Use an easy cadence to keep fatigue low and preserve recovery capacity for later.'
                  : 'Use a relaxed cadence and smooth breathing to warm up the body and settle into rhythm.'
          },
          {
            label: 'Middle rhythm',
            distance: `${blockTwo} km`,
            pace: `${paceMid.toFixed(1)} min/km`,
            hr: goalConfig.hr[1],
            feel: config.feel[1],
            note: goalConfig.label === 'Speed'
              ? 'Keep turnover high while staying grounded with a smooth, efficient stride and breathing pattern.'
              : goalConfig.label === 'Race prep'
                ? 'Hold a stable rhythm with a focus on efficiency and continuity rather than early acceleration.'
                : goalConfig.label === 'Recovery / easy'
                  ? 'Stay comfortable in the middle and monitor whether the body can remain relaxed under low pressure.'
                  : 'Keep the middle steady and avoid letting the first block run too hard.'
          },
          {
            label: 'Finish push',
            distance: `${blockThree} km`,
            pace: `${paceFinish.toFixed(1)} min/km`,
            hr: goalConfig.hr[2],
            feel: config.feel[2],
            note: goalConfig.label === 'Speed'
              ? 'Use the final section to sharpen rhythm and efficiency without forcing a chaotic sprint.'
              : goalConfig.label === 'Race prep'
                ? 'The last block should feel strong and controlled, with power at the finish rather than a sudden surge.'
                : goalConfig.label === 'Recovery / easy'
                  ? 'Stay relaxed through the final section and do not force speed; recovery is the key goal.'
                  : 'Increase effort in the final section, but keep the middle as the foundation for a strong finish.'
          }
        ];

        const weekly = [
          { day: 'Mon', type: 'Recovery', km: Math.max(3, Math.round(distance * 0.4)), goal: goalConfig.label === 'Speed' ? 'Recover actively and reduce accumulated fatigue.' : 'Easy recovery and stable breathing.' },
          { day: 'Tue', type: goalConfig.label === 'Speed' ? 'Speed work' : 'Aerobic', km: goalConfig.label === 'Speed' ? Math.max(4, Math.round(distance * 0.7)) : Math.max(4, Math.round(distance * 0.8)), goal: goalConfig.label === 'Speed' ? 'Improve cadence and power transfer.' : 'Control rhythm and build aerobic base.' },
          { day: 'Wed', type: goalConfig.label === 'Race prep' ? 'Race rhythm' : goalConfig.label === 'Fat loss' ? 'Tempo' : 'Tempo / threshold', km: Math.max(5, Math.round(distance * 0.9)), goal: goalConfig.label === 'Race prep' ? 'Keep a stable rhythm and finish with control.' : 'Keep the middle strong and the stride even.' },
          { day: 'Thu', type: 'Rest', km: 0, goal: 'Recovery and mobility to reduce fatigue buildup.' },
          { day: 'Fri', type: goalConfig.label === 'Fat loss' ? 'Easy build' : goalConfig.label === 'Race prep' ? 'Long aerobic' : 'Tempo', km: Math.max(6, Math.round(distance * 1.1)), goal: goalConfig.label === 'Fat loss' ? 'Stay relaxed and build aerobic continuity.' : goalConfig.label === 'Race prep' ? 'Hold a strong long distance rhythm and improve endurance tolerance.' : 'Stay smooth in pace and turnover.' },
          { day: 'Sat', type: 'Main route', km: distance, goal: `Follow the rhythm of ${route.name} for your main training block.` },
          { day: 'Sun', type: 'Recovery walk', km: 2, goal: 'Low-intensity recovery to help the body reset.' }
        ];

        return {
          level: config.label,
          summary: `${config.summary} ${goalConfig.weeklyGoal}`,
          priority: goalConfig.label,
          focus: goalConfig.focus,
          fatigue,
          segments,
          weekly,
          goal: goalConfig.label === 'Speed'
            ? 'Goal: improve cadence efficiency while keeping a steady middle section and a strong final third.'
            : goalConfig.label === 'Race prep'
              ? 'Goal: maintain a stable rhythm, improve endurance, and finish the last section with control.'
              : goalConfig.label === 'Recovery / easy'
                ? 'Goal: lower intensity, rebuild recovery, and make the next block more sustainable.'
                : 'Goal: improve sustained running capacity while preserving rhythm and stability.'
        };
      }

      function renderTrainingPlan(route) {
        const container = document.getElementById('training-plan-card');
        if (!container) return;

        const plan = generateTrainingPlan(route);
        const targetLabel = document.getElementById('training-target')?.value || 'fatloss';
        const targetInfo = getTrainingTargetConfig(targetLabel).label;

        container.innerHTML = `
          <div class="plan-header">
            <span class="goal-badge">Goal · ${targetInfo}</span>
            <span class="plan-badge">${plan.level}</span>
            <strong>${route.name}</strong>
          </div>
          <div class="plan-meta">
            <div>
              <small>Priority</small>
              <strong>${plan.priority}</strong>
            </div>
            <div>
              <small>Fatigue</small>
              <strong>${plan.fatigue.label}</strong>
            </div>
            <div>
              <small>Pace band</small>
              <strong>${getPaceBand(route, document.getElementById('runner-level')?.value || 'steady', document.getElementById('training-target')?.value || 'fatloss').label}</strong>
            </div>
            <div>
              <small>Goal</small>
              <strong>${document.getElementById('training-target')?.value === 'race' ? 'Race prep' : document.getElementById('training-target')?.value === 'speed' ? 'Speed' : document.getElementById('training-target')?.value === 'recovery' ? 'Recovery' : 'Fat loss'}</strong>
            </div>
          </div>
          <p class="plan-summary">${plan.summary}</p>
          <p class="plan-goal">${plan.goal}</p>
          <div class="plan-focus">
            <strong>Focus</strong>
            <span>${plan.focus}</span>
          </div>
          <div class="plan-segments">
            ${plan.segments.map((segment) => `
              <div class="plan-segment">
                <div class="plan-segment-header">
                  <strong>${segment.label}</strong>
                  <span>${segment.distance}</span>
                </div>
                <div class="plan-mini-grid">
                  <div><small>Pace</small><strong>${segment.pace}</strong></div>
                  <div><small>Heart rate</small><strong>${segment.hr}</strong></div>
                  <div><small>Feeling</small><strong>${segment.feel}</strong></div>
                </div>
                <p>${segment.note}</p>
              </div>
            `).join('')}
          </div>
          <div class="weekly-plan-compact">
            ${plan.weekly.map((day) => `
              <div class="weekly-mini-item">
                <strong>${day.day}</strong>
                <span>${day.type}</span>
                <small>${day.km ? `${day.km} km` : 'Rest'}</small>
              </div>
            `).join('')}
          </div>
        `;
      }

      function generateWeeklyPlan(route) {
        const baseDistance = route.distance || 5;
        const focus = route.tags.includes('distance') ? 'Endurance' : 'Smooth rhythm';
        const days = [
          { day: 'Mon', title: 'Recovery run', metric: `${Math.max(3, Math.round(baseDistance * 0.5))} km`, detail: 'Easy effort, forget pace.' },
          { day: 'Tue', title: 'Stride work', metric: `${Math.max(4, Math.round(baseDistance * 0.7))} km`, detail: 'Controlled rhythm with light acceleration.' },
          { day: 'Wed', title: 'Tempo session', metric: `${Math.max(5, Math.round(baseDistance * 0.85))} km`, detail: 'Steady middle effort and smooth breathing.' },
          { day: 'Thu', title: 'Rest + mobility', metric: '30-40 min', detail: 'Recovery, stretching, and easy activation.' },
          { day: 'Fri', title: 'Easy aerobic run', metric: `${Math.max(6, Math.round(baseDistance * 1.1))} km`, detail: 'Keep it relaxed and keep the route easy.' },
          { day: 'Sat', title: `${focus} route`, metric: `${baseDistance} km`, detail: `Use ${route.name} for your long, comfortable block.` },
          { day: 'Sun', title: 'Recovery walk', metric: '20-30 min', detail: 'Light movement and mobility before next week.' }
        ];

        return days;
      }

      function renderWeeklyPlan(route) {
        const container = document.getElementById('weekly-plan');
        if (!container) return;

        const plan = generateWeeklyPlan(route);
        container.innerHTML = plan
          .map((day) => `
            <div class="weekly-day">
              <strong>${day.day} · ${day.title}</strong>
              <span>${day.metric}</span>
              <small>${day.detail}</small>
            </div>
          `)
          .join('');
      }

      function renderComparisonTable(routeId = recommendedRouteId) {
        const tableBody = document.getElementById('route-comparison-body');
        if (!tableBody) return;

        const routes = getAllRoutes();
        tableBody.innerHTML = routes
          .map((route) => {
            const analysis = route.analysis || buildRouteAnalysis(route);
            const km = route.distance || Math.round(calculateRouteDistance(route.coords || []));
            return `
            <tr class="${route.id === routeId ? 'is-selected' : ''}" data-route-id="${route.id}">
              <td>${route.name}</td>
              <td>${km} km</td>
              <td>${route.bestTime || 'Flexible'}</td>
              <td>${route.surface || '—'}</td>
              <td>${route.lighting || '—'}</td>
              <td>${route.difficulty || 'Easy'}</td>
              <td>${route.score ?? '—'}</td>
            </tr>
          `;
          })
          .join('');

        // Clicking a row selects that route, matching the card behaviour.
        tableBody.querySelectorAll('tr[data-route-id]').forEach((row) => {
          row.addEventListener('click', () => {
            const route = getAllRoutes().find(item => item.id === row.dataset.routeId);
            if (route && route.id !== recommendedRouteId) updateSelectedRoute(route);
          });
        });
      }

      function getRecommendation() {
        const level = document.getElementById('runner-level').value;
        const time = document.getElementById('runner-time').value;
        const goal = document.getElementById('runner-goal').value;
        const duration = document.getElementById('runner-distance').value;

        return routeConfigs
          .map((route) => {
            let score = 0;
            const reasons = [];

            if (goal === 'night' && route.tags.includes('night')) {
              score += 5;
              reasons.push('night-friendly');
            }
            if (goal === 'distance' && route.tags.includes('distance')) {
              score += 5;
              reasons.push('good for long runs');
            }
            if (goal === 'park' && route.tags.includes('park')) {
              score += 5;
              reasons.push('calm park feel');
            }
            if (goal === 'easy' && route.tags.includes('beginner')) {
              score += 4;
              reasons.push('easy pace');
            }
            if (goal === 'river' && route.tags.includes('river')) {
              score += 4;
              reasons.push('river route');
            }

            if (level === 'beginner' && route.tags.includes('beginner')) {
              score += 5;
              reasons.push('beginner friendly');
            }
            if (level === 'advanced' && route.tags.includes('distance')) {
              score += 5;
              reasons.push('higher endurance');
            }
            if (level === 'steady' && route.distance >= 5 && route.distance <= 8) {
              score += 3;
              reasons.push('comfortable steady pace');
            }

            if (time === 'dusk' && route.bestTime === 'dusk') {
              score += 4;
              reasons.push('best at dusk');
            }
            if (time === 'morning' && route.bestTime === 'morning') {
              score += 4;
              reasons.push('best in morning');
            }
            if (time === 'weekend' && route.bestTime === 'weekend') {
              score += 4;
              reasons.push('weekend rhythm');
            }

            if (duration === 'short' && route.distance <= 5) {
              score += 4;
              reasons.push('short session fit');
            }
            if (duration === 'medium' && route.distance >= 3 && route.distance <= 8) {
              score += 4;
              reasons.push('mid-length fit');
            }
            if (duration === 'long' && route.distance >= 5) {
              score += 5;
              reasons.push('longer session fit');
            }

            if (route.nearCenter) {
              score += 2;
            }

            return { route, score, reasons };
          })
          .sort((a, b) => b.score - a.score);
      }

      function updateInsight(route) {
        const analysis = route.analysis || buildRouteAnalysis(route);
        document.getElementById('insight-name').textContent = route.name;
        document.getElementById('insight-terrain').textContent = route.terrain || 'Balanced route';
        document.getElementById('insight-surface').textContent = route.surface || 'Paved';
        document.getElementById('insight-lighting').textContent = analysis.bestTime || route.lighting || 'Flexible';
        document.getElementById('insight-difficulty').textContent = analysis.difficulty || route.difficulty || 'Easy';
      }

      function updateDashboardSummary(routeName) {
        const target = document.getElementById('training-target')?.value || 'fatloss';
        const targetLabel = getTrainingTargetConfig(target).label;
        const summary = document.getElementById('dashboard-target-label');
        const routeLabel = document.getElementById('dashboard-route-label');
        if (summary) summary.textContent = targetLabel;
        if (routeLabel) routeLabel.textContent = routeName || 'Selected route';
      }

      function updateSelectedRoute(route) {
        recommendedRouteId = route.id;
        updateInsight(route);
        updateDashboardSummary(route.name);
        // formatRouteDetail rebuilds the card (including #route-breakdown),
        // so it must run before renderRouteBreakdown fills that host.
        formatRouteDetail(route);
        renderRouteBreakdown(route);
        renderTrainingSuggestion(route);
        renderTrainingPlan(route);
        renderComparisonTable(route.id);
        renderWeeklyPlan(route);
        renderRouteProfile(route);
        renderRoutes(currentFilter, route.id);
        updateHeatOverlay();
      }

      function updateRecommendation() {
        const ranked = getRecommendation();
        const featured = ranked[0];
        const route = featured.route;

        document.getElementById('result-name').textContent = route.name;
        document.getElementById('result-summary').textContent = route.summary;

        const tagList = document.getElementById('result-tags');
        tagList.innerHTML = '';
        featured.reasons.slice(0, 3).forEach((reason) => {
          const item = document.createElement('li');
          item.textContent = reason;
          tagList.appendChild(item);
        });

        renderMatchRanking(ranked);
        updateSelectedRoute(route);
      }

      /* ---------- Run match: ranked shortlist ---------- */
      function renderMatchRanking(ranked) {
        const host = document.getElementById('match-ranking');
        if (!host) return;

        const top = ranked[0] ? ranked[0].score : 0;
        const maxScore = Math.max(top, 1);

        host.innerHTML = ranked
          .map((entry, index) => {
            const route = entry.route;
            const pct = Math.round((entry.score / maxScore) * 100);
            const isTop = index === 0;
            const reason = entry.reasons.length
              ? entry.reasons.slice(0, 2).join(' · ')
              : 'no strong signal yet — try another chip';
            return `
              <li class="match-rank-item ${isTop ? 'is-top' : ''}" data-route-id="${route.id}">
                <span class="match-rank-index">${String(index + 1).padStart(2, '0')}</span>
                <div class="match-rank-body">
                  <div class="match-rank-head">
                    <strong>${route.name}</strong>
                    <span class="match-rank-score">${entry.score}</span>
                  </div>
                  <div class="match-rank-bar"><span style="width:${pct}%"></span></div>
                  <small>${reason}</small>
                </div>
              </li>
            `;
          })
          .join('');

        host.querySelectorAll('.match-rank-item').forEach((item) => {
          item.addEventListener('click', () => {
            const route = getAllRoutes().find(entry => entry.id === item.dataset.routeId);
            if (route) updateSelectedRoute(route);
          });
        });

        const note = document.getElementById('match-board-note');
        if (note) {
          const gap = ranked.length > 1 ? ranked[0].score - ranked[1].score : 0;
          note.textContent = gap >= 4
            ? `Clear winner · ${gap} points ahead`
            : gap > 0
              ? `Close call · ${gap} point${gap === 1 ? '' : 's'} ahead`
              : 'Tie — pick either route';
        }
      }

      /* ---------- Run match: chip picker drives the hidden selects ---------- */
      function initMatchChips() {
        document.querySelectorAll('.match-chip-set').forEach((set) => {
          const fieldId = set.dataset.field;
          const select = document.getElementById(fieldId);
          if (!select) return;

          set.querySelectorAll('.match-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
              set.querySelectorAll('.match-chip').forEach((item) => {
                const active = item === chip;
                item.classList.toggle('is-active', active);
                item.setAttribute('aria-pressed', String(active));
              });
              select.value = chip.dataset.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
            });
          });
        });
      }

      initMatchChips();

      function renderRoutes(filter = 'all', selectedId = recommendedRouteId) {
        currentFilter = filter;

        const routes = getAllRoutes();
        const visibleRoutes = filter === 'all'
          ? routes
          : routes.filter(route => route.tags && route.tags.includes(filter));
        const visibleIds = new Set(visibleRoutes.map(route => route.id));

        routes.forEach((route) => {
          const layer = miniLayers[route.id];
          const instance = miniMaps[route.id];
          const card = document.querySelector(`.mini-map-card[data-route-id="${route.id}"]`);
          if (!layer || !instance) return;

          layer.clearLayers();

          const isVisible = visibleIds.has(route.id);
          if (card) card.classList.toggle('is-filtered-out', !isVisible);
          if (!isVisible || !route.coords || !route.coords.length) return;

          const isSelected = route.id === selectedId;
          if (card) card.classList.toggle('is-selected', isSelected);

          // Thin casing + slim core keeps the line readable on a 190px-tall map
          // without hiding the streets underneath.
          L.polyline(route.coords, {
            color: '#ffffff',
            weight: isSelected ? 5 : 4,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layer);

          const polyline = L.polyline(route.coords, {
            color: route.color,
            weight: isSelected ? 2.6 : 2.2,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layer);

          const startMarker = L.circleMarker(route.coords[0], {
            radius: isSelected ? 5 : 4,
            color: '#ffffff',
            fillColor: route.color,
            fillOpacity: 1,
            weight: 2
          }).addTo(layer);

          renderSceneryMarkers(route, layer);

          const popupHtml = `
            <div class="route-popup">
              <strong>${route.name}</strong>
              <p>${route.summary}</p>
              <small>${route.distance} km · ${route.bestTime}</small>
            </div>
          `;

          polyline.bindPopup(popupHtml);
          startMarker.bindPopup(popupHtml);

          polyline.on('click', () => updateSelectedRoute(route));
          startMarker.on('click', () => updateSelectedRoute(route));

          // Each mini map frames only its own route.
          instance.fitBounds(L.latLngBounds(route.coords).pad(0.06), { animate: false });

          renderSceneryChips(route);
        });

        renderHistoryOverlay();
      }

      // Selecting a route by clicking anywhere on its card (map, title, stats).
      // Delegated once on the grid so re-renders never stack duplicate handlers.
      const mapGrid = document.getElementById('map-grid');
      if (mapGrid && !mapGrid.dataset.bound) {
        mapGrid.dataset.bound = 'true';
        mapGrid.addEventListener('click', (event) => {
          // Let Leaflet popups, scenery chips and buttons handle their own clicks.
          if (event.target.closest('.leaflet-popup, .scenery-chip, button, a')) return;
          const card = event.target.closest('.mini-map-card');
          if (!card) return;
          const route = getAllRoutes().find(item => item.id === card.dataset.routeId);
          if (!route) return;
          // Re-selecting the current route is a no-op, but it must not be a
          // dead click: keep the card highlighted so the state stays obvious.
          if (route.id === recommendedRouteId) {
            card.classList.add('is-selected');
            return;
          }
          updateSelectedRoute(route);
        });
      }

      document.querySelectorAll('.map-filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
          document.querySelectorAll('.map-filter-btn').forEach((item) => item.classList.toggle('active', item === button));
          renderRoutes(button.dataset.filter, recommendedRouteId);
          updateHeatOverlay();
        });
      });

      if (heatHourInput) {
        heatHourInput.addEventListener('input', updateHeatOverlay);
      }

      const overlayToggle = document.getElementById('overlay-all');
      if (overlayToggle) {
        overlayToggle.addEventListener('change', () => {
          overlayAllRoutes = overlayToggle.checked;
          applyOverlayMode();
        });
      }

      const navigateBtn = document.getElementById('navigate-btn');
      if (navigateBtn) navigateBtn.addEventListener('click', navigateToStart);

      // Recompute pace-dependent analysis whenever the runner edits their pace.
      const paceInput = document.getElementById('runner-pace');
      if (paceInput) {
        paceInput.addEventListener('input', () => {
          const routes = getAllRoutes();
          routes.forEach((route) => buildRouteAnalysis(route));
          const current = routes.find(route => route.id === recommendedRouteId) || routes[0];
          if (current) {
            formatRouteDetail(current);
            renderRouteBreakdown(current);
            renderComparisonTable(current.id);
          }
        });
      }

      const shareBtn = document.getElementById('share-card-btn');
      if (shareBtn) shareBtn.addEventListener('click', openShareCard);

      document.querySelectorAll('[data-close-share]').forEach((element) => {
        element.addEventListener('click', closeShareCard);
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeShareCard();
      });

      const shareCopyBtn = document.getElementById('share-copy-btn');
      if (shareCopyBtn) shareCopyBtn.addEventListener('click', copyShareSummary);

      const shareDownloadBtn = document.getElementById('share-download-btn');
      if (shareDownloadBtn) shareDownloadBtn.addEventListener('click', downloadShareCard);

      document.getElementById('save-plan-btn').addEventListener('click', savePlan);

      document.getElementById('gpx-upload-btn').addEventListener('click', async () => {
        const input = document.getElementById('gpx-upload-input');
        const file = input.files && input.files[0];
        if (!file) return;

        const text = await file.text();
        const coords = parseGpxTrack(text);
        if (!coords.length) {
          showToast('This GPX file does not contain a valid track.', 'warn');
          return;
        }

        const distance = Number(calculateRouteDistance(coords).toFixed(1)) || 5;
        const elevations = parseGpxElevations(text);
        const summary = distance >= 8
          ? 'Long user-uploaded route for endurance work with a stronger aerobic focus.'
          : distance >= 4
            ? 'Balanced route for steady effort and comfortable city or park running.'
            : 'Shorter route suitable for easy recovery, warm-up, or relaxed pace work.';

        // "Near centre" is measured, not assumed: the start point must fall
        // inside the central Tianjin bounding box.
        const startPoint = coords[0] || [];
        const nearCenter = startPoint[0] >= 39.05 && startPoint[0] <= 39.20 &&
          startPoint[1] >= 117.15 && startPoint[1] <= 117.30;

        uploadedRoute = {
          id: 'custom-route',
          name: file.name.replace(/\.gpx$/i, '') || 'My route',
          color: '#d86b39',
          tags: distance >= 7 ? ['custom', 'distance'] : ['custom', 'beginner'],
          distance,
          nearCenter,
          bestTime: distance >= 8 ? 'weekend' : 'dusk',
          heat: 'custom',
          terrain: 'User uploaded route',
          surface: 'Dependent on track',
          lighting: 'Flexible',
          difficulty: 'Custom',
          audience: 'Any runner',
          risk: 'Check route safety',
          summary,
          sections: [
            { label: 'Start section', distance: `${Number((distance / 3).toFixed(1))} km`, note: 'Warm-up and settle into rhythm' },
            { label: 'Main block', distance: `${Number(((distance / 3) * 2).toFixed(1))} km`, note: 'Main effort section from the uploaded route' },
            { label: 'Finish stretch', distance: `${Number(distance.toFixed(1))} km`, note: 'Final section used to finish strong' }
          ],
          coords,
          elevations,
          rawGpxText: text,
          custom: true
        };

        uploadedRoute.score = computeRouteScore(uploadedRoute);

        buildRouteAnalysis(uploadedRoute);
        ensureCustomMiniMap(uploadedRoute);
        updateSelectedRoute(uploadedRoute);
        document.getElementById('gpx-upload-input').value = '';
      });

      ['runner-level', 'runner-time', 'runner-goal', 'runner-distance', 'training-target'].forEach((fieldId) => {
        document.getElementById(fieldId).addEventListener('change', () => {
          updateDashboardSummary(document.getElementById('result-name').textContent || recommendedRouteId);
          updateRecommendation();
        });
      });

      renderSavedPlans();
      renderHistoryDashboard();
      renderComparisonTable();
      renderTrainingSuggestion(routeConfigs[0]);
      renderWeeklyPlan(routeConfigs[0]);
      // Build the full detail card first so #route-difficulty / #route-audience /
      // #route-risk exist before renderRouteBreakdown writes into them.
      updateSelectedRoute(routeConfigs[0]);
      updateDashboardSummary(routeConfigs[0].name);
      renderHistoryOverlay();
      loadWeather();
      loadRouteGeometry();

      // Leaflet caches container size; recalculate after layout shifts
      // (responsive breakpoints, sidebar scroll, details toggles).
      let resizeTimer = null;
      function refreshMiniMaps() {
        Object.values(miniMaps).forEach((instance) => {
          if (instance) instance.invalidateSize({ animate: false });
        });
      }
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshMiniMaps, 150);
      });
      const recommendationPanel = document.getElementById('recommendation-panel');
      if (recommendationPanel) {
        recommendationPanel.addEventListener('toggle', () => {
          setTimeout(refreshMiniMaps, 60);
        });
      }
      setTimeout(refreshMiniMaps, 400);
