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
    forecastCards: document.querySelector('.forecast-cards'),

    modalOverlay: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    cancelBtn: document.getElementById('cancel-btn'),
    cityInput: document.getElementById('city-input'),
    cityError: document.getElementById('city-error'),
    addCitySubmit: document.getElementById('add-city-submit'),
    suggestions: document.getElementById('suggestions')
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
    if (!saved) return;

    const parsed = JSON.parse(saved);
    state.cities = parsed.cities || [];
    state.currentCityIndex = parsed.currentCityIndex || 0;
}

function saveState() {
    localStorage.setItem(
        CONFIG.STORAGE_KEY,
        JSON.stringify({
            cities: state.cities,
            currentCityIndex: state.currentCityIndex
        })
    );
}


function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', loadWeatherForAllCities);
    elements.addCityBtn.addEventListener('click', showAddCityModal);
    elements.modalClose.addEventListener('click', hideAddCityModal);
    elements.cancelBtn.addEventListener('click', hideAddCityModal);

    elements.modalOverlay.addEventListener('click', e => {
        if (e.target === elements.modalOverlay) hideAddCityModal();
    });

    // elements.cityInput.addEventListener('input', handleCityInput);
    // elements.addCitySubmit.addEventListener('click', addCityFromInput);

    // elements.cityInput.addEventListener('keydown', e => {
    //     if (e.key === 'Enter') addCityFromInput();
    // });

    document.querySelectorAll('.city-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.cityInput.value = btn.dataset.city;
        });
    });
}


function requestGeolocation() {
    showLoading();

    if (!navigator.geolocation) {
        showError('Геолокация не поддерживается');
        return;
    }

    navigator.geolocation.getCurrentPosition(async position => {
        const { latitude, longitude } = position.coords;

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
        showError('Разрешите доступ к геолокации или добавьте город вручную');
        showAddCityModal();
    });
}


async function loadWeatherForAllCities() {
    showLoading();

    try {
        const promises = state.cities.map((city, i) =>
            getWeatherData(city.lat, city.lon).then(data => {
                state.weatherData[i] = data;
            })
        );

        await Promise.all(promises);
        updateCitiesList();
        showWeather(state.currentCityIndex);
    } catch {
        showError('Ошибка загрузки данных');
    }
}

async function getWeatherData(lat, lon) {
    const weatherRes = await fetch(
        `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`
    );

    const forecastRes = await fetch(
        `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}&appid=${CONFIG.API_KEY}`
    );

    const weather = await weatherRes.json();
    const forecast = await forecastRes.json();

    return {
        current: weather,
        forecast: getDailyForecast(forecast.list)
    };
}


function showWeather(index) {
    const city = state.cities[index];
    const data = state.weatherData[index];
    if (!data) return;

    hideLoading();
    hideError();

    elements.locationName.textContent = '';
    const icon = document.createElement('i');
    icon.className = `fas fa-${city.isCurrentLocation ? 'location-dot' : 'city'}`;

    const text = document.createElement('span');
    text.textContent = city.displayName || city.name;

    elements.locationName.append(icon, text);

    const now = new Date();
    elements.locationDate.textContent = now.toLocaleDateString('ru-RU', { dateStyle: 'full' });
    elements.locationTime.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    elements.currentTemp.textContent = Math.round(data.current.main.temp);
    elements.weatherDescription.textContent = data.current.weather[0].description;
    elements.windSpeed.textContent = `${data.current.wind.speed} м/с`;
    elements.humidity.textContent = `${data.current.main.humidity}%`;
    elements.pressure.textContent = `${data.current.main.pressure} гПа`;
    elements.visibility.textContent = `${(data.current.visibility / 1000).toFixed(1)} км`;

    updateWeatherIcon(data.current.weather[0].icon);
    updateForecast(data.forecast);

    elements.currentWeather.style.display = 'block';
    elements.forecast.style.display = 'block';
}

