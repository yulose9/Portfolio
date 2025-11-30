declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beacon: (opts: any) => void;
  }
}

export const trackEvent = (eventName: string) => {
  if (typeof window !== 'undefined' && window.beacon) {
    window.beacon({
      type: 'event',
      eventName: eventName,
    });
  } else {
    console.log(`[Analytics] Event tracked: ${eventName}`);
  }
};
