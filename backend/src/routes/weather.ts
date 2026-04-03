import { Router, type Request, type Response } from 'express';

const router = Router();

// --- Caches ---
const weatherCache = new Map<string, { data: WeatherResponse; timestamp: number }>();
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const geoCache = new Map<string, GeoResult>();

// --- Types ---
interface GeoResult {
  lat: number;
  lon: number;
  name: string;
}

interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
}

interface WeatherDaily {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  weatherCode: number;
}

interface Treatment {
  name: string;
  status: 'ready' | 'wait' | 'not_recommended';
  threshold: string;
  message: string;
}

interface WeatherResponse {
  current: WeatherCurrent;
  daily: WeatherDaily[];
  soilTemperature: number;
  treatments: Treatment[];
  location: GeoResult;
  updatedAt: string;
}

// --- Grass classification ---
const WARM_SEASON = new Set([
  'Bermuda',
  'Zoysia',
  'St. Augustine',
  'Buffalo',
  'Centipede',
  'Bahia',
]);

function isWarmSeason(grassType: string): boolean {
  return WARM_SEASON.has(grassType);
}

// --- Geocoding (Nominatim) ---
async function geocodeZip(zip: string): Promise<GeoResult | null> {
  const cached = geoCache.get(zip);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&countrycodes=us&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DevBot/1.0 (personal lawn care app)' },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  if (!data.length) return null;

  const result: GeoResult = {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    name: data[0].display_name?.split(',')[0] || zip,
  };

  geoCache.set(zip, result);
  return result;
}

// --- Open-Meteo weather fetch ---
async function fetchWeather(
  lat: number,
  lon: number
): Promise<{ current: WeatherCurrent; daily: WeatherDaily[]; soilTemperature: number }> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    hourly: 'soil_temperature_6cm',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: '7',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

  const data = (await res.json()) as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      precipitation: number;
      weather_code: number;
    };
    hourly?: { time: string[]; soil_temperature_6cm: number[] };
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
    };
  };

  // Find current hour's soil temperature from hourly data
  let soilTemp = 0;
  if (data.hourly?.time && data.hourly?.soil_temperature_6cm) {
    const now = new Date();
    const currentHour = now.toISOString().slice(0, 13); // "2026-03-13T14"
    const hourlyTimes = data.hourly.time;
    const soilTemps = data.hourly.soil_temperature_6cm;

    const idx = hourlyTimes.findIndex((t) => t.startsWith(currentHour));
    if (idx !== -1) {
      soilTemp = soilTemps[idx];
    } else {
      // Fallback: find nearest time
      const nowMs = now.getTime();
      let closestIdx = 0;
      let closestDiff = Infinity;
      for (let i = 0; i < hourlyTimes.length; i++) {
        const diff = Math.abs(new Date(hourlyTimes[i]).getTime() - nowMs);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIdx = i;
        }
      }
      soilTemp = soilTemps[closestIdx];
    }
  }

  const current: WeatherCurrent = {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    precipitation: data.current.precipitation,
    weatherCode: data.current.weather_code,
  };

  const daily: WeatherDaily[] = [];
  if (data.daily?.time) {
    for (let i = 0; i < data.daily.time.length; i++) {
      daily.push({
        date: data.daily.time[i],
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        precipitation: data.daily.precipitation_sum[i],
        weatherCode: data.daily.weather_code[i],
      });
    }
  }

  return { current, daily, soilTemperature: soilTemp };
}

