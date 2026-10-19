// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock, Droplets, Sparkles } from 'lucide-react';
import Num from './Num';
import { EASE_OUT, LAYOUT_SPRING, TAP, TAP_TRANSITION } from "@/lib/seneca/constants/motion";
import { getDetailedLocationSummary, getSmartWeatherSummary } from "@/lib/seneca/services/weatherService";

const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);

    if (diffSeconds < 60) return 'Updated just now';

    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `Updated ${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `Updated at ${timeStr} (${diffHours}h ago)`;
};

/** Weather for every tracked location plus the AI summary, refreshed every 30 minutes. */
export function useWeather() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        const fetchWeather = async () => {
            const data = await getSmartWeatherSummary();
            if (!alive) return;
            setWeather(data);
            setLoading(false);
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, []);

    return { weather, loading };
}

/**
 * The header pill and its details popover. Pass `weather` to reuse data a
 * parent already fetched; `variant="link"` renders the trigger as the
 * section header's "View details" link instead of the pill.
 */
export default function WeatherWidget({ weather: shared, variant = "pill" }: { weather?: any; variant?: "pill" | "link" } = {}) {
    if (shared !== undefined) return <WeatherPopover weather={shared} loading={false} variant={variant} />;
    return <OwnWeather variant={variant} />;
}

function OwnWeather({ variant }) {
    const { weather, loading } = useWeather();
    return <WeatherPopover weather={weather} loading={loading} variant={variant} />;
}

function WeatherPopover({ weather, loading, variant }) {
    const [isOpen, setIsOpen] = useState(false);

    // New state for location details
    const [expandedLocation, setExpandedLocation] = useState(null);
    const [summaries, setSummaries] = useState({});
    const [loadingSummary, setLoadingSummary] = useState(false);
    const containerRef = useRef(null);

    // Dismiss the popover on outside tap or Escape, like a native popover
    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleLocationClick = async (loc) => {
        if (expandedLocation === loc.location) {
            setExpandedLocation(null);
            return;
        }

        setExpandedLocation(loc.location);

        // Fetch summary if not already cached
        if (!summaries[loc.location]) {
            setLoadingSummary(true);
            try {
                const summary = await getDetailedLocationSummary(loc.location, loc);
                setSummaries(prev => ({ ...prev, [loc.location]: summary }));
            } finally {
                setLoadingSummary(false);
            }
        }
    };

    if (loading && variant === "pill") return (
        <div className="h-8 w-24 bg-fill rounded-full animate-pulse" />
    );

    return (
        <div ref={containerRef} className="relative z-50">
            {variant === "link" ? (
                <button
                    type="button"
                    className="sn-more"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="dialog"
                    data-sound={isOpen ? "close" : "open"}
                    disabled={loading}
                >
                    View details
                </button>
            ) : (
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileTap={TAP}
                transition={TAP_TRANSITION}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="flex items-center gap-1.5 h-10 bg-white/60 backdrop-blur-md px-3 rounded-full shadow-card"
            >
                <span className="text-title-3">
                    {(weather?.homeTemp ?? 25) > 30 ? '☀️' : (weather?.raw?.[0]?.current?.precip ?? 0) > 0 ? '🌧️' : '⛅'}
                </span>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-footnote font-bold text-ink tabular-nums">
                        {typeof weather?.homeTemp === 'number' ? `${Math.round(weather.homeTemp)}°C` : '--'}
                    </span>
                    <span className="hidden min-[420px]:block text-caption-2 text-ink-2 font-medium truncate max-w-[100px]">
                        {weather?.summary?.pill || 'Loading...'}
                    </span>
                </div>
            </motion.button>
            )}

            {/* Details: the day's advice on butter, then each place as a row */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.98, filter: 'blur(2px)', transition: { duration: 0.12, ease: EASE_OUT } }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                        role="dialog"
                        aria-label="Weather details"
                        className="sn-wx-pop"
                        style={{ transformOrigin: 'top right' }}
                    >
                        <div className="sn-wx-advice">
                            <span className="sn-wx-advice-icon" aria-hidden="true">
                                {splitCondition(weather?.raw?.[0]?.current?.condition).emoji}
                            </span>
                            <div className="min-w-0">
                                <p className="sn-wx-advice-text">{weather?.summary?.recommendation || 'Checking the sky…'}</p>
                                <div className="sn-wx-advice-meta">
                                    {weather?.summary?.model && (
                                        <span className="sn-wx-chip">
                                            <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
                                            {weather.summary.model.replace('Gemini ', '')}
                                        </span>
                                    )}
                                    {weather?.summary?.timestamp && (
                                        <span className="inline-flex items-center gap-1">
                                            <Clock size={11} strokeWidth={2} aria-hidden="true" />
                                            {formatTimeAgo(weather.summary.timestamp)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ul className="sn-wx-places">
                            {weather?.raw?.map((loc, i) => {
                                const rainChance = loc.hourlyForecast?.length
                                    ? Math.max(...loc.hourlyForecast.map((h) => h.rainProb ?? 0))
                                    : 0;
                                const isExpanded = expandedLocation === loc.location;
                                const { label, emoji } = splitCondition(loc.current?.condition);
                                const summary = summaries[loc.location];

                                return (
                                    <motion.li
                                        key={loc.location}
                                        layout
                                        transition={LAYOUT_SPRING}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT, delay: 0.04 + i * 0.05 } }}
                                        className={`sn-wx-place ${isExpanded ? 'is-open' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            className="sn-wx-place-row"
                                            aria-expanded={isExpanded}
                                            onClick={() => handleLocationClick(loc)}
                                        >
                                            <span className="sn-tile sn-tile-sm" aria-hidden="true">{emoji}</span>
                                            <span className="min-w-0 flex-1 text-left">
                                                <span className="block text-[15px] font-[650] text-ink">{loc.location}</span>
                                                <span className="block truncate text-[12.5px] text-ink-2">{label}</span>
                                            </span>
                                            <span className={`sn-wx-rain ${rainChance >= 50 ? 'is-wet' : ''}`}>
                                                <Droplets size={12} strokeWidth={2} aria-hidden="true" />
                                                <Num value={rainChance} suffix="%" />
                                            </span>
                                            <span className="sn-wx-temp">
                                                {typeof loc.current?.temp === 'number' ? <Num value={Math.round(loc.current.temp)} suffix="°" /> : '--'}
                                            </span>
                                            <ChevronDown size={16} strokeWidth={2} className="sn-wx-chev" aria-hidden="true" />
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ ...LAYOUT_SPRING, opacity: { duration: 0.2, ease: EASE_OUT } }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="sn-wx-detail">
                                                        {loc.hourlyForecast?.length > 0 && (
                                                            <ol className="sn-wx-hours" aria-label={`Next hours in ${loc.location}, every four hours`}>
                                                                {loc.hourlyForecast.slice(0, 6).map((h) => (
                                                                    <li key={h.time}>
                                                                        <span className="sn-wx-hour">{hourLabel(h.time)}</span>
                                                                        <span className="sn-wx-hour-bar" aria-hidden="true">
                                                                            <span style={{ transform: `scaleY(${Math.max(0.06, (h.rainProb ?? 0) / 100)})` }} />
                                                                        </span>
                                                                        <span className="sn-wx-hour-temp">{Math.round(h.temp)}°</span>
                                                                        <span className="sn-wx-hour-rain">{h.rainProb ?? 0}%</span>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        )}
                                                        {loadingSummary && !summary ? (
                                                            <p className="sn-wx-thinking">
                                                                <span className="sn-wx-dots" aria-hidden="true"><i /><i /><i /></span>
                                                                Asking Gemini about {loc.location}…
                                                            </p>
                                                        ) : summary ? (
                                                            <motion.p
                                                                initial={{ opacity: 0, filter: 'blur(3px)' }}
                                                                animate={{ opacity: 1, filter: 'blur(0px)' }}
                                                                transition={{ duration: 0.25, ease: EASE_OUT }}
                                                                className="sn-wx-summary"
                                                            >
                                                                {summary?.text || summary}
                                                            </motion.p>
                                                        ) : null}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.li>
                                );
                            })}
                        </ul>

                        <p className="sn-wx-hint">Tap a place for the next hours and a closer read</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/** "Umuulan 🌧️" → { label: "Umuulan", emoji: "🌧️" } */
function splitCondition(condition = '') {
    const match = String(condition).match(/^(.*?)\s*(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*)\s*$/u);
    return match ? { label: match[1].trim(), emoji: match[2] } : { label: String(condition).trim(), emoji: '⛅' };
}

// Open-Meteo hours are local wall-clock strings ("2026-10-06T13:00"): read the hour, don't re-zone it.
const hourLabel = (time) => {
    const h = Number(String(time).slice(11, 13));
    if (!Number.isFinite(h)) return '';
    return h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
};
