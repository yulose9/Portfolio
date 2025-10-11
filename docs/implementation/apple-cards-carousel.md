# Apple Cards Carousel Implementation (Mobile Only)

## Overview

Replaced the previous mobile project carousel with Aceternity UI's Apple Cards Carousel component. This implementation provides a sleek, Apple-inspired card carousel with smooth scrolling, modal expansion, and modern animations.

## What Changed

### Files Created

1. **`app/hooks/use-outside-click.ts`** - Custom hook for detecting clicks outside an element
2. **This documentation file**

### Files Modified

1. **`app/components/MobileProjectCarousel.tsx`** - Completely rewritten to use Apple Cards Carousel

## Features

### 1. **Horizontal Scroll Carousel**

- Smooth horizontal scrolling with mouse/touch
- Navigation buttons (left/right arrows)
- Auto-disable buttons at scroll boundaries
- Hides scrollbar for clean UI (`[scrollbar-width:none]`)

### 2. **Expandable Cards**

- Click any card to open a full-screen modal
- Modal includes:
  - Project title and category
  - Full description
  - Links to blog and GitHub
  - Close button (X) and ESC key support
  - Click outside to close
  - Backdrop blur effect

### 3. **Smooth Animations**

- Framer Motion for card entrance animations
- Staggered appearance (0.2s delay per card)
- Layout animations for card expansion
- Smooth opacity and position transitions

### 4. **Responsive Design**

- Mobile-optimized card sizes (w-56 = 224px)
- Desktop card sizes (md:w-96 = 384px)
- Adaptive scroll distances
- Touch-friendly interactions

## Component Structure

```typescript
MobileProjectCarousel
├── CarouselContext (manages card state)
├── Card Component (individual project cards)
│   ├── Collapsed State (preview)
│   └── Expanded State (full modal)
└── Carousel Container
    ├── Scrollable Cards
    └── Navigation Buttons
```

## Props Interface

```typescript
interface MobileProjectCarouselProps {
  projects: Project[];
}

interface Project {
  image: string;
  title: string;
  description: string;
  blogUrl: string;
  githubUrl: string;
}
```

## Key Implementation Details

### Card Data Transformation

Projects are converted to the Card format required by the carousel:

```typescript
const cards: Card[] = projects.map((project) => ({
  src: project.image,
  title: project.title,
  category: "Project",
  content: (
    // JSX for expanded modal content
    <div>
      <p>{project.description}</p>
      <a href={project.blogUrl}>View Blog</a>
      <a href={project.githubUrl}>View on GitHub</a>
    </div>
  ),
}));
```

### Scroll Management

- Uses `useRef` to access the scroll container
- Tracks `canScrollLeft` and `canScrollRight` states
- Updates on scroll events via `checkScrollability()`
- Smooth scrolling with `scrollBy({ left: ±300, behavior: "smooth" })`

### Modal Interactions

- ESC key closes modal
- Click outside closes modal (via `useOutsideClick` hook)
- Body overflow hidden when modal open
- Cleanup on unmount prevents scroll lock

## Styling Approach

### Card Styles

- Rounded corners: `rounded-3xl`
- Dark mode support: `dark:bg-neutral-900`
- Gradient overlay: `from-black/50 via-transparent`
- Image as background: `absolute inset-0 object-cover`

### Navigation Buttons

- Circular: `rounded-full`
- Size: `h-10 w-10`
- Gray background: `bg-gray-100`
- Disabled opacity: `disabled:opacity-50`
- Centered icons with flex

### Modal

- Fixed fullscreen: `fixed inset-0 z-50`
- Backdrop: `bg-black/80 backdrop-blur-lg`
- Content container: `max-w-5xl rounded-3xl`
- Responsive padding: `p-4 md:p-10`

## Desktop Design

**Important**: The desktop landscape design remains completely unchanged. This component is **mobile-only** and should be conditionally rendered based on screen size in the parent Portfolio component.

## Usage in Portfolio Component

```tsx
// In Portfolio.tsx
<div className="block md:hidden">
  <MobileProjectCarousel projects={projects} />
</div>
<div className="hidden md:block">
  {/* Existing desktop carousel */}
</div>
```

## Dependencies

### Required Packages

- `framer-motion` (already installed) - For animations
- `lucide-react` (already installed) - For icons (ChevronLeft, ChevronRight, X)
- `next/image` (Next.js built-in) - For optimized images

### Custom Utilities

- `cn()` from `@/lib/utils` - For conditional className merging
- `useOutsideClick` from `@/app/hooks/use-outside-click` - For modal interactions

## Performance Considerations

1. **Image Optimization**: Uses Next.js Image component with `fill` layout
2. **Lazy Rendering**: Cards render as they scroll into view
3. **Smooth Scrolling**: Hardware-accelerated CSS scroll behavior
4. **Animation Optimization**: Uses `transform` and `opacity` for GPU acceleration
5. **Event Cleanup**: Proper cleanup of event listeners on unmount

## Accessibility

- Proper ARIA labels on navigation buttons
- Keyboard support (ESC to close modal)
- Focus management in modal
- Semantic HTML structure
- Alt text on images

## Future Enhancements

Possible improvements:

- Add swipe gestures for touch devices
- Implement auto-play carousel
- Add keyboard navigation (arrow keys)
- Progress indicator for current card
- Lazy loading for images
- Add animations on card hover
- Support for video content

## Troubleshooting

### Cards not scrolling

- Check `overflow-x-scroll` is applied
- Verify `scroll-smooth` for smooth scrolling
- Ensure container has proper width

### Modal not closing

- Verify `useOutsideClick` hook is imported correctly
- Check ESC key handler is registered
- Ensure ref is properly attached to modal container

### Images not loading

- Verify image paths in project data
- Check Next.js Image domains configuration
- Ensure `fill` layout has parent with `position: relative`

## Credits

Component inspired by and adapted from:

- **Aceternity UI**: https://ui.aceternity.com/components/apple-cards-carousel
- **Apple.com**: Original design inspiration
