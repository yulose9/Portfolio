// @ts-nocheck
import { GoogleGenAI } from "@google/genai";
import { getEnv } from "./firebase";

const LOCATIONS = [
  // City-level on purpose (two decimals is about 1 km): enough for a forecast,
  // and this file is public.
  { name: "Home", lat: 14.43, lng: 120.94 }, // Cavite
  { name: "Work", lat: 14.55, lng: 121.02 }, // Makati
  { name: "Metro", lat: 14.6, lng: 120.98 }, // Manila
];

// Fetch raw weather from OpenMeteo (Free, reliable source for Lat/Lng weather)
async function fetchRawWeather(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila&forecast_days=2`,
    );
    return await response.json();
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

// Get readable condition from WMO code localized for the Philippines
const getWeatherCondition = (code: number) => {
  const codes: Record<number, string> = {
    0: "Tirik ang Araw ☀️",
    1: "Maaraw 🌤️",
    2: "Medyo Maulap ⛅",
    3: "Makulimlim ☁️",
    45: "Hamon ng Hamog 🌫️",
    48: "Makapal na Hamog 🌫️",
    51: "Umaambon 🌧️",
    53: "Umaambon 🌧️",
    55: "Umaambon nang Malakas 🌧️",
    56: "Malamig na Ambon 🌧️",
    57: "Malamig na Ambon 🌧️",
    61: "Umuulan 🌧️",
    63: "Lakas ng Ulan 🌧️",
    65: "Malakas na Ulan ⛈️",
    66: "Malamig na Ulan 🌧️",
    67: "Malamig na Ulan 🌧️",
    71: "Nagniniyebe? (Imposible) ❄️",
    73: "Nagniniyebe? (Imposible) ❄️",
    75: "Nagniniyebe? (Imposible) ❄️",
    77: "Yelo? ❄️",
    80: "Paulan-ulan 🌦️",
    81: "Paulan-ulan 🌦️",
    82: "Buhos ng Ulan ⛈️",
    85: "Snow Showers? ❄️",
    86: "Snow Showers? ❄️",
    95: "May Pagkulog at Pagkidlat 🌩️",
    96: "Bagyo! 🌀",
    99: "Bagyo! 🌀",
  };
  return codes[code] || "Hindi matukoy 🤔";
};

// v6: current carries code, humidity, wind, gusts, is_day; hourly starts at the current hour
const RAW_CACHE_KEY = "weather_raw_v6";
const RAW_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const AI_SUMMARY_CACHE_KEY = "weather_ai_summary_docs_v7";
const AI_CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export const getSmartWeatherSummary = async () => {
  if (typeof window === "undefined") {
    return {
      raw: [],
      homeTemp: null,
      summary: { pill: "Weather", recommendation: "Loading...", timestamp: Date.now() },
    };
  }

  let rawWeatherData: any = null;
  let homeTemp: number | null = null;

  try {
    const cachedRaw = localStorage.getItem(RAW_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (Date.now() - parsed.timestamp < RAW_CACHE_DURATION) {
        rawWeatherData = parsed.data;
      }
    }
  } catch (e) {
    console.error("Raw cache error", e);
  }

  if (!rawWeatherData) {
    try {
      const weatherPromises = LOCATIONS.map(async (loc) => {
        const data = await fetchRawWeather(loc.lat, loc.lng);
        if (!data)
          return {
            location: loc.name,
            current: {},
            hourlyForecast: [],
            tomorrow: {},
          };

        // The next 24 hours from now (hourly data starts at today's midnight)
        const nowHour = String(data?.current?.time || "").slice(0, 13);
        const start = Math.max(0, (data?.hourly?.time || []).findIndex((t: string) => t.slice(0, 13) === nowHour));
        const next24Hours =
          data?.hourly?.temperature_2m?.slice(start, start + 24).map((temp: number, i: number) => ({
            time: data.hourly.time[start + i],
            temp: temp,
            rainProb: data.hourly.precipitation_probability[start + i],
            code: data.hourly.weather_code[start + i],
            condition: getWeatherCondition(data.hourly.weather_code[start + i]),
          })) || [];

        const tomorrow = {
          maxTemp: data?.daily?.temperature_2m_max?.[1],
          minTemp: data?.daily?.temperature_2m_min?.[1],
          rainSum: data?.daily?.precipitation_sum?.[1],
          condition: getWeatherCondition(data?.daily?.weather_code?.[1]),
        };

        return {
          location: loc.name,
          current: {
            temp: data?.current?.temperature_2m,
            feelsLike: data?.current?.apparent_temperature,
            condition: getWeatherCondition(data?.current?.weather_code),
            code: data?.current?.weather_code,
            precip: data?.current?.precipitation,
            humidity: data?.current?.relative_humidity_2m,
            wind: data?.current?.wind_speed_10m,
            gusts: data?.current?.wind_gusts_10m,
            isDay: data?.current?.is_day === undefined ? null : data.current.is_day === 1,
            time: data?.current?.time,
          },
          // Rain chance for the next four hours, for "rain coming" scenes
          rainSoon: Math.max(0, ...next24Hours.slice(0, 4).map((h: any) => h.rainProb ?? 0)),
          hourlyForecast: next24Hours.filter((_: any, i: number) => i % 4 === 0),
          tomorrow: tomorrow,
        };
      });
      rawWeatherData = await Promise.all(weatherPromises);

      if (
        rawWeatherData &&
        rawWeatherData.length > 0 &&
        rawWeatherData[0].current.temp !== undefined
      ) {
        localStorage.setItem(
          RAW_CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            data: rawWeatherData,
          }),
        );
      }
    } catch (e) {
      console.error("OpenMeteo Fetch Error:", e);
    }
  }

  const homeData = rawWeatherData?.find((d: any) => d.location === "Home") || {};
  homeTemp = homeData.current?.temp ?? null;

  let aiSummary: any = null;
  let modelUsed = "Cached Memory";

  try {
    const cachedAI = localStorage.getItem(AI_SUMMARY_CACHE_KEY);
    if (cachedAI) {
      const parsed = JSON.parse(cachedAI);
      const age = Date.now() - parsed.timestamp;
      const cachedDate = new Date(parsed.timestamp).getDate();
      const todayDate = new Date().getDate();

      if (cachedDate === todayDate && age < AI_CACHE_DURATION) {
        aiSummary = parsed.data;
        aiSummary.timestamp = parsed.timestamp;
      }
    }
  } catch (e) {
    console.error("AI cache error", e);
  }

  if (!aiSummary && rawWeatherData) {
    const promptText = `
            Current Date/Time: ${new Date().toLocaleString("en-PH")}
            
            You are a helpful, witty personal assistant.
            Here is the comprehensive weather data for my locations:
            - Home: Cavite
            - Work: Makati
            - Metro: Metro Manila
            
            Data: ${JSON.stringify(rawWeatherData)}
    
            Based on the "current", "hourlyForecast" (next 24h), and "tomorrow" data for ALL THREE locations above:
            1. Summarize the overall weather outlook across these areas in just ONE SHARP, CONCISE sentence.
            2. Tell me whether to bring an umbrella, a jacket, or just a general practical suggestion based on the overview.
    
            TASKS:
            1. "pill": A very short status (max 4 words) e.g., "Rainy Day ☔" or "Clear Skies ☀️".
            2. "icon": Provide exactly ONE of these string values representing the best overall icon: "sun", "cloud-sun", "cloud", "cloud-rain", "cloud-lightning", "umbrella", "wind".
            3. "recommendation": A straight-to-the-point sentence combining the summary and action. 
               - Example: "Rain expected across all locations later today, definitely bring an umbrella! ☔"
               - Example: "Scorching hot at home and work today, dress light and stay hydrated! 🥤"
               - Example: "Overcast but dry everywhere today, comfortable weather for commuting. ☁️"
               Make it maximum 15 words. NO fluff.
    
            Output strictly valid JSON:
            { "pill": "...", "icon": "...", "recommendation": "..." }
        `;

    const apiKey = getEnv("GEMINI_API_KEY");
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: { responseMimeType: "application/json" },
        });

        const fullText = (result as any)?.text || (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (fullText) {
          const cleanText = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
          aiSummary = JSON.parse(cleanText);
          modelUsed = "Gemini 2.0 Flash";
        }
      } catch (error) {
        console.warn("Gemini weather summary failed, using offline fallback:", error);
        aiSummary = generateOfflineSummary(homeData);
        modelUsed = "Offline Fallback";
      }
    } else {
      aiSummary = generateOfflineSummary(homeData);
      modelUsed = "Offline Fallback";
    }

    if (aiSummary) {
      const generatedTimestamp = Date.now();
      aiSummary.timestamp = generatedTimestamp;
      localStorage.setItem(
        AI_SUMMARY_CACHE_KEY,
        JSON.stringify({
          timestamp: generatedTimestamp,
          data: aiSummary,
        }),
      );
    }
  }

  if (!aiSummary) {
    aiSummary = { pill: "Weather", recommendation: "Unable to load weather.", timestamp: Date.now() };
  }

  return {
    raw: rawWeatherData || [],
    homeTemp: homeTemp !== undefined ? homeTemp : null,
    summary: { ...aiSummary, model: modelUsed },
  };
};

const CACHE_KEY_DETAIL_PREFIX = "weather_detail_cache_v6_";
const CACHE_DURATION_DETAIL = 8 * 60 * 60 * 1000;

export const getDetailedLocationSummary = async (
  locationName: string,
  locationData: any,
) => {
  if (!locationData || typeof window === "undefined") return null;

  const cacheKey = `${CACHE_KEY_DETAIL_PREFIX}${locationName}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (age < CACHE_DURATION_DETAIL) {
        return { text: parsed.data, timestamp: parsed.timestamp, cached: true };
      }
    }
  } catch (e) {
    console.error("Detail cache read error:", e);
  }

  const minimalData = {
    current: locationData.current,
    forecast: locationData.hourlyForecast?.slice(0, 5).map((h: any) => ({
      time: new Date(h.time).getHours() + ":00",
      temp: h.temp,
      rain: h.rainProb + "%",
      cond: h.condition,
    })),
  };

  const locationMapping: Record<string, string> = {
    Home: "Cavite",
    Work: "Makati",
    Metro: "Metro Manila",
  };
  const actualLocation = locationMapping[locationName] || locationName;

  const promptText = `
        Current Time: ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}.
        Location: ${actualLocation}
        API Data: ${JSON.stringify(minimalData)}

        Task: You are a smart weather assistant. 
        Give me a completely straight-to-the-point, ultra-short summary (max 1-2 SHORT sentences).
        State the vibe (e.g. humid, rainy, clear) and ONE piece of practical advice (wear/bring).
        NO fluff.
        
        Style: Casual, witty, helpful.
        Emoji: Required.
    `;

  const apiKey = getEnv("GEMINI_API_KEY");
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: { temperature: 0.9 },
      });

      const text = ((response as any)?.text || (response as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text)?.trim();
      if (text) {
        const generatedTimestamp = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: generatedTimestamp, data: text }));
        return { text, timestamp: generatedTimestamp, cached: false };
      }
    } catch (error) {
      console.warn("Gemini detail weather summary failed:", error);
    }
  }

  const temp = locationData.current?.temp || 25;
  const cond = locationData.current?.condition?.toLowerCase() || "";
  const rainForecast = locationData.hourlyForecast?.some((h: any) => h.rainProb > 30);
  const rainNow = locationData.current?.precip > 0 || cond.includes("rain") || cond.includes("drizzle");

  const fallbackTimestamp = Date.now();
  if (rainNow || rainForecast)
    return { text: "Rain detected or expected provided by OpenMeteo. Bring an umbrella! ☔", timestamp: fallbackTimestamp, cached: false };
  if (temp > 31)
    return { text: `It's ${Math.round(temp)}°C outside. Wear cool clothes and sunscreen! ☀️`, timestamp: fallbackTimestamp, cached: false };
  if (cond.includes("cloud") || cond.includes("overcast"))
    return { text: "It's a bit cloudy, but should remain dry. ☁️", timestamp: fallbackTimestamp, cached: false };
  if (temp < 24)
    return { text: "Cooler weather today. A light jacket might be nice. 🧥", timestamp: fallbackTimestamp, cached: false };

  return { text: "Skies look clear. Enjoy your day! 🌤️", timestamp: fallbackTimestamp, cached: false };
};

