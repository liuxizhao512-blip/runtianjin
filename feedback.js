// Feedback form for the About page.
// Builds a mailto: link from the form fields and opens the user's email app.
// Set FEEDBACK_EMAIL below to the address that should receive messages.
(function () {
  const FEEDBACK_EMAIL = 'liuxizhao512@gmail.com';

  const form = document.getElementById('feedback-form');
  if (!form) return;

  const status = document.getElementById('feedback-status');
  const message = document.getElementById('feedback-message');

  function showStatus(text, isError) {
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle('is-error', Boolean(isError));
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
