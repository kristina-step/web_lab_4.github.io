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
    setupEvents();

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
    const data = JSON.parse(saved);
    state.cities = data.cities || [];
    state.currentCityIndex = data.currentCityIndex || 0;
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

function setupEvents() {
    elements.refreshBtn.addEventListener('click', loadWeatherForAllCities);
    elements.addCityBtn.addEventListener('click', showAddCityModal);
    elements.modalClose.addEventListener('click', hideAddCityModal);
    elements.cancelBtn.addEventListener('click', hideAddCityModal);

    elements.modalOverlay.addEventListener('click', e => {
        if (e.target === elements.modalOverlay) hideAddCityModal();
    });

    elements.cityInput.addEventListener('input', handleCityInput);
    elements.addCitySubmit.addEventListener('click', addCityFromInput);
}

function showLoading() {
    elements.loading.style.display = 'flex';
    elements.currentWeather.style.display = 'none';
    elements.forecast.style.display = 'none';
    elements.error.style.display = 'none';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.error.style.display = 'flex';
    hideLoading();
}

async function requestGeolocation() {
    showLoading();

    if (!navigator.geolocation) {
        showError('Геолокация не поддерживается');
        return;
    }

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
        showError('Разрешите доступ к геолокации или добавьте город вручную');
        showAddCityModal();
    });
}

async function loadWeatherForAllCities() {
    showLoading();

    try {
        for (let i = 0; i < state.cities.length; i++) {
            const city = state.cities[i];
            state.weatherData[i] = await getWeatherData(city.lat, city.lon);
        }
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
        forecast: buildDailyForecast(forecast.list)
    };
}

function buildDailyForecast(list) {
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
                min: item.main.temp_min,
                max: item.main.temp_max,
                icon: item.weather[0].icon,
                desc: item.weather[0].description
            };
        } else {
            days[date].min = Math.min(days[date].min, item.main.temp_min);
            days[date].max = Math.max(days[date].max, item.main.temp_max);
        }
    });

    return Object.values(days).slice(0, 3);
}

function showWeather(index) {
    hideLoading();

    const city = state.cities[index];
    const data = state.weatherData[index];

    elements.locationName.textContent = city.displayName;
    elements.currentTemp.textContent = Math.round(data.current.main.temp);
    elements.weatherDescription.textContent = data.current.weather[0].description;
    elements.windSpeed.textContent = `${data.current.wind.speed} м/с`;
    elements.humidity.textContent = `${data.current.main.humidity}%`;
    elements.pressure.textContent = `${data.current.main.pressure} гПа`;
    elements.visibility.textContent = `${(data.current.visibility / 1000).toFixed(1)} км`;

    updateForecast(data.forecast);

    elements.currentWeather.style.display = 'block';
    elements.forecast.style.display = 'block';
}

function updateForecast(days) {
    elements.forecastCards.innerHTML = '';

    days.forEach(day => {
        const card = document.createElement('div');
        card.className = 'forecast-card';

        const date = document.createElement('div');
        date.className = 'forecast-date';
        date.textContent = day.date;

        const icon = document.createElement('div');
        icon.className = 'forecast-icon';
        const i = document.createElement('i');
        i.className = getForecastIconClass(day.icon);
        icon.append(i);

        const temps = document.createElement('div');
        temps.className = 'forecast-temp';

        const max = document.createElement('div');
        max.className = 'temp-high';
        max.textContent = `${Math.round(day.max)}°`;

        const min = document.createElement('div');
        min.className = 'temp-low';
        min.textContent = `${Math.round(day.min)}°`;

        temps.append(max, min);

        const desc = document.createElement('div');
        desc.className = 'forecast-description';
        desc.textContent = day.desc;

        card.append(date, icon, temps, desc);
        elements.forecastCards.append(card);
    });
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

function updateCitiesList() {
    elements.citiesList.innerHTML = '';

    state.cities.forEach((city, index) => {
        const item = document.createElement('div');
        item.className = `city-item ${index === state.currentCityIndex ? 'active' : ''}`;

        const info = document.createElement('div');
        info.className = 'city-info';

        const name = document.createElement('div');
        name.className = 'city-name';
        name.textContent = city.displayName;

        const temp = document.createElement('div');
        temp.className = 'city-temp';
        temp.textContent = `${Math.round(state.weatherData[index].current.main.temp)}°C`;

        info.append(name, temp);
        item.append(info);

        item.addEventListener('click', () => {
            state.currentCityIndex = index;
            saveState();
            showWeather(index);
            updateCitiesList();
        });

        elements.citiesList.append(item);
    });
}