const generateOfflineSummary = (locationData: any) => {
  const temp = locationData?.current?.temp;
  const cond = (locationData?.current?.condition || "").toLowerCase();
  const precip = locationData?.current?.precip || 0;
  const rainComing = locationData?.hourlyForecast?.some((h: any) => h.rainProb > 40);
  const rainNow = precip > 0 || cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower");
  const isHot = temp > 32;
  const isWarm = temp > 28;
  const isCool = temp < 24;
  const isCloudy = cond.includes("cloud") || cond.includes("overcast");
  const isFoggy = cond.includes("fog");

  if (rainNow) {
    return {
      pill: "Raining Now 🌧️",
      icon: "cloud-rain",
      recommendation: "It's raining outside. Grab an umbrella before heading out! ☔",
    };
  }
  if (rainComing) {
    return {
      pill: "Rain Expected 🌦️",
      icon: "umbrella",
      recommendation: "Rain is expected later. Keep an umbrella handy! ☂️",
    };
  }
  if (isHot) {
    return {
      pill: "Hot Weather ☀️",
      icon: "sun",
      recommendation: `It's ${temp ? Math.round(temp) + "°C" : "hot"}. Stay hydrated and wear light clothing! 🥤`,
    };
  }
  if (isFoggy) {
    return {
      pill: "Foggy 🌫️",
      icon: "cloud",
      recommendation: "Visibility is low with fog. Drive carefully! 🌫️",
    };
  }
  if (isCloudy && isWarm) {
    return {
      pill: "Warm & Cloudy ⛅",
      icon: "cloud-sun",
      recommendation: `${temp ? Math.round(temp) + "°C" : "Warm"} with clouds. Comfortable weather, no umbrella needed. 👍`,
    };
  }
  if (isCloudy) {
    return {
      pill: "Overcast ☁️",
      icon: "cloud",
      recommendation: "Cloudy skies today. Should stay dry though! ☁️",
    };
  }
  if (isCool) {
    return {
      pill: "Cool Weather 🧥",
      icon: "wind",
      recommendation: `Cooler at ${temp ? Math.round(temp) + "°C" : "low temps"}. A light jacket would be nice! 🧥`,
    };
  }
  if (temp !== undefined) {
    return {
      pill: "Clear Skies ☀️",
      icon: "sun",
      recommendation: `${Math.round(temp)}°C with clear skies. Great weather to be outside! 🌤️`,
    };
  }
  return {
    pill: "Weather ⛅",
    icon: "cloud",
    recommendation: "Couldn't reach the forecast. Check outside before heading out! 👀",
  };
};
