// @ts-nocheck
"use client";
import React, { useId } from "react";

/*
 * The weather card's painting, one scene per Philippine sky (see
 * lib/seneca/utils/weatherScene.ts). Every sky is drawn in the same box
 * (x 96–240, y 8–118) above a shared strip of hills, so scenes swap without
 * the layout moving. Ambient motion (falling rain, drifting cloud, twinkling
 * stars, a lightning flash) is CSS and stops under reduced motion.
 */

const CLOUD = "M120 86c0-14 11-24 24-24 5-12 17-20 30-20 18 0 32 13 33 30 11 1 19 9 19 20 0 11-9 20-20 20h-70c-9 0-16-7-16-16v-10Z";

/** A cloud centred on (x, y), scaled. */
const Cloud = ({ x, y, s = 1, fill = "#fff", opacity = 0.95, drift = false }) => (
  <g className={drift ? "sn-art-drift" : undefined}>
    <path d={CLOUD} fill={fill} opacity={opacity} transform={`translate(${x} ${y}) scale(${s}) translate(-173 -74)`} />
  </g>
);

/** Rain: `n` drops spread under a cloud; `long` for a downpour. */
const Drops = ({ n = 8, x0 = 126, x1 = 222, y0 = 88, len = 9, color = "#6d9cc0", heavy = false }) => (
  <g className="sn-art-rain" stroke={color} strokeWidth={heavy ? 2.4 : 2} strokeLinecap="round">
    {Array.from({ length: n }, (_, i) => {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / n + (i % 2 ? 4 : -3);
      const y = y0 + (i % 3) * 7;
      return <path key={i} d={`M${x} ${y} l-3 ${len}`} style={{ animationDelay: `${(i * 137) % 900}ms` }} />;
    })}
  </g>
);

const Sun = ({ x = 168, y = 60, r = 26, halo = 40, rays = true, core = "#f7b545", glow = "#fbd46a" }) => (
  <g>
    <circle cx={x} cy={y} r={halo} fill={glow} opacity="0.5" />
    {rays && (
      <g className="sn-art-spin" style={{ transformOrigin: `${x}px ${y}px` }}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x={x - 1.5} y={y - halo - 6} width="3" height="8" rx="1.5" fill={core} opacity="0.7" transform={`rotate(${i * 30} ${x} ${y})`} />
        ))}
      </g>
    )}
    <circle cx={x} cy={y} r={r} fill={core} />
    <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.34} fill="#fde49a" opacity="0.8" />
  </g>
);

