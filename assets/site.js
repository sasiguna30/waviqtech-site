'use strict';
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
if (menuButton && navigation) {
  const narrow = window.matchMedia('(max-width: 900px)');
  const resetMenu = () => {
    menuButton.hidden = !narrow.matches;
    navigation.hidden = narrow.matches;
    menuButton.setAttribute('aria-expanded', String(!narrow.matches));
  };
  resetMenu();
  narrow.addEventListener('change', resetMenu);
  menuButton.addEventListener('click', () => {
    navigation.hidden = !navigation.hidden;
    menuButton.setAttribute('aria-expanded', String(!navigation.hidden));
  });
  navigation.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches) {
      navigation.hidden = true;
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.focus();
    }
  });
}
const selector = document.querySelector('#country-selector');
if (selector) {
  const countries = {
    canada: ['Canada', 'SMS', 'Waviq Technologies Inc.', 'Facebook Messenger and WhatsApp', 'CAD'],
    usa: ['USA', 'SMS', 'Waviq Technologies LLC.', 'WhatsApp and Facebook Messenger', 'USD'],
    india: ['India', 'WhatsApp', 'Waviq Technologies Private Limited.', 'Instagram and SMS', 'INR']
  };
  const updateCountry = () => {
    const data = countries[selector.value];
    const contactChannels = { india: 'whatsapp', canada: 'sms', usa: 'consultation' };
    const channel = data ? contactChannels[selector.value] : null;
    document.querySelectorAll('[data-contact-channel]').forEach(card => {
      card.hidden = card.dataset.contactChannel !== channel;
    });
    document.querySelector('#contact-prompt').hidden = Boolean(data);
    document.querySelector('#assistant-instructions').hidden = !data || channel === 'consultation';
    document.querySelector('#automation-contact-heading').textContent =
      channel === 'consultation' ? 'Request a Consultation' : 'Waviq Automated Assistants';
    const recommendation = document.querySelector('#country-recommendation');
    if (recommendation) recommendation.hidden = !data;
    if (!data) return;
    ['country', 'channel', 'entity', 'alternatives', 'currency'].forEach((key, index) => {
      const field = document.querySelector('#selected-' + key);
      if (field) field.textContent = data[index];
    });
    const countryLink = document.querySelector('#selected-link');
    if (countryLink) {
      countryLink.href = selector.value + '.html';
      countryLink.textContent = 'Explore ' + data[0] + ' →';
    }
  };
  selector.addEventListener('change', updateCountry);
  updateCountry();
}

// SMS body syntax: RFC 5724 for Android/other handlers; Apple Messages uses &body=.
// Includes iPadOS desktop user agents. Native app behavior still needs device testing.
// https://www.rfc-editor.org/rfc/rfc5724.html
// https://docs.sendblue.com/guides/imessage-link-button/
const usesAppleMessages = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(navigator.userAgent)
  && !/Android/i.test(navigator.userAgent);
if (usesAppleMessages) {
  document.querySelectorAll('a[href^="sms:"]').forEach(link => {
    link.setAttribute('href', link.getAttribute('href').replace('?body=', '&body='));
  });
}
