'use strict';

window.destinationReady = (async () => {
 const el = id => document.getElementById(id);

 const id = new URLSearchParams(location.search).get('id');

 async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
   const response = await fetch(url, {
    signal: controller.signal
   });

   if (!response.ok) {
    throw new Error('Unavailable');
   }

   return await response.json();
  } finally {
   clearTimeout(timer);
  }
 }

 try {
  let place;

  if (/^\d+$/.test(id || '')) {
   place = await get(
       'https://geocoding-api.open-meteo.com/v1/get?id=' +
       id +
       '&language=en'
   );
  } else {
   const query = new URLSearchParams(location.search);
   const latitude = query.get('lat');
   const longitude = query.get('lon');

   if (
       latitude === null ||
       longitude === null ||
       !Number.isFinite(Number(latitude)) ||
       !Number.isFinite(Number(longitude)) ||
       Math.abs(Number(latitude)) > 90 ||
       Math.abs(Number(longitude)) > 180
   ) {
    throw new Error(
        'Choose a destination from the search page.'
    );
   }

   place = {
    name: 'My approximate location',
    latitude: Number(latitude),
    longitude: Number(longitude),
    timezone:
    Intl.DateTimeFormat().resolvedOptions().timeZone
   };
  }

  if (
      !Number.isFinite(place.latitude) ||
      !Number.isFinite(place.longitude) ||
      !place.name
  ) {
   throw new Error(
       'This destination could not be found.'
   );
  }

  window.destination = place;

  el('destination-name').textContent = place.name;

  document.title =
      place.name + ' | Pookie Bear Campus Explorer';

  el('destination-type').textContent =
      place.feature_code === 'PCLI'
          ? 'COUNTRY GUIDE'
          : 'CITY AND PLACE GUIDE';

  el('destination-subtitle').textContent = [
   place.admin1,
   place.country
  ]
      .filter(
          (value, index, array) =>
              value &&
              value !== place.name &&
              array.indexOf(value) === index
      )
      .join(' · ');

  el('fact-country').textContent =
      place.country || 'Not available';

  function clock() {
   try {
    el('fact-time').textContent =
        new Intl.DateTimeFormat(undefined, {
         timeZone: place.timezone,
         dateStyle: 'medium',
         timeStyle: 'short'
        }).format(new Date());
   } catch {
    el('fact-time').textContent = 'Not available';
   }
  }

  clock();
  setInterval(clock, 60000);

  if (
      typeof L !== 'undefined' &&
      location.protocol !== 'file:'
  ) {
   const map = L.map('destination-map', {
    scrollWheelZoom: false
   }).setView(
       [place.latitude, place.longitude],
       place.feature_code === 'PCLI' ? 5 : 10
   );

   L.tileLayer(
       'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
       {
        maxZoom: 18,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">' +
            'OpenStreetMap contributors</a>'
       }
   ).addTo(map);

   L.circleMarker(
       [place.latitude, place.longitude],
       {
        radius: 8,
        color: '#fff',
        fillColor: '#119fc8',
        fillOpacity: 1
       }
   ).addTo(map);
  } else {
   el('destination-map-status').textContent =
       'Use the local website or published URL to display the map.';
  }

  async function weather() {
   el('destination-refresh').disabled = true;

   el('destination-weather-status').textContent =
       'Loading weather…';

   el('destination-weather-result').hidden = true;
   el('destination-weather-time').textContent = '';

   try {
    const data = await get(
        'https://api.open-meteo.com/v1/forecast?' +
        new URLSearchParams({
         latitude: place.latitude,
         longitude: place.longitude,
         current:
             'temperature_2m,relative_humidity_2m,' +
             'apparent_temperature,weather_code,' +
             'wind_speed_10m',
         timezone: 'auto'
        })
    );

    const current = data.current;

    if (
        !current ||
        ![
         'temperature_2m',
         'relative_humidity_2m',
         'apparent_temperature',
         'weather_code',
         'wind_speed_10m'
        ].every(key => Number.isFinite(current[key]))
    ) {
     throw new Error('Missing data');
    }

    el('destination-temperature').textContent =
        Math.round(current.temperature_2m) + ' °C';

    el('destination-condition').textContent =
        current.weather_code === 0
            ? 'Clear sky'
            : current.weather_code <= 3
                ? 'Cloudy'
                : current.weather_code <= 48
                    ? 'Fog'
                    : current.weather_code <= 67
                        ? 'Rain or drizzle'
                        : current.weather_code <= 77
                            ? 'Snow'
                            : current.weather_code <= 82
                                ? 'Rain showers'
                                : current.weather_code <= 86
                                    ? 'Snow showers'
                                    : 'Thunderstorm';

    el('destination-feels').textContent =
        'Feels like ' +
        Math.round(current.apparent_temperature) +
        ' °C';

    el('destination-humidity').textContent =
        'Humidity ' +
        current.relative_humidity_2m +
        '%';

    el('destination-wind').textContent =
        'Wind ' +
        current.wind_speed_10m +
        ' km/h';

    el('destination-weather-time').textContent =
        'Weather time: ' +
        current.time +
        ' · ' +
        data.timezone;

    el('destination-weather-result').hidden = false;

    el('destination-weather-status').textContent =
        'Weather loaded.';
   } catch {
    el('destination-weather-status').textContent =
        'Weather is unavailable. Please try again.';
   } finally {
    el('destination-refresh').disabled = false;
   }
  }

  el('destination-refresh').addEventListener(
      'click',
      weather
  );

  weather();

  try {
   const countries = await get(
       'country-currencies.json'
   );

   const codes = (
       countries[place.country_code] || []
   ).filter(code => /^[A-Z]{3}$/.test(code));

   place.currency = codes[0];

   el('fact-currency').textContent =
       codes.join(', ') || 'Not available';
  } catch {
   el('fact-currency').textContent = 'Choose below';
  }

  return place;
 } catch (error) {
  for (const id of [
   'destination-about',
   'destination-weather',
   'exchange',
   'news'
  ]) {
   el(id).hidden = true;
  }

  el('destination-name').textContent =
      'Destination unavailable';

  el('destination-error').hidden = false;

  el('destination-error').textContent =
      error.message +
      ' Return to search and try again.';

  return null;
 }
})();