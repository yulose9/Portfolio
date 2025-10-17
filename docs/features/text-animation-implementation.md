# Text Animation Implementation Guide

## Quick Start

Your portfolio now has 4 powerful text animation components. Here's how to use them:

## 1. Update Existing Components

Replace your current animations with enhanced versions in your sections:

### Hero Section

```tsx
import { GsapBouncyText } from "@/app/(sections)/hero";

// Update any section headings
<GsapBouncyText
  text="Developer & Cloud Engineer"
  as="h1"
  animationStyle="bouncy"
  className="text-5xl font-bold"
/>;
```

### About Section

```tsx
import { GsapBouncyText } from "@/app/(sections)/hero";

<GsapBouncyText
  text="About Me"
  as="h2"
  animationStyle="smooth"
  staggerDelay={0.1}
  className="text-4xl font-bold"
/>;
```

### Portfolio/Work Sections

```tsx
import { AdvancedSplitText } from "@/app/components/animations";

<AdvancedSplitText
  animationType="fadeSlide"
  staggerDelay={0.12}
  className="text-3xl font-bold"
>
  My Latest Projects
</AdvancedSplitText>;
```

## 2. Component Selection Guide

**Use GsapBouncyText when:**

- You want word-level animations
- You need multiple pre-configured styles
- You want the simplest API

**Use AdvancedSplitText when:**

- You need character or line-level animations
- You want more granular control
- You need hover effects

**Use GsapSplitTextAnimation when:**

- You're using the official SplitText plugin
- You need advanced scroll trigger effects
- You want maximum performance

**Use SplitText when:**

- You have existing `<SplitText>` components
- You want basic animations with options

## 3. Step-by-Step Implementation

### Step 1: Identify Text Animations

Search your codebase for animation components:

```bash
grep -r "TextFadeIn\|TextPullUp\|GsapBouncyText" app/
```

### Step 2: Choose Animation Style

For each text element, decide:

- Should it be word-level or character-level?
- What mood should it convey? (playful, professional, energetic)
- What's the context? (heading, body, CTA)

### Step 3: Update Component

Replace old component with new one:

**Before:**

```tsx
<TextFadeIn text="My Projects" />
```

**After:**

```tsx
<GsapBouncyText text="My Projects" animationStyle="smooth" />
```

### Step 4: Fine-tune Timing

Adjust `staggerDelay` and `duration`:

```tsx
<GsapBouncyText
  text="My Projects"
  animationStyle="smooth"
  staggerDelay={0.08} // Time between words
  duration={0.6} // Animation speed
/>
```

### Step 5: Test on Mobile

Ensure animations feel good on small screens:

- Reduce `duration` if too slow
- Increase `staggerDelay` if too fast
- Use simpler animations on mobile

```tsx
// Conditional rendering
const isLarge = useMediaQuery("(min-width: 1024px)");

<GsapBouncyText text="Title" animationStyle={isLarge ? "wave" : "smooth"} />;
```

## 4. Animation Recommendations by Section

### Hero Section

- **Heading**: `bouncy` or `elastic`
- **Subheading**: `smooth` or `smooth-wave`
- **CTA Button**: `pop`

```tsx
<div className="hero">
  <GsapBouncyText
    text="John Nazarene Dela Pisa"
    as="h1"
    animationStyle="bouncy"
    className="text-5xl font-bold"
    delay={0}
  />
  <GsapBouncyText
    text="Developer & Cloud Engineer"
    as="h2"
    animationStyle="smooth-wave"
    className="text-2xl"
    delay={0.5}
  />
</div>
```

### About Section

- **Section Title**: `smooth` or `fadeSlide`
- **Body Text**: `slideUp` (word-level)
- **Highlights**: Use `AdvancedSplitText` with `scaleReveal`

```tsx
<section className="about">
  <GsapBouncyText
    text="About"
    as="h2"
    animationStyle="smooth"
    className="text-4xl font-bold"
  />
  <AdvancedSplitText
    animationType="slideUp"
    staggerDelay={0.08}
    className="text-lg leading-relaxed"
  >
    I'm passionate about building scalable applications...
  </AdvancedSplitText>
</section>
```

### Portfolio/Projects Section

- **Section Title**: `wave` or `elastic`
- **Project Cards**: Animate on scroll with `fadeSlide`
- **Project Titles**: `rotateIn` or `bounce`

```tsx
<GsapBouncyText
  text="Featured Projects"
  as="h2"
  animationStyle="wave"
  className="text-4xl font-bold mb-12"
/>

<div className="projects-grid">
  {projects.map((project) => (
    <AdvancedSplitText
      key={project.id}
      animationType="rotateIn"
      triggerOnView={true}
    >
      {project.title}
    </AdvancedSplitText>
  ))}
</div>
```

### Contact/CTA Section

- **Heading**: `pop` or `bounce`
- **Description**: `fadeSlide`
- **CTA Button**: Quick `pop` animation

```tsx
<GsapBouncyText
  text="Let's Work Together"
  as="h2"
  animationStyle="pop"
  className="text-4xl font-bold mb-4"
/>

<AdvancedSplitText
  animationType="fadeSlide"
  staggerDelay={0.1}
  className="text-lg mb-8"
>
  Ready to build something amazing?
</AdvancedSplitText>
```

## 5. Performance Optimization

### For Many Animations

```tsx
// Use word-level instead of character-level
<GsapBouncyText
  text="Optimized for performance"
  animationStyle="smooth"
/>

// Instead of:
<AdvancedSplitText splitType="chars">
  Slower with many characters
</AdvancedSplitText>
```

### For Mobile Devices

