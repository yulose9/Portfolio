/**
 * Which picture the weather card paints — the sky as it feels in the
 * Philippines, not just the WMO code. Wind and heat index can outrank the sky
 * (a bagyo is a bagyo whatever the cloud code says; 38° feels-like is
 * alinsangan even under a clear sky), and time of day changes the light.
 */
export type SceneId =
  | "typhoon"
  | "thunder"
  | "downpour"
  | "rain"
  | "drizzle"
  | "fog"
  | "windy"
  | "rain-night"
  | "clear-night"
  | "cloudy-night"
  | "hot"
  | "golden-hour"
  | "cool-morning"
  | "rain-coming"
  | "clear-day"
  | "partly-cloudy"
  | "overcast";

export type SceneInput = {
  /** WMO weather code */
  code?: number | null;
  isDay?: boolean | null;
  temp?: number | null;
  feelsLike?: number | null;
  /** km/h */
  wind?: number | null;
  gusts?: number | null;
  /** mm in the last hour */
  precip?: number | null;
  /** Highest rain chance (%) over the next few hours */
  rainSoon?: number | null;
  /** Local hour, 0–23 */
  hour: number;
};

/** Each scene's words: how it feels, in the app's Taglish. */
export const SCENE_LABEL: Record<SceneId, string> = {
  typhoon: "Bagyo, malakas ang hangin",
  thunder: "Kumukulog at kumikidlat",
  downpour: "Malakas na ulan",
  rain: "Umuulan",
  drizzle: "Umaambon",
  fog: "Mahamog",
  windy: "Mahangin",
  "rain-night": "Maulang gabi",
  "clear-night": "Maaliwalas na gabi",
  "cloudy-night": "Maulap na gabi",
  hot: "Mainit at maalinsangan",
  "golden-hour": "Golden hour",
  "cool-morning": "Malamig na umaga",
  "rain-coming": "Uulan mamaya",
  "clear-day": "Maaraw",
  "partly-cloudy": "Medyo maulap",
  overcast: "Makulimlim",
};

const n = (v: number | null | undefined, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function pickScene(input: SceneInput): SceneId {
  const code = n(input.code, 2);
  const wind = n(input.wind);
  const gusts = n(input.gusts);
  const precip = n(input.precip);
  const feels = n(input.feelsLike, n(input.temp, 28));
  const temp = n(input.temp, 28);
  const rainSoon = n(input.rainSoon);
  const night = input.isDay === false || (input.isDay == null && (input.hour >= 19 || input.hour < 5));

  // Wind strong enough to be a tropical storm (PAGASA signal no. 1 starts near 39 km/h)
  if (wind >= 45 || gusts >= 70) return "typhoon";
  if (code >= 95) return "thunder";
  if (code === 65 || code === 82 || ((code === 63 || code === 81) && precip >= 7.5)) return night ? "rain-night" : "downpour";
  if ([61, 63, 66, 67, 80, 81].includes(code)) return night ? "rain-night" : "rain";
  if (code >= 51 && code <= 57) return night ? "rain-night" : "drizzle";
  if (code === 45 || code === 48) return "fog";
  if (wind >= 30 || gusts >= 50) return "windy";

  if (night) return code <= 1 ? "clear-night" : "cloudy-night";

  // PAGASA's "extreme caution" heat index band starts at 33°; 38°+ is the sticky kind
  if (feels >= 38 && code <= 2) return "hot";
  if ((input.hour === 17 || input.hour === 18) && code <= 2) return "golden-hour";
  if (input.hour < 9 && temp <= 24 && code <= 2) return "cool-morning";
  if (rainSoon >= 70 && code >= 2) return "rain-coming";
  if (code <= 1) return "clear-day";
  if (code === 2) return "partly-cloudy";
  return "overcast";
}
