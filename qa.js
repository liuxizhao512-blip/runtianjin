// Running assistant for the Tips page.
// Two modes:
//   1. BYOK — the visitor pastes their own AI key, stored in localStorage and
//      sent straight to the provider. No backend, works from file://.
//   2. Fallback — keyword matching over knowledge.js, used when no key is set
//      or the provider call fails.
(function () {
  const root = document.getElementById('qa');
  if (!root) return;

  const form = root.querySelector('.qa-form');
  const input = root.querySelector('#qa-input');
  const submit = root.querySelector('.qa-submit');
  const answerBox = root.querySelector('.qa-answer');
  const answerBody = root.querySelector('.qa-answer-body');
  const answerMeta = root.querySelector('.qa-answer-meta');
  const suggestionsBox = root.querySelector('.qa-suggestions');
  const suggestionsList = root.querySelector('.qa-suggestions-list');
  const chips = root.querySelectorAll('.ai-chip');

  const setupBox = document.getElementById('qa-setup');
  const setupState = document.getElementById('qa-setup-state');
  const providerSelect = document.getElementById('qa-provider');
  const keyInput = document.getElementById('qa-key');
  const saveBtn = document.getElementById('qa-save');
  const clearBtn = document.getElementById('qa-clear');
  const setupHelp = document.getElementById('qa-setup-help');

  const knowledge = window.RUN_TIANJIN_KNOWLEDGE || '';

  // ---------------------------------------------------------------- knowledge
  // Split the knowledge base into sections keyed by their "## Heading".
  const sections = [];
  (function parseKnowledge() {
    const lines = knowledge.split('\n');
    let current = null;
    lines.forEach(function (line) {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        current = { title: heading[1], body: [] };
        sections.push(current);
        return;
      }
      if (current) current.body.push(line);
    });
    sections.forEach(function (section) {
      section.text = section.body.join('\n').trim();
    });
  })();

  // Individual route blocks ("### 1. Haihe Riverside Run (route key: haihe)").
  const routes = [];
  (function parseRoutes() {
    const routeSection = sections.find(function (s) {
      return /^Routes/i.test(s.title);
    });
    if (!routeSection) return;
    let current = null;
    routeSection.text.split('\n').forEach(function (line) {
      const heading = line.match(/^###\s+(.+?)\s*$/);
      if (heading) {
        current = { title: heading[1], body: [] };
        routes.push(current);
        return;
      }
      if (current) current.body.push(line);
    });
    routes.forEach(function (route) {
      route.text = route.body.join('\n').trim();
      route.name = route.title.replace(/^\d+\.\s*/, '').replace(/\s*\(route key:.*\)$/, '');
      route.key = (route.title.match(/route key:\s*([a-z]+)/i) || [])[1] || '';
      route.fields = {};
      route.text.split('\n').forEach(function (line) {
        const field = line.match(/^-\s*([^:]+):\s*(.+)$/);
        if (field) route.fields[field[1].trim().toLowerCase()] = field[2].trim();
      });
    });
  })();

  function field(route, key) {
    return route.fields[key] || '';
  }

  // ---------------------------------------------------------------- matching
  const STOP_WORDS = [
    'the', 'a', 'an', 'is', 'are', 'do', 'does', 'did', 'i', 'my', 'me', 'you', 'your',
    'should', 'can', 'could', 'would', 'will', 'what', 'which', 'when', 'where', 'how',
    'why', 'who', 'for', 'to', 'of', 'in', 'on', 'at', 'and', 'or', 'it', 'this', 'that',
    'be', 'am', 'was', 'were', 'have', 'has', 'if', 'about', 'with', 'from', 'there'
  ];

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(function (word) {
        return word.length > 2 && STOP_WORDS.indexOf(word) === -1;
      });
  }

  // Topic keywords mapped to the knowledge section that answers them.
  // Each list carries synonyms, common misspellings, and British/American
  // variants so a question does not have to use the guide's exact wording.
  const TOPICS = [
    {
      section: /^Routes/i,
      words: ['route', 'routes', 'where', 'path', 'loop', 'distance', 'km', 'kilometre',
        'kilometer', 'kms', 'haihe', 'cuiping', 'nancui', 'water', 'park', 'shuishang', 'binhai',
        'tada', 'taida', 'coastal', 'riverside', 'lake', 'lakeside', 'scenic', 'night', 'beginner',
        'first', 'start', 'long', 'endurance', 'mileage', 'surface', 'asphalt',
        'rubber', 'track', 'flat', 'hill', 'hilly', 'crowd', 'busy', 'quiet',
        // synonyms / misspellings
        'trail', 'course', 'circuit', 'whereto', 'rout', 'routs', 'rute', 'rutes',
        'hai', 'river', 'seaside', 'beach', 'shore', 'waterfront', 'promenade',
        'shortest', 'longest', 'easiest', 'hardest', 'flattest', 'hills']
    },
    {
      section: /^Training intensity/i,
      words: ['intensity', 'pace', 'pacing', 'effort', 'rpe', 'heart', 'rate', 'tempo',
        'interval', 'intervals', 'speed', 'fast', 'slow', 'breath', 'breathing', 'talk',
        'zone', 'threshold', 'recovery', 'easy', 'hard', 'fartlek', 'enough', 'know',
        'feel', 'feels', 'feeling', 'comfortable', 'conversation', 'run', 'running',
        // synonyms / misspellings
        'hr', 'bpm', 'cardio', 'aerobic', 'anaerobic', 'sprint', 'sprints', 'splits',
        'pase', 'pacing', 'intesity', 'intensety', 'tired', 'exhausted', 'breathless',
        'conversational', 'zone2', 'zone4', 'easyrun']
    },
    {
      section: /^Before \/ during \/ after/i,
      words: ['warm', 'warmup', 'warm-up', 'cool', 'cooldown', 'cool-down', 'stretch',
        'stretching', 'before', 'after', 'during', 'routine', 'prepare', 'rehydrate',
        'hydrate', 'hydration', 'water', 'drink',
        // synonyms / misspellings
        'warmdown', 'warmdown', 'mobility', 'foam', 'roller', 'roll', 'dynamic',
        'static', 'prep', 'recovery', 'electrolyte', 'electrolytes', 'fluid', 'fluids',
        'stretches', 'stretchs', 'cooldwn', 'warmp']
    },
    {
      section: /^Running in Tianjin/i,
      words: ['tianjin', 'weather', 'wind', 'windy', 'winter', 'summer', 'spring', 'autumn',
        'fall', 'cold', 'hot', 'heat', 'humidity', 'humid', 'ice', 'icy', 'fog', 'air',
        'pollution', 'haze', 'smog', 'season', 'temperature', 'local', 'conditions',
        // synonyms / misspellings
        'aqi', 'pm25', 'pm2', 'smoggy', 'hazy', 'rain', 'rainy', 'snow', 'snowy',
        'freezing', 'chilly', 'warm', 'muggy', 'sticky', 'breeze', 'breezy', 'gust',
        'gusty', 'tianjinn', 'tianjing', 'tianjiin', 'tj']
    },
    {
      section: /^Gear checklist/i,
      words: ['gear', 'shoe', 'shoes', 'sneaker', 'sneakers', 'wear', 'clothing', 'clothes',
        'layer', 'layers', 'jacket', 'windbreaker', 'reflective', 'visibility', 'light',
        'bottle', 'belt', 'glove', 'gloves', 'hat', 'kit', 'equipment',
        // synonyms / misspellings
        'trainers', 'trainer', 'runners', 'footwear', 'apparel', 'outfit', 'tights',
        'shorts', 'socks', 'cap', 'beanie', 'headlamp', 'vest', 'hydration', 'pack',
        'geer', 'shoos', 'shose', 'cloths', 'clothing', 'whatwear']
    },
    {
      section: /^7-day running plan/i,
      words: ['plan', 'schedule', 'week', 'weekly', 'day', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday', 'sunday', 'rest', 'programme', 'program',
        // synonyms / misspellings
        'routine', 'calendar', 'timetable', 'regime', 'regimen', 'training', 'planning',
        'plans', 'schedul', 'shedule', 'sched', 'week1', 'week2', 'howoften', 'frequency']
    },
    {
      section: /^FAQ/i,
      words: ['faq', 'question', 'increase', 'knee', 'pain', 'hurt', 'injury', 'injured',
        'shin', 'ankle', 'ache', 'sore', 'soreness', 'begin', 'new',
        // synonyms / misspellings
        'splints', 'shinsplints', 'itband', 'itb', 'plantar', 'achilles', 'calf',
        'hamstring', 'quad', 'quads', 'back', 'hip', 'hips', 'foot', 'feet', 'heel',
        'blister', 'blisters', 'cramp', 'cramps', 'overtraining', 'progress', 'improve',
        'faster', 'distance', 'mileage', 'injry', 'injur', 'pian', 'knees']
    }
  ];

  function scoreSection(section, tokens) {
    const haystack = (section.title + ' ' + section.text).toLowerCase();
    let score = 0;
    tokens.forEach(function (token) {
      if (haystack.indexOf(token) !== -1) score += 1;
      if (section.title.toLowerCase().indexOf(token) !== -1) score += 2;
    });
    return score;
  }

  // Topic keywords are weighted much more heavily than raw text matches, so a
  // question like "winter gear" lands on the gear section instead of a route.
  function topicWordsFor(section) {
    const topic = TOPICS.find(function (entry) {
      return entry.section.test(section.title);
    });
    return topic ? topic.words : [];
  }

  function scoreTopic(section, tokens) {
    const words = topicWordsFor(section);
    if (!words.length) return 0;
    let score = 0;
    tokens.forEach(function (token) {
      if (words.indexOf(token) !== -1) score += 4;
    });
    return score;
  }

  function scoreRoute(route, tokens) {
    const haystack = (route.name + ' ' + route.text).toLowerCase();
    let score = 0;
    tokens.forEach(function (token) {
      if (haystack.indexOf(token) !== -1) score += 2;
      if (route.name.toLowerCase().indexOf(token) !== -1) score += 3;
    });
    return score;
  }

  // ---------------------------------------------------------------- answering
  function bulletList(items) {
    return items
      .filter(Boolean)
      .map(function (item) {
        return '• ' + item;
      })
      .join('\n');
  }

  function routeSummary(route) {
    return bulletList([
      field(route, 'distance') && 'Distance: ' + field(route, 'distance'),
      field(route, 'surface') && 'Surface: ' + field(route, 'surface'),
      field(route, 'best time') && 'Best time: ' + field(route, 'best time'),
      field(route, 'suitable for') && 'Good for: ' + field(route, 'suitable for'),
      field(route, 'recommendation') && 'Why: ' + field(route, 'recommendation')
    ]);
  }

  // Words that clearly point at a specific route rather than a general topic.
  const ROUTE_HINTS = [
    'route', 'routes', 'path', 'loop', 'trail', 'haihe', 'cuiping', 'nancui', 'shuishang',
    'binhai', 'tada', 'taida', 'coastal', 'riverside', 'lakeside', 'lake', 'park', 'scenic'
  ];

  function answerRouteQuestion(tokens) {
    const mentionsRoute = tokens.some(function (token) {
      return ROUTE_HINTS.indexOf(token) !== -1;
    });
    if (!mentionsRoute) return '';

    const ranked = routes
      .map(function (route) {
        return { route: route, score: scoreRoute(route, tokens) };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    const best = ranked[0];
    if (!best || best.score === 0) return '';
    const route = best.route;
    const lines = ['**' + route.name + '**', routeSummary(route)];

    const notes = field(route, 'notes');
    const avoid = field(route, 'avoid');
    if (notes) lines.push('Note: ' + notes);
    if (avoid) lines.push('Avoid: ' + avoid);

    if (ranked[1] && ranked[1].score > 0) {
      lines.push('Also worth a look: ' + ranked[1].route.name + '.');
    }
    return lines.join('\n\n');
  }

  function answerFromSection(section, tokens) {
    const text = section.text;

    if (/^Routes/i.test(section.title)) {
      const lines = ['Here are the four routes on the site:'];
      routes.forEach(function (route) {
        lines.push(
          '**' + route.name + '** — ' + field(route, 'distance') + ', ' + field(route, 'surface') +
            '. Best ' + field(route, 'best time') + '.'
        );
      });
      return lines.join('\n\n');
    }

    if (/^Training intensity/i.test(section.title)) {
      const rows = text
        .split('\n')
        .filter(function (line) {
          return line.indexOf('|') === 0 && line.indexOf('---') === -1;
        })
        .slice(1)
        .map(function (line) {
          const cells = line
            .split('|')
            .map(function (cell) {
              return cell.trim();
            })
            .filter(Boolean);
          return (
            '• ' + cells[0] + ' — effort ' + cells[1] + ', heart rate ' + cells[2] +
            ', talk test: ' + cells[3] + '. Suggested route: ' + cells[4] + '.'
          );
        });
      return 'Match the session to how it should feel:\n\n' + rows.join('\n');
    }

    if (/^FAQ/i.test(section.title)) {
      // The FAQ block is a list of "- Question? Answer" entries; return the
      // entries that best match the question instead of the whole block.
      const entries = [];
      let current = null;
      text.split('\n').forEach(function (line) {
        const start = line.match(/^-\s+(.+)$/);
        if (start) {
          current = { text: start[1] };
          entries.push(current);
          return;
        }
        if (current && line.trim()) current.text += ' ' + line.trim();
      });
      const scored = entries
        .map(function (entry) {
          const hay = entry.text.toLowerCase();
          let score = 0;
          tokens.forEach(function (token) {
            if (hay.indexOf(token) !== -1) score += 1;
          });
          return { entry: entry, score: score };
        })
        .sort(function (a, b) {
          return b.score - a.score;
        });
      const top = scored.filter(function (item) {
        return item.score > 0;
      }).slice(0, 2);
      if (top.length) {
        return top
          .map(function (item) {
            return '• ' + item.entry.text;
          })
          .join('\n\n');
      }
      return text.trim();
    }

    return text.trim();
  }

  function answer(question) {
    const tokens = tokenize(question);
    if (!tokens.length) {
      return { text: 'Type a question about routes, pacing, gear, or running conditions in Tianjin.', found: false };
    }

    const routeAnswer = answerRouteQuestion(tokens);
    const rankedSections = sections
      .map(function (section) {
        return {
          section: section,
          score: scoreSection(section, tokens) + scoreTopic(section, tokens)
        };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    const bestSection = rankedSections[0];
    const sectionScore = bestSection ? bestSection.score : 0;

    // A strong topic match (gear, weather, pacing, plan) wins over a route card.
    if (bestSection && sectionScore >= 4) {
      const body = answerFromSection(bestSection.section, tokens);
      return { text: routeAnswer ? routeAnswer + '\n\n' + body : body, found: true };
    }

    if (routeAnswer) return { text: routeAnswer, found: true };

    if (bestSection && sectionScore > 0) {
      return { text: answerFromSection(bestSection.section, tokens), found: true };
    }

    return {
      text:
        'Nothing in the guide matches that wording. The guide covers four routes ' +
        '(Haihe Riverside, South Cuiping Park, Water Park Lakeside, Binhai TEDA Coastal), ' +
        'training intensity, warm-up and recovery, Tianjin conditions, gear, and a 7-day plan.',
      found: false
    };
  }

  // ---------------------------------------------------------------- rendering
  // Shown when a search finds nothing, so the user always has a next step
  // instead of a dead end.
  const FALLBACK_QUESTIONS = [
    'Which route should I pick for my first run?',
    'How do I know if I am running easy enough?',
    'What should I wear for a winter run in Tianjin?',
    'Should I warm up even for a short run?',
    'How do I increase distance without getting injured?'
  ];

  function renderSuggestions() {
    if (!suggestionsBox || !suggestionsList) return;
    suggestionsList.textContent = '';
    FALLBACK_QUESTIONS.forEach(function (question) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'qa-suggestion';
      button.textContent = question;
      button.addEventListener('click', function () {
        ask(question);
      });
      suggestionsList.appendChild(button);
    });
    suggestionsBox.hidden = false;
  }

  function hideSuggestions() {
    if (suggestionsBox) suggestionsBox.hidden = true;
  }

  function render(result) {
    answerBox.hidden = false;
    answerBox.classList.remove('is-error');
    if (result.source === 'ai') {
      answerMeta.textContent = 'Answered by AI from the site guide';
    } else if (result.note) {
      answerMeta.textContent = result.note;
    } else {
      answerMeta.textContent = 'Matched from the site guide';
    }
    answerBody.textContent = result.text;
    if (result.found) {
      hideSuggestions();
    } else {
      renderSuggestions();
    }
  }

  function renderError(text) {
    answerBox.hidden = false;
    answerBox.classList.add('is-error');
    answerMeta.textContent = 'Something went wrong';
    answerBody.textContent = text;
    hideSuggestions();
  }

  // ---------------------------------------------------------------- BYOK setup
  // The key lives in localStorage on this device only. It is sent directly to
  // the provider, so no server of ours ever sees it.
  const STORE_KEY = 'runtianjin:ai';
  const PROVIDERS = {
    groq: {
      label: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      style: 'openai',
      help: 'Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com</a>.'
    },
    openai: {
      label: 'OpenAI',
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      style: 'openai',
      help: 'Get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a>.'
    },
    gemini: {
      label: 'Gemini',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      model: 'gemini-2.0-flash',
      style: 'gemini',
      help: 'Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a>.'
    }
  };

  function readConfig() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.key || !PROVIDERS[parsed.provider]) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeConfig(config) {
    try {
      if (config) {
        localStorage.setItem(STORE_KEY, JSON.stringify(config));
      } else {
        localStorage.removeItem(STORE_KEY);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  let config = readConfig();

  function refreshSetupUI() {
    if (!setupState) return;
    if (config) {
      setupState.textContent = 'On — ' + PROVIDERS[config.provider].label;
      setupState.classList.add('is-on');
      if (providerSelect) providerSelect.value = config.provider;
      if (keyInput) keyInput.value = config.key;
    } else {
      setupState.textContent = 'Off — using keyword search';
      setupState.classList.remove('is-on');
      if (keyInput) keyInput.value = '';
    }
    if (setupHelp && providerSelect) {
      setupHelp.innerHTML = PROVIDERS[providerSelect.value].help;
    }
  }

  if (providerSelect) {
    providerSelect.addEventListener('change', function () {
      if (setupHelp) setupHelp.innerHTML = PROVIDERS[providerSelect.value].help;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      const provider = providerSelect ? providerSelect.value : 'groq';
      const key = keyInput ? keyInput.value.trim() : '';
      if (!key) {
        if (setupHelp) setupHelp.textContent = 'Paste a key first.';
        return;
      }
      config = { provider: provider, key: key };
      if (!writeConfig(config)) {
        config = null;
        if (setupHelp) setupHelp.textContent = 'This browser blocked storage, so the key cannot be saved.';
        return;
      }
      refreshSetupUI();
      if (setupHelp) setupHelp.textContent = 'Key saved on this device.';
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      config = null;
      writeConfig(null);
      refreshSetupUI();
      if (setupHelp) setupHelp.textContent = 'Key removed.';
    });
  }

  refreshSetupUI();

  // ---------------------------------------------------------------- AI answers
  function buildSystemPrompt() {
    return [
      'You are the running assistant for Run Tianjin, a city running guide for Tianjin, China.',
      'Answer using ONLY the guide below. If the guide does not cover the question, say so plainly',
      'and suggest what the guide does cover. Never invent routes, distances, or opening hours.',
      'Keep answers under 120 words. Use short paragraphs or a few bullets. Plain text only.',
      '',
      '--- GUIDE START ---',
      knowledge.slice(0, 12000),
      '--- GUIDE END ---'
    ].join('\n');
  }

  function askAI(question) {
    if (!config) return Promise.reject(new Error('No key configured'));

    const provider = PROVIDERS[config.provider];
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller
      ? window.setTimeout(function () {
          controller.abort();
        }, 25000)
      : null;

    let url = provider.url;
    let headers = { 'Content-Type': 'application/json' };
    let body;

    if (provider.style === 'gemini') {
      url = url + '?key=' + encodeURIComponent(config.key);
      body = {
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 400 }
      };
    } else {
      headers.Authorization = 'Bearer ' + config.key;
      body = {
        model: provider.model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: question }
        ]
      };
    }

    return fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            const detail =
              (data && data.error && (data.error.message || data.error)) || 'Request failed';
            throw new Error(typeof detail === 'string' ? detail : 'Request failed');
          }
          if (provider.style === 'gemini') {
            const parts =
              data && data.candidates && data.candidates[0] && data.candidates[0].content
                ? data.candidates[0].content.parts
                : null;
            const text = parts
              ? parts
                  .map(function (part) {
                    return part.text || '';
                  })
                  .join('')
              : '';
            if (!text) throw new Error('Empty answer');
            return text;
          }
          const text =
            data && data.choices && data.choices[0] && data.choices[0].message
              ? data.choices[0].message.content
              : '';
          if (!text) throw new Error('Empty answer');
          return text;
        });
      })
      .finally(function () {
        if (timer) window.clearTimeout(timer);
      });
  }

  function ask(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    submit.disabled = true;
    submit.textContent = config ? 'Thinking…' : 'Searching…';

    const finish = function () {
      submit.disabled = false;
      submit.textContent = 'Ask';
    };

    if (!config) {
      // No key: answer locally, same as before.
      window.setTimeout(function () {
        try {
          render(answer(trimmed));
        } catch (error) {
          renderError('Could not build an answer. (' + error.message + ')');
        } finally {
          finish();
        }
      }, 220);
      return;
    }

    askAI(trimmed)
      .then(function (text) {
        render({ text: text, found: true, source: 'ai' });
      })
      .catch(function (error) {
        // Bad key, rate limit, or network: fall back to the local guide so the
        // visitor still gets an answer.
        const local = answer(trimmed);
        let note;
        if (error && error.name === 'AbortError') {
          note = 'The AI took too long, so this answer comes from the site guide.';
        } else if (error && /401|403|invalid|api key|unauthor/i.test(error.message)) {
          note = 'That key was rejected. Check it in the AI answers panel above.';
        } else {
          note = 'The AI is unavailable right now, so this answer comes from the site guide.';
        }
        render({ text: local.text, found: local.found, source: 'local', note: note });
      })
      .finally(finish);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    ask(question);
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const question = chip.dataset.question || chip.textContent.trim();
      ask(question);
    });
  });
})();
