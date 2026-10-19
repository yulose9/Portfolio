// @ts-nocheck
"use client";
import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cloud, Droplets, Thermometer } from "lucide-react";
import Num from "@/components/seneca/Num";
import WeatherWidget, { useWeather } from "@/components/seneca/WeatherWidget";
import { pickScene, SCENE_LABEL } from "@/lib/seneca/utils/weatherScene";
import { SectionHead, splitCondition } from "./parts";
import WeatherArt from "./WeatherArt";

const manilaHour = () => Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false })) % 24;

/** Dev only: ?wx=typhoon previews a scene without waiting for the sky. */
const previewScene = () => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return null;
  const wx = new URLSearchParams(window.location.search).get("wx");
  return wx && wx in SCENE_LABEL ? wx : null;
};

export default function WeatherCard() {
  const reduce = useReducedMotion();
  const { weather, loading } = useWeather();
  const here = weather?.raw?.[0];
  const temp = typeof weather?.homeTemp === "number" ? Math.round(weather.homeTemp) : null;
  const { label, emoji } = splitCondition(here?.current?.condition);
  const rain = here?.hourlyForecast?.length ? Math.max(...here.hourlyForecast.map((h) => h.rainProb ?? 0)) : null;
  const feels = typeof here?.current?.feelsLike === "number" ? Math.round(here.current.feelsLike) : null;

  // Cheap to work out; recomputed each render so the dev preview always applies
  const scene = (() => {
    const preview = previewScene();
    if (preview) return preview;
    const c = here?.current || {};
    const hour = c.time ? Number(String(c.time).slice(11, 13)) : manilaHour();
    return pickScene({
      code: c.code,
      isDay: c.isDay,
      temp: c.temp,
      feelsLike: c.feelsLike,
      wind: c.wind,
      gusts: c.gusts,
      precip: c.precip,
      rainSoon: here?.rainSoon,
      hour,
    });
  })();

  return (
    <section aria-labelledby="sn-weather">
      <SectionHead id="sn-weather" title="Weather" action={<WeatherWidget weather={weather} variant="link" />} />
      <div className="sn-weather" data-scene={scene} aria-busy={loading}>
        <div className="flex items-start justify-between gap-3">
          <span className="sn-weather-icon" aria-hidden="true">
            {emoji}
          </span>
          <p className="sn-weather-temp" aria-label={temp !== null ? `${temp} degrees Celsius` : "Temperature loading"}>
            {temp !== null ? <Num value={temp} /> : "--"}
            <span aria-hidden="true">°C</span>
          </p>
        </div>

        <dl className="sn-weather-stats">
          <div className="sn-wstat">
            <dt>
              <Thermometer size={13} strokeWidth={2} aria-hidden="true" />
              Feels like
            </dt>
            <dd>{feels !== null ? <Num value={feels} suffix="°" /> : "--"}</dd>
          </div>
          <div className="sn-wstat">
            <dt>
              <Droplets size={13} strokeWidth={2} aria-hidden="true" />
              Rain
            </dt>
            <dd>{rain !== null ? <Num value={rain} suffix="%" /> : "--"}</dd>
          </div>
          <div className="sn-wstat sn-wstat-sky">
            <dt>
              <Cloud size={13} strokeWidth={2} aria-hidden="true" />
              Sky
            </dt>
            <dd title={label}>{loading && !previewScene() ? "--" : SCENE_LABEL[scene]}</dd>
          </div>
        </dl>

        {/* Scenes cross-fade when the sky changes */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={scene}
            className="sn-weather-art"
            initial={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <WeatherArt scene={scene} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
