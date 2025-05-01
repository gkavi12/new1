document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const celsiusBtn = document.getElementById('celsius-btn');
    const fahrenheitBtn = document.getElementById('fahrenheit-btn');
    
    // Weather display elements
    const cityName = document.getElementById('city-name');
    const currentDate = document.getElementById('current-date');
    const currentTemp = document.getElementById('current-temp');
    const currentConditions = document.getElementById('current-conditions');
    const weatherIcon = document.getElementById('weather-icon');
    const humidity = document.getElementById('humidity');
    const wind = document.getElementById('wind');
    const feelsLike = document.getElementById('feels-like');
    const forecastContainer = document.getElementById('forecast-container');

    // API Configuration
    const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Replace with your actual API key
    let units = 'metric'; // Default to Celsius
    let currentCity = '';

    // Initialize the app
    checkUnitPreference();
    getLocationWeather();

    // Event Listeners
    searchBtn.addEventListener('click', searchWeather);
    locationBtn.addEventListener('click', getLocationWeather);
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });
    
    celsiusBtn.addEventListener('click', function() {
        if (units !== 'metric') {
            units = 'metric';
            celsiusBtn.classList.add('active');
            fahrenheitBtn.classList.remove('active');
            if (currentCity) {
                getWeather(currentCity);
            }
        }
    });
    
    fahrenheitBtn.addEventListener('click', function() {
        if (units !== 'imperial') {
            units = 'imperial';
            fahrenheitBtn.classList.add('active');
            celsiusBtn.classList.remove('active');
            if (currentCity) {
                getWeather(currentCity);
            }
        }
    });

    // Functions
    function checkUnitPreference() {
        // You could implement localStorage to remember user preference
        // For now, default to metric (Celsius)
        units = 'metric';
        celsiusBtn.classList.add('active');
    }

    function searchWeather() {
        const city = cityInput.value.trim();
        if (city) {
            getWeather(city);
        }
    }

    function getLocationWeather() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`)
                        .then(response => response.json())
                        .then(data => {
                            currentCity = data.name;
                            displayCurrentWeather(data);
                            getForecast(lat, lon);
                        })
                        .catch(error => {
                            console.error('Error fetching weather:', error);
                            alert('Unable to fetch weather data. Please try again.');
                        });
                },
                error => {
                    console.error('Geolocation error:', error);
                    alert('Unable to get your location. Please enable location services or search by city name.');
                    // Default to a popular city if location is denied
                    getWeather('London');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser. Please search by city name.');
            getWeather('London');
        }
    }

    function getWeather(city) {
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${units}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('City not found');
                }
                return response.json();
            })
            .then(data => {
                currentCity = data.name;
                displayCurrentWeather(data);
                getForecast(data.coord.lat, data.coord.lon);
            })
            .catch(error => {
                console.error('Error fetching weather:', error);
                alert('City not found. Please try another location.');
            });
    }

    function getForecast(lat, lon) {
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`)
            .then(response => response.json())
            .then(data => {
                displayForecast(data);
            })
            .catch(error => {
                console.error('Error fetching forecast:', error);
            });
    }

    function displayCurrentWeather(data) {
        cityName.textContent = `${data.name}, ${data.sys.country}`;
        
        const date = new Date(data.dt * 1000);
        currentDate.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        currentTemp.textContent = `${Math.round(data.main.temp)}°`;
        currentConditions.textContent = data.weather[0].description;
        
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
        
        humidity.textContent = `${data.main.humidity}%`;
        wind.textContent = units === 'metric' 
            ? `${Math.round(data.wind.speed * 3.6)} km/h` 
            : `${Math.round(data.wind.speed)} mph`;
        feelsLike.textContent = `${Math.round(data.main.feels_like)}°`;
    }

    function displayForecast(data) {
        forecastContainer.innerHTML = '';
        
        // Group forecast by day
        const dailyForecast = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000).toLocaleDateString();
            if (!dailyForecast[date]) {
                dailyForecast[date] = [];
            }
            dailyForecast[date].push(item);
        });
        
        // Get the next 5 days (skip today)
        const forecastDates = Object.keys(dailyForecast).slice(1, 6);
        
        forecastDates.forEach(date => {
            const dayData = dailyForecast[date];
            const dayTemp = dayData.reduce((acc, curr) => acc + curr.main.temp, 0) / dayData.length;
            const dayTempMax = Math.max(...dayData.map(item => item.main.temp_max));
            const dayTempMin = Math.min(...dayData.map(item => item.main.temp_min));
            
            // Find the most common weather condition for the day
            const weatherCount = {};
            dayData.forEach(item => {
                const condition = item.weather[0].main;
                weatherCount[condition] = (weatherCount[condition] || 0) + 1;
            });
            const mostCommonWeather = Object.keys(weatherCount).reduce((a, b) => 
                weatherCount[a] > weatherCount[b] ? a : b
            );
            const weatherIconCode = dayData.find(item => 
                item.weather[0].main === mostCommonWeather
            ).weather[0].icon;
            
            // Create forecast card
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            
            const forecastDate = new Date(dayData[0].dt * 1000);
            const dayName = forecastDate.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            forecastCard.innerHTML = `
                <div class="forecast-date">${dayName}<br>${monthDay}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${weatherIconCode}.png" alt="${mostCommonWeather}">
                </div>
                <div class="forecast-temp">
                    <span class="forecast-temp-max">${Math.round(dayTempMax)}°</span>
                    <span class="forecast-temp-min">${Math.round(dayTempMin)}°</span>
                </div>
            `;
            
            forecastContainer.appendChild(forecastCard);
        });
    }
});