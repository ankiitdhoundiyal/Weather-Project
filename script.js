(function () {
  // ---------- API endpoints (Open-Meteo: free, no API key) ----------
  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

  // Default place shown on first load
  const DEFAULT_PLACE = {
    name: "Zermatt",
    country: "Switzerland",
    latitude: 46.0207,
    longitude: 7.7491,
  };

  let currentPlace = DEFAULT_PLACE;

  // Initial/fallback data (used only if the API cannot be reached)
  const weatherData = {
    temperature: 12,
    condition: "Partly Cloudy",
    icon: "fa-cloud-sun",
    location: "Mountain Ridge · 2,400m",
    heroDesc: "Real-time conditions · elevation 2,400 m",
    forecast: [
      { day: "Mon", date: "", icon: "fa-sun", max: 14, min: 6 },
      { day: "Tue", date: "", icon: "fa-cloud-sun", max: 11, min: 4 },
      { day: "Wed", date: "", icon: "fa-cloud-rain", max: 8, min: 2 },
    ],
    details: [
      { label: "Wind", value: "18 km/h", icon: "fa-wind" },
      { label: "Humidity", value: "63%", icon: "fa-droplet" },
      { label: "Visibility", value: "12 km", icon: "fa-eye" },
      { label: "Pressure", value: "1015 hPa", icon: "fa-gauge-high" },
    ],
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const temperatureEl = $("temperature");
  const conditionEl = $("weather-condition");
  const weatherIconEl = $("weather-icon");
  const locationEl = $("weather-location");
  const forecastContainer = $("forecastContainer");
  const detailsContainer = $("detailsContainer");
  const refreshBtn = $("refreshBtn");
  const heroDesc = $("hero-desc");
  const searchForm = $("searchForm");
  const searchInput = $("searchInput");
  const suggestionsEl = $("suggestions");
  const statusMsg = $("statusMsg");

  // ---------- Weather code -> text + icon (WMO codes) ----------
  function describeCode(code, isDay) {
    const sun = isDay ? "fa-sun" : "fa-moon";
    const partly = isDay ? "fa-cloud-sun" : "fa-cloud-moon";
    if (code === 0) return { text: isDay ? "Sunny" : "Clear Night", icon: sun };
    if (code === 1) return { text: "Mostly Clear", icon: sun };
    if (code === 2) return { text: "Partly Cloudy", icon: partly };
    if (code === 3) return { text: "Overcast", icon: "fa-cloud" };
    if (code === 45 || code === 48) return { text: "Foggy", icon: "fa-smog" };
    if (code >= 51 && code <= 57)
      return { text: "Drizzle", icon: "fa-cloud-rain" };
    if (code >= 61 && code <= 67)
      return { text: "Rain", icon: "fa-cloud-showers-heavy" };
    if (code >= 71 && code <= 77) return { text: "Snow", icon: "fa-snowflake" };
    if (code >= 80 && code <= 82)
      return { text: "Rain Showers", icon: "fa-cloud-showers-heavy" };
    if (code === 85 || code === 86)
      return { text: "Snow Showers", icon: "fa-snowflake" };
    if (code >= 95) return { text: "Thunderstorm", icon: "fa-bolt" };
    return { text: "Unknown", icon: "fa-cloud" };
  }

  // ---------- Rendering ----------
  function renderWeather() {
    temperatureEl.textContent = weatherData.temperature;
    conditionEl.textContent = weatherData.condition;
    weatherIconEl.className = `fas ${weatherData.icon}`;
    locationEl.innerHTML = '<i class="fas fa-location-dot"></i> ';
    locationEl.append(weatherData.location);
    heroDesc.textContent = weatherData.heroDesc;

    forecastContainer.innerHTML = "";
    weatherData.forecast.forEach((d) => {
      const card = document.createElement("div");
      card.className = "forecast-item";
      card.innerHTML = `
        <div class="day">${d.day}</div>
        <div class="date">${d.date}</div>
        <i class="fas ${d.icon}"></i>
        <div class="temp">${d.max}°C</div>
        <div class="range">Low ${d.min}°C</div>
      `;
      forecastContainer.appendChild(card);
    });

    detailsContainer.innerHTML = "";
    weatherData.details.forEach((d) => {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.innerHTML = `
        <i class="fas ${d.icon}"></i>
        <div class="label">${d.label}</div>
        <div class="value">${d.value}</div>
      `;
      detailsContainer.appendChild(item);
    });
  }

  function setStatus(msg, isError = false) {
    statusMsg.textContent = msg;
    statusMsg.classList.toggle("error", isError);
  }

  // ---------- API: weather ----------
  async function loadWeather(place) {
    setStatus("Loading weather…");
    refreshBtn.querySelector("i").classList.add("spin");

    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m",
      hourly: "visibility",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      timezone: "auto",
      forecast_days: "4", // today + next 3 days
    });

    try {
      const res = await fetch(`${WEATHER_URL}?${params}`);
      if (!res.ok) throw new Error("Weather service error");
      const data = await res.json();
      const c = data.current;

      // Current
      const info = describeCode(c.weather_code, c.is_day === 1);
      weatherData.temperature = Math.round(c.temperature_2m);
      weatherData.condition = info.text;
      weatherData.icon = info.icon;

      // Elevation: prefer API's elevation, fall back to geocoding result
      const elevation = Math.round(data.elevation ?? place.elevation ?? 0);
      const region = [place.name, place.admin1, place.country]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(", ");
      weatherData.location = `${region} · ${elevation.toLocaleString()}m`;
      weatherData.heroDesc = `Real-time conditions · elevation ${elevation.toLocaleString()} m`;

      // Visibility (hourly, meters) at the current hour
      const hourKey = c.time.slice(0, 13) + ":00";
      const hIdx = data.hourly.time.indexOf(hourKey);
      const visMeters = hIdx >= 0 ? data.hourly.visibility[hIdx] : null;
      const visibility =
        visMeters == null ? "N/A" : `${(visMeters / 1000).toFixed(1)} km`;

      weatherData.details = [
        {
          label: "Wind",
          value: `${Math.round(c.wind_speed_10m)} km/h`,
          icon: "fa-wind",
        },
        {
          label: "Humidity",
          value: `${c.relative_humidity_2m}%`,
          icon: "fa-droplet",
        },
        { label: "Visibility", value: visibility, icon: "fa-eye" },
        {
          label: "Pressure",
          value: `${Math.round(c.surface_pressure)} hPa`,
          icon: "fa-gauge-high",
        },
        {
          label: "Feels Like",
          value: `${Math.round(c.apparent_temperature)}°C`,
          icon: "fa-temperature-half",
        },
        {
          label: "Elevation",
          value: `${elevation.toLocaleString()} m`,
          icon: "fa-mountain",
        },
      ];

      // 3-day forecast (skip today, index 0)
      weatherData.forecast = [1, 2, 3].map((i) => {
        const d = new Date(data.daily.time[i] + "T00:00:00");
        return {
          day: d.toLocaleDateString("en-US", { weekday: "short" }),
          date: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          icon: describeCode(data.daily.weather_code[i], true).icon,
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
        };
      });

      currentPlace = place;
      renderWeather();
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(
        "Couldn't load weather. Check your internet connection and try again.",
        true,
      );
    } finally {
      refreshBtn.querySelector("i").classList.remove("spin");
    }
  }

  // ---------- API: city search ----------
  async function searchCities(query) {
    const params = new URLSearchParams({
      name: query,
      count: "5",
      language: "en",
      format: "json",
    });
    const res = await fetch(`${GEO_URL}?${params}`);
    if (!res.ok) throw new Error("Geocoding error");
    const data = await res.json();
    return data.results || [];
  }

  function closeSuggestions() {
    suggestionsEl.classList.remove("open");
    suggestionsEl.innerHTML = "";
  }

  function selectPlace(place) {
    searchInput.value = place.name;
    closeSuggestions();
    loadWeather(place);
  }

  function showSuggestions(results) {
    suggestionsEl.innerHTML = "";
    if (!results.length) return closeSuggestions();
    results.forEach((place) => {
      const li = document.createElement("li");
      li.textContent = place.name;
      const small = document.createElement("small");
      small.textContent = [place.admin1, place.country]
        .filter(Boolean)
        .join(", ");
      li.appendChild(small);
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectPlace(place);
      });
      suggestionsEl.appendChild(li);
    });
    suggestionsEl.classList.add("open");
  }

  let debounceTimer;
  let latestQuery = "";

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    latestQuery = q;
    clearTimeout(debounceTimer);
    if (q.length < 2) return closeSuggestions();
    debounceTimer = setTimeout(async () => {
      try {
        const results = await searchCities(q);
        if (q === latestQuery) showSuggestions(results); // ignore stale responses
      } catch (e) {
        closeSuggestions();
      }
    }, 300);
  });

  searchInput.addEventListener("blur", () => setTimeout(closeSuggestions, 150));

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    setStatus("Searching…");
    try {
      const results = await searchCities(q);
      if (!results.length) {
        setStatus(`No place found for "${q}".`, true);
        return;
      }
      selectPlace(results[0]); // Enter / button picks the best match
    } catch (err) {
      setStatus("Search failed. Please try again.", true);
    }
  });

  // ---------- Scroll reveal ----------
  function setupScrollReveal() {
    const sections = document.querySelectorAll(".fade-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -50px 0px" },
    );
    sections.forEach((s) => observer.observe(s));
  }

  // ---------- Init ----------
  function init() {
    renderWeather(); // fallback data first
    setupScrollReveal();
    loadWeather(DEFAULT_PLACE);

    // Refresh re-fetches the currently selected place
    refreshBtn.addEventListener("click", () => loadWeather(currentPlace));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
