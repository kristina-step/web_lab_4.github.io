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
    weatherData: {},
    isLoading: false,
    error: null
};

const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    addCityBtn: document.getElementById('add-city-btn'),

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

    citiesList: document.getElementById('cities-list'),

    modalOverlay: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    cancelBtn: document.getElementById('cancel-btn'),
    cityInput: document.getElementById('city-input'),
    cityError: document.getElementById('city-error'),
    addCitySubmit: document.getElementById('add-city-submit'),

    forecastCards: document.querySelector('.forecast-cards')
};


document.addEventListener('DOMContentLoaded', init);

async function init() {
    loadState();
    setupEventListeners();

    if (state.cities.length === 0) {
        requestGeolocation();
    } else {
        await loadWeatherForAllCities();
        showWeather(state.currentCityIndex);
    }
}


function loadState() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        state.cities = data.cities || [];
        state.currentCityIndex = data.currentCityIndex || 0;
    }
}

function saveState() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        cities: state.cities,
        currentCityIndex: state.currentCityIndex
    }));
}


function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', loadWeatherForAllCities);
    elements.addCityBtn.addEventListener('click', showAddCityModal);
    elements.modalClose.addEventListener('click', hideAddCityModal);
    elements.cancelBtn.addEventListener('click', hideAddCityModal);

    elements.modalOverlay.addEventListener('click', e => {
        if (e.target === elements.modalOverlay) hideAddCityModal();
    });

    elements.addCitySubmit.addEventListener('click', addCityFromInput);

    elements.cityInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addCityFromInput();
    });
}


function requestGeolocation() {
    if (!navigator.geolocation) {
        showError('Геолокация не поддерживается');
        showAddCityModal();
        return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude, longitude } = pos.coords;

        state.cities.unshift({
            name: 'Текущее местоположение',
            displayName: 'Текущее местоположение',
            lat: latitude,
            lon: longitude,
            isCurrentLocation: true
        });

        saveState();
        await loadWeatherForAllCities();
        showWeather(0);
    }, () => {
        showError('Разрешите геолокацию или добавьте город вручную');
        showAddCityModal();
    });
}


async function loadWeatherForAllCities() {
    if (state.cities.length === 0) return;

    showLoading();

    try {
        const tasks = state.cities.map(async (city, i) => {
            state.weatherData[i] = await getWeatherData(city.lat, city.lon);
        });

        await Promise.all(tasks);
        updateCitiesList();
        showWeather(state.currentCityIndex);
    } catch {
        showError('Ошибка загрузки погоды');
    }
}

async function getWeatherData(lat, lon) {
    const weatherUrl = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`;
    const forecastUrl = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`;

    const [w, f] = await Promise.all([fetch(weatherUrl), fetch(forecastUrl)]);
    return {
        current: await w.json(),
        forecast: getDailyForecast((await f.json()).list)
    };
}

function getDailyForecast(list) {
    const days = {};

    list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });

        if (!days[date]) {
            days[date] = {
                date,
                temp_min: item.main.temp_min,
                temp_max: item.main.temp_max,
                icon: item.weather[0].icon,
                description: item.weather[0].description
            };
        } else {
            days[date].temp_min = Math.min(days[date].temp_min, item.main.temp_min);
            days[date].temp_max = Math.max(days[date].temp_max, item.main.temp_max);
        }
    });

    return Object.values(days).slice(0, 3);
}


function showWeather(index) {
    const data = state.weatherData[index];
    if (!data) return;

    hideLoading();
    hideError();

    const city = state.cities[index];
    const now = new Date();

    elements.locationName.innerHTML =
        `<i class="fas fa-${city.isCurrentLocation ? 'location-dot' : 'city'}"></i>
         <span>${city.displayName}</span>`;

    elements.locationDate.textContent = now.toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    elements.locationTime.textContent = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit'
    });

    elements.currentTemp.textContent = Math.round(data.current.main.temp);
    elements.weatherDescription.textContent = data.current.weather[0].description;
    elements.windSpeed.textContent = `${data.current.wind.speed} м/с`;
    elements.humidity.textContent = `${data.current.main.humidity}%`;
    elements.pressure.textContent = `${data.current.main.pressure} гПа`;
    elements.visibility.textContent = `${(data.current.visibility / 1000).toFixed(1)} км`;

    elements.weatherIcon.innerHTML =
        `<i class="fas fa-cloud"></i>`;

    updateForecast(data.forecast);

    elements.currentWeather.style.display = 'block';
    elements.forecast.style.display = 'block';
}

function updateForecast(forecast) {
    elements.forecastCards.innerHTML = '';

    forecast.forEach(day => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        card.innerHTML = `
            <div class="forecast-date">${day.date}</div>
            <div class="forecast-temp">
                <div>${Math.round(day.temp_max)}°</div>
                <div>${Math.round(day.temp_min)}°</div>
            </div>
            <div>${day.description}</div>
        `;

        elements.forecastCards.appendChild(card);
    });
}

function updateCitiesList() {
    elements.citiesList.innerHTML = '';

    state.cities.forEach((city, i) => {
        const el = document.createElement('div');
        el.className = `city-item ${i === state.currentCityIndex ? 'active' : ''}`;

        el.innerHTML = `
            <span>${city.displayName}</span>
            <span>${Math.round(state.weatherData[i]?.current.main.temp ?? 0)}°</span>
        `;

        el.addEventListener('click', () => {
            state.currentCityIndex = i;
            saveState();
            showWeather(i);
            updateCitiesList();
        });

        elements.citiesList.appendChild(el);
    });
}


async function addCityFromInput() {
    const name = elements.cityInput.value.trim();

    if (!name) {
        elements.cityError.textContent = 'Введите город';
        return;
    }

    if (state.cities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        elements.cityError.textContent = 'Город уже добавлен';
        return;
    }

    try {
        elements.addCitySubmit.disabled = true;

        const city = await getCityCoordinates(name);
        if (!city) {
            elements.cityError.textContent = 'Город не найден';
            return;
        }

        state.cities.push({
            name,
            displayName: city.local_names?.ru || name,
            lat: city.lat,
            lon: city.lon,
            isCurrentLocation: false
        });

        saveState();
        hideAddCityModal();
        await loadWeatherForAllCities();

        state.currentCityIndex = state.cities.length - 1;
        showWeather(state.currentCityIndex);

    } finally {
        elements.addCitySubmit.disabled = false;
    }
}

async function getCityCoordinates(name) {
    const url = `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(name)}&limit=1&appid=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    return (await res.json())[0];
}


function showAddCityModal() {
    elements.modalOverlay.style.display = 'flex';
    elements.cityInput.value = '';
    elements.cityError.textContent = '';
}

function hideAddCityModal() {
    elements.modalOverlay.style.display = 'none';
}

function showLoading() {
    elements.loading.style.display = 'flex';
    elements.currentWeather.style.display = 'none';
    elements.forecast.style.display = 'none';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function showError(msg) {
    elements.errorMessage.textContent = msg;
    elements.error.style.display = 'flex';
}

function hideError() {
    elements.error.style.display = 'none';
}
