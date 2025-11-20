/**
 * Navigation Utilities
 * Shared functions for smooth scrolling to sections
 */

/**
 * Finds the visible element with the given ID
 * Handles cases where there are multiple elements with the same ID (mobile/desktop)
 */
export function findVisibleElement(sectionId: string): HTMLElement | null {
    // Get all elements with this ID (there might be mobile + desktop versions)
    const elements = document.querySelectorAll(`[id="${sectionId}"]`);

    // Find the visible one by checking display and dimensions
    for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const styles = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();

        // Check if element is displayed and has dimensions
        if (
            styles.display !== "none" &&
            styles.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
        ) {
            // Additional check: ensure parent containers are not hidden
            let parent = htmlEl.parentElement;
            let isParentVisible = true;

            while (parent && parent !== document.body) {
                const parentStyles = window.getComputedStyle(parent);
                if (parentStyles.display === "none") {
                    isParentVisible = false;
                    break;
                }
                parent = parent.parentElement;
            }

            if (isParentVisible) {
                return htmlEl;
            }
        }
    }

    // Fallback: if no element found with visibility check, use first one with valid dimensions
    for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            return htmlEl;
        }
    }

    return null;
}

/**
 * Scrolls to a section smoothly using Lenis or fallback to native scroll
 */
export function scrollToSection(sectionId: string): void {
    const targetElement = findVisibleElement(sectionId);

    if (!targetElement) {
        console.warn(`Section with id "${sectionId}" not found or not visible`);
        return;
    }

    // Check if Lenis is available for smooth scroll
    if (window.lenis) {
        window.lenis.scrollTo(targetElement, {
            offset: 0,
            duration: 1.5,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
    } else {
        // Fallback to native smooth scroll
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}
