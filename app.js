'use strict';
const cities={bangkok:{name:'Bangkok',latitude:13.7563,longitude:100.5018},chiangmai:{name:'Chiang Mai',latitude:18.7883,longitude:98.9853},phuket:{name:'Phuket',latitude:7.8804,longitude:98.3923}};
Object.assign(cities,{tokyo:{name:'Tokyo, Japan',latitude:35.6762,longitude:139.6503},london:{name:'London, United Kingdom',latitude:51.5074,longitude:-.1278},newyork:{name:'New York, United States',latitude:40.7128,longitude:-74.006},nairobi:{name:'Nairobi, Kenya',latitude:-1.2921,longitude:36.8219},sydney:{name:'Sydney, Australia',latitude:-33.8688,longitude:151.2093}});
let selected=cities.bangkok,map,marker,selectionVersion=0;
const $=id=>document.getElementById(id);
const conditions={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',56:'Light freezing drizzle',57:'Dense freezing drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',66:'Light freezing rain',67:'Heavy freezing rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',77:'Snow grains',80:'Slight rain showers',81:'Moderate rain showers',82:'Violent rain showers',85:'Slight snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with slight hail',99:'Thunderstorm with heavy hail'};
let controller;
async function loadWeather(){
  if(controller)controller.abort();
  const request=new AbortController();controller=request;
  const timer=setTimeout(()=>request.abort(),12000);
  const city=selected;const button=$('refresh');
  $('weather').hidden=true;$('status').className='';$('status').textContent='Loading weather…';button.disabled=true;
  try{
    const params=new URLSearchParams({latitude:city.latitude,longitude:city.longitude,current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',timezone:'auto'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:request.signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();const c=data.current;
    if(!c||!['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m'].every(k=>Number.isFinite(c[k]))||typeof c.time!=='string')throw new Error('Incomplete weather data');
    if(controller!==request)return;
    $('location').textContent=city.name;$('temperature').textContent=Math.round(c.temperature_2m)+' °C';$('condition').textContent=conditions[c.weather_code]||'Weather code '+c.weather_code;
    $('feels').textContent=Math.round(c.apparent_temperature)+' °C';$('humidity').textContent=c.relative_humidity_2m+'%';$('wind').textContent=c.wind_speed_10m+' km/h';
    $('updated').textContent='Weather time: '+c.time.replace('T',' ')+' ('+data.timezone+')';
    $('weather').hidden=false;$('status').textContent='Weather loaded.';
  }catch(error){if(controller!==request)return;$('status').className='error';$('status').textContent='We couldn’t load the weather. Check your connection, then select Refresh weather to try again.';}
  finally{clearTimeout(timer);if(controller===request)button.disabled=false;}
}
function selectPlace(place,zoom=8){
  if(!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)return;
  selectionVersion++;selected=place;$('selected-place').textContent=place.name+' · '+place.latitude.toFixed(2)+', '+place.longitude.toFixed(2);
  $('city').value=Object.keys(cities).find(key=>cities[key]===place)||'custom';
  if(map){const coords=[place.latitude,place.longitude];if(marker)marker.setLatLng(coords);else marker=L.circleMarker(coords,{radius:9,color:'#fff',weight:3,fillColor:'#119fc8',fillOpacity:1}).addTo(map);map.setView(coords,zoom);}
  loadWeather();
}
if(typeof location!=='undefined'&&location.protocol==='file:'){
  $('map').hidden=true;$('world').disabled=true;
  $('map-status').textContent='To display the map, open this app through a local web server or its published website. Opening index.html directly cannot identify the website to the map provider. City search still works.';
}else if(typeof L!=='undefined'){
  map=L.map('map',{scrollWheelZoom:false,worldCopyJump:true}).setView([20,15],2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map).on('tileerror',()=>{$('map-status').textContent='Some map tiles could not load. You can still search for a city.';}).on('load',()=>{});
  map.on('click',event=>{const point=event.latlng.wrap();selectPlace({name:'Selected map location',latitude:point.lat,longitude:point.lng},map.getZoom());});
}else{$('map-status').textContent='The map could not load. City search and weather are still available.';$('world').disabled=true;}
$('world').addEventListener('click',()=>{if(map)map.setView([20,15],2);});
let searchRequest;
$('search').addEventListener('input',()=>{if(searchRequest)searchRequest.abort();searchRequest=null;$('search-results').replaceChildren();$('search-status').textContent='';});
$('search-form').addEventListener('submit',async event=>{
  event.preventDefault();const name=$('search').value.trim();if(name.length<2){$('search-status').textContent='Enter at least two letters.';return;}
  if(searchRequest)searchRequest.abort();const request=new AbortController();searchRequest=request;
  const timer=setTimeout(()=>request.abort(),12000);$('search-results').replaceChildren();$('search-status').textContent='Searching worldwide…';
  try{const response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:8,language:'en',format:'json'}),{signal:request.signal});if(!response.ok)throw new Error('Search failed');const data=await response.json();if(searchRequest!==request)return;
    const results=(Array.isArray(data.results)?data.results:[]).filter(item=>typeof item.name==='string'&&Number.isFinite(item.latitude)&&Number.isFinite(item.longitude));
    $('search-status').textContent=results.length?'Choose a matching city:':'No cities found. Try another spelling or select a place on the map.';
    for(const item of results){const li=document.createElement('li'),button=document.createElement('button');button.type='button';const name=[item.name,item.admin1,item.country].filter(Boolean).join(', ');button.textContent=name;button.addEventListener('click',()=>{selectPlace({name,latitude:item.latitude,longitude:item.longitude});$('search-results').replaceChildren();$('search-status').textContent='Selected '+name;});li.append(button);$('search-results').append(li);}
  }catch(error){if(searchRequest===request)$('search-status').textContent='City search is unavailable. Try again or select a point on the map.';}finally{clearTimeout(timer);}
});
$('locate').addEventListener('click',()=>{
  if(!navigator.geolocation){$('gps-status').textContent='Location is unavailable in this browser. Please search for a city.';return;}
  if(!window.isSecureContext){$('gps-status').textContent='Location needs HTTPS or localhost. Please use city search for now.';return;}
  const version=selectionVersion;$('locate').disabled=true;$('gps-status').textContent='Waiting for your location permission…';
  navigator.geolocation.getCurrentPosition(position=>{
    $('locate').disabled=false;if(selectionVersion!==version){$('gps-status').textContent='Kept your newer location selection.';return;}
    const latitude=Number(position.coords.latitude.toFixed(2)),longitude=Number(position.coords.longitude.toFixed(2));
    $('gps-status').textContent='Using your approximate location. Browser location may be less precise than GPS.';selectPlace({name:'My approximate location',latitude,longitude},10);
  },error=>{$('locate').disabled=false;$('gps-status').textContent=error.code===1?'Location permission was denied. You can search for any city instead.':'Could not find your location. Try again or search for a city.';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
});
$('weather-form').addEventListener('submit',event=>{event.preventDefault();loadWeather();});$('city').addEventListener('change',()=>{if(cities[$('city').value])selectPlace(cities[$('city').value]);});
selectPlace(selected,2);
