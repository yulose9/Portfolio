"use client";

import { GsapBouncyText } from "./";

interface HeroRolesProps {
  /** Legacy delay prop - used if useWelcomeEvent is false */
  delay?: number;
  className?: string;
  /** If true, animation waits for welcome screen lift event */
  useWelcomeEvent?: boolean;
  /** Additional delay after welcome event fires (in seconds) */
  welcomeEventDelay?: number;
}

export default function HeroRoles({
  delay = 0,
  className,
  useWelcomeEvent = true,
  welcomeEventDelay = 0.1,
}: HeroRolesProps) {
  return (
    <div className={className}>
      <GsapBouncyText
        text="Developer"
        as="div"
        delay={delay}
        staggerDelay={0.03}
        useWelcomeEvent={useWelcomeEvent}
        welcomeEventDelay={welcomeEventDelay}
      />
      <GsapBouncyText
        text="Cloud Engineer"
        as="div"
        delay={delay + 0.05}
        staggerDelay={0.03}
        useWelcomeEvent={useWelcomeEvent}
        welcomeEventDelay={welcomeEventDelay + 0.05}
      />
      <GsapBouncyText
        text="Artificial Intelligence"
        as="div"
        delay={delay + 0.1}
        staggerDelay={0.03}
        useWelcomeEvent={useWelcomeEvent}
        welcomeEventDelay={welcomeEventDelay + 0.1}
      />
    </div>
  );
}
