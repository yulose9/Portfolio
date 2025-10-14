# Mobile Work Experience View Toggle Implementation

## Overview

Implemented a dual-view system (List and Grid) for the mobile work experience section, featuring professional glassmorphism cards that maintain all details from the desktop design. The implementation includes smooth transitions, touch interactions, and a beautiful card-based experience.

## Features

### 1. **Dual View System**

- **List View**: Traditional table layout with company logos, names, locations, and positions
- **Grid View**: Modern glassmorphism cards with all information beautifully laid out
- Smooth AnimatePresence transitions between views (0.3s duration)
- View state persists during session

### 2. **View Toggle Buttons**

- Circular buttons (50x50px) with glassmorphism effect
- Active state: White background with green icon
- Inactive state: Transparent with white icon and subtle border
- Scale animation on toggle (105% scale for active state)
- Icons from desktop design (list and grid SVGs)
- Positioned above content with proper spacing

### 3. **Grid View Cards - Glassmorphism Design**

#### Card Structure

```tsx
<div className="relative rounded-[20px] overflow-hidden
  bg-[rgba(243,243,243,0.08)] backdrop-blur-[30px]
  border border-white/20
  shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]
  hover:shadow-[0px_20px_60px_0px_rgba(0,0,0,0.3)]">
```

#### Card Features

- **Glassmorphism Effect**: Translucent white background with backdrop blur
- **Hover Animation**: Gradient overlay from green to transparent
- **Touch Support**: onTouchStart/onTouchEnd for mobile devices
- **Staggered Entrance**: Cards animate in with 0.08s delay between each

#### Card Content Layout

1. **Company Section** (Top)

   - Company logo (64x64px) with rounded corners
   - Company name (18px, bold, white)
   - Duration badge (green pill with white text)
   - Tooltip on duration badge showing full calculation

2. **Position Section** (Middle)

   - Job position (14px, semi-bold)
   - Border separator below

3. **Location Section** (Bottom)
   - Location icon (pin/marker)
   - Location text with link
   - Hover effect changes to green

### 4. **Maintained Desktop Features**

All desktop information preserved in mobile grid view:

- ✅ Company logo with LinkedIn link
- ✅ Company name with website link
- ✅ Duration badge with tooltip (shows calculated duration)
- ✅ Job position
- ✅ Location with Google Maps link
- ✅ Hover effects and transitions
- ✅ Error handling for missing logos

### 5. **Animation Details**

#### Entrance Animations

```typescript
// Header: 0.6s duration, no delay
// Toggle buttons: 0.5s duration, 0.1s delay
// Cards: 0.35s duration, staggered (idx * 0.08s)
```

#### Transition Animations

```typescript
// View switch: 0.3s duration
// Initial: opacity 0, y: 20
// Animate: opacity 1, y: 0
// Exit: opacity 0, y: -20
```

#### Hover Effects

- Card shadow intensifies on hover/touch
- Gradient overlay fades in (0.2s)
- Scale effects on links and buttons

## Technical Implementation

### Dependencies

```tsx
import { AnimatePresence, motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
```

### State Management

```typescript
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
```

### Duration Calculator

```typescript
const calculateDuration = (startYear: number, startMonth?: number): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  let years = currentYear - startYear;
  let months = currentMonth - (startMonth ?? 0);

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years === 0) return `${months}m`;
  else if (months === 0) return `${years}y`;
  else return `${years}y ${months}m`;
};
```

## Design Decisions

### Glassmorphism Parameters

- **Background**: `rgba(243,243,243,0.08)` - Very subtle white tint
- **Backdrop Blur**: `30px` - Strong blur for depth
- **Border**: `white/20` - Subtle definition
- **Shadow**: Multi-layer for depth and hover states

### Spacing & Sizing

