# Mobile Blog Carousel - Apple Newsroom Style Implementation

## Overview

Implemented an Apple Newsroom-inspired blog carousel for mobile devices, based on the design reference from web-to-mcp tool (reference: `f25409bb-130c-484e-9689-41dfc1d4638e`).

## Design Source

- **Reference**: Apple Newsroom "Apple Stories" section
- **Style**: Modern, clean, card-based carousel with gradient overlays
- **Inspiration**: https://www.apple.com/newsroom (mobile view)

## Features

### 🎨 Visual Design

- **Card Style**: Rounded corners (rounded-3xl / 24px radius)
- **Image Display**: Full-bleed with gradient overlay
- **Gradient**: Bottom-to-top (black/80 → black/60 → transparent)
- **Aspect Ratio**: 360.5 x 450.625 (maintains Apple's proportions)
- **Typography**: SF Pro Display & SF Pro Text aesthetic

### 🏷️ Category Badge

- **Position**: Top-left over gradient
- **Style**: Pill-shaped with rounded corners
- **Colors**: Dynamic based on category (passed via `tagColor` prop)
- **Text**: Uppercase, bold, white, 12px font
- **Examples**:
  - `CREATIVES` - Orange (#D28314)
  - `DEVELOPERS` - Blue (#065EC6)

### 📝 Content Layout

- **Title**: Large, bold white text (24px)
- **Date**: Small, semibold white text (14px)
- **Spacing**: Consistent padding (24px)
- **Alignment**: Left-aligned, bottom-positioned

### 🎯 Navigation

1. **Dot Pagination**

   - Centered below card
   - Active: Elongated pill (24px wide)
   - Inactive: Small circles (6px)
   - Color: Gray-800 with opacity variations
   - Clickable for direct navigation

2. **Arrow Buttons**

   - Circular (44px diameter)
   - Light gray background (#F5F5F7)
   - Dark gray icons
   - Disabled state when at boundaries
   - Hover effect: Slightly darker background

3. **View All Button**
   - Centered below navigation
   - Rounded pill shape
   - Light gray background
   - 17px font (Apple's standard body size)
   - Links to all blogs page

### ⚡ Interactions

- **Card Hover**: Slight scale effect (scale-105)
- **Smooth Transitions**: 400ms ease-out
- **Button States**: Disabled, hover, active
- **Keyboard Accessible**: All buttons have aria-labels

## Component Structure

```tsx
<div className="container">
  {/* Main Card */}
  <a href="..." className="card">
    {/* Image + Gradient */}
    <div className="image-container">
      <Image ... />
      <div className="gradient-overlay" />
    </div>

    {/* Content Overlay */}
    <div className="content">
      <div className="badge">CATEGORY</div>
      <h3 className="title">Blog Title</h3>
      <div className="date">Date</div>
    </div>
  </a>

  {/* Pagination Dots */}
  <div className="dots">
    <button>•</button>
  </div>

  {/* Navigation Arrows */}
  <div className="arrows">
    <button>←</button>
    <button>→</button>
  </div>

  {/* View All */}
  <a href="...">View All</a>
</div>
```

## Props Interface

```typescript
interface Blog {
  image: string; // Blog image URL
  tag: string; // Category name
  tagColor: string; // Badge background color (hex)
  title: string; // Blog title
  date: string; // Publication date
  url?: string; // Optional link URL
}

interface MobileBlogCarouselProps {
  blogs: Blog[]; // Array of blog items
}
```

## Usage Example

```tsx
import MobileBlogCarousel from "@/app/components/MobileBlogCarousel";

const blogs = [
  {
    image: "/images/blog1.jpg",
    tag: "CREATIVES",
    tagColor: "#D28314",
    title: "How the mind-splitting world of Severance comes together on Mac",
    date: "March 26, 2025",
    url: "/blog/severance-mac",
  },
  {
    image: "/images/blog2.jpg",
    tag: "DEVELOPERS",
    tagColor: "#065EC6",
    title: "Meet four of this year's Swift Student Challenge winners",
    date: "May 8, 2025",
    url: "/blog/swift-challenge",
  },
];

<MobileBlogCarousel blogs={blogs} />;
```

## Styling Details

### Colors

- **Card Background**: White (#FFFFFF)
- **Gradient Start**: Black 80% opacity (rgba(0,0,0,0.8))
- **Gradient Mid**: Black 60% opacity (rgba(0,0,0,0.6))
- **Text**: White (#FFFFFF)
- **Dot Active**: Gray-800 (#1F2937)
- **Dot Inactive**: Gray-800 30% opacity
- **Button Background**: Gray-100 (#F3F4F6)
- **Button Hover**: Gray-200 (#E5E7EB)
- **Button Icon**: Gray-700 (#374151)

### Spacing

- **Container Padding**: 24px horizontal, 40px vertical
- **Max Width**: 366px (Apple's mobile content width)
- **Card Margin Bottom**: 24px
- **Dots Margin Bottom**: 24px
- **Button Gap**: 8px
- **View All Margin Top**: 24px

### Typography

- **Badge**: 12px, bold, uppercase, tracking-tight
- **Title**: 24px, bold, leading-7, tracking-wide
- **Date**: 14px, semibold, tracking-tight
- **View All**: 17px, semibold, tracking-tight

## Responsive Behavior

### Mobile Only Design

This component is designed specifically for mobile screens:

- Max width: 366px
- Auto-centered with margins
- Touch-friendly tap targets (44px minimum)
- Optimized for single-column layout

### Container

```css
.container {
  width: 100%;
  max-width: 366px;
  margin: 0 auto;
  padding: 40px 24px;
}
```

## Accessibility

### ARIA Labels

- Previous button: `aria-label="Previous blog"`
- Next button: `aria-label="Next blog"`
- Dot buttons: `aria-label="Go to blog {index}"`

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order: Card link → Dots → Arrows → View All
- Disabled state on boundary arrows

### Screen Readers

- Semantic HTML (heading, button elements)
- Alt text on images
- Clear action labels

## Animations

### Card Hover

```css
transition: transform 0.4s ease-out;
&:hover {
  transform: scale(1.05);
}
```

### Dot Transitions

```css
transition: all 0.3s ease;
```

### Button Transitions

```css
transition: all 0.2s ease;
```

## Dependencies

- `next/image` - Optimized image component
- `lucide-react` - ChevronLeft, ChevronRight icons
- `react` - useState hook for state management

## Performance Considerations

- **Next.js Image**: Automatic optimization and lazy loading
- **Single Card Display**: Only one card visible at a time (no virtual scrolling needed)
- **Minimal Re-renders**: State updates only affect current index
- **CSS Transitions**: GPU-accelerated transforms and opacity

## Browser Support

- Modern browsers with CSS Grid and Flexbox
- Tailwind CSS utility classes
- Next.js Image optimization
- Touch events for mobile interaction

## Comparison with Previous Design

### Before (Old Design)

- Multiple cards in horizontal scroll
- Glass morphism effect
- Complex transform calculations
- Floating navigation dots on cards
- Dark theme controls

### After (Apple Newsroom Style)

- Single large card display
- Clean gradient overlay
- Simple pagination system
- Navigation below card
- Light theme controls
- "View All" CTA button

## Design Principles

1. **Simplicity**: Focus on one card at a time
2. **Clarity**: High contrast white text on dark gradient
3. **Accessibility**: Clear navigation and states
4. **Apple Aesthetic**: Rounded corners, SF fonts, subtle interactions
5. **Mobile-First**: Touch-friendly, optimized for small screens

## Future Enhancements

- [ ] Auto-play carousel option
- [ ] Swipe gesture support
- [ ] Parallax effect on scroll
- [ ] Smooth card transitions (slide animation)
- [ ] Dark mode variant
- [ ] Loading skeleton states
- [ ] Analytics tracking

## Credits

- **Design Reference**: Apple Newsroom (apple.com/newsroom)
- **Tool**: web-to-mcp capture reference
- **Implementation**: React + Next.js + Tailwind CSS
- **Icons**: Lucide React

## Files Modified

- `app/components/MobileBlogCarousel.tsx` - Complete rewrite

## Related Components

- `MobileProjectCarousel.tsx` - Similar mobile carousel for projects
- `BlogCard.tsx` - Desktop blog card component
- `Carousel.tsx` - Desktop carousel component
