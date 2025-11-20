"use client";

import { GsapBouncyText } from "./";

interface HeroRolesProps {
    delay: number;
    className?: string;
}

export default function HeroRoles({ delay, className }: HeroRolesProps) {
    return (
        <div className={className}>
            <GsapBouncyText
                text="Developer"
                as="div"
                delay={delay}
                staggerDelay={0.03}
            />
            <GsapBouncyText
                text="Cloud Engineer"
                as="div"
                delay={delay + 0.05} // Slight offset for subsequent items
                staggerDelay={0.03}
            />
            <GsapBouncyText
                text="Artificial Intelligence"
                as="div"
                delay={delay + 0.1} // Slight offset for subsequent items
                staggerDelay={0.03}
            />
        </div>
    );
}
