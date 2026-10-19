import test from "node:test";
import assert from "node:assert/strict";
import { pickScene, SCENE_LABEL } from "../lib/seneca/utils/weatherScene.ts";

const noon = { hour: 12, isDay: true, temp: 30, feelsLike: 33 };

test("wind outranks the sky: a bagyo is a bagyo", () => {
  assert.equal(pickScene({ ...noon, code: 1, wind: 50 }), "typhoon");
  assert.equal(pickScene({ ...noon, code: 63, gusts: 80 }), "typhoon");
  assert.equal(pickScene({ ...noon, code: 1, wind: 32 }), "windy");
});

test("storms, downpours, rain and drizzle by code and rainfall", () => {
  assert.equal(pickScene({ ...noon, code: 95 }), "thunder");
  assert.equal(pickScene({ ...noon, code: 65 }), "downpour");
  assert.equal(pickScene({ ...noon, code: 63, precip: 9 }), "downpour");
  assert.equal(pickScene({ ...noon, code: 63, precip: 2 }), "rain");
  assert.equal(pickScene({ ...noon, code: 53 }), "drizzle");
  assert.equal(pickScene({ ...noon, code: 45 }), "fog");
});

test("night changes the light, and rain at night is its own scene", () => {
  const night = { hour: 22, isDay: false, temp: 26 };
  assert.equal(pickScene({ ...night, code: 0 }), "clear-night");
  assert.equal(pickScene({ ...night, code: 3 }), "cloudy-night");
  assert.equal(pickScene({ ...night, code: 61 }), "rain-night");
  assert.equal(pickScene({ ...night, code: 95 }), "thunder", "a storm stays a storm");
  assert.equal(pickScene({ hour: 2, code: 0 }), "clear-night", "falls back to the hour without is_day");
});

test("heat index, golden hour and cool amihan mornings", () => {
  assert.equal(pickScene({ ...noon, code: 1, feelsLike: 40 }), "hot");
  assert.equal(pickScene({ ...noon, code: 3, feelsLike: 40 }), "overcast", "heat under heavy cloud reads as cloud");
  assert.equal(pickScene({ hour: 17, isDay: true, code: 1, feelsLike: 31 }), "golden-hour");
  assert.equal(pickScene({ hour: 7, isDay: true, code: 0, temp: 22 }), "cool-morning");
});

test("rain on the way, then plain sky cover", () => {
  assert.equal(pickScene({ ...noon, code: 3, rainSoon: 85 }), "rain-coming");
  assert.equal(pickScene({ ...noon, code: 0 }), "clear-day");
  assert.equal(pickScene({ ...noon, code: 2 }), "partly-cloudy");
  assert.equal(pickScene({ ...noon, code: 3 }), "overcast");
  assert.equal(pickScene({ hour: 12 }), "partly-cloudy", "missing data falls back gently");
});

test("every scene has words", () => {
  for (const scene of Object.keys(SCENE_LABEL)) assert.ok(SCENE_LABEL[scene].length > 0, scene);
  assert.equal(Object.keys(SCENE_LABEL).length, 17);
});
