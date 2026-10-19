"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/seneca/services/firebase";
import { House, Flame, Trophy, Coins, BookOpen } from "@phosphor-icons/react";
import PageHeader from "./PageHeader";
import { Tabs, TabsList, TabsTrigger } from "../../components/kit/tabs";
import { ROUTE_POPPED, TOPBAR_SLOT_ID, useShellView, viewFromUrl, writeViewUrl } from "./shell-nav";
import SenecaApp from "@/components/seneca/SenecaApp";
import type { SenecaTab } from "@/lib/seneca/context/SenecaNavContext";
import "./seneca.css";
import "./seneca-sunlit.css";
import "./seneca-home.css";
import "./seneca-horizon.css";
import "./seneca-mobile.css";
import "./seneca-boards.css";
import "./seneca-money.css";

const SENECA_TABS: readonly { id: SenecaTab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "protocol", label: "Protocol", icon: Flame },
  { id: "growth", label: "Growth", icon: Trophy },
  { id: "wealth", label: "Wealth", icon: Coins },
  { id: "journal", label: "Journal", icon: BookOpen },
];

// The top bar renders its slot in the same commit, so a snapshot read after
// mount finds it; nothing about it changes later, hence no subscription.
const noSubscribe = () => () => {};
const findTopbarSlot = () => document.getElementById(TOPBAR_SLOT_ID);
const noSlot = () => null;

export default function SenecaWorkspace() {
  // The URL is the source of truth (?view=protocol), so Back/Forward and
  // reloads land on the tab you were on.
  const [tab, setTab] = useState<SenecaTab>(() => (viewFromUrl("seneca") as SenecaTab | null) ?? "home");

  // Every tab change — tabs, sidebar, "View details" links — becomes a history
  // entry. Arriving without ?view= (a plain section link) fills it in place.
  useEffect(() => {
    const inUrl = viewFromUrl("seneca");
    if (inUrl === tab) return;
    writeViewUrl(tab, { replace: inUrl === null, drop: tab === "journal" ? [] : ["entry"] });
  }, [tab]);

  // Back/Forward: AdminApp has applied the URL; follow it.
  useEffect(() => {
    const follow = () => {
      const view = viewFromUrl("seneca") as SenecaTab | null;
      setTab(view ?? "home");
    };
    window.addEventListener(ROUTE_POPPED, follow);
    return () => window.removeEventListener(ROUTE_POPPED, follow);
  }, []);

  // Sync with sidebar sub-items (Home, Protocol, Growth, Wealth, Journal)
  useShellView("seneca", tab, (view) => {
    setTab(view as SenecaTab);
  });

  // The header's sync badge says what is true: synced only with a Firebase user
  const [synced, setSynced] = useState<boolean | null>(null);
  useEffect(() => onAuthStateChanged(auth, (user) => setSynced(!!user)), []);

  // Below 900px the page header steps aside for one compact top bar; the sync
  // state rides in the top bar's slot instead (CSS shows exactly one of the two).
  const topbarSlot = useSyncExternalStore(noSubscribe, findTopbarSlot, noSlot);

  const handleTabChange = (next: SenecaTab) => {
    // No playSound here: the global sound layer already voices every tab
    // press (role="tab" + data-sound), and both together played twice.
    setTab(next);
  };

  return (
    <div className="control-page cc-page seneca-workspace-page">
      <PageHeader
        title="Seneca"
        subtitle="Your daily habits, goals, money, and reflections."
        actions={
          synced === null ? null : (
            <span className={`sn-sync-badge ${synced ? "is-on" : "is-local"}`} role="status">
              <span aria-hidden="true" />
              {synced ? "Cloud sync on" : "On this device only"}
            </span>
          )
        }
      />

      {topbarSlot && synced !== null
        ? createPortal(
            <span className={`sn-sync-badge sn-sync-compact ${synced ? "is-on" : "is-local"}`} role="status">
              <span aria-hidden="true" />
              <span className="sn-sync-label" aria-hidden="true">{synced ? "Synced" : "This device"}</span>
              <span className="sr-only">{synced ? "Cloud sync on" : "On this device only"}</span>
            </span>,
            topbarSlot,
          )
        : null}

      <div className="admin-toolbar writing-status-toolbar cc-filters">
        <Tabs value={tab} onValueChange={(next) => handleTabChange(next as SenecaTab)}>
          <TabsList aria-label="Seneca views">
            {SENECA_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  data-sound="select"
                >
                  <Icon size={14} className="mr-1.5" aria-hidden="true" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="seneca-workspace-canvas w-full min-h-[700px] mt-2">
        <SenecaApp activeTab={tab} onTabChange={setTab} embedded={false} />
      </div>

      {/*
        Phones: the five destinations as a bottom tab bar, one thumb away —
        the top tab strip can't fit them. Same state, URL and sounds as the
        tabs above; CSS shows exactly one of the two.
      */}
      <nav className="sn-tabbar" aria-label="Seneca views">
        {SENECA_TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="sn-tabbar-item"
              aria-current={active ? "page" : undefined}
              data-sound="select"
              onClick={() => {
                if (!active) handleTabChange(item.id);
                else window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                });
              }}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
