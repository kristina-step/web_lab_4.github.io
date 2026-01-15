const CONFIG = {
    API_KEY: '4208d8616b7fcd29c05a0fa73e535be8',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    GEO_URL: 'https://api.openweathermap.org/geo/1.0',
    UNITS: 'metric',
    LANG: 'ru',
    STORAGE_KEY: 'weatherAppData'
};

const state = {
    cities: [],
    currentCityIndex: 0,
    weatherData: {}
};

const el = {
    refreshBtn: document.getElementById('refresh-btn'),
    addCityBtn: document.getElementById('add-city-btn'),
    citiesList: document.getElementById('cities-list'),
    forecastCards: document.querySelector('.forecast-cards'),

    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorMessage: document.getElementById('error-message'),

    currentWeather: document.getElementById('current-weather'),
    forecast: document.getElementById('forecast'),

    locationName: document.getElementById('location-name'),
    locationDate: document.getElementById('location-date'),
    locationTime: document.getElementById('location-time'),
    weatherIcon: document.getElementById('weather-icon'),
    currentTemp: document.getElementById('current-temp'),
    weatherDescription: document.getElementById('weather-description'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),

    modal: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    cancelBtn: document.getElementById('cancel-btn'),
    cityInput: document.getElementById('city-input'),
    cityError: document.getElementById('city-error'),
    addCitySubmit: document.getElementById('add-city-submit')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    loadState();
    setupEvents();

    if (state.cities.length === 0) {
        requestGeolocation();
    } else {
        loadWeatherForAllCities();
    }
}

function setupEvents() {
    el.refreshBtn.addEventListener('click', loadWeatherForAllCities);
    el.addCityBtn.addEventListener('click', showModal);
    el.modalClose.addEventListener('click', hideModal);
    el.cancelBtn.addEventListener('click', hideModal);
    el.addCitySubmit.addEventListener('click', addCityFromInput);

    el.modal.addEventListener('click', e => {
        if (e.target === el.modal) hideModal();
    });
}

function showModal() {
    el.modal.style.display = 'flex';
    el.cityInput.value = '';
    el.cityError.textContent = '';
}

function hideModal() {
    el.modal.style.display = 'none';
}

function loadState() {
    const data = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!data) return;
    const parsed = JSON.parse(data);
    state.cities = parsed.cities || [];
    state.currentCityIndex = parsed.currentCityIndex || 0;
}

function saveState() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        cities: state.cities,
        currentCityIndex: state.currentCityIndex
    }));
}

async function requestGeolocation() {
    showLoading();

    navigator.geolocation.getCurrentPosition(async pos => {
        state.cities.unshift({
            name: 'Текущее местоположение',
            displayName: 'Текущее местоположение',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            isCurrentLocation: true
        });
        saveState();
        await loadWeatherForAllCities();
    }, () => {
        showError('Разрешите геолокацию или добавьте город');
        showModal();
    });
}

async function loadWeatherForAllCities() {
    showLoading();
    state.weatherData = {};

    for (let i = 0; i < state.cities.length; i++) {
        const city = state.cities[i];
        state.weatherData[i] = await getWeather(city.lat, city.lon);
    }

    updateCitiesList();
    showWeather(state.currentCityIndex);
}

async function getWeather(lat, lon) {
    const w = await fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`).then(r => r.json());
    const f = await fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`).then(r => r.json());
    return { current: w, forecast: buildForecast(f.list) };
}

function buildForecast(list) {
    const days = {};
    list.forEach(i => {
        const d = new Date(i.dt * 1000).toLocaleDateString('ru-RU', { weekday:'short', day:'numeric', month:'short' });
        if (!days[d]) {
            days[d] = { date:d, min:i.main.temp_min, max:i.main.temp_max, icon:i.weather[0].icon, desc:i.weather[0].description };
        } else {
            days[d].min = Math.min(days[d].min, i.main.temp_min);
            days[d].max = Math.max(days[d].max, i.main.temp_max);
        }
    });
    return Object.values(days).slice(0,3);
}

