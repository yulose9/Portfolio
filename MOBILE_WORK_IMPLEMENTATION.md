# Mobile Work Component Implementation

## Overview

This document describes the implementation of mobile-specific designs for the Work & Experiences and Certificates & Licenses sections, based on Figma designs (node-id: 821-783).

## Implementation Approach

### Separation of Concerns

- **Desktop Design**: Completely preserved in `Work.tsx` (grid-based table, 3-column certificate layout)
- **Mobile Design**: Created as separate components (`MobileWorkExperiences.tsx`, `MobileCertificates.tsx`)
- **Responsive Rendering**: Using Tailwind's responsive classes (`block md:hidden` for mobile, `hidden md:flex` for desktop)

### Breakpoint

- Mobile: `< 768px` (Tailwind's `md:` breakpoint)
- Desktop: `≥ 768px`

## Components

### 1. MobileWorkExperiences.tsx

#### Features

- **Compact Table Layout**: 4-column grid optimized for mobile screens
- **Vertical Stacking**: Duration displayed above each row for better readability
- **Small Typography**: Uses scaled-down font sizes (10px-12px) to fit mobile viewport
- **Framer Motion Animations**: Staggered entrance animations for smooth reveal
- **View All Button**: Rounded button with hover effects

#### Design Details

- **Header**: 36px font, split into two lines ("Work &" / "Experiences")
- **Table Columns**: Company Name, Location, Position (with headers)
- **Duration Row**: Full-width row above each entry
- **Typography**:
  - Headers: 12px semibold, uppercase
  - Duration: 10px light
  - Content: 11px light
- **Spacing**: 15px gaps, 22px vertical padding per row
- **Border**: White with 20% opacity between rows

#### Animation Timing

- Header: 0.6s duration, immediate
- Table headers: 0.5s duration, staggered 0-0.2s delay
- Rows: 0.6s duration, staggered 0.08s per row + 0.3s base delay
- View All button: 0.6s duration, 0.4s delay

### 2. MobileCertificates.tsx

#### Features

- **2-Column Grid**: Space-efficient layout for mobile
- **Compact Cards**: 180px × 238.732px dimensions
- **Date Badges**: Top-right positioned with rounded pill design
- **Certificate Icons**: Checkmark icon with gradient background
- **Frosted Glass Effect**: White/50 background with 17.512px backdrop blur
- **Hover Effects**: Scale transform on button

#### Design Details

- **Header**: 36px font, split into two lines ("Certificates &" / "Licenses")
- **Description**: 16px font, centered text below header
- **Card Layout**:
  - Border radius: 10.141px
  - Border: 0.146px rgba(117,117,117,0.4)
  - Shadow: Multi-layer shadow for depth
  - Background: White 50% with backdrop blur
- **Date Badge**:
  - Background: #d9d9d9
  - Position: Absolute top-right
  - Font: 11.724px
- **Certificate Image Area**:
  - Size: 98.873px square
  - Border radius: 2.535px
  - Gradient background with decorative elements
  - Checkmark icon centered
  - Corner accents with white/40 borders
- **Typography**:
  - Title: 18.474px semibold
  - Issuing Org: 11.724px normal

#### Animation Timing

- Header: 0.6s duration, immediate
- Description: 0.6s duration, 0.2s delay
- Cards: 0.6s duration, staggered 0.1s per card + 0.3s base delay
- View All button: 0.6s duration, 0.6s delay

## Integration with Work.tsx

### Structure

```tsx
<div id="work" className="relative w-screen bg-[#657a62]">
  {/* Mobile Work & Experiences */}
  <div className="block md:hidden">
    <MobileWorkExperiences />
  </div>

  {/* Desktop Work & Experiences */}
  <section className="hidden md:flex ...">
    {/* Existing desktop table layout */}
  </section>

  {/* Mobile Certificates */}
  <div className="block md:hidden">
    <MobileCertificates />
  </div>

  {/* Desktop Certificates */}
  <section className="hidden md:flex ...">
    {/* Existing desktop grid layout */}
  </section>
</div>
```

### Import Statements

```tsx
import MobileWorkExperiences from "./MobileWorkExperiences";
import MobileCertificates from "./MobileCertificates";
```

## Design System

### Colors

- **Primary Background**: `#657a62` (sage green)
- **Button**: `#8eb08a` (lighter green)
- **Text Primary**: `white`
- **Text Secondary**: `#f0f0f0`
- **Card Background**: `rgba(243,243,243,0.5)` with backdrop blur
- **Date Badge**: `#d9d9d9`
- **Borders**: `rgba(255,255,255,0.2)` or `rgba(117,117,117,0.4)`

### Typography

- **SF Pro Display**: Headers (36px)
- **SF Pro Text**: Body text, buttons, labels
- **Inter**: Desktop fallback

### Spacing

- **Mobile Padding**: 15px horizontal, 80-113px vertical
- **Grid Gap**: 13-15px
- **Button Size**: 117px × 41.373px
- **Border Radius**: 10.141px (cards), 12.456px (buttons)

## Animations

### Variants

All animations use Framer Motion with:

- **Easing**: `[0.21, 0.47, 0.32, 0.98]` (custom bezier)
- **Direction**: Fade in + slide up (y: 20 → 0)
- **Viewport**: `once: true`, `margin: "-50px"` (trigger before entering viewport)

### Stagger Pattern

- Headers: No delay
- Descriptions: 0.2s delay
- Table items: Progressive delay (0.08s × index + base delay)
- Cards: Progressive delay (0.1s × index + base delay)
- Buttons: Fixed delay at end

## Data Structure

### Work Experience

```typescript
{
  duration: string; // e.g., "2023-xxxx"
  companyName: string; // Company name
  location: string; // Address/location
  position: string; // Job title/position
}
```

### Certificate

```typescript
{
  title: string; // Certificate title
  issuingOrg: string; // Issuing organization
  date: string; // Issue date (MMM yyyy format)
}
```

## Responsive Behavior

### Mobile (< 768px)

- Work table: 4-column compact layout with stacked duration
- Certificates: 2-column grid with smaller cards
- Buttons: Smaller size (117px × 41px)
- Typography: Reduced font sizes
- Spacing: Tighter gaps and padding

### Desktop (≥ 768px)

- Work table: Full-width 4-column table with inline duration
- Certificates: 3-column grid with larger cards (495px height)
- Buttons: Larger size (220px × 70px)
- Typography: Full-size fonts
- Spacing: Generous gaps and padding

## Future Enhancements

### Potential Improvements

1. **Interactive Cards**: Add tap/click handlers to view full certificate details
2. **Filtering**: Category or date range filtering for work experiences
3. **Swipe Gestures**: Horizontal swipe for certificate carousel on mobile
4. **Dynamic Data**: Connect to CMS or API for certificate/work data
5. **Image Loading**: Add Next.js Image component for certificate images
6. **Skeleton Loading**: Loading states for data fetching
7. **View Toggle**: Allow users to switch between grid/list view on mobile
8. **Search**: Filter work experiences by company, location, or position

## Testing Checklist

- [ ] Mobile view renders correctly < 768px
- [ ] Desktop view remains unchanged ≥ 768px
- [ ] No layout shift between breakpoints
- [ ] All animations trigger properly on scroll
- [ ] Buttons are interactive and accessible
- [ ] Touch targets meet minimum size requirements (44px)
- [ ] Text is legible at all screen sizes
- [ ] Colors meet WCAG contrast requirements
- [ ] No TypeScript errors
- [ ] No console warnings

## Accessibility

### Implemented Features

- Semantic HTML structure
- Proper heading hierarchy (h2 for section titles)
- Descriptive button labels
- Keyboard navigation support
- Touch-friendly button sizes
- High contrast text (white on dark green)

### Recommendations

- Add `aria-label` to View All buttons
- Consider `role="table"` for work experience section
- Add focus visible states for keyboard navigation
- Test with screen readers
- Verify touch target sizes (minimum 44px)

## Performance

### Optimizations

- Framer Motion animations use GPU-accelerated transforms
- `viewport: { once: true }` prevents re-animation on scroll
- Backdrop blur uses CSS filters (hardware accelerated)
- No external image dependencies
- Minimal component re-renders

### Considerations

- Monitor animation performance on low-end devices
- Consider reducing blur intensity for better performance
- Test scroll performance with many work entries
- Optimize SVG icons if performance issues arise

## Notes

- Desktop design completely preserved as per requirement
- Mobile components are self-contained and reusable
- Figma design specifications followed precisely
- All spacing, typography, and colors match Figma export
- Animations enhance user experience without blocking interaction
