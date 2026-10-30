// Local running assistant for the Tips page.
// Runs entirely in the browser — no API key, no network request.
// Answers are matched against knowledge.js (window.RUN_TIANJIN_KNOWLEDGE).
(function () {
  const root = document.getElementById('ai-ask');
  if (!root) return;

  const form = root.querySelector('.ai-ask-form');
  const input = root.querySelector('.ai-ask-input');
  const submit = root.querySelector('.ai-ask-submit');
  const answerBox = root.querySelector('.ai-ask-answer');
  const answerBody = root.querySelector('.ai-ask-answer-body');
  const answerMeta = root.querySelector('.ai-ask-answer-meta');
  const chips = root.querySelectorAll('.ai-chip');

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
  const TOPICS = [
    {
      section: /^Routes/i,
      words: ['route', 'routes', 'where', 'path', 'loop', 'distance', 'km', 'kilometre',
        'kilometer', 'haihe', 'cuiping', 'nancui', 'water', 'park', 'shuishang', 'binhai',
        'tada', 'taida', 'coastal', 'riverside', 'lake', 'scenic', 'night', 'beginner',
        'first', 'start', 'long', 'endurance', 'mileage', 'surface', 'asphalt',
        'rubber', 'track', 'flat', 'hill', 'hilly', 'crowd', 'busy', 'quiet']
    },
    {
      section: /^Training intensity/i,
      words: ['intensity', 'pace', 'pacing', 'effort', 'rpe', 'heart', 'rate', 'tempo',
        'interval', 'intervals', 'speed', 'fast', 'slow', 'breath', 'breathing', 'talk',
        'zone', 'threshold', 'recovery', 'easy', 'hard', 'fartlek', 'enough', 'know',
        'feel', 'feels', 'feeling', 'comfortable', 'conversation', 'run', 'running']
    },
    {
      section: /^Before \/ during \/ after/i,
      words: ['warm', 'warmup', 'warm-up', 'cool', 'cooldown', 'cool-down', 'stretch',
        'stretching', 'before', 'after', 'during', 'routine', 'prepare', 'rehydrate',
        'hydrate', 'hydration', 'water', 'drink']
    },
    {
      section: /^Running in Tianjin/i,
      words: ['tianjin', 'weather', 'wind', 'windy', 'winter', 'summer', 'spring', 'autumn',
        'fall', 'cold', 'hot', 'heat', 'humidity', 'humid', 'ice', 'icy', 'fog', 'air',
        'pollution', 'haze', 'smog', 'season', 'temperature', 'local', 'conditions']
    },
    {
      section: /^Gear checklist/i,
      words: ['gear', 'shoe', 'shoes', 'sneaker', 'sneakers', 'wear', 'clothing', 'clothes',
        'layer', 'layers', 'jacket', 'windbreaker', 'reflective', 'visibility', 'light',
        'bottle', 'belt', 'glove', 'gloves', 'hat', 'kit', 'equipment']
    },
    {
      section: /^7-day running plan/i,
      words: ['plan', 'schedule', 'week', 'weekly', 'day', 'monday', 'tuesday', 'wednesday',
        'thursday', 'friday', 'saturday', 'sunday', 'rest', 'programme', 'program']
    },
    {
      section: /^FAQ/i,
      words: ['faq', 'question', 'increase', 'knee', 'pain', 'hurt', 'injury', 'injured',
        'shin', 'ankle', 'ache', 'sore', 'soreness', 'begin', 'new']
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
      return 'Ask me about routes, pacing, gear, or running conditions in Tianjin.';
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

    // A strong topic match (gear, weather, pacing, plan…) wins over a route card.
    if (bestSection && sectionScore >= 4) {
      const body = answerFromSection(bestSection.section, tokens);
      return routeAnswer ? routeAnswer + '\n\n' + body : body;
    }

    if (routeAnswer) return routeAnswer;

    if (bestSection && sectionScore > 0) {
      return answerFromSection(bestSection.section, tokens);
    }

    return (
      'I could not find that in the site guide. Try asking about one of the four routes ' +
      '(Haihe Riverside, South Cuiping Park, Water Park Lakeside, Binhai TEDA Coastal), ' +
      'training intensity, gear, or running conditions in Tianjin.'
    );
  }

  // ---------------------------------------------------------------- rendering
  function render(text) {
    answerBox.hidden = false;
    answerBox.classList.remove('is-error');
    answerMeta.textContent = 'Run Tianjin assistant';
    answerBody.textContent = text;
  }

  function renderError(text) {
    answerBox.hidden = false;
    answerBox.classList.add('is-error');
    answerMeta.textContent = 'Something went wrong';
    answerBody.textContent = text;
  }

  function ask(question) {
    const trimmed = question.trim();
    if (!trimmed) return;
    submit.disabled = true;
    submit.textContent = 'Thinking…';
    // Small delay so the button state is visible, then answer locally.
    window.setTimeout(function () {
      try {
        render(answer(trimmed));
      } catch (error) {
        renderError('Could not build an answer. (' + error.message + ')');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Ask';
      }
    }, 220);
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