- **Card Padding**: `24px` (p-6)
- **Card Gap**: `24px` (gap-6)
- **Logo Size**: `64x64px` (mobile-optimized, smaller than desktop's 128px)
- **Border Radius**: `20px` for cards, `12px` for logos

### Color Scheme

- **Primary Text**: `white` with various opacity levels
- **Accent Color**: `#8eb08a` (green for badges, hovers)
- **Backgrounds**: White with low opacity (glassmorphism)
- **Borders**: White with 10-20% opacity

## Responsive Behavior

### Mobile (< 768px)

- Grid: 1 column layout
- Cards: Full width with proper padding
- Touch interactions enabled
- Optimized font sizes (11-18px range)

### Tablet (768px - 1024px)

- Desktop view shown (handled by parent component)

## Comparison: Mobile vs Desktop Grid

### Similarities

- Same data structure and information
- Duration tooltip with calculated time
- Company logo with LinkedIn link
- Company name with website link
- Job position display
- Location with Maps link
- Green accent color (#8eb08a)

### Differences

| Feature           | Desktop                 | Mobile                    |
| ----------------- | ----------------------- | ------------------------- |
| Card Aspect Ratio | 5:7 (poker card)        | Auto height               |
| Grid Columns      | 1/2/4 (responsive)      | 1 (single column)         |
| Logo Size         | 128x128px               | 64x64px                   |
| Layout            | Vertical centered       | Horizontal with logo left |
| Background        | `rgba(243,243,243,0.5)` | `rgba(243,243,243,0.08)`  |
| Backdrop Blur     | 36.31px                 | 30px                      |
| Hover Effect      | Green halo (layoutId)   | Gradient overlay          |
| Touch Support     | No                      | Yes                       |

## User Experience

### List View

- Familiar table format
- Compact information display
- Easy scanning of multiple entries
- Quick comparison of details

### Grid View

- Card-based modern interface
- More visual with larger logos
- Better separation of information
- Professional glassmorphism aesthetic
- Touch-friendly on mobile devices

### Transitions

- Smooth fade and slide animations
- No jarring layout shifts
- Clear visual feedback on toggle
- Maintains scroll position

## Accessibility

- **ARIA Labels**: View toggle buttons have descriptive labels
- **Keyboard Support**: All interactive elements focusable
- **Touch Targets**: 50x50px minimum for buttons
- **Color Contrast**: White text on dark background (high contrast)
- **Link Indication**: Hover states and underlines where appropriate

## Performance Considerations

### Optimizations

- `AnimatePresence mode="wait"`: Prevents simultaneous renders
- Conditional rendering: Only active view in DOM
- `viewport={{ once: true }}`: Animations run once
- `transition-all duration-300`: Hardware-accelerated CSS transitions
- Image error handling: Fallback to SVG icon

### Bundle Impact

- No additional dependencies (uses existing framer-motion and radix-ui)
- Minimal state management overhead
- Efficient re-renders with React.memo potential

## Testing Checklist

### Functionality

- [ ] Toggle between list and grid views
- [ ] List view displays correctly
- [ ] Grid view displays correctly
- [ ] All links work (company, LinkedIn, location)
- [ ] Duration tooltips show on hover/touch
- [ ] Logo error handling works
- [ ] View All button present

### Visual

- [ ] Glassmorphism effect visible
- [ ] Hover animations smooth
- [ ] Touch interactions responsive
- [ ] Text readable and properly sized
- [ ] Icons display correctly
- [ ] Spacing consistent

### Animation

- [ ] View toggle transitions smooth
- [ ] Card entrance staggered
- [ ] Hover effects performant
- [ ] No layout shifts
- [ ] Scroll position maintained

### Responsive

- [ ] Works on various mobile sizes (320px - 767px)
- [ ] Touch targets adequate size
- [ ] No horizontal scroll
- [ ] Content fits within viewport

## Future Enhancements

### Potential Additions

1. **Filter/Sort Options**: Sort by date, company, position
2. **Search Functionality**: Quick search through experiences
3. **Animation Preferences**: Respect prefers-reduced-motion
4. **Swipe Gestures**: Swipe cards for additional actions
5. **Lazy Loading**: For larger datasets
6. **Card Flip**: Show additional details on flip
7. **Export Feature**: Download experience list as PDF

### Performance

1. Virtual scrolling for 10+ items
2. Image lazy loading and optimization
3. Intersection observer for animations
4. Service worker caching

## Code Examples

### Adding New Work Experience

```typescript
const newExperience = {
  duration: "Jan 2025-present",
  startYear: 2025,
  startMonth: 0, // January (0-indexed)
  companyName: "New Company",
  companyUrl: "https://newcompany.com/",
  location: "City, Country",
  locationUrl: "https://maps.google.com/...",
  position: "Job Title",
  customDuration: undefined, // Or "3m" for custom
  logo: "/images/company-logos/newcompany.png",
  linkedinUrl: "https://www.linkedin.com/company/newcompany/",
};
```

### Customizing Card Colors

```typescript
// In grid view card container
className = "bg-[rgba(YOUR_COLOR_HERE)] ...";

// Hover gradient
className = "bg-gradient-to-br from-[YOUR_COLOR]/20 to-transparent";

// Duration badge
className = "bg-[YOUR_COLOR] ...";
```

### Adjusting Animation Timing

```typescript
// Card entrance delay
delay: idx * 0.1, // Change 0.08 to 0.1 for slower

// View transition speed
duration: 0.5, // Change 0.3 to 0.5 for slower
```

## Troubleshooting

### Cards Not Animating

- Check `AnimatePresence` wraps conditional render
- Verify unique `key` props on motion components
- Ensure framer-motion is imported correctly

### Glassmorphism Not Visible

- Check `backdrop-blur` support in browser
- Verify background has enough contrast
- Ensure parent doesn't have `overflow: hidden`

### Touch Events Not Working

- Add `onTouchStart` and `onTouchEnd` handlers
- Check z-index stacking
- Verify `pointer-events` not disabled

### Tooltips Not Showing

- Wrap with `TooltipProvider`
- Check `TooltipTrigger` wraps target element
- Verify radix-ui tooltip installed

## Related Files

- `app/(sections)/work/MobileWorkExperiences.tsx` - Main implementation
- `app/(sections)/work/Work.tsx` - Parent component with desktop view
- `app/(sections)/work/WorkExperienceGrid.tsx` - Desktop grid cards
- `app/components/ui/tooltip.tsx` - Radix UI tooltip component
- `app/components/ui/table.tsx` - Shadcn table component

## Conclusion

The mobile work experience view toggle provides a modern, professional, and user-friendly way to browse work history. The glassmorphism cards create a premium feel while maintaining all the information from the desktop design. The smooth animations and touch support ensure an excellent mobile experience.

The implementation follows best practices for React, TypeScript, and Framer Motion, making it maintainable and extensible for future enhancements.
