'use strict';
(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const fields = form.querySelector('fieldset');
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#enquiry-status');
  let apiBase;
  let widget;
  let token = '';
  let sending = false;
  let ready = false;
  let attempt = null;
  const labels = { name: 'Name', email: 'Email', phone: 'Phone number', country: 'Country', enquiry: 'Your enquiry' };
  const unavailable = 'Online enquiries are temporarily unavailable. Please try again later. Our business email is info@waviqtech.com.';
  const show = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  const updateButton = () => { button.disabled = !ready || sending || !token; };
  const resetSpam = () => {
    token = '';
    if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
    updateButton();
  };
  form.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!ready || sending) return;
    for (const key of ['name', 'email', 'enquiry']) {
      form.elements[key].setCustomValidity(form.elements[key].value.trim() ? '' : 'Please complete this field.');
    }
    const phone = form.elements.phone.value.trim();
    const phoneDigits = phone.replace(/\D/g, '').length;
    form.elements.phone.setCustomValidity(!phone || (/^\+[1-9][0-9 ()-]*$/.test(phone) && phoneDigits >= 7 && phoneDigits <= 15) ? '' : 'Include a country code beginning with + and 7 to 15 digits.');
    if (!form.reportValidity()) return;
    if (!token) { show('Please complete the spam check before sending.', 'error'); return; }
    const values = Object.fromEntries(Object.keys(labels).map(key => [key, form.elements[key].value.trim()]));
    const serialized = JSON.stringify(values);
    // Keep the same request key for unchanged retries, including an uncertain network outcome.
    // Inputs are held only in this page's memory, never localStorage or analytics.
    if (!attempt || attempt.serialized !== serialized) attempt = { serialized, id: crypto.randomUUID() };
    sending = true;
    fields.disabled = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    show('Sending your enquiry…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch(new URL('/api/enquiries/submit', apiBase), {
        method: 'POST', credentials: 'omit', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, website: form.elements.website.value,
          request_id: attempt.id, turnstile_token: token })
      });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) {
        const fieldNames = Array.isArray(result.fields) ? result.fields.filter(key => labels[key]).map(key => labels[key]) : [];
        if (response.status === 422) show('Please check your details' + (fieldNames.length ? ': ' + fieldNames.join(', ') : '') + '. Your information has been kept.', 'error');
        else if (response.status === 429) show('Too many attempts. Please wait an hour before trying again. Your information has been kept.', 'error');
        else if (response.status === 400) show('The spam check could not be verified. Please complete it again. Your information has been kept.', 'error');
        else show('We could not confirm sending your enquiry. Your information has been kept. Please try again later.', 'error');
        return;
      }
      form.reset();
      attempt = null;
      show('Your enquiry has been accepted for delivery to Waviq.', 'success');
    } catch {
      show('We could not confirm sending your enquiry. Your information has been kept. Check your connection and try again later.', 'error');
    } finally {
      clearTimeout(timer);
      sending = false;
      fields.disabled = false;
      form.removeAttribute('aria-busy');
      resetSpam();
    }
  });
  async function initialise() {
    try {
      const configResponse = await fetch('assets/enquiry-config.json', { cache: 'no-store' });
      if (!configResponse.ok) throw new Error('Unavailable');
      const config = await configResponse.json();
      if (config.enabled !== true || !config.apiBaseUrl) return;
      apiBase = new URL(config.apiBaseUrl);
      if (apiBase.protocol !== 'https:' || apiBase.username || apiBase.password || apiBase.search || apiBase.hash || apiBase.pathname !== '/') throw new Error('Invalid configuration');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let publicConfig;
      try {
        const response = await fetch(new URL('/api/enquiries/config', apiBase), { credentials: 'omit', cache: 'no-store', signal: controller.signal });
        publicConfig = await response.json();
        if (!response.ok || publicConfig.enabled !== true || typeof publicConfig.turnstileSiteKey !== 'string' || !publicConfig.turnstileSiteKey) throw new Error('Unavailable');
      } finally { clearTimeout(timer); }
      if (!crypto.randomUUID) throw new Error('Unsupported browser');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
      widget = window.turnstile.render('#enquiry-spam-check', {
        sitekey: publicConfig.turnstileSiteKey, action: 'enquiry', size: 'flexible',
        callback: value => { token = value; updateButton(); },
        'expired-callback': () => { token = ''; updateButton(); },
        'error-callback': () => { token = ''; updateButton(); show('The spam check is unavailable. Please try again later.', 'error'); }
      });
      ready = true;
      fields.disabled = false;
      show('Complete the required fields and spam check, then select Send Enquiry.');
      updateButton();
    } catch {
      show(unavailable, 'error');
    }
  }
  initialise();
})();
