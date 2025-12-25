const API_KEY = "4208d8616b7fcd29c05a0fa73e535be8";
const BASE_URL = "https://api.openweathermap.org/data/2.5/forecast";

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const weatherContainer = document.getElementById("weatherContainer");
const errorMessage = document.getElementById("errorMessage");

const refreshBtn = document.getElementById("refreshBtn");
const retryBtn = document.getElementById("retryBtn");

const addCityBtn = document.getElementById("addCityBtn");
const modal = document.getElementById("addCityModal");
const closeModal = document.querySelector(".close-modal");
const saveCityBtn = document.getElementById("saveCityBtn");
const cancelCityBtn = document.getElementById("cancelCityBtn");
const cityInput = document.getElementById("cityInput");
const cityError = document.getElementById("cityError");
const suggestions = document.getElementById("citySuggestions");

const savedCitiesList = document.getElementById("savedCitiesList");
const currentLocationLabel = document.getElementById("currentLocation");

let currentLocation = JSON.parse(localStorage.getItem("currentLocation"));
let cities = JSON.parse(localStorage.getItem("cities")) || [];

const cityHints = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Минск", "Киев", "Алматы"];

/* ================= UI ================= */

function showLoading() {
    loadingState.style.display = "flex";
    errorState.style.display = "none";
    weatherContainer.style.display = "none";
}

function showError(msg) {
    loadingState.style.display = "none";
    errorState.style.display = "block";
    weatherContainer.style.display = "none";
    errorMessage.textContent = msg;
}

function showWeather() {
    loadingState.style.display = "none";
    errorState.style.display = "none";
    weatherContainer.style.display = "block";
}

/* ================= API ================= */

async function fetchWeather(params) {
    const url = `${BASE_URL}?${params}&units=metric&lang=ru&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка получения данных");
    return res.json();
}

/* ================= RENDER ================= */

function renderToday(data) {
    const today = data.list[0];
    document.getElementById("todayForecast").innerHTML = `
        <div>${Math.round(today.main.temp)}°C</div>
        <div>${today.weather[0].description}</div>
        <div>Ветер: ${today.wind.speed} м/с</div>
    `;
}

function renderDaily(data) {
    const container = document.getElementById("dailyForecast");
    container.innerHTML = "";

    data.list
        .filter(item => item.dt_txt.includes("12:00:00"))
        .slice(0, 2)
        .forEach(day => {
            container.innerHTML += `
                <div class="weather-card">
                    <div>${new Date(day.dt * 1000).toLocaleDateString()}</div>
                    <div>${Math.round(day.main.temp)}°C</div>
                    <div>${day.weather[0].description}</div>
                </div>
            `;
        });
}

/* ================= MAIN ================= */

async function loadWeather() {
    try {
        showLoading();
        let data;

        if (currentLocation.type === "geo") {
            data = await fetchWeather(`lat=${currentLocation.lat}&lon=${currentLocation.lon}`);
            currentLocationLabel.textContent = "Текущее местоположение";
        } else {
            data = await fetchWeather(`q=${currentLocation.city}`);
            currentLocationLabel.textContent = currentLocation.city;
        }

        renderToday(data);
        renderDaily(data);
        showWeather();
        renderCities();
    } catch (e) {
        showError(e.message);
    }
}

/* ================= GEO ================= */

function initGeo() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            currentLocation = {
                type: "geo",
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            };
            localStorage.setItem("currentLocation", JSON.stringify(currentLocation));
            loadWeather();
        },
        () => showError("Геолокация отклонена. Добавьте город вручную.")
    );
}

/* ================= CITIES ================= */

function renderCities() {
    savedCitiesList.innerHTML = "";
    cities.forEach(city => {
        const btn = document.createElement("button");
        btn.className = "btn btn-secondary";
        btn.textContent = city;
        btn.onclick = () => {
            currentLocation = { type: "city", city };
            localStorage.setItem("currentLocation", JSON.stringify(currentLocation));
            loadWeather();
        };
        savedCitiesList.appendChild(btn);
    });
}

/* ================= MODAL ================= */

addCityBtn.onclick = () => modal.style.display = "flex";
closeModal.onclick = cancelCityBtn.onclick = () => modal.style.display = "none";

cityInput.oninput = () => {
    suggestions.innerHTML = "";
    const value = cityInput.value.toLowerCase();
    cityHints.filter(c => c.toLowerCase().includes(value))
        .forEach(c => {
            const div = document.createElement("div");
            div.textContent = c;
            div.onclick = () => {
                cityInput.value = c;
                suggestions.innerHTML = "";
            };
            suggestions.appendChild(div);
        });
};

saveCityBtn.onclick = async () => {
    try {
        const city = cityInput.value.trim();
        if (!city) throw new Error("Введите город");

        await fetchWeather(`q=${city}`);

        if (!cities.includes(city)) {
            cities.push(city);
            localStorage.setItem("cities", JSON.stringify(cities));
        }

        currentLocation = { type: "city", city };
        localStorage.setItem("currentLocation", JSON.stringify(currentLocation));

        modal.style.display = "none";
        cityInput.value = "";
        loadWeather();
    } catch {
        cityError.textContent = "Город не найден";
    }
};

/* ================= INIT ================= */

refreshBtn.onclick = loadWeather;
retryBtn.onclick = () => location.reload();

if (currentLocation) loadWeather();
else initGeo();
