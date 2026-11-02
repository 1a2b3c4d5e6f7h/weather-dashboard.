
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const statusMessage = document.querySelector("#status-message");
const weatherContainer = document.querySelector("#weather-container");
const searchButton = searchForm.querySelector("button");
let currentCity = null;
let currentWeather = null;
let temperatureUnit = "C";
const celsiusButton = document.querySelector("#celsius-btn");
const fahrenheitButton = document.querySelector("#fahrenheit-btn");

// Find a city and retrieve its coordinates.
async function findCity(cityName) {
  const params = new URLSearchParams({
    name: cityName,
    count: "5",
    language: "en",
    format: "json"
  });

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?${params}`;

  const response = await fetch(url);

  // fetch() does not reject just because the server returns
  // an HTTP error status.
  if (!response.ok) {
    throw new Error("Unable to search for this city.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Please check the name.");
  }

  return data.results;
}

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),

    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m"
    ].join(","),

    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min"
    ].join(","),

    forecast_days: "5",
    timezone: "auto"
  });

  const url =
    `https://api.open-meteo.com/v1/forecast?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to retrieve weather data.");
  }

  const data = await response.json();

  if (!data.current || !data.daily) {
    throw new Error("Weather data is unavailable.");
  }

  return data;
}



function describeWeather(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Mainly clear or cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";

  return "Weather condition unavailable";
}
function convertTemperature(celsius, unit) {
  if (unit === "F") {
    return (celsius * 9 / 5) + 32;
  }

  return celsius;
}

// let temperatureUnit = "C"; // Default to Celsius

function renderWeather(city, data) {
  const current = data.current;

  const card = document.createElement("article");
  card.className = "weather-card";

  const heading = document.createElement("h2");
  heading.textContent =
    `${city.name}, ${city.country ?? "Unknown country"}`;

  const condition = document.createElement("p");
  condition.className = "weather-main";
  condition.textContent = describeWeather(current.weather_code);

  const temperature = document.createElement("p");
  temperature.className = "temperature";

  const convertedTemperature = convertTemperature(
    current.temperature_2m,
    temperatureUnit
  );

  temperature.textContent =
    `${Math.round(convertedTemperature)} °${temperatureUnit}`;

  const feelsLike = convertTemperature(
    current.apparent_temperature,
    temperatureUnit
  );

  const details = document.createElement("div");
  details.className = "weather-details";

  const measurements = [
    ["Feels like", `${Math.round(feelsLike)} °${temperatureUnit}`],
    ["Humidity", `${current.relative_humidity_2m}%`],
    ["Wind speed", `${current.wind_speed_10m} km/h`]
  ];

  for (const [label, value] of measurements) {
    const detail = document.createElement("div");
    detail.className = "weather-detail";

    const title = document.createElement("p");
    title.textContent = label;

    const reading = document.createElement("p");
    reading.textContent = value;

    detail.append(title, reading);
    details.append(detail);
  }

  card.append(heading, condition, temperature, details);
  weatherContainer.replaceChildren(card);
}


function renderForecast(data) {
  const daily = data.daily;

  const section = document.createElement("section");
  section.className = "forecast-section";

  const heading = document.createElement("h2");
  heading.textContent = "5-Day Forecast";
  section.append(heading);

  const list = document.createElement("div");
  list.className = "forecast-list";

  for (let i = 0; i < daily.time.length; i++) {
    const card = document.createElement("article");
    card.className = "forecast-card";

    // Use midday to avoid date shifts from timezone parsing.
    const date = new Date(`${daily.time[i]}T12:00:00`);

    const day = document.createElement("h3");
    day.textContent = date.toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    const condition = document.createElement("p");
    condition.textContent = describeWeather(
      daily.weather_code[i]
    );

    const temperatures = document.createElement("p");
    temperatures.className = "forecast-temperatures";
const maxTemperature = convertTemperature(
  daily.temperature_2m_max[i],
  temperatureUnit
);

const minTemperature = convertTemperature(
  daily.temperature_2m_min[i],
  temperatureUnit
);

temperatures.textContent =
  `${Math.round(maxTemperature)}° / ` +
  `${Math.round(minTemperature)}° ${temperatureUnit}`;

    card.append(day, condition, temperatures);
    list.append(card);
  }

  section.append(list);
  weatherContainer.append(section);
  console.log("Forecast cards created:", list.children.length);
}
function updateTemperatureButtons() {
  celsiusButton.setAttribute(
    "aria-pressed",
    String(temperatureUnit === "C")
  );

  fahrenheitButton.setAttribute(
    "aria-pressed",
    String(temperatureUnit === "F")
  );
}


updateTemperatureButtons();

// Handle the form submission.
let searchRequestId = 0;

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
 

  const cityName = cityInput.value.trim();

  if (!cityName) {
    statusMessage.className = "error";
    statusMessage.textContent = "Please enter a city name.";
    return;
  }
   searchRequestId++;
const currentRequestId = searchRequestId;

  searchButton.disabled = true;
  statusMessage.className = "";
  statusMessage.textContent = "Loading weather...";
  weatherContainer.replaceChildren();
  currentCity = null;
currentWeather = null;

  try {
    // Request 1: Find the city.
    const cities = await findCity(cityName);
     currentCity = cities[0];
     if (currentRequestId !== searchRequestId) return;

    // Request 2: Retrieve weather using its coordinates.
     currentWeather = await getWeather(
      currentCity.latitude,
      currentCity.longitude
    );
    if (currentRequestId !== searchRequestId) return;
   console.log("Weather data received:", currentWeather);
console.log("Daily forecast:", currentWeather.daily);

    // Display the result.
   renderWeather(currentCity, currentWeather);
renderForecast(currentWeather);

statusMessage.textContent = "Weather and forecast updated successfully.";
  } catch (error) {
    if (currentRequestId !== searchRequestId) return;
    statusMessage.className = "error";
    statusMessage.textContent =
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";

    weatherContainer.replaceChildren();
  } finally {
    if (currentRequestId === searchRequestId) {
    searchButton.disabled = false;
  }
}
});
celsiusButton.addEventListener("click", () => {
  temperatureUnit = "C";
  updateTemperatureButtons()
  if (!currentCity || !currentWeather) return;

  renderWeather(currentCity, currentWeather);
  renderForecast(currentWeather);
});

fahrenheitButton.addEventListener("click", () => {
  temperatureUnit = "F";
  updateTemperatureButtons()
  if (!currentCity || !currentWeather) return;

  renderWeather(currentCity, currentWeather);
  renderForecast(currentWeather);
});

