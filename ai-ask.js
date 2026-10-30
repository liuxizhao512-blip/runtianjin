// AI running assistant for the Tips page.
// Requires config.js (see config.example.js) and knowledge.js to be loaded first.
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

  const config = window.RUN_TIANJIN_CONFIG || {};
  const knowledge = window.RUN_TIANJIN_KNOWLEDGE || '';

  const SYSTEM_PROMPT = [
    'You are the running assistant for Run Tianjin, a city running guide for Tianjin, China.',
    'Answer using ONLY the knowledge base below. If the answer is not covered, say so briefly and',
    'suggest the closest related topic from the site. Keep answers under 120 words, practical, and',
    'friendly. Use plain sentences or short bullet lists. Never invent routes, distances, or facts.',
    'When a route is relevant, mention its name exactly as written in the knowledge base.',
    '',
    'KNOWLEDGE BASE:',
    knowledge
  ].join('\n');

  const history = [];

  function setBusy(busy) {
    submit.disabled = busy;
    submit.textContent = busy ? 'Thinking…' : 'Ask';
    input.disabled = busy;
  }

  function showError(message) {
    answerBox.hidden = false;
    answerBox.classList.add('is-error');
    answerMeta.textContent = 'Something went wrong';
    answerBody.textContent = message;
  }

  function showAnswer(text) {
    answerBox.hidden = false;
    answerBox.classList.remove('is-error');
    answerMeta.textContent = 'Run Tianjin assistant';
    answerBody.textContent = text;
  }

  function missingConfigMessage() {
    if (!config.apiKey || config.apiKey.indexOf('sk-your') === 0) {
      return 'The AI assistant is not configured yet. Copy config.example.js to config.js and add your DeepSeek API key.';
    }
    return '';
  }

  async function ask(question) {
    const configError = missingConfigMessage();
    if (configError) {
      showError(configError);
      return;
    }

    setBusy(true);
    answerBox.hidden = false;
    answerBox.classList.remove('is-error');
    answerMeta.textContent = 'Run Tianjin assistant';
    answerBody.textContent = 'Looking through the route guide…';

    history.push({ role: 'user', content: question });

    try {
      const response = await fetch(config.baseUrl || 'https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.apiKey
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }].concat(history.slice(-6)),
          temperature: 0.3,
          max_tokens: 400,
          stream: false
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error('API error ' + response.status + ': ' + detail.slice(0, 200));
      }

      const data = await response.json();
      const reply = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : '';

      if (!reply) throw new Error('The assistant returned an empty answer.');

      history.push({ role: 'assistant', content: reply });
      showAnswer(reply);
    } catch (error) {
      history.pop();
      showError(
        'Could not reach the assistant. Check your network connection and API key, then try again. (' +
          error.message +
          ')'
      );
    } finally {
      setBusy(false);
    }
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