const Umbrella = ({ x = 160, y = 80, rotate = -18, canopy = "#ef9a3c", rib = "#c96f1f", s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-160 -80)`}>
    <path d="M160 102V60" stroke="#8a5320" strokeWidth="4" strokeLinecap="round" />
    <path d="M160 102c0 7 9 7 9 0" fill="none" stroke="#8a5320" strokeWidth="4" strokeLinecap="round" />
    <path d="M100 66C104 34 130 16 160 16s56 18 60 50c-9-7-19-7-28 0-9-7-21-7-32 0-11-7-23-7-32 0-9-7-19-7-28 0Z" fill={canopy} />
    <path d="M160 16c-15 10-23 30-24 50M160 16c15 10 23 30 24 50" fill="none" stroke={rib} strokeWidth="2.5" />
  </g>
);

const Moon = ({ x = 176, y = 52, r = 22, id, color = "#f6e7b5" }) => (
  <g>
    <defs>
      <mask id={id}>
        <rect x="90" y="0" width="160" height="130" fill="#fff" />
        <circle cx={x + r * 0.45} cy={y - r * 0.35} r={r * 0.88} fill="#000" />
      </mask>
    </defs>
    <circle cx={x} cy={y} r={r + 12} fill={color} opacity="0.12" />
    <circle cx={x} cy={y} r={r} fill={color} mask={`url(#${id})`} />
  </g>
);

const Stars = ({ points = [[112, 22], [138, 40], [210, 22], [226, 58], [124, 70], [200, 92], [150, 16]] }) => (
  <g fill="#fff6d6">
    {points.map(([x, y], i) => (
      <path
        key={i}
        className="sn-art-twinkle"
        style={{ animationDelay: `${i * 420}ms` }}
        d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z`}
      />
    ))}
  </g>
);

function Sky({ scene, maskId }) {
  switch (scene) {
    case "clear-day":
      return <Sun />;
    case "hot":
      return (
        <g>
          <Sun r={30} halo={46} core="#f59a3c" glow="#f9c26a" />
          <g className="sn-art-shimmer" fill="none" stroke="#e8893a" strokeWidth="2" strokeLinecap="round" opacity="0.55">
            <path d="M118 104c6-4 10 4 16 0s10 4 16 0 10 4 16 0" />
            <path d="M176 112c6-4 10 4 16 0s10 4 16 0 10 4 16 0" />
          </g>
          {/* thermometer */}
          <g transform="translate(116 34)">
            <rect x="-4" y="0" width="8" height="34" rx="4" fill="#fff" />
            <rect x="-1.6" y="8" width="3.2" height="24" rx="1.6" fill="#e2625c" />
            <circle cx="0" cy="36" r="7" fill="#e2625c" stroke="#fff" strokeWidth="2.5" />
          </g>
        </g>
      );
    case "partly-cloudy":
      return (
        <g>
          <Sun x={194} y={44} r={20} halo={30} rays={false} />
          <Cloud x={160} y={76} s={0.85} drift />
        </g>
      );
    case "overcast":
      return (
        <g>
          <Cloud x={150} y={50} s={0.66} fill="#e3e7ea" drift />
          <Cloud x={190} y={72} s={0.9} />
          <Cloud x={128} y={86} s={0.56} fill="#f2f3f4" />
        </g>
      );
    case "rain-coming":
      return (
        <g>
          <Cloud x={150} y={50} s={0.72} fill="#d9dee3" drift />
          <Cloud x={186} y={66} s={0.82} fill="#eef1f3" />
          {/* a closed umbrella, ready by the door */}
          <g transform="translate(214 66) rotate(12)">
            <path d="M0 0v44" stroke="#8a5320" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M0 44c0 6 7 6 7 0" fill="none" stroke="#8a5320" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M0-4c-7 10-9 22-8 34h16c1-12-1-24-8-34Z" fill="#ef9a3c" />
          </g>
          <Drops n={3} x0={130} x1={176} y0={96} len={6} color="#9ab7cc" />
        </g>
      );
    case "drizzle":
      return (
        <g>
          <Cloud x={172} y={58} s={0.86} fill="#f3f5f7" drift />
          <Drops n={7} y0={94} len={5} color="#86acc8" />
        </g>
      );
    case "rain":
      return (
        <g>
          <Drops n={6} x0={100} x1={236} y0={14} len={10} color="#c9a74a" />
          <Umbrella />
        </g>
      );
    case "downpour":
      return (
        <g>
          <Cloud x={172} y={50} s={0.96} fill="#97a3b0" />
          <Drops n={14} y0={84} len={16} color="#5f87a8" heavy />
          <g fill="none" stroke="#7fa3bf" strokeWidth="1.5" opacity="0.7">
            <ellipse cx="136" cy="114" rx="10" ry="2.5" />
            <ellipse cx="206" cy="116" rx="12" ry="3" />
          </g>
        </g>
      );
    case "thunder":
      return (
        <g>
          <Cloud x={172} y={50} s={0.96} fill="#7d8796" />
          <path className="sn-art-flash" d="M180 76l-16 22h11l-9 20 26-28h-11l9-14Z" fill="#f3c945" stroke="#fff3c4" strokeWidth="1.5" strokeLinejoin="round" />
          <Drops n={6} x0={126} x1={160} y0={88} len={11} color="#6d8aa6" />
        </g>
      );
    case "typhoon":
      return (
        <g>
          <g className="sn-art-spin-slow" style={{ transformOrigin: "176px 56px" }} fill="none" strokeLinecap="round">
            <path d="M176 56m-34 0a34 34 0 1 1 34 34" stroke="#8fa6b4" strokeWidth="7" opacity="0.8" />
            <path d="M176 56m-20 0a20 20 0 1 0 20-20" stroke="#aebfca" strokeWidth="6" opacity="0.85" />
            <circle cx="176" cy="56" r="6" fill="#6f8796" />
          </g>
          <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" className="sn-art-gust">
            <path d="M104 98h30" />
            <path d="M112 108h44" />
            <path d="M196 102h36" />
          </g>
          {/* palm bending into the wind */}
          <g transform="translate(112 118)">
            <path d="M0 0c4-14 12-26 24-34" fill="none" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />
            <path d="M24-34c10-4 22-2 30 6M24-34c8 2 16 10 18 20M24-34c-2-8 2-16 10-20" fill="none" stroke="#4c7a56" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
      );
    case "windy":
      return (
        <g>
          <Cloud x={196} y={40} s={0.5} fill="#ffffff" drift />
          <g className="sn-art-gust" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
            <path d="M104 62h70c10 0 14-12 6-16" />
            <path d="M112 80h96c12 0 16 14 6 18" />
            <path d="M120 98h50" />
          </g>
          {[[214, 64, 30], [150, 50, -20], [228, 96, 60]].map(([x, y, r], i) => (
            <ellipse key={i} className="sn-art-leaf" style={{ animationDelay: `${i * 500}ms` }} cx={x} cy={y} rx="6" ry="3" fill="#5f8f69" transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      );
    case "fog":
      return (
        <g>
          <Sun x={186} y={46} r={18} halo={26} rays={false} core="#f3d27a" glow="#f7e3a8" />
          <g className="sn-art-drift" fill="#ffffff">
            <rect x="104" y="62" width="110" height="9" rx="4.5" opacity="0.85" />
            <rect x="122" y="78" width="112" height="9" rx="4.5" opacity="0.75" />
            <rect x="100" y="94" width="96" height="9" rx="4.5" opacity="0.7" />
            <rect x="140" y="108" width="96" height="8" rx="4" opacity="0.6" />
          </g>
        </g>
      );
    case "clear-night":
      return (
        <g>
          <Stars />
          <Moon id={maskId} />
        </g>
      );
    case "cloudy-night":
      return (
        <g>
          <Stars points={[[112, 22], [140, 36], [214, 18], [232, 50]]} />
          <Moon id={maskId} x={188} y={44} r={18} />
          <Cloud x={158} y={78} s={0.78} fill="#c6cbe0" opacity="0.9" drift />
        </g>
      );
    case "rain-night":
      return (
        <g>
          <Moon id={maskId} x={204} y={34} r={14} color="#e9dcb0" />
          <Cloud x={168} y={60} s={0.86} fill="#a9b0c9" />
          <Drops n={9} y0={92} len={10} color="#9bb3d6" />
        </g>
      );
    case "golden-hour":
      return (
        <g>
          <circle cx="168" cy="118" r="62" fill="#f8c27a" opacity="0.45" />
          <circle cx="168" cy="118" r="36" fill="#f5a55b" />
          <g fill="none" stroke="#8a5320" strokeWidth="2" strokeLinecap="round" opacity="0.7">
            <path d="M130 46q5-5 10 0q5-5 10 0" />
            <path d="M190 30q4-4 8 0q4-4 8 0" />
            <path d="M210 58q3-3 6 0q3-3 6 0" />
          </g>
        </g>
      );
    case "cool-morning":
      return (
        <g>
          <Sun x={192} y={48} r={18} halo={28} rays={false} core="#f9cf6a" glow="#fbe3a0" />
          <g className="sn-art-drift" fill="#ffffff" opacity="0.8">
            <rect x="104" y="96" width="96" height="7" rx="3.5" />
            <rect x="140" y="108" width="96" height="6" rx="3" opacity="0.8" />
          </g>
          <g fill="#ffffff">
            {[[126, 70], [146, 58], [222, 86]].map(([x, y], i) => (
              <path key={i} className="sn-art-twinkle" style={{ animationDelay: `${i * 600}ms` }} d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2Z`} />
            ))}
          </g>
        </g>
      );
    default:
      return <Sun />;
  }
}