function updateWeatherIcon(code) {
    const map = {
        '01d': 'fas fa-sun',
        '01n': 'fas fa-moon',
        '02': 'fas fa-cloud-sun',
        '03': 'fas fa-cloud',
        '04': 'fas fa-cloud',
        '09': 'fas fa-cloud-rain',
        '10': 'fas fa-cloud-sun-rain',
        '11': 'fas fa-bolt',
        '13': 'fas fa-snowflake',
        '50': 'fas fa-smog'
    };

    elements.weatherIcon.textContent = '';
    const i = document.createElement('i');
    i.className = map[code.slice(0, 2)] || 'fas fa-cloud';
    elements.weatherIcon.appendChild(i);
}

function updateForecast(days) {
    elements.forecastCards.textContent = '';

    days.forEach(day => {
        const card = document.createElement('div');
        card.className = 'forecast-card fade-in';

        const date = document.createElement('div');
        date.className = 'forecast-date';
        date.textContent = day.date;

        const iconWrap = document.createElement('div');
        iconWrap.className = 'forecast-icon';
        const icon = document.createElement('i');
        icon.className = getForecastIconClass(day.icon);
        iconWrap.appendChild(icon);

        const temps = document.createElement('div');
        temps.className = 'forecast-temp';

        const high = document.createElement('div');
        high.className = 'temp-high';
        high.textContent = `${Math.round(day.temp_max)}°`;

        const low = document.createElement('div');
        low.className = 'temp-low';
        low.textContent = `${Math.round(day.temp_min)}°`;

        temps.append(high, low);

        const desc = document.createElement('div');
        desc.className = 'forecast-description';
        desc.textContent = day.description;

        card.append(date, iconWrap, temps, desc);
        elements.forecastCards.appendChild(card);
    });
}

function updateCitiesList() {
    elements.citiesList.textContent = '';

    state.cities.forEach((city, index) => {
        const item = document.createElement('div');
        item.className = `city-item ${index === state.currentCityIndex ? 'active' : ''}`;

        const info = document.createElement('div');
        info.className = 'city-info';

        const name = document.createElement('div');
        name.className = 'city-name';
        name.textContent = city.displayName || city.name;

        const temp = document.createElement('div');
        temp.className = 'city-temp';
        temp.textContent = `${Math.round(state.weatherData[index]?.current.main.temp ?? '--')}°C`;

        info.append(name, temp);
        item.appendChild(info);

        if (!city.isCurrentLocation) {
            const btn = document.createElement('button');
            btn.className = 'city-remove';

            const icon = document.createElement('i');
            icon.className = 'fas fa-times';

            btn.appendChild(icon);
            btn.addEventListener('click', e => {
                e.stopPropagation();
                removeCity(index);
            });

            item.appendChild(btn);
        }

        item.addEventListener('click', () => {
            state.currentCityIndex = index;
            saveState();
            updateCitiesList();
            showWeather(index);
        });

        elements.citiesList.appendChild(item);
    });
}


function removeCity(index) {
    if (state.cities[index].isCurrentLocation) return;

    state.cities.splice(index, 1);
    saveState();
    loadWeatherForAllCities();
}

function showLoading() {
    elements.loading.style.display = 'flex';
    elements.error.style.display = 'none';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.error.style.display = 'flex';
}

function hideError() {
    elements.error.style.display = 'none';
}

function showAddCityModal() {
    elements.modalOverlay.style.display = 'flex';
    elements.cityInput.value = '';
    elements.cityError.textContent = '';
}

function hideAddCityModal() {
    elements.modalOverlay.style.display = 'none';
}

function getForecastIconClass(code) {
    const map = {
        '01': 'fas fa-sun',
        '02': 'fas fa-cloud-sun',
        '03': 'fas fa-cloud',
        '04': 'fas fa-cloud',
        '09': 'fas fa-cloud-rain',
        '10': 'fas fa-cloud-sun-rain',
        '11': 'fas fa-bolt',
        '13': 'fas fa-snowflake',
        '50': 'fas fa-smog'
    };
    return map[code.slice(0, 2)] || 'fas fa-cloud';
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
                description: item.weather[0].description,
                icon: item.weather[0].icon
            };
        }
    });

    return Object.values(days).slice(0, 3);
}