```tsx
import { useMediaQuery } from "@/hooks";

<GsapBouncyText
  text="Title"
  animationStyle={isMobile ? "smooth" : "wave"}
  duration={isMobile ? 0.8 : 0.6}
/>;
```

### Batch Animations

```tsx
// Group related animations
<div className="hero-group">
  <GsapBouncyText text="Hello" delay={0} staggerDelay={0.1} />
  <GsapBouncyText text="World" delay={0.6} staggerDelay={0.1} />
</div>
```

## 6. Advanced Patterns

### Staggered Section Entry

```tsx
<>
  <GsapBouncyText text="Section Title" as="h2" delay={0} />
  <AdvancedSplitText animationType="slideUp" staggerDelay={0.08} delay={0.4}>
    Description text appears after title
  </AdvancedSplitText>
</>
```

### Character-by-Character Reveals

```tsx
<AdvancedSplitText
  splitType="chars"
  animationType="slideUp"
  staggerDelay={0.03} // Very small delay
  className="text-2xl font-bold tracking-widest"
>
  IMPACT TEXT
</AdvancedSplitText>
```

### Hover Interaction

```tsx
<AdvancedSplitText
  animationType="elasticSlide"
  hover={true} // Re-plays on hover
  className="cursor-pointer select-none"
>
  Hover to replay
</AdvancedSplitText>
```

### Conditional Animations

```tsx
const isLarge = useMediaQuery("(min-width: 1024px)");

<GsapBouncyText
  text="Responsive Animation"
  animationStyle={isLarge ? "wave" : "smooth"}
  duration={isLarge ? 0.8 : 0.6}
/>;
```

## 7. Troubleshooting

### Animation not playing

1. Check element is visible on page load
2. Verify `triggerOnView={true}` (default)
3. Check browser console for errors
4. Ensure GSAP is installed: `npm list gsap`

### Text looks jumpy/glitchy

1. Add `overflow: hidden` to parent
2. Verify `willChange` CSS property
3. Check for conflicting CSS animations
4. Reduce animation complexity

### Animation too fast/slow

- Increase/decrease `duration` prop
- Adjust `staggerDelay` for sequence speed
- Use different `ease` function

### Mobile performance issues

- Use `smooth` animation instead of `wave`
- Increase `staggerDelay` slightly
- Consider reducing number of animated elements
- Test on actual device

## 8. CSS Considerations

Make sure parent containers are set up properly:

```css
/* Enable smooth animations */
.text-container {
  will-change: transform;
}

/* Prevent text jittering */
.animated-text span {
  font-kerning: auto;
  text-rendering: optimizeLegibility;
}

/* Smooth scrolling for context */
html {
  scroll-behavior: smooth;
}
```

## 9. Accessibility

Ensure animations don't interfere with readability:

```tsx
// Respect prefers-reduced-motion
import { useReducedMotion } from "@/hooks";

export function AccessibleText() {
  const prefersReduced = useReducedMotion();

  return (
    <GsapBouncyText
      text="Accessible Animation"
      animationStyle={prefersReduced ? "smooth" : "wave"}
      duration={prefersReduced ? 0.1 : 0.6}
    />
  );
}
```

## 10. Testing Your Animations

### Visual Testing

1. Test in Chrome, Firefox, Safari
2. Test on mobile (iOS Safari, Chrome Mobile)
3. Test with different network speeds
4. Test with reduced motion enabled

### Performance Testing

1. Use DevTools Performance tab
2. Check frame rate during animations
3. Monitor memory usage
4. Test on lower-end devices

### Accessibility Testing

1. Test with screen readers
2. Verify keyboard navigation
3. Test with reduced motion
4. Check color contrast

## Complete Example

Here's a complete section with multiple animation types:

```tsx
import { GsapBouncyText } from "@/app/(sections)/hero";
import { AdvancedSplitText } from "@/app/components/animations";

export default function ExampleSection() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Main Heading */}
        <GsapBouncyText
          text="Explore My Work"
          as="h1"
          animationStyle="bouncy"
          className="text-5xl md:text-6xl font-bold text-white mb-6"
          delay={0}
        />

        {/* Subheading */}
        <GsapBouncyText
          text="Crafted with passion and attention to detail"
          as="h2"
          animationStyle="smooth-wave"
          className="text-xl md:text-2xl text-slate-300 mb-12"
          delay={0.4}
        />

        {/* Description */}
        <AdvancedSplitText
          animationType="fadeSlide"
          staggerDelay={0.08}
          delay={0.8}
          className="text-lg text-slate-400 leading-relaxed mb-12 max-w-2xl"
        >
          From concept to deployment, every project showcases my commitment to
          quality and innovation. Explore the collection below to see what I've
          been working on.
        </AdvancedSplitText>

        {/* CTA Button */}
        <div className="inline-block mt-8">
          <AdvancedSplitText
            splitType="words"
            animationType="pop"
            staggerDelay={0.1}
            delay={1.2}
            className="text-lg font-semibold"
          >
            View All Projects
          </AdvancedSplitText>
        </div>
      </div>
    </section>
  );
}
```

## Next Steps

1. ✅ Review the `enhanced-text-animations.md` for all options
2. ✅ Update your sections one by one
3. ✅ Test animations on all devices
4. ✅ Fine-tune timing based on feedback
5. ✅ Consider accessibility implications
6. ✅ Monitor performance metrics

## Resources

- [GSAP Documentation](https://gsap.com/docs/)
- [Animation Showcase Component](./AnimationShowcase.tsx)
- [Enhanced Text Animations Guide](./enhanced-text-animations.md)

Happy animating! 🎬
