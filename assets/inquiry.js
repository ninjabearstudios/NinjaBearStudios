(() => {
  'use strict';
  const form = document.querySelector('#inquiry-form');
  if (!form) return;
  const button = form.querySelector('[type="submit"]');
  const status = document.querySelector('#inquiry-status');
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your inquiry…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: new FormData(form),
        headers: { Accept: 'application/json' }, signal: controller.signal
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const messages = Array.isArray(result.errors) ? result.errors.map(error => error.message).filter(message => typeof message === 'string').join(' ') : '';
        throw new Error(messages || 'The form service could not accept your inquiry. Please try again.');
      }
      form.reset();
      status.textContent = 'Thank you! Your inquiry has been submitted. I’ll reply to the email address you provided.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' || error instanceof TypeError
        ? 'Submission could not be confirmed. Your details are still here; check your connection and try again.'
        : `Your inquiry was not submitted. ${error.message}`;
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      button.textContent = 'Send inquiry';
      form.removeAttribute('aria-busy');
      status.focus();
    }
  });
})();
