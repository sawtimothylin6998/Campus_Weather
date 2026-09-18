# Pookie Bear Campus Explorer pages

## Start here

Open `index.html` through a local web server or your Render website. The homepage focuses on place search. Type at least three letters for automatic search, or press Explore after two letters. Choose a matching city or country. A destination photograph and interactive map appear. Click the photograph to open `destination.html?id=...`.

The destination page retrieves the selected place by its Open-Meteo/GeoNames identifier, so it can be bookmarked, reloaded and shared. It includes location weather, a map, local time, country currency, a converter, and location-based news. The browser Back button and Search another place link return to search.

Country weather describes the map marker only; it is not a national average. The news section searches Google News for the selected place and, for a city, includes its country to improve relevance. Results are limited to recent headlines. Currency selections use Unicode CLDR territory data, dated 15 September 2026. Currency rates remain supplied by Frankfurter. Multiple currencies can exist in a country; the first listed is selected initially and can be changed.

## Photo sources

Wikimedia Commons search finds destination landscape or skyline photographs dynamically. The preview credits the returned creator and licence and links to the original file page. Images are not bundled or fabricated. Search can occasionally return a poor match or no usable photograph; the destination link remains available if the image service fails. A photograph is illustrative and may show an older view.

## Deployment files

Upload **all files in this folder**, including both HTML pages, the JavaScript files, stylesheet, `pookie-bear-icon.png`, `country-currencies.json`, and `UNICODE-LICENSE.txt`. Publish directory remains `.`. There is no build dependency or API secret. The earlier single-page report draft must be revised to describe this updated application before submission.

## Sources

- Places and weather: https://open-meteo.com/en/docs/geocoding-api and https://open-meteo.com/en/docs
- Photos and licences: https://commons.wikimedia.org/
- Currency territory data: https://github.com/unicode-org/cldr-json/blob/main/cldr-json/cldr-core/supplemental/currencyData.json (CLDR 48; licence included)
- Rates: https://frankfurter.dev/
- News: https://news.google.com/ through https://rss2json.com/docs
- Maps: https://www.openstreetmap.org/copyright
