/**
 * Typography Configuration Constants
 * Centralized typography settings for responsive design
 */

// Font families
export const FONTS = {
    display: "SF Pro Display, Inter, sans-serif",
    text: "SF Pro Text, Inter, sans-serif",
    ui: "Inter, SF UI Text, sans-serif",
} as const;

// Mobile typography scale (optimized for readability)
export const MOBILE_TYPOGRAPHY = {
    // Hero section
    heroTitle: {
        fontSize: "clamp(28px, 8vw, 38px)", // Increased from 24px min
        lineHeight: "1.1",
        letterSpacing: "-0.041em",
        fontWeight: "700",
    },
    heroSubtitle: {
        fontSize: "18px", // Increased from 14px
        lineHeight: "1.4",
        letterSpacing: "normal",
        fontWeight: "500",
    },
    heroRoles: {
        fontSize: "20px", // Increased from 23px for better fit
        lineHeight: "1.35",
        letterSpacing: "normal",
        fontWeight: "500",
    },

    // Section headers
    sectionTitle: {
        fontSize: "32px", // Increased from typical 24-28px
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontWeight: "700",
    },
    sectionDescription: {
        fontSize: "16px", // Increased from 14px
        lineHeight: "1.6", // Better readability
        letterSpacing: "-0.02em",
        fontWeight: "400",
    },

    // Body text
    bodyLarge: {
        fontSize: "18px",
        lineHeight: "1.6",
        letterSpacing: "normal",
        fontWeight: "400",
    },
    bodyMedium: {
        fontSize: "16px",
        lineHeight: "1.6",
        letterSpacing: "normal",
        fontWeight: "400",
    },
    bodySmall: {
        fontSize: "14px",
        lineHeight: "1.5",
        letterSpacing: "normal",
        fontWeight: "400",
    },

    // Buttons and CTAs
    buttonLarge: {
        fontSize: "18px",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontWeight: "600",
    },
    buttonMedium: {
        fontSize: "16px",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontWeight: "600",
    },
} as const;

// Desktop typography scale
export const DESKTOP_TYPOGRAPHY = {
    // Hero section
    heroTitle: {
        fontSize: "clamp(60px, 8vw, 110px)",
        lineHeight: "1",
        letterSpacing: "-0.041em",
        fontWeight: "700",
    },
    heroSubtitle: {
        fontSize: "26px",
        lineHeight: "107%",
        letterSpacing: "-0.02em",
        fontWeight: "600",
    },
    heroRoles: {
        fontSize: "40px",
        lineHeight: "107%",
        letterSpacing: "-0.08em",
        fontWeight: "500",
    },

    // Section headers
    sectionTitle: {
        fontSize: "48px",
        lineHeight: "1.2",
        letterSpacing: "-0.02em",
        fontWeight: "700",
    },
    sectionDescription: {
        fontSize: "20px",
        lineHeight: "1.588",
        letterSpacing: "-0.8px",
        fontWeight: "400",
    },

    // Body text
    bodyLarge: {
        fontSize: "22px",
        lineHeight: "1.5",
        letterSpacing: "normal",
        fontWeight: "400",
    },
    bodyMedium: {
        fontSize: "18px",
        lineHeight: "1.5",
        letterSpacing: "normal",
        fontWeight: "400",
    },
    bodySmall: {
        fontSize: "16px",
        lineHeight: "1.5",
        letterSpacing: "normal",
        fontWeight: "400",
    },
} as const;

// Spacing scale (mobile optimized)
export const MOBILE_SPACING = {
    // Section padding
    sectionPaddingY: "4rem", // 64px - consistent across all sections
    sectionPaddingX: "1rem", // 16px - left/right padding

    // Component spacing
    componentGap: {
        small: "0.5rem", // 8px
        medium: "1rem", // 16px
        large: "1.5rem", // 24px
        xlarge: "2rem", // 32px
    },

    // Content max widths
    contentMaxWidth: {
        narrow: "320px",
        medium: "375px",
        wide: "100%",
    },

    // Touch targets
    touchTarget: {
        minimum: "44px", // WCAG minimum
        comfortable: "48px",
        large: "56px",
    },
} as const;

// Desktop spacing scale
export const DESKTOP_SPACING = {
    // Section padding
    sectionPaddingY: "8rem", // 128px
    sectionPaddingX: "2rem", // 32px

    // Component spacing
    componentGap: {
        small: "1rem", // 16px
        medium: "2rem", // 32px
        large: "3rem", // 48px
        xlarge: "4rem", // 64px
    },

    // Content max widths
    contentMaxWidth: {
        narrow: "640px",
        medium: "1024px",
        wide: "1280px",
        full: "1920px",
    },
} as const;

// Helper function to generate responsive font size
export function responsiveFontSize(mobileSize: string, desktopSize: string) {
    return `clamp(${mobileSize}, 4vw, ${desktopSize})`;
}

// Helper to create responsive typography object
export function createResponsiveTypography(
    mobile: typeof MOBILE_TYPOGRAPHY[keyof typeof MOBILE_TYPOGRAPHY],
    desktop: typeof DESKTOP_TYPOGRAPHY[keyof typeof DESKTOP_TYPOGRAPHY]
) {
    return {
        mobile,
        desktop,
        // Tailwind-compatible classes
        className: {
            mobile: `text-[${mobile.fontSize}] leading-[${mobile.lineHeight}] tracking-[${mobile.letterSpacing}] font-[${mobile.fontWeight}]`,
            desktop: `md:text-[${desktop.fontSize}] md:leading-[${desktop.lineHeight}] md:tracking-[${desktop.letterSpacing}] md:font-[${desktop.fontWeight}]`,
        },
    };
}
