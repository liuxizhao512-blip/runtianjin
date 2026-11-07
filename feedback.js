// Feedback form for the About page.
// Builds a mailto: link from the form fields and opens the user's email app.
// Set FEEDBACK_EMAIL below to the address that should receive messages.
(function () {
  const FEEDBACK_EMAIL = 'liuxizhao512@gmail.com';

  const form = document.getElementById('feedback-form');
  if (!form) return;

  const status = document.getElementById('feedback-status');
  const message = document.getElementById('feedback-message');
  const copyButton = document.getElementById('feedback-copy');

  function showStatus(text, isError) {
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle('is-error', Boolean(isError));
  }

  // ---------------------------------------------------------------- copy email
  // `mailto:` silently does nothing on phones without a configured mail app,
  // so the address is also offered as plain text the user can copy.
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for `file://` and older browsers where the async clipboard API
    // is unavailable or blocked.
    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      document.body.appendChild(area);
      area.select();
      try {
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        ok ? resolve() : reject(new Error('copy command rejected'));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  if (copyButton) {
    copyButton.addEventListener('click', function () {
      copyText(FEEDBACK_EMAIL).then(
        function () {
          showStatus('Copied ' + FEEDBACK_EMAIL + ' to your clipboard.', false);
        },
        function () {
          showStatus('Could not copy automatically. The address is ' + FEEDBACK_EMAIL, true);
        }
      );
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const topic = form.topic.value;
    const route = form.route.value;
    const body = message.value.trim();
    const email = form.email.value.trim();

    if (!body) {
      showStatus('Please write a short message before sending.', true);
      message.focus();
      return;
    }

    const subject = route ? '[Run Tianjin] ' + topic + ' — ' + route : '[Run Tianjin] ' + topic;

    const lines = [
      'Topic: ' + topic,
      'Route: ' + (route || 'Not route-specific'),
      '',
      body,
      '',
      '---',
      email ? 'Reply to: ' + email : 'No reply address provided.'
    ];

    const href =
      'mailto:' +
      FEEDBACK_EMAIL +
      '?subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(lines.join('\n'));

    window.location.href = href;
    showStatus('Your email app should open with the message ready to send.', false);
  });
})();
