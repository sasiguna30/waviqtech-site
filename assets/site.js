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
    if (!data) return;
    ['country', 'channel', 'entity', 'alternatives', 'currency'].forEach((key, index) => {
      document.querySelector('#selected-' + key).textContent = data[index];
    });
    const countryLink = document.querySelector('#selected-link');
    countryLink.href = selector.value + '.html';
    countryLink.textContent = 'Explore ' + data[0] + ' →';
  };
  selector.addEventListener('change', updateCountry);
  updateCountry();
}
