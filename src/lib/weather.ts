import { useEffect, useState } from "react";
import type { LocationName } from "./locations";

type Coordinates = { latitude: number; longitude: number };

export type WeatherSnapshot = {
  temperature: number;
  humidity: number;
  uvIndex: number;
  summary: string;
  code: number;
  updatedAt: number;
  source: "live" | "fallback";
};

export const NIGERIA_STATE_COORDINATES: Record<LocationName, Coordinates> = {
  Abia: { latitude: 5.4527, longitude: 7.5248 },
  Adamawa: { latitude: 9.3265, longitude: 12.3984 },
  "Akwa Ibom": { latitude: 5.0382, longitude: 7.9092 },
  Anambra: { latitude: 6.2209, longitude: 6.9369 },
  Bauchi: { latitude: 10.3158, longitude: 9.8442 },
  Bayelsa: { latitude: 4.7719, longitude: 6.0699 },
  Benue: { latitude: 7.3369, longitude: 8.7404 },
  Borno: { latitude: 11.8846, longitude: 13.151 },
  "Cross River": { latitude: 5.8702, longitude: 8.5988 },
  Delta: { latitude: 5.8904, longitude: 5.6803 },
  Ebonyi: { latitude: 6.2649, longitude: 8.0137 },
  Edo: { latitude: 6.335, longitude: 5.6037 },
  Ekiti: { latitude: 7.7189, longitude: 5.311 },
  Enugu: { latitude: 6.4584, longitude: 7.5464 },
  "FCT Abuja": { latitude: 9.0765, longitude: 7.3986 },
  Gombe: { latitude: 10.2904, longitude: 11.167 },
  Imo: { latitude: 5.572, longitude: 7.0588 },
  Jigawa: { latitude: 12.228, longitude: 9.5616 },
  Kaduna: { latitude: 10.5222, longitude: 7.4383 },
  Kano: { latitude: 11.9964, longitude: 8.5167 },
  Katsina: { latitude: 12.9868, longitude: 7.6171 },
  Kebbi: { latitude: 11.6781, longitude: 4.0695 },
  Kogi: { latitude: 7.7995, longitude: 6.739 },
  Kwara: { latitude: 8.9669, longitude: 4.3874 },
  Lagos: { latitude: 6.5244, longitude: 3.3792 },
  Nasarawa: { latitude: 8.5378, longitude: 8.32 },
  Niger: { latitude: 9.9293, longitude: 5.5983 },
  Ogun: { latitude: 7.1608, longitude: 3.3489 },
  Ondo: { latitude: 7.2526, longitude: 5.1931 },
  Osun: { latitude: 7.5629, longitude: 4.52 },
  Oyo: { latitude: 7.3775, longitude: 3.947 },
  Plateau: { latitude: 9.2182, longitude: 9.5179 },
  Rivers: { latitude: 4.8156, longitude: 7.0498 },
  Sokoto: { latitude: 13.0059, longitude: 5.2476 },
  Taraba: { latitude: 8.8937, longitude: 11.526 },
  Yobe: { latitude: 11.747, longitude: 11.9605 },
  Zamfara: { latitude: 12.1707, longitude: 6.6641 },
};

const CACHE_TTL = 15 * 60 * 1000;

function fallbackWeather(): WeatherSnapshot {
  return {
    temperature: 30,
    humidity: 65,
    uvIndex: 6,
    summary: "Weather unavailable",
    code: -1,
    updatedAt: Date.now(),
    source: "fallback",
  };
}

function weatherSummary(code: number) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain showers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Changing conditions";
}

async function getWeather(location: LocationName, signal: AbortSignal): Promise<WeatherSnapshot> {
  const cachedKey = `goall26-weather:${location}`;
  try {
    const cached = sessionStorage.getItem(cachedKey);
    if (cached) {
      const parsed = JSON.parse(cached) as WeatherSnapshot;
      if (Date.now() - parsed.updatedAt < CACHE_TTL) return parsed;
    }
  } catch {
    // A failed cache read should never block live weather.
  }

  const coordinates = NIGERIA_STATE_COORDINATES[location];
  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code",
    daily: "uv_index_max",
    timezone: "auto",
    forecast_days: "1",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);

  const payload = (await response.json()) as {
    current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number };
    daily?: { uv_index_max?: number[] };
  };
  const code = payload.current?.weather_code;
  const temperature = payload.current?.temperature_2m;
  const humidity = payload.current?.relative_humidity_2m;
  if (typeof code !== "number" || typeof temperature !== "number" || typeof humidity !== "number") {
    throw new Error("Weather response was incomplete");
  }

  const weather: WeatherSnapshot = {
    temperature: Math.round(temperature),
    humidity: Math.round(humidity),
    uvIndex: Math.round(payload.daily?.uv_index_max?.[0] ?? 0),
    summary: weatherSummary(code),
    code,
    updatedAt: Date.now(),
    source: "live",
  };
  try {
    sessionStorage.setItem(cachedKey, JSON.stringify(weather));
  } catch {
    // No action is required if browser storage is unavailable.
  }
  return weather;
}

export function useRealWeather(location: LocationName) {
  const [weather, setWeather] = useState<WeatherSnapshot>(fallbackWeather);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void getWeather(location, controller.signal)
      .then((value) => setWeather(value))
      .catch(() => setWeather(fallbackWeather()))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [location]);

  return { weather, loading };
}
