# Work Experience View Toggle - List & Grid Implementation

## Overview

This document describes the implementation of dual view modes (List and Grid) for the Work & Experiences section, inspired by HeroUI card components and Aceternity hover effects.

## Architecture

### Single Source of Truth

Both view modes render from the same data source: `workExperiences` array in `Work.tsx`

```typescript
const workExperiences = [
  {
    duration: `Nov 2024-present`,
    startYear: 2024,
    startMonth: 10,
    companyName: "Trends and Technologies Inc.",
    companyUrl: "https://www.trends.com.ph/",
    location: "Makati, Metro Manila",
    locationUrl: "https://maps.app.goo.gl/...",
    position: "Solutions Architect (AWS & RHEL)",
    customDuration: undefined,
    logo: "/images/company-logos/trends-and-technologies.png",
    linkedinUrl: "https://www.linkedin.com/company/...",
  },
  // ... more experiences
];
```

## Components

### 1. Work.tsx (Main Container)

**Location:** `app/(sections)/work/Work.tsx`

**Features:**

- State management for view mode toggle
- Conditional rendering based on `viewMode` state
- View toggle buttons with active states
- Shared data source for both views

**State:**

```typescript
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
```

**Toggle Buttons:**

- **List View Button:** Active by default (white bg, green icon)
- **Grid View Button:** Inactive by default (semi-transparent bg, white icon)
- Click handlers update `viewMode` state
- Active state styling applied conditionally

### 2. WorkExperienceGrid.tsx (Grid View Component)

**Location:** `app/(sections)/work/WorkExperienceGrid.tsx`

**Design Inspiration:**

- HeroUI Card components for structure
- Aceternity hover effects for animations
- Clean, modern card-based layout

**Features:**

- Responsive grid layout (1/2/3 columns)
- Hover background animation with layoutId
- Frosted glass card design
- Company logo display
- Duration badge
- Clickable links (company URL, location, LinkedIn)

**Card Structure:**

```typescript
<WorkExperienceGrid>
  └── Grid Container
      └── Card Wrapper (with hover detection)
          ├── Hover Background (AnimatePresence)
          └── Card
              ├── CardHeader (Logo + Duration Badge)
              ├── CardBody (Company + Position)
              └── CardFooter (Location + Date Range)
```

## Design System

### List View (Table Layout)

**Visual Design:**

- Clean table with header row
- 4 columns: Duration | Company | Location | Position
- Company logos in 48x48 rounded squares
- Hover effects on links
- Tooltip on duration showing calculated time
- Border separators between rows

**Colors:**

- Background: `bg-[#657a62]` (green)
- Text: White
- Borders: `border-white/20`
- Hover: `text-[#8eb08a]`

### Grid View (Card Layout)

**Visual Design:**

- Responsive 3-column grid (lg), 2-column (md), 1-column (mobile)
- Card size: Auto height based on content
- Frosted glass cards with backdrop blur
- Centered company logos (96x96)
- Hover animations with background glow

**Colors:**

- Card Background: `bg-[rgba(243,243,243,0.5)]` with backdrop blur
- Border: `border-[rgba(117,117,117,0.4)]`
- Hover Border: `border-[#8eb08a]/60`
- Hover Background: `bg-[#8eb08a]/30`
- Duration Badge: `bg-[#8eb08a]`
- Text: Black/Gray (for contrast on light cards)

## Animations & Transitions

### View Toggle Transition

The transition between list and grid views uses Framer Motion's `AnimatePresence` with `mode="wait"`:

```typescript
<AnimatePresence mode="wait">
  {viewMode === "list" ? (
    <motion.div
      key="list-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {/* List view content */}
    </motion.div>
  ) : (
    <motion.div
      key="grid-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {/* Grid view content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Behavior:**

- `mode="wait"` ensures previous view exits before new view enters
- Exit animation: fade out + translate up (y: -20)
- Enter animation: fade in + translate from below (y: 20)
- Duration: 300ms with custom cubic-bezier easing
- Smooth, professional transition feel

### Grid Card Stagger Animation

Each card in the grid animates in sequence:

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.5,
    delay: idx * 0.1,  // Stagger effect
    ease: [0.21, 0.47, 0.32, 0.98]
  }}
>
```

**Behavior:**

- Cards appear with 0.1s delay between each
- First card: 0s delay
- Second card: 0.1s delay
- Third card: 0.2s delay
- Creates cascading reveal effect
- Total animation time: 0.5s per card

### Hover Effects

### Aceternity-Inspired Animation

The grid view implements the Aceternity card hover effect:

```typescript
<AnimatePresence>
  {hoveredIndex === idx && (
    <motion.span
      className="absolute inset-0 h-full w-full bg-[#8eb08a]/30 block rounded-3xl"
      layoutId="hoverBackground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.15 } }}
      exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
    />
  )}
</AnimatePresence>
```

**Behavior:**

- Smooth background glow appears behind hovered card
- Uses Framer Motion's `layoutId` for shared animation
- 0.15s fade in/out with 0.2s exit delay
- Green-tinted overlay matches theme

