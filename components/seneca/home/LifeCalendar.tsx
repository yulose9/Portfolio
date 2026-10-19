// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import NumberStepper from "@/components/seneca/NumberStepper";
import { Calendar } from "@/app/components/kit/inputs/calendar";
import { Button } from "@/app/components/kit/button";
import Num from "@/components/seneca/Num";
import Sheet from "@/components/seneca/Sheet";
import { useLifeSettings } from "@/lib/seneca/data/syncedData";
import { lifeProgress, yearProgress } from "@/lib/seneca/utils/lifeProgress";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";

const MONTH_DAYS = (year) => Array.from({ length: 12 }, (_, m) => new Date(Date.UTC(year, m + 1, 0)).getUTCDate());

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The year: days left as the figure, the share beside it, and twelve month
 * pills that fill left to right. Each pill names its month on hover or focus.
 */
function YearStrip({ today }) {
  const y = yearProgress(today);
  const month = Number(today.slice(5, 7)) - 1;
  const day = Number(today.slice(8));
  const days = MONTH_DAYS(y.year);
  return (
    <div className="sn-life-year">
      <div className="sn-life-row">
        <p className="sn-life-figure-lg">
          <Num value={y.daysLeft} />
          <span className="sn-life-unit">d left</span>
        </p>
        <p className="sn-life-meta">
          <span className="sn-life-dot" aria-hidden="true">·</span>
          <Num value={y.pct} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
          <span className="sn-life-of">
            of <Num value={y.year} format={{ useGrouping: false }} />
          </span>
        </p>
      </div>
      <div className="sn-life-months" role="list" aria-label={`${y.year}: ${y.daysLeft} days left, ${y.pct}% through the year`}>
        {days.map((n, m) => {
          const state = m < month ? "done" : m === month ? "now" : "ahead";
          const tip =
            state === "now"
              ? `${MONTH_NAMES[m]}: day ${day} of ${n}`
              : state === "done"
                ? `${MONTH_NAMES[m]}: done`
                : MONTH_NAMES[m];
          return (
            <span key={m} role="listitem" tabIndex={0} className={`sn-life-month is-${state}`} data-tip={tip} aria-label={tip}>
              {state === "now" && <i style={{ transform: `scaleX(${day / n})` }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Life: one dot a year, ten to a row (a decade per row), today's year lit. */
function LifeGrid({ life, birthDate, today }) {
  const birthYear = Number(birthDate.slice(0, 4));
  const current = yearProgress(today);
  return <div className="sn-life-grid" role="list" aria-label="Your life in calendar years">
    {Array.from({ length: life.targetAge }, (_, i) => {
      const year = birthYear + i;
      const tip = year === current.year ? `${year} · ${current.pct}% complete` : String(year);
      return <span key={i} role="listitem" tabIndex={0} aria-label={tip} data-tip={tip} className={year < current.year ? "is-lived" : year === current.year ? "is-now" : ""} />;
    })}
  </div>;
}

function LifeSheet({ open, onClose, settings, onSave }) {
  const [birth, setBirth] = useState(settings.birthDate);
  const [choosingDate, setChoosingDate] = useState(false);
  const [target, setTarget] = useState(settings.targetAge);
  const today = getPhDateKey();
  useEffect(() => {
    if (!open) return;
    setBirth(settings.birthDate);
    setChoosingDate(false);
    setTarget(settings.targetAge);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = birth ? lifeProgress(birth, target, today) : null;

  return (
    <Sheet open={open} onClose={onClose} label="Life calendar" className="sn-sheet">
      <div className="sn-sheet-head">
        <div>
          <h2>Life calendar</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">Your birthday, and the age you count toward.</p>
        </div>
        <button type="button" className="sn-icon-btn" aria-label="Close" data-sound="close" onClick={onClose}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="sn-sheet-body">
        <div className="sn-field">
          <span>Born</span>
          <Button variant="outline" className="sn-goal-date" aria-label="Birth date" aria-expanded={choosingDate} onClick={() => setChoosingDate(!choosingDate)}><CalendarDays size={17} />{new Date(`${birth}T12:00:00`).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' })}</Button>
          {choosingDate && <div className="sn-goal-calendar"><Calendar mode="single" captionLayout="dropdown" startMonth={new Date(1900,0)} endMonth={new Date(`${today}T12:00:00`)} selected={new Date(`${birth}T12:00:00`)} defaultMonth={new Date(`${birth}T12:00:00`)} disabled={{ after: new Date(`${today}T23:59:59`) }} onSelect={date => { if (!date) return; setBirth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`); setChoosingDate(false); }} /></div>}
        </div>
        <div className="sn-field"><span>Count toward</span><NumberStepper label="Target age" value={target} onChange={setTarget} min={1} max={120} less="One year less" more="One year more" unit={target === 1 ? 'year' : 'years'} /></div>
        {preview && (
          <p className="sn-switch-row" style={{ cursor: "default" }}>
            <span>
              <strong>
                <Num value={preview.pct} suffix="%" /> to <Num value={target} />
              </strong>
              <small>
                Age <Num value={preview.age} /> · <Num value={preview.daysLeft} /> days to go
              </small>
            </span>
          </p>
        )}
      </div>
      <div className="sn-sheet-foot">
        <div className="ml-auto flex gap-2">
          <button type="button" className="sn-btn sn-btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="sn-btn sn-btn-primary"
            data-sound="pop"
            disabled={!birth || birth > today || target < 1}
            onClick={() => {
              onSave({ birthDate: birth, targetAge: target });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Under the month: the year running out, and a life measured against the age
 * you count toward. Birthday and target age sync across devices.
 */
export default function LifeCalendar() {
  const [settings, setSettings] = useLifeSettings();
  const [editing, setEditing] = useState(false);
  const today = getPhDateKey();
  const s = { birthDate: "2000-01-01", targetAge: 90, ...(settings || {}) };
  const life = lifeProgress(s.birthDate, s.targetAge, today);

  return (
    <section className="sn-life sn-area-section" aria-labelledby="sn-life">
      <div className="sn-head">
        <h2 id="sn-life">Life calendar</h2>
        <button type="button" className="sn-more" data-sound="open" aria-label="Set birthday and target age" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>

      <div className="sn-card sn-fill sn-life-card">
        <YearStrip today={today} />

        <div className="sn-life-rule" aria-hidden="true" />

        <div className="sn-life-body">
          <div className="sn-life-summary">
            <div>
            <p className="sn-life-figure-lg">
              <Num value={life.pct} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="%" />
            </p>
            <p className="sn-life-of mt-1">to age {life.targetAge}</p>
            </div>
            <dl className="sn-life-facts">
              <div>
                <dt>Age</dt>
                <dd>
                  <Num value={life.age} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
                </dd>
              </div>
              <div>
                <dt>Days to go</dt>
                <dd>
                  <Num value={life.daysLeft} />
                </dd>
              </div>
            </dl>
          </div>
          <LifeGrid life={life} birthDate={s.birthDate} today={today} />
          <div className="sn-life-legend"><span><i className="is-lived" />Years lived</span><span><i className="is-now" />This year</span><span><i />Years ahead</span></div>
          <p className="sn-life-grid-caption">One circle, one year. Each row is a decade.</p>
        </div>
      </div>

      <LifeSheet open={editing} onClose={() => setEditing(false)} settings={s} onSave={(next) => setSettings(next)} />
    </section>
  );
}
