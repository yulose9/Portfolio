// @ts-nocheck
"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/*
 * The study route, drawn at four scales. The longer the stretch you look
 * back over, the further the journey goes: a barangay street for a week, a
 * town for two, a city across a river for a month, a mountain road past rice
 * terraces for two months. Stops are sampled from each road, so they always
 * sit on it; today's pin waits at the end.
 */

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

const MAPS = {
  1: {
    road: "M24 112C70 112 92 72 140 72s82 40 118 0",
    decor: () => (
      <g>
        {/* houses with roofs */}
        {[[30, 64, "#f3c9a0"], [70, 40, "#cfe1ca"], [196, 96, "#f6dfb0"], [236, 104, "#d9e4ec"]].map(([x, y, c], i) => (
          <g key={i}>
            <rect x={x} y={y} width="26" height="20" rx="3" fill={c} />
            <path d={`M${x - 3} ${y + 1}l16-12 16 12Z`} fill="#c98a5a" />
            <rect x={x + 10} y={y + 9} width="6" height="11" rx="1" fill="#fff" opacity="0.7" />
          </g>
        ))}
        {/* sari-sari store with a striped awning */}
        <g transform="translate(150 12)">
          <rect x="0" y="10" width="44" height="26" rx="3" fill="#fff" opacity="0.9" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={i * 8.8} y="4" width="8.8" height="9" fill={i % 2 ? "#ffffff" : "#e2625c"} />
          ))}
        </g>
        {[[118, 26], [262, 40], [12, 136]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="#9cc29a" />
        ))}
      </g>
    ),
  },
  2: {
    road: "M18 122C40 112 66 98 80 76s28-26 46-24 36 14 58 26 42-6 68-46",
    decor: () => (
      <g>
        {[[10, 10, 46, 30], [64, 6, 30, 22], [180, 104, 40, 30], [228, 96, 44, 40], [110, 100, 36, 26], [196, 8, 30, 26]].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="6" className="sn-map-block" />
        ))}
        <path d="M150 0c10 18 34 22 52 18 20-4 40 4 56 20 8 8 14 10 22 10V0Z" className="sn-map-water" />
        <path d="M0 150v-46c18 4 30 14 34 30 3 10 10 16 18 16Z" className="sn-map-park" />
      </g>
    ),
  },
  4: {
    road: "M16 126C46 126 52 92 84 92s44 34 76 34 26-46 58-46 38 18 46-20",
    decor: () => (
      <g>
        {/* the river, and the bridge where the road crosses it */}
        <path d="M112 0c8 30-10 52 6 80s4 50 14 70h22c-10-22 4-44-10-72s4-52-8-78Z" className="sn-map-water" />
        <rect x="104" y="104" width="44" height="12" rx="3" fill="#d8c9b0" transform="rotate(18 126 110)" />
        {/* city blocks, some taller */}
        {[[12, 12, 26, 44], [44, 26, 22, 30], [180, 10, 24, 40], [210, 22, 30, 28], [246, 6, 26, 46], [186, 110, 30, 30], [226, 100, 44, 40]].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="4" className="sn-map-block" />
            {Array.from({ length: Math.floor(h / 12) }, (_, r) => (
              <rect key={r} x={x + 5} y={y + 5 + r * 12} width={w - 10} height="4" rx="2" fill="#fff" opacity="0.55" />
            ))}
          </g>
        ))}
        <circle cx="58" cy="134" r="14" className="sn-map-park" />
      </g>
    ),
  },
  8: {
    road: "M14 138C60 138 40 112 90 112s70 0 50-22-60-20-10-26 70 6 76-18-30-22 20-30",
    decor: () => (
      <g>
        {/* mountains */}
        <path d="M120 70L176 4l64 66Z" fill="#b9cfd6" />
        <path d="M184 70l44-46 52 46Z" fill="#a7c2cb" />
        <path d="M168 18l8-14 10 12-8 2Z" fill="#fff" opacity="0.8" />
        {/* rice terraces, stepping down the right */}
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M150 ${92 + i * 12}q65 ${-12 + i * 2} 130 0v8q-65 ${-10 + i * 2} -130 0Z`} fill={i % 2 ? "#a9cc8f" : "#bcd99f"} />
        ))}
        {/* a little chapel by the road */}
        <g transform="translate(40 76)">
          <rect x="0" y="10" width="22" height="18" rx="2" fill="#f4ede0" />
          <path d="M-3 11l14-11 14 11Z" fill="#c98a5a" />
          <path d="M11 -9v8M7 -5h8" stroke="#8a5320" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="30" cy="22" r="11" fill="#f8d47a" opacity="0.9" />
      </g>
    ),
  },
};

export default function RouteMap({ weeks, stops, studiedToday, empty }) {
  const reduce = useReducedMotion();
  const map = MAPS[weeks] || MAPS[2];
  const days = stops.length;
  const roadRef = useRef(null);
  const [points, setPoints] = useState([]);

  useLayoutEffect(() => {
    const road = roadRef.current;
    if (!road?.getTotalLength) return;
    const length = road.getTotalLength();
    setPoints(
      Array.from({ length: days }, (_, i) => {
        const p = road.getPointAtLength((length * i) / Math.max(1, days - 1));
        return [p.x, p.y];
      }),
    );
  }, [days, weeks]);

  const pin = points[days - 1] ?? [252, 32];
  const rOn = days <= 7 ? 6.5 : days <= 14 ? 5 : days <= 28 ? 3.8 : 2.8;
  const rOff = days <= 7 ? 4.5 : days <= 14 ? 3.5 : days <= 28 ? 2.6 : 1.9;

  return (
    <motion.svg
      key={weeks}
      viewBox="0 -20 280 190"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={empty ? "is-empty" : undefined}
      initial={reduce ? false : { opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      {map.decor()}
      <path ref={roadRef} d={map.road} className="sn-map-road" />
      <path d={map.road} className="sn-map-lane" />

      {points.map(([x, y], i) => {
        if (i === points.length - 1) return null;
        const on = stops[i];
        const weekEnd = weeks >= 4 && (i + 1) % 7 === 0;
        return (
          <g key={`${weeks}-${i}`}>
            <motion.circle
              cx={x}
              cy={y}
              className={on ? "sn-map-stop is-on" : "sn-map-stop"}
              initial={false}
              animate={{ r: on ? rOn : rOff }}
              transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            />
            {weeks === 1 && (
              <text x={x} y={y + 16} textAnchor="middle" className="sn-map-dow">
                {DOW[(new Date().getDay() + 6 - (days - 1 - i) + 7 * 4) % 7]}
              </text>
            )}
            {weekEnd && (
              <g transform={`translate(${x} ${y})`} className="sn-map-flag">
                <path d="M0 0v-14" stroke="#8a5320" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M0-14h9l-3 3.5 3 3.5h-9Z" fill={on ? "#f5a55b" : "#e9e5dc"} />
              </g>
            )}
          </g>
        );
      })}

      <g transform={`translate(${pin[0]} ${pin[1]})`}>
        <circle r="15" className={`sn-map-pin-halo ${studiedToday ? "is-on" : ""}`} />
        <circle r="9" className={studiedToday ? "sn-map-pin is-on" : "sn-map-pin"} />
        <circle r="3.5" fill="#fff" />
      </g>
    </motion.svg>
  );
}
