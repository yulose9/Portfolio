/**
 * Animation Configuration Constants
 * Centralized animation settings for consistent timing and easing across the application
 */

// Standard easing functions
export const EASINGS = {
    // Smooth acceleration and deceleration
    easeInOutCubic: [0.21, 0.47, 0.32, 0.98],
    // Quick snap
    easeOut: [0, 0, 0.2, 1],
    // Spring-like
    easeInOut: "easeInOut",
} as const;

// Animation durations (in seconds)
export const DURATIONS = {
    fast: 0.2,
    normal: 0.3,
    medium: 0.5,
    slow: 0.6,
} as const;

// Delays for staggered animations
export const DELAYS = {
    none: 0,
    short: 0.1,
    medium: 0.2,
    long: 0.3,
    heroElements: {
        highlighter: 4.4,
        roles: 4.5,
        title: 4.8,
        scrollPrompt: 5.2,
        scrollPromptDesktop: 5.4,
    },
} as const;

// Common animation variants
export const ANIMATION_VARIANTS = {
    fadeInUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    },
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    scaleIn: {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
    },
    slideInRight: {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
    },
} as const;

// Bounce animation for scroll indicator
export const SCROLL_BOUNCE_ANIMATION = {
    y: [0, 10, 0],
    transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
    },
} as const;

// Viewport options for scroll-triggered animations
export const VIEWPORT_OPTIONS = {
    standard: {
        once: true,
        margin: "-50px",
    },
    eager: {
        once: true,
        margin: "-100px",
    },
    lazy: {
        once: true,
        margin: "0px",
    },
} as const;
