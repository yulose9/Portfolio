// @ts-nocheck
"use client";
import { useWebHaptics } from "web-haptics/react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "@/lib/seneca/context/SenecaNavContext";
import AddTaskSheet from "@/components/seneca/AddTaskSheet";
import Analytics from "@/components/seneca/home/Analytics";
import { StudyRoute, Streaks } from "@/components/seneca/home/GoalCards";
import { ExportCard, Greeting, MonthRings } from "@/components/seneca/home/GreetingColumn";
import { JournalPrompt, PriorityPayment } from "@/components/seneca/home/SideCards";
import LifeCalendar from "@/components/seneca/home/LifeCalendar";
import TodayTodos from "@/components/seneca/home/TodayTodos";
import WeatherCard from "@/components/seneca/home/WeatherCard";
import DayHorizon from "@/components/seneca/home/DayHorizon";
import MoneyHorizon from "@/components/seneca/home/MoneyHorizon";
import { useProtocol } from "@/lib/seneca/context/ProtocolContext";
import { useJournalEntries, useWealthAssets, useWealthLiabilities } from "@/lib/seneca/data/syncedData";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { ROUTE_PUSHED } from "@/app/admin/ui/shell-nav";

// Get dynamic greeting based on time of day + journal/protocol state
const getTimeBasedGreeting = (
  hasJournalToday = false,
  protocolProgress = 0,
) => {
  const hour = new Date().getHours();

  // If user already journaled today, give contextual "finish strong" messages
  if (hasJournalToday) {
    if (hour >= 4 && hour < 12) {
      return {
        title: "Already Reflected ✓",
        message:
          "You've logged your thoughts this morning. Now go conquer the day.",
        buttonText: "View Entry",
      };
    } else if (hour >= 12 && hour < 18) {
      return {
        title: "Journal Logged ✓",
        message:
          protocolProgress >= 80
            ? "Great progress today. Keep pushing through the rest of your protocol."
            : "You've reflected. Now finish strong — complete your remaining tasks.",
        buttonText: "View Entry",
      };
    } else {
      return {
        title: "Day Captured ✓",
        message:
          protocolProgress >= 100
            ? "What a day. Protocol done, journal written. Rest well tonight."
            : "Your thoughts are saved. Wrap up any remaining tasks and wind down.",
        buttonText: "View Entry",
      };
    }
  }

  // No journal entry yet — prompt to write
  if (hour >= 4 && hour < 6) {
    return {
      title: "Early Riser",
      message:
        "The world is quiet. A perfect time to set your intentions for the day.",
      buttonText: "Write Entry",
    };
  } else if (hour >= 6 && hour < 12) {
    return {
      title: "Good Morning",
      message: "A fresh start awaits. What are your main goals for today?",
      buttonText: "Write Entry",
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      title: "Midday Check-in",
      message:
        "Half the day is gone. How are you feeling? Time to refuel and reset.",
      buttonText: "Write Entry",
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      title: "Afternoon Focus",
      message:
        "Keep the momentum going. You're doing great. What's next on the list?",
      buttonText: "Write Entry",
    };
  } else if (hour >= 18 && hour < 21) {
    return {
      title: "Evening Wind Down",
      message:
        "The day is shifting. Time to relax and reflect on what you've accomplished.",
      buttonText: "Write Entry",
    };
  } else {
    return {
      title: "Late Night Thoughts",
      message:
        "The stars are out. Capture your final thoughts before sleep takes over.",
      buttonText: "Write Entry",
    };
  }
};

/**
 * Home — a one-screen read of the day, laid out like a desk:
 *
 *   greet  | weather | today's protocol | journal
 *   month  | streaks |                  | priority
 *   export | study   | analytics ------------------
 *
 * Container queries (seneca-sunlit.css) fold it to three, two and one column.
 */