function showWeather(i) {
    hideLoading();
    const city = state.cities[i];
    const w = state.weatherData[i].current;

    el.locationName.textContent = city.displayName;
    el.currentTemp.textContent = Math.round(w.main.temp);
    el.weatherDescription.textContent = w.weather[0].description;
    el.windSpeed.textContent = `${w.wind.speed} м/с`;
    el.humidity.textContent = `${w.main.humidity}%`;
    el.pressure.textContent = `${w.main.pressure} гПа`;
    el.visibility.textContent = `${(w.visibility/1000).toFixed(1)} км`;

    updateForecast(state.weatherData[i].forecast);

    el.currentWeather.style.display = 'block';
    el.forecast.style.display = 'block';
}

function updateCitiesList() {
    el.citiesList.innerHTML = '';

    state.cities.forEach((city, i) => {
        const item = document.createElement('div');
        item.className = `city-item ${i === state.currentCityIndex ? 'active' : ''}`;

        const info = document.createElement('div');
        info.className = 'city-info';

        const name = document.createElement('div');
        name.className = 'city-name';
        name.textContent = city.displayName;

        const temp = document.createElement('div');
        temp.className = 'city-temp';
        temp.textContent = `${Math.round(state.weatherData[i].current.main.temp)}°C`;

        info.append(name, temp);
        item.append(info);

        if (!city.isCurrentLocation) {
            const btn = document.createElement('button');
            btn.className = 'city-remove';
            btn.innerHTML = '<i class="fas fa-times"></i>';
            btn.onclick = e => {
                e.stopPropagation();
                removeCity(i);
            };
            item.append(btn);
        }

        item.onclick = () => {
            state.currentCityIndex = i;
            saveState();
            showWeather(i);
            updateCitiesList();
        };

        el.citiesList.append(item);
    });
}

function removeCity(i) {
    state.cities.splice(i,1);
    saveState();
    loadWeatherForAllCities();
}

function updateForecast(days) {
    el.forecastCards.innerHTML = '';
    days.forEach(d => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        const date = document.createElement('div');
        date.className = 'forecast-date';
        date.textContent = d.date;

        const icon = document.createElement('div');
        icon.className = 'forecast-icon';
        const i = document.createElement('i');
        i.className = getIcon(d.icon);
        icon.append(i);

        const temps = document.createElement('div');
        temps.className = 'forecast-temp';

        const max = document.createElement('div');
        max.className = 'temp-high';
        max.textContent = `${Math.round(d.max)}°`;

        const min = document.createElement('div');
        min.className = 'temp-low';
        min.textContent = `${Math.round(d.min)}°`;

        temps.append(max,min);
        card.append(date,icon,temps);
        el.forecastCards.append(card);
    });
}

function getIcon(code) {
    const m = { '01':'fas fa-sun','02':'fas fa-cloud-sun','03':'fas fa-cloud','04':'fas fa-cloud','09':'fas fa-cloud-rain','10':'fas fa-cloud-sun-rain','11':'fas fa-bolt','13':'fas fa-snowflake','50':'fas fa-smog'};
    return m[code.slice(0,2)] || 'fas fa-cloud';
}

function showLoading() {
    el.loading.style.display = 'flex';
    el.currentWeather.style.display = 'none';
    el.forecast.style.display = 'none';
}

function hideLoading() {
    el.loading.style.display = 'none';
}

function showError(msg) {
    el.errorMessage.textContent = msg;
    el.error.style.display = 'flex';
}

async function addCityFromInput() {
    const name = el.cityInput.value.trim();
    if (!name) return;

    const geo = await fetch(`${CONFIG.GEO_URL}/direct?q=${name}&limit=1&appid=${CONFIG.API_KEY}`).then(r=>r.json());
    if (!geo[0]) {
        el.cityError.textContent = 'Город не найден';
        return;
    }

    state.cities.push({
        name,
        displayName: geo[0].local_names?.ru || name,
        lat: geo[0].lat,
        lon: geo[0].lon,
        isCurrentLocation:false
    });

    saveState();
    hideModal();
    loadWeatherForAllCities();
}