### Card Hover Enhancements

- Scale effect on company logo (hover:scale-105)
- Shadow intensification on card
- Border color transition
- Link color changes

## Responsive Behavior

### Desktop (md and up)

- **List View:** 4-column table layout
- **Grid View:** 3-column grid (lg), 2-column (md)
- Toggle buttons visible and functional

### Mobile

- Uses `MobileWorkExperiences` component
- View toggle hidden on mobile
- Simplified layout optimized for small screens

## Data Flow

```
Work.tsx (Data Source)
    │
    ├─→ viewMode === "list"
    │       └─→ Table Layout (inline)
    │           ├─→ Table Headers
    │           └─→ Table Rows (map workExperiences)
    │
    └─→ viewMode === "grid"
            └─→ WorkExperienceGrid Component
                └─→ Grid Layout
                    └─→ Cards (map workExperiences)
```

## Helper Functions

### calculateDuration()

**Location:** `Work.tsx`

Calculates time elapsed from start date to current date:

```typescript
const calculateDuration = (startYear: number, startMonth?: number): string => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

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

**Usage:**

- Displays in List View tooltip
- Shows in Grid View duration badge
- Falls back to `customDuration` if provided

## Interaction States

### Toggle Buttons

**List View Active (Default):**

- Button: `bg-white border-white`
- Icon: `text-[#657a62]` (green)

**Grid View Active:**

- Button: `bg-white border-white`
- Icon: `text-[#657a62]` (green)

**Inactive State:**

- Button: `bg-[#697668]/80 border-[rgba(117,117,117,0.4)]`
- Icon: `text-white`

**Hover State (Both):**

- Transform: `hover:scale-110`
- Smooth transition on all properties

## Adding New Work Experiences

To add a new work experience, simply update the array in `Work.tsx`:

```typescript
const workExperiences = [
  // ... existing experiences
  {
    duration: `MMM YYYY-present`, // or date range
    startYear: 2024,
    startMonth: 0, // 0-indexed (0 = Jan, 11 = Dec)
    companyName: "Company Name",
    companyUrl: "https://...",
    location: "City, Country/State",
    locationUrl: "https://maps.google.com/...",
    position: "Job Title",
    customDuration: undefined, // or "6m", "1y 3m", etc.
    logo: "/images/company-logos/logo.png",
    linkedinUrl: "https://linkedin.com/company/...",
  },
];
```

Both views will automatically display the new entry.

## Browser Compatibility

### Supported Features:

- CSS Grid Layout
- Backdrop Blur Filter
- Framer Motion Animations
- React Hooks (useState)
- Flexbox

### Minimum Requirements:

- Modern browsers (Chrome 88+, Firefox 87+, Safari 14+)
- JavaScript enabled
- CSS Grid support

## Performance Considerations

### Optimizations:

- Single render cycle for view changes
- Framer Motion's layoutId for efficient animations
- Conditional rendering prevents rendering both views
- Image lazy loading via Next.js Image component
- AnimatePresence for smooth mount/unmount

### Animation Performance:

- GPU-accelerated transforms
- Optimized opacity transitions
- Minimal repaints with proper z-index layering

## Accessibility

### Features:

- Semantic HTML structure
- ARIA labels on buttons (`aria-label="List view"`)
- Keyboard navigation support
- Proper link relationships (`rel="noopener noreferrer"`)
- Tooltip for duration (List View)
- High contrast text colors

### Screen Reader Support:

- Descriptive link text
- Alt text on company logos
- Fallback SVG icons for missing images

## Future Enhancements

### Potential Improvements:

1. **Sorting Options:** Sort by date, company, or position
2. **Filtering:** Filter by position type or date range
3. **Search:** Search through work experiences
4. **Details Modal:** Expanded view with full job description
5. **Export:** Export as PDF or JSON
6. **Animations:** Stagger animations on view toggle
7. **Persist View:** Save user's preferred view in localStorage
8. **Dark Mode:** Adjust colors for dark theme
9. **Print Styles:** Optimized print layout

### Code Improvements:

1. Extract toggle buttons to separate component
2. Create reusable Card component system
3. Add TypeScript strict mode
4. Implement unit tests for view toggle
5. Add Storybook documentation

## Troubleshooting

### Common Issues:

**Issue:** Grid view not showing

- **Solution:** Check `viewMode` state, ensure it's set to "grid"

**Issue:** Hover animation not working

- **Solution:** Verify Framer Motion is installed, check `layoutId` is unique

**Issue:** Images not loading

- **Solution:** Check image paths, ensure files exist in public directory

**Issue:** Toggle buttons not responding

- **Solution:** Check onClick handlers, verify state is updating

**Issue:** Mobile view showing desktop layout

- **Solution:** Check Tailwind breakpoints, ensure `hidden md:flex` classes

---

**Last Updated:** October 12, 2025
**Status:** ✅ Fully Implemented
**Version:** 1.0.0