export default function Home() {
  const navigate = useNavigate();
  const haptic = useWebHaptics();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const today = getPhDateKey();
  const day = selectedDay || today;
  const dayLabel = new Date(`${day}T12:00:00+08:00`).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" });

  const [assets] = useWealthAssets();
  const [liabilities] = useWealthLiabilities();
  const [journalEntries] = useJournalEntries();
  const wealth = useMemo(() => {
    const total = (list) => list.filter(x=>!x.excludeFromTotal).reduce((sum, x) => sum + (x.amount || 0), 0);
    return {
      netWorth: total(assets) - total(liabilities),
      priority: liabilities.find((l) => l.isPriority) || null,
    };
  }, [assets, liabilities]);
  const hasJournalToday = useMemo(() => {
    const today = getPhDateKey();
    return journalEntries.some((e) => e.isoDate === today);
  }, [journalEntries]);

  const { progress, phases, phaseOrder, phaseTasks, taskHistory, addCustomTask, protocolCategory } = useProtocol();
  const greeting = getTimeBasedGreeting(hasJournalToday, progress);
  const selectedEntry = journalEntries.find(e => e.isoDate === day);
  const journalGreeting = day === today ? greeting : {
    title: selectedEntry ? `${dayLabel}, captured` : `Reflect on ${dayLabel}`,
    message: selectedEntry ? "Your thoughts from this day are saved." : `No journal entry for ${dayLabel} yet. There's still room to reflect.`,
    buttonText: selectedEntry ? "View entry" : `Write for ${dayLabel}`,
  };
  const openJournalDay = (date) => {
    const entry = journalEntries.find(e => e.isoDate === date);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "journal");
    url.searchParams.set("entry", entry ? String(entry.id) : "new");
    if (entry) url.searchParams.delete("entryDate");
    else url.searchParams.set("entryDate", date);
    window.history.pushState(null, "", url.toString());
    window.dispatchEvent(new Event(ROUTE_PUSHED));
    haptic.trigger("light");
    navigate("/journal");
  };

  // Every task in today's protocol: the denominator for the calendar and charts.
  const tasks = useMemo(
    () =>
      phaseOrder.flatMap((phaseId) =>
        (phaseTasks[phaseId] || []).map((t) => ({ key: `${phaseId}-${t.id}`, title: t.title, emoji: t.emoji, phase: phases[phaseId]?.title })),
      ),
    [phaseOrder, phaseTasks, phases],
  );
  const taskKeys = useMemo(() => tasks.map((t) => t.key), [tasks]);

  const go = (path) => () => {
    haptic.trigger("light");
    navigate(path);
  };

  return (
    <div className="sn-home">
      <div className="sn-resource-grid">
        <div className="sn-resource-slot"><DayHorizon /></div>
        <div className="sn-resource-slot"><MoneyHorizon onOpenWealth={go("/wealth")} onOpenSummary={(view) => {
          const url = new URL(window.location.href);
          url.searchParams.set('view', 'wealth');
          url.searchParams.set('money', view);
          url.searchParams.delete('entry');
          window.history.pushState(null, '', url.toString());
          window.dispatchEvent(new Event(ROUTE_PUSHED));
          haptic.trigger('light');
          navigate(`/wealth#money-${view === 'held' ? 'accounts' : 'records'}`);
        }} /></div>
      </div>
      {/*
        Three bands on one equal-column grid, one 24px gap both ways:
          Today     A greet + month | B weather + streaks | C protocol | D journal + payment
          Progress  E life          | F study route      | G analytics (2 cols)
          Utility   H export + sign out (full width)
        Every area opens with a section head so card tops share one line, and
        the last card in each area stretches so each band's bottoms align.
        Container queries in seneca-home.css fold it to 3, 2 and 1 columns.
      */}
      <div className="sn-home-grid">
        <div className="sn-area sn-area-a sn-enter" style={{ "--i": 0 }}>
          <Greeting onAddTask={() => setAddOpen(true)} onWrite={() => openJournalDay(today)} hasJournalToday={hasJournalToday} />
          <MonthRings history={taskHistory} taskKeys={taskKeys} selected={day} onSelect={setSelectedDay} />
        </div>

        <div className="sn-area sn-area-b sn-enter" style={{ "--i": 1 }}>
          <WeatherCard />
          <Streaks onOpenGoal={(id) => { haptic.trigger("light"); navigate(`/growth#goal-${id},goals`); }} />
        </div>

        <div className="sn-area sn-area-c sn-enter" style={{ "--i": 1 }}>
          <TodayTodos onOpen={go("/protocol")} date={day} />
        </div>

        <div className="sn-area sn-area-d sn-enter" style={{ "--i": 2 }}>
          <JournalPrompt greeting={journalGreeting} hasJournalToday={!!selectedEntry} onWrite={() => openJournalDay(day)} onOpenJournal={go("/journal")} />
          <PriorityPayment liability={wealth.priority} onOpen={go("/wealth")} />
        </div>

        <div className="sn-area sn-area-e sn-enter" style={{ "--i": 2 }}>
          <LifeCalendar />
        </div>

        <div className="sn-area sn-area-f sn-enter" style={{ "--i": 3 }}>
          <StudyRoute onOpen={(target) => { haptic.trigger("light"); navigate(`/growth#${target},goals`); }} />
        </div>

        <div className="sn-area sn-area-g sn-enter" style={{ "--i": 3 }}>
          <Analytics
            history={taskHistory}
            taskKeys={taskKeys}
            tasks={tasks}
            netWorth={wealth.netWorth}
            onOpenProtocol={go("/protocol")}
            onOpenWealth={go("/wealth")}
          />
        </div>

        <div className="sn-area sn-area-h">
          <ExportCard />

        </div>
      </div>

      <AddTaskSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAddTask={addCustomTask}
        protocolCategory={protocolCategory}
      />
    </div>
  );
}
