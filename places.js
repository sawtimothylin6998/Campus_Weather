'use strict';

(() => {
 const el = id => document.getElementById(id);

 let request;
 let photoRequest;
 let map;
 let marker;

 async function get(url, signal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
   throw new Error('Provider HTTP ' + response.status);
  }

  return response.json();
 }

 function linkFor(place) {
  return 'destination.html?' + new URLSearchParams({
   id: place.id
  });
 }

 async function preview(place) {
  el('place-preview').hidden = false;
  el('place-name').textContent = place.name;

  el('place-type').textContent =
      (place.feature_code === 'PCLI' ? 'COUNTRY' : 'CITY OR PLACE') +
      ' · ' +
      (place.country || '');

  el('place-link').href = linkFor(place);
  el('place-photo').hidden = true;
  el('photo-placeholder').hidden = false;
  el('photo-placeholder').textContent =
      'Finding a destination photo…';

  el('photo-credit').replaceChildren();

  if (typeof L !== 'undefined' && location.protocol !== 'file:') {
   if (!map) {
    map = L.map('preview-map', {
     scrollWheelZoom: false
    });

    L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
         maxZoom: 18,
         attribution:
             '&copy; <a href="https://www.openstreetmap.org/copyright">' +
             'OpenStreetMap contributors</a>'
        }
    ).addTo(map);
   }

   map.invalidateSize();

   map.setView(
       [place.latitude, place.longitude],
       place.feature_code === 'PCLI' ? 5 : 10
   );

   if (marker) {
    marker.setLatLng([place.latitude, place.longitude]);
   } else {
    marker = L.circleMarker(
        [place.latitude, place.longitude],
        {
         radius: 8,
         color: '#fff',
         fillColor: '#119fc8',
         fillOpacity: 1
        }
    ).addTo(map);
   }
  } else {
   el('preview-map-status').textContent =
       'Open the local website or published URL to display the map.';
  }

  if (photoRequest) {
   photoRequest.abort();
  }

  const photo = new AbortController();
  photoRequest = photo;

  const timer = setTimeout(() => photo.abort(), 15000);

  try {
   const query =
       place.name +
       ' ' +
       (
           place.feature_code === 'PCLI'
               ? 'landscape'
               : (place.country || '') + ' skyline'
       ) +
       ' filetype:bitmap -intitle:map -intitle:flag';

   const data = await get(
       'https://commons.wikimedia.org/w/api.php?' +
       new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrnamespace: 6,
        gsrlimit: 4,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: 1000,
        format: 'json',
        origin: '*'
       }),
       photo.signal
   );

   if (photoRequest !== photo) {
    return;
   }

   const pages = Object.values(data.query?.pages || {})
       .sort((a, b) => (a.index || 0) - (b.index || 0));

   const chosen = pages.find(
       page => page.imageinfo?.[0]?.thumburl
   );

   if (!chosen) {
    throw new Error('No photo');
   }

   const info = chosen.imageinfo[0];
   const url = new URL(info.thumburl);

   if (
       url.protocol !== 'https:' ||
       ![
        'upload.wikimedia.org',
        'thumb.wikimedia.org'
       ].includes(url.hostname)
   ) {
    throw new Error('Invalid photo');
   }

   el('place-photo').onload = () => {
    if (photoRequest !== photo) {
     return;
    }

    el('place-photo').hidden = false;
    el('photo-placeholder').hidden = true;
   };

   el('place-photo').onerror = () => {
    if (photoRequest === photo) {
     el('place-photo').hidden = true;
     el('photo-placeholder').hidden = false;
     el('photo-placeholder').textContent =
         'Photo unavailable — open destination';
    }
   };

   el('place-photo').alt = chosen.title.replace(/^File:/, '');
   el('place-photo').src = url.href;

   const plain = value =>
       new DOMParser()
           .parseFromString(value || '', 'text/html')
           .body.textContent;

   const sourceLink = document.createElement('a');

   sourceLink.href =
       'https://commons.wikimedia.org/wiki/' +
       encodeURIComponent(chosen.title);

   sourceLink.target = '_blank';
   sourceLink.rel = 'noopener';
   sourceLink.textContent = 'Photo source and licence';

   el('photo-credit').append(
       document.createTextNode(
           (plain(info.extmetadata?.Artist?.value) ||
               'Wikimedia Commons') +
           ' · ' +
           (plain(info.extmetadata?.LicenseShortName?.value) ||
               'See licence') +
           ' · '
       ),
       sourceLink
   );
  } catch (error) {
   console.warn('Destination photo:', error.message);

   if (photoRequest === photo) {
    el('photo-placeholder').textContent =
        'Photo unavailable — open destination';
   }
  } finally {
   clearTimeout(timer);
  }
 }

 async function search() {
  const name = el('place-query').value.trim();

  if (name.length < 2) {
   return;
  }

  if (request) {
   request.abort();
  }

  const current = new AbortController();
  request = current;

  const timer = setTimeout(() => current.abort(), 12000);

  el('place-status').textContent = 'Finding places…';
  el('place-matches').replaceChildren();
  el('place-preview').hidden = true;

  try {
   const data = await get(
       'https://geocoding-api.open-meteo.com/v1/search?' +
       new URLSearchParams({
        name,
        count: 8,
        language: 'en',
        format: 'json'
       }),
       current.signal
   );

   if (request !== current) {
    return;
   }

   const results = (data.results || []).filter(
       place =>
           Number.isInteger(place.id) &&
           Number.isFinite(place.latitude) &&
           Number.isFinite(place.longitude)
   );

   el('place-status').textContent = results.length
       ? 'Choose a place below, then click its photo to explore.'
       : 'No matching places. Try another spelling.';

   for (const place of results) {
    const listItem = document.createElement('li');
    const button = document.createElement('button');

    button.type = 'button';

    button.textContent = [
     place.name,
     place.admin1,
     place.country
    ]
        .filter(
            (value, index, array) =>
                value && array.indexOf(value) === index
        )
        .join(', ');

    button.addEventListener(
        'click',
        () => preview(place)
    );

    listItem.append(button);
    el('place-matches').append(listItem);
   }

   if (results.length) {
    preview(results[0]);
   }
  } catch {
   if (request === current) {
    el('place-status').textContent =
        'Place search is unavailable. Please try again.';
   }
  } finally {
   clearTimeout(timer);
  }
 }

 el('nearby').addEventListener('click', () => {
  if (!navigator.geolocation || !window.isSecureContext) {
   el('place-status').textContent =
       'Location needs a supported browser on HTTPS or localhost. ' +
       'You can search instead.';

   return;
  }

  el('nearby').disabled = true;
  el('place-status').textContent =
      'Waiting for location permission…';

  navigator.geolocation.getCurrentPosition(
      position => {
       location.href =
           'destination.html?' +
           new URLSearchParams({
            lat: position.coords.latitude.toFixed(2),
            lon: position.coords.longitude.toFixed(2)
           });
      },
      () => {
       el('nearby').disabled = false;

       el('place-status').textContent =
           'Location was unavailable or permission was denied. ' +
           'Please search for a place.';
      },
      {
       enableHighAccuracy: false,
       timeout: 10000,
       maximumAge: 60000
      }
  );
 });

 let debounce;

 el('place-query').addEventListener('input', () => {
  clearTimeout(debounce);

  if (request) {
   request.abort();
  }

  request = null;

  if (photoRequest) {
   photoRequest.abort();
  }

  photoRequest = null;

  el('place-preview').hidden = true;
  el('place-matches').replaceChildren();
  el('place-status').textContent = '';

  if (el('place-query').value.trim().length >= 3) {
   debounce = setTimeout(search, 700);
  }
 });

 el('place-search').addEventListener('submit', event => {
  event.preventDefault();
  clearTimeout(debounce);
  search();
 });
})();