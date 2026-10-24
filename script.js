(function () {

  const weatherData = {
    temperature: 12,
    condition: "Partly Cloudy",
    icon: "fa-sun", // Font Awesome class
    location: "Mountain Ridge · 2,400m",
    forecast: [
      { day: "Mon", icon: "fa-sun", temp: 14 },
      { day: "Tue", icon: "fa-cloud-sun", temp: 11 },
      { day: "Wed", icon: "fa-cloud-rain", temp: 8 },
    ],
    details: [
      { label: "Wind", value: "18 km/h", icon: "fa-wind" },
      { label: "Humidity", value: "63%", icon: "fa-droplet" },
      { label: "Visibility", value: "12 km", icon: "fa-eye" },
      { label: "Pressure", value: "1015 hPa", icon: "fa-gauge-high" },
    ],
  };

  // DOM elements
  const temperatureEl = document.getElementById("temperature");
  const conditionEl = document.getElementById("weather-condition");
  const weatherIconEl = document.getElementById("weather-icon");
  const locationEl = document.getElementById("weather-location");
  const forecastContainer = document.getElementById("forecastContainer");
  const detailsContainer = document.getElementById("detailsContainer");
  const refreshBtn = document.getElementById("refreshBtn");


  function getIconClass(iconName) {

    if (iconName.startsWith("fa-")) return iconName;
    return "fa-" + iconName;
  }

  
  function renderWeather() {
    // Update current weather
    temperatureEl.textContent = weatherData.temperature;
    conditionEl.textContent = weatherData.condition;
    weatherIconEl.className = `fas ${getIconClass(weatherData.icon)}`;
    locationEl.innerHTML = `<i class="fas fa-location-dot"></i> ${weatherData.location}`;

    // Update forecast cards
    forecastContainer.innerHTML = "";
    weatherData.forecast.forEach((day) => {
      const card = document.createElement("div");
      card.className = "forecast-item";
      card.innerHTML = `
                <div class="day">${day.day}</div>
                <i class="fas ${getIconClass(day.icon)}"></i>
                <div class="temp">${day.temp}°C</div>
            `;
      forecastContainer.appendChild(card);
    });

    // Update details grid
    detailsContainer.innerHTML = "";
    weatherData.details.forEach((detail) => {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.innerHTML = `
                <i class="fas ${getIconClass(detail.icon)}"></i>
                <div class="label">${detail.label}</div>
                <div class="value">${detail.value}</div>
            `;
      detailsContainer.appendChild(item);
    });
  }

  
  function generateRandomWeather() {
    // Possible conditions with icons
    const conditions = [
      { condition: "Sunny", icon: "fa-sun", tempRange: [14, 22] },
      { condition: "Partly Cloudy", icon: "fa-cloud-sun", tempRange: [8, 16] },
      { condition: "Cloudy", icon: "fa-cloud", tempRange: [6, 12] },
      { condition: "Light Rain", icon: "fa-cloud-rain", tempRange: [4, 9] },
      { condition: "Windy", icon: "fa-wind", tempRange: [5, 11] },
      { condition: "Snow", icon: "fa-snowflake", tempRange: [-3, 2] },
    ];
    const randomCondition =
      conditions[Math.floor(Math.random() * conditions.length)];

    // Temperature 
    const minTemp = randomCondition.tempRange[0];
    const maxTemp = randomCondition.tempRange[1];
    const temp = Math.floor(Math.random() * (maxTemp - minTemp + 1)) + minTemp;

    // Update weatherData object
    weatherData.temperature = temp;
    weatherData.condition = randomCondition.condition;
    weatherData.icon = randomCondition.icon;

    // Slight variation in forecast
    const forecastIcons = [
      "fa-sun",
      "fa-cloud-sun",
      "fa-cloud-rain",
      "fa-snowflake",
      "fa-wind",
    ];
    weatherData.forecast = [
      {
        day: "Mon",
        icon: forecastIcons[Math.floor(Math.random() * forecastIcons.length)],
        temp: temp + Math.floor(Math.random() * 5) - 2,
      },
      {
        day: "Tue",
        icon: forecastIcons[Math.floor(Math.random() * forecastIcons.length)],
        temp: temp + Math.floor(Math.random() * 5) - 3,
      },
      {
        day: "Wed",
        icon: forecastIcons[Math.floor(Math.random() * forecastIcons.length)],
        temp: temp + Math.floor(Math.random() * 7) - 4,
      },
    ];

    // Details variation
    const windSpeed = Math.floor(Math.random() * 30) + 5;
    const humidity = Math.floor(Math.random() * 50) + 40;
    const visibility = (Math.random() * 15 + 2).toFixed(1);
    const pressure = Math.floor(Math.random() * 30) + 1000;

    weatherData.details = [
      { label: "Wind", value: `${windSpeed} km/h`, icon: "fa-wind" },
      { label: "Humidity", value: `${humidity}%`, icon: "fa-droplet" },
      { label: "Visibility", value: `${visibility} km`, icon: "fa-eye" },
      { label: "Pressure", value: `${pressure} hPa`, icon: "fa-gauge-high" },
    ];

    
    const locations = [
      "Mountain Ridge · 2,400m",
      "Alpine Peak · 2,800m",
      "Cloud Base · 2,100m",
    ];
    weatherData.location =
      locations[Math.floor(Math.random() * locations.length)];

    renderWeather();
  }

  function setupScrollReveal() {
    const sections = document.querySelectorAll(".fade-section");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
         
        });
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));
  }

  // Initialize all weather 
  function init() {
    renderWeather(); // initial render
    setupScrollReveal();

    // Refresh button 
    refreshBtn.addEventListener("click", () => {
      //  spin animation to the button
      refreshBtn.style.transform = "scale(0.95)";
      setTimeout(() => (refreshBtn.style.transform = ""), 150);
      generateRandomWeather();
    });
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
