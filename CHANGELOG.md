# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Mobile Work Experience View Toggle

- **Dual View System**: Added list and grid view toggle for mobile work experience section
- **View Toggle Buttons**:
  - Circular glassmorphism buttons (50x50px)
  - Active state with white background and green icon
  - Inactive state with transparent background
  - Smooth scale animations and transitions
- **Grid View Cards**:
  - Professional glassmorphism cards with backdrop blur
  - Company logo (64x64px) with hover effects
  - Duration badge with tooltip showing calculated duration
  - Position and location details maintained from desktop
  - Touch-friendly interactions (onTouchStart/onTouchEnd)
  - Gradient hover overlay effect
  - Staggered entrance animations (0.08s delay)
- **List View**:
  - Traditional table layout maintained
  - Company logos (32x32px)
  - Clean and compact information display
- **Smooth Transitions**: AnimatePresence for 300ms view switching
- **Improved Duration Calculator**: Fixed calculation with proper month handling

#### Documentation

- `docs/implementation/mobile-work-view-toggle.md`: Complete implementation guide
- `docs/features/mobile-work-view-visual-guide.md`: Visual specifications and ASCII diagrams

### Changed

- **MobileWorkExperiences.tsx**: Complete rewrite with dual-view support
- **Duration Calculation**: Enhanced to handle month-based calculations correctly
- **Spacing**: Reduced header margin from 121px to 60px for better proportion

## [2.0.0] - 2025-10-12

### Added

#### Work Experience Section

- **Dual View System**: Toggle between list (table) and grid (cards) views
- **List View**:
  - Glass morphism hover effect on table rows
  - Smooth layoutId animations when moving between rows
  - Duration tooltips showing full time period
- **Grid View**:
  - Playing card-style cards with 5:7 aspect ratio
  - Aceternity-inspired hover effects
  - 96x96px company logos centered with duration badges
  - 4-column responsive grid (1/2/4 on mobile/tablet/desktop)
  - Staggered entrance animations
- **WorkExperienceGrid Component**: New component for card-based grid layout

#### Placeholder Components

- **BlogPlaceholder**: "Coming Soon" cards with animated sparkles icon
- **ProjectPlaceholder**: "Coming Soon" cards with animated code brackets icon
- Consistent design language across placeholder states

#### Image Optimization

- Quality presets: 95 for desktop carousel, 90 for mobile
- Priority loading for first carousel image
- Proper responsive sizes configuration
- Updated next.config.js with quality array

#### Documentation

- `docs/features/image-optimization-guide.md`: Comprehensive image optimization guide
- `docs/features/placeholder-components.md`: Placeholder implementation guide
- `docs/features/work-experience-view-toggle.md`: View toggle documentation
- `docs/features/work-view-improvements-v1.1.md`: Technical details of v1.1 improvements
- `docs/features/work-view-visual-guide.md`: Visual specifications and diagrams
- `docs/implementation/work-view-improvements-summary.md`: Implementation summary

### Changed

#### Work Section Improvements

- Fixed vertical layout shift when toggling between views
- Removed `justify-center` from section to prevent reflow
- Added fixed minimum height container with flex layout
- Improved card aspect ratio from 4:3 to 5:7 (poker card proportions)
- Enhanced text sizes in grid view for better readability
- Centered logo and duration badge grouping in cards

#### Carousel Enhancements

- Added quality={95} to desktop carousel
- Added quality={90} to mobile carousel
- Added priority flag to first image
- Updated image files with better compression

#### Code Structure

- Exported WorkExperienceGrid and ProjectPlaceholder components
- Updated index.ts files for proper exports
- Improved component modularity

### Fixed

- Layout shift bug when switching between list/grid views
- Card text hierarchy and sizing issues
- Logo and badge alignment in grid cards
- Carousel image quality settings

### Technical Details

- **Frameworks**: Next.js 15.5.4, React, Framer Motion
- **UI Components**: Radix UI Tooltip
- **Styling**: Tailwind CSS, CSS Grid, Flexbox
- **Animations**: AnimatePresence, layoutId morphing
- **Image Handling**: Next.js Image optimization

### Performance

- Optimized image loading with quality presets
- Efficient animation transitions (300ms)
- Staggered card animations (100ms delay)
- Smooth hover effects without jank

### Repository Maintenance

- Updated .gitignore to exclude documentation drafts and utility scripts
- Added patterns for temporary files and issue tracking
- Cleaned up unnecessary tracked files

---

## Previous Releases

### [1.2.0] - 2025-10-11

- Enhanced carousel with infinite loop
- Improved table alignment

### [1.1.0] - 2025-10-10

- Restructured project architecture
- Added work experience features

### [1.0.0] - 2025-10-09

- Initial release with core features
- Apple Cards Carousel implementation
- Table and Tooltip components

---

## Links

- [Repository](https://github.com/yulose9/Portfolio)
- [Documentation](./docs/)
- [Issues](https://github.com/yulose9/Portfolio/issues)
