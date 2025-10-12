# Placeholder Components Implementation

## Overview

This document describes the placeholder component system implemented for both project carousel and blog sections. These components provide a professional "Coming Soon" state while content is being developed.

## Components Created

### 1. ProjectPlaceholder Component

**Location:** `app/(sections)/portfolio/ProjectPlaceholder.tsx`

A reusable placeholder overlay for project carousel items that displays:

- Animated code icon (breathing effect with scale and opacity)
- "Coming Soon" badge with gray background
- Customizable title
- Customizable message
- Dimmed background with backdrop blur

**Props:**

```typescript
interface ProjectPlaceholderProps {
  title?: string; // Default: "Coming Soon"
  message?: string; // Default: "This project is currently in development..."
}
```

**Features:**

- Responsive design (mobile and desktop)
- Framer Motion animations
- Semi-transparent overlay (bg-black/60)
- Backdrop blur effect
- Code brackets icon for projects

### 2. BlogCard Placeholder State

**Location:** `app/(sections)/blog/BlogCard.tsx`

Enhanced with `isPlaceholder` prop support:

- Conditional rendering for placeholder vs normal content
- Animated book icon for placeholder cards
- Disabled hover effects on placeholders
- Non-clickable cursor for placeholder cards

**Props Added:**

```typescript
interface BlogCardProps {
  // ... existing props
  isPlaceholder?: boolean; // New prop
}
```

## Updated Components

### 1. Desktop Carousel (Carousel.tsx)

**Changes:**

- Added `isPlaceholder?: boolean` to project interface
- Import `ProjectPlaceholder` component
- Conditional rendering of placeholder overlay on each slide
- Passes project title and description to placeholder

### 2. Mobile Project Carousel (MobileProjectCarousel.tsx)

**Changes:**

- Added `isPlaceholder?: boolean` to Project and Card interfaces
- Inline placeholder overlay (simplified for mobile)
- Disabled card click functionality for placeholders
- Uses `animate-pulse` for mobile icon animation

### 3. Mobile Blog Carousel (MobileBlogCarousel.tsx)

**Changes:**

- Added `isPlaceholder?: boolean` to Blog interface
- Conditional rendering for placeholder content
- Centered placeholder layout for mobile
- Simplified placeholder design for carousel view

### 4. Portfolio.tsx Data

**Updated Sample Data:**

**Projects Array:**

```typescript
const projects = [
  {
    image: "/images/carousell-item1.png",
    title: "Coming Soon",
    description:
      "This project is currently in development. Stay tuned for updates!",
    isPlaceholder: true, // Enables placeholder overlay
  },
  // ... 3 more placeholder projects
];
```

**Blogs Array:**

```typescript
const blogs = [
  {
    image: "/images/image-blogcard.png",
    tag: "COMING SOON",
    tagColor: "#6b7280",
    title: "Stay Tuned",
    date: "Publishing Soon",
    isPlaceholder: true, // Enables placeholder state
  },
  // ... 2 more placeholder blogs
];
```

## Design Patterns

### Visual Consistency

All placeholders follow a consistent design:

- **Background:** Black overlay at 60% opacity with backdrop blur
- **Badge Color:** Neutral gray (#6b7280)
- **Icon Animation:** Breathing effect (scale + opacity)
- **Typography:** White text with reduced opacity for descriptions

### Icon Selection

- **Projects:** Code brackets icon (`</>`) - represents development
- **Blogs:** Book icon - represents content/reading

### Behavior

- **Desktop Projects:** Full overlay, no interaction possible
- **Mobile Projects:** Simplified overlay, click disabled
- **Blog Cards:** Dimmed appearance, no hover effects
- **Mobile Blog Carousel:** Centered placeholder content

## Usage

### Converting to Real Content

#### For Projects:

1. Update the project object in `Portfolio.tsx`
2. Change `title` and `description` to actual content
3. Add proper `blogUrl` and `githubUrl`
4. **Remove or set `isPlaceholder: false`**

```typescript
{
  image: "/images/my-real-project.png",
  title: "My Awesome Project",
  description: "A full-stack application...",
  blogUrl: "https://blog.example.com/my-project",
  githubUrl: "https://github.com/user/project",
  isPlaceholder: false,  // or just remove this line
}
```

#### For Blogs:

1. Update the blog object in `Portfolio.tsx`
2. Change all placeholder content to real blog data
3. **Remove or set `isPlaceholder: false`**

```typescript
{
  image: "/images/blog-thumbnail.png",
  tag: "TUTORIAL",
  tagColor: "#17d440",
  title: "Getting Started with Next.js",
  date: "March 15, 2024",
  isPlaceholder: false,  // or just remove this line
}
```

## Benefits

1. **Professional Appearance:** Portfolio looks complete even without all content
2. **Transparency:** Clearly communicates "work in progress" status
3. **Maintainability:** Easy to switch between placeholder and real content
4. **Consistency:** Unified design across all placeholder states
5. **Flexibility:** Customizable titles and messages per item
6. **Responsive:** Works seamlessly on mobile and desktop

## Technical Details

### Dependencies

- Framer Motion (for animations)
- Next.js Image component
- Tailwind CSS (for styling)

### Animation Performance

- CSS transforms (scale, opacity) for smooth animations
- `backdrop-blur-sm` for modern blur effect
- Hardware-accelerated animations via GPU

### Accessibility

- Proper z-index layering (z-20 for overlays)
- Maintains image alt text
- Non-interactive elements have appropriate cursor styling
- Clear visual distinction between placeholder and real content

## Future Enhancements

Potential improvements:

1. Add progress indicators for projects in development
2. Include estimated completion dates
3. Add newsletter signup for updates
4. Implement skeleton loading states
5. Add animation variants for different placeholder types

---

**Last Updated:** October 12, 2025
**Status:** ✅ Fully Implemented
