// Route definitions, landmark notes, and inline SVG art for map.html.
// Pure data: no DOM access, no side effects. Loaded before map-app.js.

      const routeConfigs = [
        {
          id: 'haihe',
          name: 'Haihe Riverside',
          color: '#2d76d7',
          tags: ['night', 'river'],
          distance: 7.7,
          nearCenter: true,
          bestTime: 'dusk',
          score: 92,
          heat: 'high',
          terrain: 'Flat river path',
          surface: 'Paved',
          lighting: 'Dusk friendly',
          difficulty: 'Easy',
          audience: 'Beginner and steady runners',
          risk: 'Low',
          summary: 'Flat city waterfront route great for dusk runs and easy mileage.',
          sections: [
            { label: 'South riverfront', distance: '2.6 km', note: 'Smooth start beside the river' },
            { label: 'Midway bend', distance: '2.9 km', note: 'Flat and easy to maintain rhythm' },
            { label: 'Finish stretch', distance: '2.5 km', note: 'Straight run back with clear lanes' }
          ],
          gpxFile: 'gpx/haihe-riverside.gpx'
        },
        {
          id: 'park',
          name: 'South Cuiping Park',
          color: '#3e9d74',
          tags: ['beginner', 'park'],
          distance: 3,
          nearCenter: true,
          bestTime: 'morning',
          score: 88,
          heat: 'steady',
          terrain: 'Park loop',
          surface: 'Packed earth',
          lighting: 'Morning calm',
          difficulty: 'Easy',
          audience: 'New runners and recovery days',
          risk: 'Low',
          summary: 'Short and controlled loop with easy surface and lower stress.',
          sections: [
            { label: 'North park entry', distance: '1.1 km', note: 'Gentle warm-up section' },
            { label: 'Center loop', distance: '1.2 km', note: 'Relaxed loop with low traffic' },
            { label: 'South return', distance: '0.7 km', note: 'Easy finish and cool-down' }
          ],
          gpxFile: 'gpx/south-cuiping-park.gpx'
        },
        {
          id: 'water',
          name: 'Water Park Lakeside',
          color: '#e48848',
          tags: ['park', 'beginner'],
          distance: 5,
          nearCenter: true,
          bestTime: 'morning',
          score: 84,
          heat: 'moderate',
          terrain: 'Lakefront track',
          surface: 'Smooth path',
          lighting: 'Shady morning',
          difficulty: 'Easy-medium',
          audience: 'Steady runners and easy mileage',
          risk: 'Low-medium',
          summary: 'Comfortable pace around the lake with shade and calm conditions.',
          sections: [
            { label: 'Lake inlet', distance: '1.6 km', note: 'Shaded and cool early in the day' },
            { label: 'Water edge', distance: '2.0 km', note: 'Longer continuous running section' },
            { label: 'Finish loop', distance: '1.4 km', note: 'Gentle return with clear sight lines' }
          ],
          gpxFile: 'gpx/water-park-lakeside.gpx'
        },
        {
          id: 'coastal',
          name: 'Binhai TEDA Coastal',
          color: '#8f5edc',
          tags: ['distance', 'river'],
          distance: 6.7,
          nearCenter: false,
          bestTime: 'weekend',
          score: 90,
          heat: 'high',
          terrain: 'Open coast path',
          surface: 'Paved and wide',
          lighting: 'Weekend breeze',
          difficulty: 'Moderate',
          audience: 'Intermediate to advanced endurance runners',
          risk: 'Moderate',
          summary: 'Long and steady coastal route for aerobic work and weekend mileage.',
          sections: [
            { label: 'Coastal start', distance: '2.2 km', note: 'Wide start with strong open-air conditions' },
            { label: 'Long stretch', distance: '3.1 km', note: 'Steady endurance section with flat ground' },
            { label: 'Return run', distance: '1.7 km', note: 'Final push before the finish' }
          ],
          gpxFile: 'gpx/binhai-teda-coastal.gpx'
        }
      ];

      /* ---------- Scenery along the route ----------
         Landmarks are real places on each route, anchored to the same
         Tianditu POI coordinates used by the GPX tracks. Each one carries a
         short note plus a small inline illustration so the map explains what
         you actually run past, not just where the line goes. */
      const sceneryData = {
        haihe: [
          {
            name: 'Tianjin Eye',
            lat: 39.152961, lon: 117.179862,
            kind: 'Landmark',
            when: 'After dark',
            note: 'A 120 m Ferris wheel built over the Yongle Bridge. The loop starts right under it — the wheel is lit after dark, which is why this route is the night-run pick.',
            art: 'ferris',
            photo: 'images/landmarks/tianjin-eye.png',
            photoPos: 'center 45%',
            facts: [
              ['Built', '2008'],
              ['Height', '120 m'],
              ['Spans', 'Yongle Bridge'],
              ['Ride time', '~28 min']
            ],
            detail: 'The only Ferris wheel in the world built on top of a bridge. It carries 48 passenger capsules over the Haihe, and the crossing traffic runs underneath you. At night the rim is lit in a rotating colour cycle, which is why the riverside path fills up after 19:00.',
            runTip: 'Start here and head south — you get the lit wheel behind you and the quieter stretch of the river ahead.'
          },
          {
            name: 'Jiefang Bridge',
            lat: 39.131671, lon: 117.199964,
            kind: 'Bridge',
            when: 'Any time',
            note: 'A 1927 steel truss bridge that opens to let boats through. Flat deck, wide footway — the smoothest crossing on the whole riverside.',
            art: 'bridge',
            photo: 'images/landmarks/jiefang-bridge.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Opened', '1927'],
              ['Type', 'Steel truss'],
              ['Feature', 'Opens for boats'],
              ['Deck', 'Flat, wide footway']
            ],
            detail: 'One of the oldest surviving bridges over the Haihe, and still a working bascule bridge — the deck splits and lifts to let taller boats pass. The steel trusses are painted a deep grey-green, and the footway is separated from traffic, so you never break stride crossing it.',
            runTip: 'The smoothest river crossing on the route. Use it to switch banks without losing rhythm.'
          },
          {
            name: 'Jinwan Plaza riverbank',
            lat: 39.135123, lon: 117.213982,
            kind: 'City view',
            when: 'Sunset −30 min',
            note: 'The far bank opens up here: skyline on one side, water on the other. Best light is roughly 30 minutes before sunset.',
            art: 'skyline',
            photo: 'images/landmarks/jinwan-plaza.jpg',
            photoPos: 'center 45%',
            facts: [
              ['Best light', 'Sunset −30 min'],
              ['View', 'Skyline + water'],
              ['Bank', 'South / far side'],
              ['Surface', 'Paved promenade']
            ],
            detail: 'The river bends here, so the far bank opens into a long skyline view instead of the close-in buildings you get further north. The promenade is wide and paved, with low steps down to the water on the plaza side.',
            runTip: 'Time your finish for golden hour. The last kilometre faces west, so you run into the light rather than away from it.'
          }
        ],
        park: [
          {
            name: 'Cuiping Hill',
            lat: 39.075610, lon: 117.148290,
            kind: 'Hill',
            when: 'Morning shade',
            note: 'The park is built around a low wooded hill, so the loop rolls gently instead of staying dead flat. Shaded almost the whole way in summer.',
            art: 'hill',
            photo: 'images/landmarks/cuiping-hill.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Terrain', 'Low wooded hill'],
              ['Profile', 'Rolling, not flat'],
              ['Shade', 'Most of the loop'],
              ['Best season', 'Summer']
            ],
            detail: 'The whole park is arranged around this hill, which is why the loop is never quite flat — there are gentle rises rather than one climb. Mature trees cover most of the path, so it stays noticeably cooler than the open riverside in July and August.',
            runTip: 'The shade makes this the best summer option. Expect a few short rises; shorten your stride rather than pushing uphill.'
          },
          {
            name: 'Ski slope',
            lat: 39.076450, lon: 117.150420,
            kind: 'Landmark',
            when: 'Winter',
            note: 'A dry ski slope sits inside the park. In winter it is the busiest corner; the rest of the year it is a quiet landmark to run past.',
            art: 'slope',
            photo: 'images/landmarks/cuiping-ski.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Type', 'Dry ski slope'],
              ['Busiest', 'Winter'],
              ['Position', 'Inside the park'],
              ['Rest of year', 'Quiet']
            ],
            detail: 'An artificial surface slope built inside the park boundary, so you run past it rather than around it. In winter it draws a crowd and the surrounding paths get busy; from spring to autumn it is just a landmark on the loop.',
            runTip: 'A good mental marker — once you pass the slope you are roughly two-thirds through the loop.'
          }
        ],
        water: [
          {
            name: 'West Lake',
            lat: 39.085734, lon: 117.159812,
            kind: 'Water',
            when: 'Early morning',
            note: 'The calmer of the two lakes. The path hugs the shore, so you get a continuous water line on your left for most of this stretch.',
            art: 'lake',
            photo: 'images/landmarks/water-park-westlake.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Water', 'Calm, sheltered'],
              ['Path', 'Hugs the shore'],
              ['Water side', 'Left'],
              ['Best time', 'Early morning']
            ],
            detail: 'The western of the two lakes in the park, and the quieter one — the shoreline is more sheltered, so the surface stays flat even when it is windy elsewhere. The path runs directly along the water for most of this stretch.',
            runTip: 'Use this section to settle into an easy cadence. Flat, shaded, and the water line gives you a natural sense of pace.'
          },
          {
            name: 'Tianjin Zoo',
            lat: 39.081420, lon: 117.159840,
            kind: 'Landmark',
            when: 'Weekday mornings',
            note: 'The zoo entrance sits at the south end of the loop. Expect families and strollers here on weekends — the one section worth slowing down for.',
            art: 'zoo',
            photo: 'images/landmarks/tianjin-zoo.png',
            photoPos: 'center 50%',
            facts: [
              ['Position', 'South end of loop'],
              ['Busiest', 'Weekends'],
              ['Hazard', 'Strollers, families'],
              ['Best time', 'Weekday AM']
            ],
            detail: 'The zoo entrance opens directly onto the lakeside path, which makes this the one genuinely congested point on an otherwise quiet loop. Weekday mornings are close to empty; weekend afternoons are not.',
            runTip: 'Slow down here rather than weaving. It is a 200 m stretch — losing five seconds is cheaper than clipping a stroller.'
          },
          {
            name: 'East Lake dock',
            lat: 39.091800, lon: 117.161420,
            kind: 'Water',
            when: 'Golden hour',
            note: 'Small boat dock on the east lake. Open sight lines and a wide paved apron make it a natural turnaround point.',
            art: 'dock',
            photo: 'images/landmarks/water-park-eastdock.png',
            photoPos: 'center 50%',
            facts: [
              ['Type', 'Small boat dock'],
              ['Surface', 'Wide paved apron'],
              ['View', 'Open sight lines'],
              ['Best light', 'Golden hour']
            ],
            detail: 'A small dock on the eastern lake where rowing boats are hired out. The paved apron around it is wide and open, with clear sight lines across the water — the most photogenic point on the loop.',
            runTip: 'Natural turnaround. If you are extending the run, this is where to add an extra lap rather than doubling back early.'
          }
        ],
        coastal: [
          {
            name: 'TEDA Football Stadium',
            lat: 39.031680, lon: 117.718970,
            kind: 'Landmark',
            when: 'Match days',
            note: 'Home ground of Tianjin Jinmen Tiger. On match days the surrounding roads close to traffic, which turns the approach into a wide open running lane.',
            art: 'stadium',
            photo: 'images/landmarks/teda-stadium.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Home of', 'Tianjin Jinmen Tiger'],
              ['Match days', 'Roads close'],
              ['Approach', 'Wide open lane'],
              ['Position', 'Route start']
            ],
            detail: 'The stadium anchors the start of the coastal route. On match days the surrounding roads are closed to traffic, which turns the approach into an unusually wide, car-free running lane — the best surface on the whole route.',
            runTip: 'Check the fixture list. A match day gives you a closed road; a normal day gives you a quiet pavement.'
          },
          {
            name: 'TEDA MSD circle',
            lat: 39.023400, lon: 117.704040,
            kind: 'City view',
            when: 'Weekends',
            note: 'The modern business district: glass towers, wide empty pavements, and almost no pedestrians at weekends. This is where the route feels fastest.',
            art: 'towers',
            photo: 'images/landmarks/teda-msd.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Type', 'Business district'],
              ['Pavements', 'Wide, empty'],
              ['Weekends', 'Almost no foot traffic'],
              ['Feel', 'Fastest section']
            ],
            detail: 'The modern business core of TEDA: glass towers, broad granite pavements, and almost nobody around at weekends. The long straight past the towers is flat and uninterrupted, which makes it the easiest place on the route to hold a target pace.',
            runTip: 'This is the block to hold goal pace. Flat, uninterrupted, and easy to measure against the buildings.'
          },
          {
            name: 'Beihai Road interchange',
            lat: 39.029079, lon: 117.712592,
            kind: 'Waypoint',
            when: 'Any time',
            note: 'The one real junction on the route. Cross under the flyover rather than over it — the underpass keeps you off the traffic lights.',
            art: 'road',
            photo: 'images/landmarks/beihai-road.jpg',
            photoPos: 'center 50%',
            facts: [
              ['Type', 'Flyover junction'],
              ['Crossing', 'Underpass'],
              ['Traffic lights', 'Avoidable'],
              ['Position', 'Mid route']
            ],
            detail: 'The only real junction on an otherwise continuous route. The flyover carries the main road overhead, and the pedestrian underpass runs beneath it — taking the underpass keeps you off the traffic lights entirely.',
            runTip: 'Take the underpass, not the surface crossing. It costs nothing in time and keeps your rhythm intact.'
          }
        ]
      };

      const sceneryArt = {
        ferris: '<circle cx="20" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="16" r="2" fill="currentColor"/><path d="M20 5v22M9 16h22M12 8l16 16M28 8L12 24" stroke="currentColor" stroke-width="1" opacity="0.55"/><path d="M14 38h12" stroke="currentColor" stroke-width="1.6"/>',
        bridge: '<path d="M4 26h32M8 26v-8M32 26v-8M8 18c6-6 18-6 24 0" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 26v-5M20 26v-7M28 26v-5" stroke="currentColor" stroke-width="1" opacity="0.6"/><path d="M4 30h32" stroke="currentColor" stroke-width="1.6"/>',
        skyline: '<path d="M4 34V20h6v14M12 34V12h7v22M21 34V24h6v10M29 34V16h7v18" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 34h32" stroke="currentColor" stroke-width="1.6"/>',
        hill: '<path d="M3 32c5-12 12-16 17-16s12 4 17 16" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 32h34" stroke="currentColor" stroke-width="1.6"/><path d="M16 22l4-6 4 6" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>',
        slope: '<path d="M4 32L34 12v20z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 32h32" stroke="currentColor" stroke-width="1.6"/><path d="M14 26l6-4M20 22l6-4" stroke="currentColor" stroke-width="1" opacity="0.6"/>',
        lake: '<path d="M4 24c4-3 8 3 12 0s8-3 12 0 8 3 8 0" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 30c4-3 8 3 12 0s8-3 12 0 8 3 8 0" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.6"/><circle cx="30" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
        zoo: '<path d="M12 30V18a8 8 0 0116 0v12" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 30h24" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="20" r="1.6" fill="currentColor"/><circle cx="24" cy="20" r="1.6" fill="currentColor"/>',
        dock: '<path d="M6 30h28M10 30V22h20v8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 22V10l10 6-10 6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 34c4-2 8 2 12 0s8-2 12 0 8 2 8 0" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>',
        stadium: '<ellipse cx="20" cy="22" rx="16" ry="10" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="20" cy="22" rx="8" ry="5" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6"/><path d="M4 22v6M36 22v6" stroke="currentColor" stroke-width="1.4"/>',
        towers: '<path d="M6 34V14h8v20M18 34V8h8v26M30 34V18h6v16" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 34h34" stroke="currentColor" stroke-width="1.6"/><path d="M9 20h2M9 25h2M21 14h2M21 20h2M21 26h2" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>',
        road: '<path d="M14 36L18 8M26 36L22 8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 32v-4M20 24v-4M20 16v-4" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>'
      };
