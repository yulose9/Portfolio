declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beacon: (opts: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
  }
}

export const trackEvent = (eventName: string) => {
  // Cloudflare Analytics
  if (typeof window !== "undefined" && window.beacon) {
    window.beacon({
      type: "event",
      eventName: eventName,
    });
  }

  // Google Analytics 4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      event_category: "User Interaction",
      event_label: eventName,
    });
  }

  if (typeof window === "undefined" || (!window.beacon && !window.gtag)) {
    console.log(`[Analytics] Event tracked: ${eventName}`);
  }
};
