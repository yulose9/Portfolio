"use client";

import NumberFlow from "@number-flow/react";
import { useId, useState } from "react";

import { PAY_TABLE } from "./pinasweldo-pay";

/*
 * PinaSweldo's signature moment, in miniature: move your pay and see where it
 * goes. The figures are PinaSweldo's own (PAY_TABLE, from its compute()), and
 * the colours are its deduction marks from its DESIGN.md, so this is the
 * product's behaviour rather than an imitation of it.
 */
const PARTS = [
  { key: "net", label: "Take-home", color: "#0a0a0a" },
  { key: "tax", label: "Income tax", color: "#cf4a3b" },
  { key: "sss", label: "SSS", color: "#3f6fe3" },
  { key: "philhealth", label: "PhilHealth", color: "#17784a" },
  { key: "pagibig", label: "Pag-IBIG", color: "#bf8a10" },
] as const;

const peso = (n: number, cents = true) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);

/** PinaSweldo's own rolling digits: its NumberFlow timing, from components/calc/Adjustments.tsx. */
const FLOW = { duration: 420, easing: "cubic-bezier(0.32, 0.72, 0, 1)" };
const PESO = { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;
const PESO_ROUND = { style: "currency", currency: "PHP", maximumFractionDigits: 0 } as const;

function Money({ value, round = false, prefix }: { value: number; round?: boolean; prefix?: string }) {
  return (
    <NumberFlow
      value={value}
      locales="en-PH"
      format={round ? PESO_ROUND : PESO}
      prefix={prefix}
      transformTiming={FLOW}
      spinTiming={FLOW}
    />
  );
}

export default function PinaSweldoDemo({ icon }: { icon: string | null }) {
  const [index, setIndex] = useState(20); // ₱35,000, the figure on the site's own screenshots
  const id = useId();
  const [pay, net, tax, sss, philhealth, pagibig] = PAY_TABLE[index];
  const values = { net, tax, sss, philhealth, pagibig };
  const kept = (net / pay) * 100;

  return (
    <div className="pina-demo">
      <header className="pina-demo-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon ? <img src={icon} alt="" width={28} height={28} /> : null}
        <span translate="no">PinaSweldo</span>
      </header>

      <h3 className="pina-demo-lede">What’s left of your pay, and where the rest goes.</h3>

      <section className="pina-demo-card">
        <label className="pina-demo-label" htmlFor={id}>
          Your monthly basic pay
        </label>
        <output className="pina-demo-pay" htmlFor={id}>
          <Money value={pay} round />
        </output>
        <input
          id={id}
          className="pina-demo-range"
          type="range"
          min={0}
          max={PAY_TABLE.length - 1}
          step={1}
          value={index}
          aria-valuetext={peso(pay, false)}
          onChange={(event) => setIndex(Number(event.target.value))}
        />
        <div className="pina-demo-range-ends" aria-hidden="true">
          <span>{peso(PAY_TABLE[0][0], false)}</span>
          <span>{peso(PAY_TABLE[PAY_TABLE.length - 1][0], false)}</span>
        </div>
      </section>

      <section className="pina-demo-result" aria-live="polite">
        <p className="pina-demo-label">Your take-home pay</p>
        <p className="pina-demo-net">
          <Money value={net} /> <span>a month</span>
        </p>
        <p className="pina-demo-kept">
          Out of <Money value={pay} round />, you keep{" "}
          <strong>
            <NumberFlow
              value={kept / 100}
              locales="en-PH"
              format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              transformTiming={FLOW}
              spinTiming={FLOW}
            />
          </strong>
          .
        </p>
      </section>

      <div className="pina-demo-bar" aria-hidden="true">
        {PARTS.map((part) => (
          <span
            key={part.key}
            style={{ flexGrow: Math.max(values[part.key], 0.0001), background: part.color }}
          />
        ))}
      </div>

      <ul className="pina-demo-rows">
        {PARTS.map((part) => (
          <li key={part.key}>
            <span className="pina-demo-dot" style={{ background: part.color }} aria-hidden="true" />
            <span>{part.label}</span>
            <span className="pina-demo-amount">
              <Money value={values[part.key]} prefix={part.key === "net" ? undefined : "−"} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