const NIGHT = new Set(["clear-night", "cloudy-night", "rain-night"]);
const WET = new Set(["rain", "downpour", "drizzle", "thunder", "rain-night", "typhoon"]);

function Ground({ scene }) {
  const night = NIGHT.has(scene);
  const back = night ? "#3f5e4a" : scene === "hot" ? "#93b26f" : "#7fae7c";
  const front = night ? "#2f4a3a" : scene === "hot" ? "#6f9256" : "#5f8f69";
  const leaf = night ? "#27402f" : "#4c7a56";
  return (
    <>
      <path d="M0 118c30-14 58-16 86-6 22 8 40 6 60-4 30-15 62-12 94 6v36H0Z" fill={back} />
      <path d="M0 132c34-10 70-8 104 2 30 9 66 8 136-8v24H0Z" fill={front} />
      <path d="M22 122c2-12 12-20 22-20-2 12-10 20-22 20Z" fill={leaf} />
      <path d="M206 116c4-11 14-17 24-15-3 11-13 17-24 15Z" fill={leaf} />
      {night ? (
        // fireflies instead of daisies
        [[46, 124], [120, 132], [190, 126], [80, 140]].map(([x, y], i) => (
          <circle key={i} className="sn-art-twinkle" style={{ animationDelay: `${i * 380}ms` }} cx={x} cy={y} r="1.8" fill="#f6e7a0" />
        ))
      ) : (
        [[52, 128], [196, 130], [118, 136]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-4.5" rx="2.6" ry="4" fill="#fff" transform={`rotate(${a})`} />
            ))}
            <circle r="2.4" fill="#f5b544" />
          </g>
        ))
      )}
      {WET.has(scene) && (
        <g fill="#9cc0d8" opacity={night ? 0.35 : 0.55}>
          <ellipse cx="150" cy="142" rx="16" ry="2.6" />
          <ellipse cx="62" cy="146" rx="10" ry="2" />
        </g>
      )}
    </>
  );
}

export default function WeatherArt({ scene }) {
  const maskId = `sn-moon-${useId().replace(/:/g, "")}`;
  return (
    <>
      <svg className="sn-weather-sky" viewBox="96 8 144 110" aria-hidden="true">
        <Sky scene={scene} maskId={maskId} />
      </svg>
      <svg className="sn-weather-ground" viewBox="0 100 240 50" aria-hidden="true">
        <Ground scene={scene} />
      </svg>
    </>
  );
}
