'use strict';

(async () => {
 const el = id => document.getElementById(id);

 const destination = window.destinationReady
     ? await window.destinationReady
     : null;

 if (window.destinationReady && !destination) {
  return;
 }

 async function json(url, signal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
   throw new Error('HTTP ' + response.status);
  }

  return response.json();
 }

 const fallback = {
  USD: 'US Dollar',
  THB: 'Thai Baht',
  MMK: 'Myanmar Kyat',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  SGD: 'Singapore Dollar',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  KRW: 'South Korean Won'
 };

 function fillCurrencies(items) {
  const from =
      el('currency-from').value || 'USD';

  const to =
      el('currency-to').value ||
      destination?.currency ||
      'USD';

  for (const id of [
   'currency-from',
   'currency-to'
  ]) {
   el(id).replaceChildren();

   for (const [code, name] of items) {
    const option =
        document.createElement('option');

    option.value = code;
    option.textContent =
        code + ' — ' + name;

    el(id).append(option);
   }

   el(id).value =
       id === 'currency-from' ? from : to;
  }
 }

 if (
     destination?.currency &&
     !fallback[destination.currency]
 ) {
  fallback[destination.currency] =
      destination.currency;
 }

 fillCurrencies(Object.entries(fallback));

 async function currencies() {
  const request = new AbortController();
  const timer =
      setTimeout(() => request.abort(), 12000);

  try {
   const data = await json(
       'https://api.frankfurter.dev/v2/currencies',
       request.signal
   );

   if (!Array.isArray(data)) {
    throw new Error('Invalid currencies');
   }

   const rows = data
       .filter(
           currency =>
               /^[A-Z]{3}$/.test(currency.iso_code) &&
               typeof currency.name === 'string'
       )
       .map(
           currency => [
            currency.iso_code,
            currency.name
           ]
       );

   if (!rows.length) {
    throw new Error('No currencies');
   }

   fillCurrencies(
       rows.sort(
           (first, second) =>
               first[0].localeCompare(second[0])
       )
   );

   el('currency-list-status').textContent = '';
  } catch {
   el('currency-list-status').textContent =
       'Showing common currencies. The full currency ' +
       'list is temporarily unavailable.';
  } finally {
   clearTimeout(timer);
  }
 }

 let conversionRequest;

 function invalidate() {
  if (conversionRequest) {
   conversionRequest.abort();
  }

  conversionRequest = null;
  el('exchange-result').hidden = true;

  el('exchange-status').textContent =
      'Select Convert to update the amount.';

  el('convert').disabled = false;
 }

 for (const id of [
  'amount',
  'currency-from',
  'currency-to'
 ]) {
  el(id).addEventListener('input', invalidate);
 }

 el('swap').addEventListener('click', () => {
  const old = el('currency-from').value;

  el('currency-from').value =
      el('currency-to').value;

  el('currency-to').value = old;

  invalidate();
  convert();
 });

 async function convert() {
  if (conversionRequest) {
   conversionRequest.abort();
  }

  const request = new AbortController();
  conversionRequest = request;

  const amount = Number(el('amount').value);
  const base = el('currency-from').value;
  const quote = el('currency-to').value;

  el('exchange-result').hidden = true;

  if (
      !el('amount').value.trim() ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 1e12 ||
      !base ||
      !quote
  ) {
   el('exchange-status').textContent =
       'Enter an amount from 0 to 1,000,000,000,000 ' +
       'and select two currencies.';

   return;
  }

  const timer =
      setTimeout(() => request.abort(), 12000);

  el('convert').disabled = true;

  el('exchange-status').textContent =
      'Getting the latest available rate…';

  try {
   const data =
       base === quote
           ? {
            rate: 1,
            date: null,
            base,
            quote
           }
           : await json(
               'https://api.frankfurter.dev/v2/rate/' +
               base.toLowerCase() +
               '/' +
               quote.toLowerCase(),
               request.signal
           );

   if (conversionRequest !== request) {
    return;
   }

   if (
       !Number.isFinite(data.rate) ||
       data.rate <= 0 ||
       (
           base !== quote &&
           (
               !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
               data.base !== base ||
               data.quote !== quote
           )
       )
   ) {
    throw new Error('Invalid rate');
   }

   const format = (number, code) =>
       new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code
       }).format(number);

   el('conversion').textContent =
       format(amount, base) +
       ' = ' +
       format(amount * data.rate, quote);

   el('rate-detail').textContent =
       base === quote
           ? 'Same currency: no conversion needed.'
           : '1 ' +
           base +
           ' = ' +
           data.rate +
           ' ' +
           quote +
           ' · Rate date: ' +
           data.date;

   el('exchange-result').hidden = false;

   el('exchange-status').textContent =
       'Conversion ready.';
  } catch {
   if (conversionRequest === request) {
    el('exchange-status').textContent =
        'The rate for this pair is unavailable. ' +
        'Check your connection, try another currency, ' +
        'or try again later.';
   }
  } finally {
   clearTimeout(timer);

   if (conversionRequest === request) {
    el('convert').disabled = false;
   }
  }
 }

 el('exchange-form').addEventListener(
     'submit',
     event => {
      event.preventDefault();
      convert();
     }
 );

 let newsRequest;

 async function news() {
  if (newsRequest) {
   newsRequest.abort();
  }

  const request = new AbortController();
  newsRequest = request;

  const timer =
      setTimeout(() => request.abort(), 15000);

  el('news-refresh').disabled = true;
  el('news-list').replaceChildren();

  el('news-status').textContent =
      'Finding news about ' +
      (destination?.name || 'your selected place') +
      '…';

  try {
   const placeName = destination?.name || '';
   const country = destination?.country || '';

   const terms =
       destination?.feature_code === 'PCLI'
           ? `"${placeName}" when:30d`
           : `"${placeName}" ${country} when:30d`;

   const feed =
       'https://news.google.com/rss/search?' +
       new URLSearchParams({
        q: terms,
        hl: 'en-US',
        gl: 'US',
        ceid: 'US:en'
       });

   const searchUrl =
       'https://news.google.com/search?' +
       new URLSearchParams({
        q: terms,
        hl: 'en-US',
        gl: 'US',
        ceid: 'US:en'
       });

   el('news-source-link').href = searchUrl;

   const data = await json(
       'https://api.rss2json.com/v1/api.json?' +
       new URLSearchParams({
        rss_url: feed
       }),
       request.signal
   );

   if (newsRequest !== request) {
    return;
   }

   if (
       data.status !== 'ok' ||
       !Array.isArray(data.items)
   ) {
    throw new Error('Feed unavailable');
   }

   let count = 0;

   for (const item of data.items.slice(0, 8)) {
    let url;

    try {
     url = new URL(item.link);
    } catch {
     continue;
    }

    if (
        url.protocol !== 'https:' ||
        url.hostname !== 'news.google.com' ||
        typeof item.title !== 'string' ||
        !item.title.trim()
    ) {
     continue;
    }

    const listItem =
        document.createElement('li');

    const link =
        document.createElement('a');

    const meta =
        document.createElement('p');

    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title;

    const stamp =
        typeof item.pubDate === 'string'
            ? item.pubDate
            : '';

    meta.className = 'muted';

    meta.textContent =
        'Google News' +
        (
            stamp
                ? ' · Published ' + stamp + ' UTC'
                : ''
        );

    listItem.append(link, meta);
    el('news-list').append(listItem);

    count++;
   }

   el('news-status').textContent = count
       ? 'Showing recent news for ' +
       placeName +
       '. Retrieved ' +
       new Date().toLocaleTimeString() +
       '.'
       : 'No recent news about ' +
       (placeName || 'this location') +
       ' was found. Try again later.';
  } catch {
   if (newsRequest === request) {
    el('news-status').textContent =
        'News for this destination could not load. ' +
        'Please try again later.';
   }
  } finally {
   clearTimeout(timer);

   if (newsRequest === request) {
    el('news-refresh').disabled = false;
   }
  }
 }

 el('news-refresh').addEventListener(
     'click',
     news
 );

 currencies();
 convert();
 news();
})();