// --- Treatment readiness logic ---
function calculateTreatments(soilTemp: number, grassType: string): Treatment[] {
  const warm = isWarmSeason(grassType);
  const treatments: Treatment[] = [];

  // Pre-Emergent Herbicide (universal: soil 50-65°F)
  if (soilTemp >= 50 && soilTemp <= 65) {
    treatments.push({
      name: 'Pre-Emergent',
      status: 'ready',
      threshold: 'Soil 50\u201365\u00B0F',
      message: 'Ideal window \u2014 apply before weeds germinate',
    });
  } else if (soilTemp >= 45 && soilTemp < 50) {
    treatments.push({
      name: 'Pre-Emergent',
      status: 'wait',
      threshold: 'Soil 50\u201365\u00B0F',
      message: `Approaching threshold (${Math.round(soilTemp)}\u00B0F)`,
    });
  } else {
    treatments.push({
      name: 'Pre-Emergent',
      status: 'not_recommended',
      threshold: 'Soil 50\u201365\u00B0F',
      message:
        soilTemp < 45 ? 'Too cold \u2014 wait for soil to warm' : 'Window has passed this season',
    });
  }

  // Fertilizer
  if (warm) {
    if (soilTemp >= 65) {
      treatments.push({
        name: 'Fertilizer',
        status: 'ready',
        threshold: 'Soil > 65\u00B0F',
        message: 'Warm-season grass is actively growing',
      });
    } else if (soilTemp >= 55) {
      treatments.push({
        name: 'Fertilizer',
        status: 'wait',
        threshold: 'Soil > 65\u00B0F',
        message: `Needs ${Math.round(65 - soilTemp)}\u00B0 more to reach threshold`,
      });
    } else {
      treatments.push({
        name: 'Fertilizer',
        status: 'not_recommended',
        threshold: 'Soil > 65\u00B0F',
        message: 'Grass is dormant \u2014 fertilizer won\u2019t be absorbed',
      });
    }
  } else {
    if (soilTemp >= 50 && soilTemp <= 75) {
      treatments.push({
        name: 'Fertilizer',
        status: 'ready',
        threshold: 'Soil 50\u201375\u00B0F',
        message: 'Cool-season grass is actively growing',
      });
    } else if (soilTemp >= 40 && soilTemp < 50) {
      treatments.push({
        name: 'Fertilizer',
        status: 'wait',
        threshold: 'Soil 50\u201375\u00B0F',
        message: `Soil warming \u2014 needs ${Math.round(50 - soilTemp)}\u00B0 more`,
      });
    } else {
      treatments.push({
        name: 'Fertilizer',
        status: 'not_recommended',
        threshold: 'Soil 50\u201375\u00B0F',
        message: soilTemp < 40 ? 'Grass is dormant' : 'Too hot \u2014 grass is heat-stressed',
      });
    }
  }

  // Seeding / Overseeding
  if (warm) {
    if (soilTemp >= 65 && soilTemp <= 85) {
      treatments.push({
        name: 'Seeding',
        status: 'ready',
        threshold: 'Soil 65\u201385\u00B0F',
        message: 'Optimal germination conditions',
      });
    } else if (soilTemp >= 55 && soilTemp < 65) {
      treatments.push({
        name: 'Seeding',
        status: 'wait',
        threshold: 'Soil 65\u201385\u00B0F',
        message: `Needs ${Math.round(65 - soilTemp)}\u00B0 more for germination`,
      });
    } else {
      treatments.push({
        name: 'Seeding',
        status: 'not_recommended',
        threshold: 'Soil 65\u201385\u00B0F',
        message: soilTemp < 55 ? 'Too cold for germination' : 'Too hot for establishment',
      });
    }
  } else {
    if (soilTemp >= 50 && soilTemp <= 65) {
      treatments.push({
        name: 'Seeding',
        status: 'ready',
        threshold: 'Soil 50\u201365\u00B0F',
        message: 'Ideal for cool-season seed germination',
      });
    } else if (soilTemp >= 40 && soilTemp < 50) {
      treatments.push({
        name: 'Seeding',
        status: 'wait',
        threshold: 'Soil 50\u201365\u00B0F',
        message: `Soil warming \u2014 ${Math.round(50 - soilTemp)}\u00B0 to go`,
      });
    } else {
      treatments.push({
        name: 'Seeding',
        status: 'not_recommended',
        threshold: 'Soil 50\u201365\u00B0F',
        message: soilTemp < 40 ? 'Too cold for germination' : 'Too warm \u2014 wait for fall',
      });
    }
  }

  return treatments;
}

// --- Route ---
router.get('/', async (req: Request, res: Response) => {
  const zip = req.query.zip as string;
  const grassType = (req.query.grass_type as string) || '';

  if (!zip) {
    res.status(400).json({ error: 'zip query parameter is required' });
    return;
  }

  const cacheKey = `${zip}:${grassType}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const geo = await geocodeZip(zip);
    if (!geo) {
      res.status(404).json({ error: `Could not find coordinates for zip code: ${zip}` });
      return;
    }

    const weather = await fetchWeather(geo.lat, geo.lon);
    const treatments = calculateTreatments(weather.soilTemperature, grassType);

    const response: WeatherResponse = {
      ...weather,
      treatments,
      location: geo,
      updatedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: response, timestamp: Date.now() });
    res.json(response);
  } catch (err) {
    console.error('Weather fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export { router as weatherRouter };
