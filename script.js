const apiKey = "52ab48e942b64ed092690100261801";

// DOM
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const spinner = document.getElementById('spinner');
const errorMsg = document.getElementById('errorMsg');
const unitSelect = document.getElementById('unitSelect');
const themeToggle = document.getElementById('themeToggle');

const currentSection = document.getElementById('current');
const weatherIcon = document.getElementById('weatherIcon');
const conditionText = document.getElementById('conditionText');
const placeEl = document.getElementById('place');
const tempEl = document.getElementById('temp');
const feelsEl = document.getElementById('feelslike');
const minmaxEl = document.getElementById('minmax');
const localtimeEl = document.getElementById('localtime');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const aqiEl = document.getElementById('aqi');
const forecastSection = document.getElementById('forecast');
const forecastCards = document.getElementById('forecastCards');
const historyList = document.getElementById('historyList');

let lastData = null;

function showSpinner() { spinner.classList.remove('hidden'); spinner.setAttribute('aria-hidden','false'); }
function hideSpinner() { spinner.classList.add('hidden'); spinner.setAttribute('aria-hidden','true'); }

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('visible');
}

function clearError() {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
}

function mapConditionToEmoji(text, isNight=false) {
    const t = text.toLowerCase();
    if (t.includes('sun') || t.includes('clear')) return '☀️';
    if (t.includes('cloud')) return '☁️';
    if (t.includes('rain') || t.includes('shower') || t.includes('drizzle')) return '🌧️';
    if (t.includes('snow') || t.includes('sleet') ) return '❄️';
    if (t.includes('thunder')) return '⛈️';
    if (t.includes('mist') || t.includes('fog') || t.includes('haze')) return '🌫️';
    return isNight ? '🌙' : '🌤️';
}

function updateBackground(conditionText, localtime) {
    const body = document.body;
    body.classList.remove('sunny','rain','cloud','snow','night');
    const t = conditionText.toLowerCase();
    if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) body.classList.add('rain');
    else if (t.includes('snow') || t.includes('sleet')) body.classList.add('snow');
    else if (t.includes('cloud')) body.classList.add('cloud');
    else body.classList.add('sunny');
    if (localtime && localtime.includes(' ')) {
        const timePart = localtime.split(' ')[1];
        const hour = parseInt(timePart.split(':')[0],10);
        if (hour < 6 || hour >= 19) body.classList.add('night');
    }
}

function renderCurrent(data) {
    const unit = localStorage.getItem('unit') || 'C';
    const loc = data.location;
    const cur = data.current;
    const today = data.forecast?.forecastday?.[0]?.day || null;

    lastData = data;

    placeEl.textContent = `${loc.name}, ${loc.country}`;
    conditionText.textContent = cur.condition.text;
    const emoji = mapConditionToEmoji(cur.condition.text, cur.is_day === 0);
    weatherIcon.textContent = emoji;

    const temp = unit === 'C' ? cur.temp_c + ' °C' : cur.temp_f + ' °F';
    tempEl.textContent = temp;
    feelsEl.textContent = `Feels like: ${unit === 'C' ? cur.feelslike_c + ' °C' : cur.feelslike_f + ' °F'}`;

    if (today) {
        const mint = unit === 'C' ? today.mintemp_c : today.mintemp_f;
        const maxt = unit === 'C' ? today.maxtemp_c : today.maxtemp_f;
        minmaxEl.textContent = `Min / Max: ${mint} / ${maxt}`;
    } else {
        minmaxEl.textContent = 'Min / Max: -- / --';
    }

    localtimeEl.textContent = `Local time: ${loc.localtime}`;
    humidityEl.textContent = `Humidity: ${cur.humidity}%`;
    windEl.textContent = `Wind: ${cur.wind_kph} km/h`;

    if (cur.air_quality) {
        const aq = cur.air_quality;
        aqiEl.textContent = `PM2.5: ${Math.round(aq['pm2_5'] || 0)}, PM10: ${Math.round(aq['pm10'] || 0)}`;
    } else {
        aqiEl.textContent = 'AQI: --';
    }

    updateBackground(cur.condition.text, loc.localtime);

    currentSection.classList.remove('hidden');
    document.getElementById('details').classList.remove('hidden');
    forecastSection.classList.remove('hidden');
}

function renderForecast(data) {
    forecastCards.innerHTML = '';
    const unit = localStorage.getItem('unit') || 'C';
    const days = data.forecast?.forecastday || [];
    days.forEach(day => {
        const date = day.date;
        const cond = day.day.condition.text;
        const emoji = mapConditionToEmoji(cond);
        const avg = unit === 'C' ? day.day.avgtemp_c : day.day.avgtemp_f;
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `<div class="fc-date">${date}</div><div class="fc-emoji">${emoji}</div><div class="fc-temp">${avg}°${unit}</div><div class="fc-cond">${cond}</div>`;
        forecastCards.appendChild(card);
    });
}

function updateHistory(city) {
    if (!city) return;
    let hist = JSON.parse(localStorage.getItem('weather_history') || '[]');
    hist = hist.filter(h => h.toLowerCase() !== city.toLowerCase());
    hist.unshift(city);
    hist = hist.slice(0,5);
    localStorage.setItem('weather_history', JSON.stringify(hist));
    renderHistory();
}

function renderHistory() {
    const hist = JSON.parse(localStorage.getItem('weather_history') || '[]');
    historyList.innerHTML = '';
    hist.forEach(city => {
        const li = document.createElement('li');
        li.textContent = city;
        li.addEventListener('click', () => { fetchWeather(city); });
        historyList.appendChild(li);
    });
}

function fetchWeather(query) {
    if (!query) { showError('Please enter a city name'); return; }
    clearError();
    showSpinner();
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=3&aqi=yes&alerts=yes`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            hideSpinner();
            if (data.error) {
                showError('Please enter a valid city name');
                return;
            }
            renderCurrent(data);
            renderForecast(data);
            updateHistory(data.location.name);
        })
        .catch(err => {
            hideSpinner();
            showError('Network error — please try again');
            console.error(err);
        });
}

function useGeolocation() {
    if (!navigator.geolocation) { showError('Geolocation not supported'); return; }
    showSpinner();
    navigator.geolocation.getCurrentPosition(pos => {
        const q = `${pos.coords.latitude},${pos.coords.longitude}`;
        fetchWeather(q);
    }, err => {
        hideSpinner();
        showError('Unable to retrieve location');
    });
}

function applyUnit(unit) {
    localStorage.setItem('unit', unit);
    if (lastData) { renderCurrent(lastData); renderForecast(lastData); }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

function init() {
    const savedUnit = localStorage.getItem('unit') || 'C';
    unitSelect.value = savedUnit;
    renderHistory();

    searchBtn.addEventListener('click', () => fetchWeather(locationInput.value.trim()));
    locationInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchWeather(locationInput.value.trim()); });
    locBtn.addEventListener('click', useGeolocation);
    unitSelect.addEventListener('change', e => applyUnit(e.target.value));
    themeToggle.addEventListener('click', toggleTheme);
}

init();







