(() => {
  'use strict';
  const form = document.querySelector('#inquiry-form');
  const destination = window.NINJABEAR_CONFIG?.contactUrl || '';
  // Email drafts require a confirmed owner-supplied mailto destination.
  if (!form || !/^mailto:[^?\s]+@[^?\s]+$/i.test(destination)) return;
  form.hidden = false;
  document.querySelector('[data-inquiry-unavailable]').hidden = true;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const fields = [['Name', 'name'], ['Email', 'email'], ['Business / project', 'business'], ['Existing website', 'website'], ['Project details', 'details'], ['Budget', 'budget'], ['Timeline', 'timeline']];
    const body = fields.map(([label, key]) => `${label}: ${String(data.get(key) || '').trim() || 'Not specified'}`).join('\n\n');
    const subject = 'Website project inquiry';
    window.location.href = `${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector('#inquiry-status').textContent = 'Your email app was requested. Review and send the draft there. If it did not open, use the Email me directly button below. Your inquiry has not been sent by this website.';
  });
})();
