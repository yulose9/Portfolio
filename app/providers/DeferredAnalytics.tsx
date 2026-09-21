"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PostHogAnalytics = dynamic(() => import("./PostHogAnalytics"), { ssr: false });

export default function DeferredAnalytics() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const timer = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  return ready ? <PostHogAnalytics /> : null;
}
