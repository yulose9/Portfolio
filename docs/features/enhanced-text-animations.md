# Enhanced Text Animation System

## Overview

Your portfolio now features three advanced text animation components with multiple animation styles inspired by industry best practices (CodePen examples, GSAP documentation).

## Components

### 1. **GsapBouncyText** (Enhanced)

The main component you've been using, now with more animation styles.

**New Props:**

- `animationStyle`: `"bouncy" | "smooth" | "elastic" | "pop" | "wave" | "smooth-wave"`
- `duration`: Duration in seconds (default: 0.6)
- `once`: Animate only once (default: true)

**Usage Examples:**

```tsx
// Playful bouncy animation (original)
<GsapBouncyText
  text="About"
  as="h2"
  className="text-4xl font-bold"
/>

// Smooth professional entrance
<GsapBouncyText
  text="Projects"
  animationStyle="smooth"
  staggerDelay={0.1}
/>

// Elastic springy effect
<GsapBouncyText
  text="Contact Me"
  animationStyle="elastic"
  duration={0.8}
/>

// Quick pop effect
<GsapBouncyText
  text="Skills"
  animationStyle="pop"
  duration={0.4}
/>

// Wave-like motion
<GsapBouncyText
  text="Experience"
  animationStyle="wave"
/>

// Smooth controlled wave
<GsapBouncyText
  text="Testimonials"
  animationStyle="smooth-wave"
/>
```

### 2. **AdvancedSplitText** (New)

Advanced component for character and line-level animations with hover effects.

**Props:**

- `children`: Text content
- `splitType`: `"words" | "chars" | "lines"` (default: "words")
- `animationType`: Multiple animation types
- `duration`: Animation duration
- `staggerDelay`: Delay between elements
- `delay`: Initial delay
- `ease`: GSAP easing function
- `once`: Animate only once
- `hover`: Re-play animation on hover
- `triggerOnView`: Trigger when visible

**Animation Types:**

- `slideUp`: Classic slide up with fade
- `slideDown`: Slide down entrance
- `fadeSlide`: Slide with fade and skew
- `scaleReveal`: Scale from 0 to 1
- `elasticSlide`: Elastic overshoot slide
- `rotateIn`: Rotate entrance
- `charWave`: Wave-like character motion
- `letterPress`: Pressed letter effect
- `bounce`: Bouncy slide
- `blur`: Blur-to-clear fade

**Character-Level Animation:**

```tsx
<AdvancedSplitText
  splitType="chars"
  animationType="slideUp"
  staggerDelay={0.05}
>
  Amazing
</AdvancedSplitText>
```

**Line-Level Animation:**

```tsx
<AdvancedSplitText
  splitType="lines"
  animationType="fadeSlide"
  staggerDelay={0.15}
>
  {`This is line one
This is line two
This is line three`}
</AdvancedSplitText>
```

**With Hover Effect:**

```tsx
<AdvancedSplitText animationType="elasticSlide" hover={true}>
  Hover me!
</AdvancedSplitText>
```

### 3. **GsapSplitTextAnimation** (New - Premium)

Uses official GSAP SplitText plugin for maximum control and performance.

**Props:**

- `text`: Text content
- `splitType`: `"chars" | "words" | "lines"`
- `animationType`: Animation type
- `duration`: Animation duration
- `staggerDelay`: Stagger delay
- `scrollTriggered`: Use ScrollTrigger
- `once`: Animate only once

**Basic Usage:**

```tsx
import { GsapSplitTextAnimation } from "@/app/components/animations";

<GsapSplitTextAnimation
  text="Incredible Typography"
  splitType="words"
  animationType="slideUp"
  duration={0.7}
  staggerDelay={0.1}
/>;
```

**Character-Level:**

```tsx
<GsapSplitTextAnimation
  text="Animated"
  splitType="chars"
  animationType="rotateIn"
  staggerDelay={0.08}
/>
```

### 4. **SplitText** (Enhanced)

Enhanced version with multiple animation types.

**Props:**

- `children`: Text content
- `animationType`: `"slideUp" | "slideDown" | "fade" | "scale" | "wave"`
- `duration`: Animation duration
- `ease`: GSAP easing

**Usage:**

```tsx
import { SplitText } from "@/app/components/animations";

<SplitText animationType="wave" staggerDelay={0.12} duration={0.8}>
  Wave Animation
</SplitText>;
```

## Animation Types Reference

| Animation    | Effect                      | Best For                |
| ------------ | --------------------------- | ----------------------- |
| slideUp      | Classic bottom-to-top slide | Headings, introductions |
| slideDown    | Top-to-bottom slide         | Descending emphasis     |
| fadeSlide    | Slide with perspective skew | Dynamic content reveal  |
| scaleReveal  | Grows from center           | Key highlights          |
| elasticSlide | Bouncy overshoot slide      | Playful sections        |
| rotateIn     | Spins into view             | Eye-catching titles     |
| charWave     | Wavy character motion       | Title sequences         |
| letterPress  | Quick letter press effect   | Impact text             |
| bounce       | Bouncy slide effect         | Fun, engaging content   |
| blur         | Blur-to-clear transition    | Elegant fades           |

## Easing Functions Guide

Common GSAP easing functions:

```
power1.out   - Smooth, versatile ease-out
power2.out   - Smoother ease-out, more pronounced
power3.out   - Very smooth ease-out
power4.out   - Extremely smooth ease-out
sine.out     - Slow end, smooth like sine wave
cubic.out    - Cubic interpolation
quad.inOut   - Quadratic in and out
back.out(1.7) - Overshoots, bouncy
elastic.out  - Spring effect
bounce.out   - Classic bounce effect
circ.easeOut - Circular easing
```

## Performance Tips

1. **Use `once: true`** to prevent re-animation on scroll
2. **Limit `staggerDelay`** for character animations (0.03-0.05)
3. **Set appropriate `duration`** for readability (0.4-0.8 seconds)
4. **Use `willChange: transform, opacity`** for GPU acceleration (automatic)
5. **Consider `splitType="words"`** over `chars` for performance

## Migration Examples

### Before (Framer Motion)

```tsx
<TextFadeIn text="Hello World" />
```

### After (Enhanced GSAP)

```tsx
// Option 1: Keep existing behavior
<GsapBouncyText text="Hello World" />

// Option 2: Upgrade to smooth
<GsapBouncyText
  text="Hello World"
  animationStyle="smooth"
/>

// Option 3: Advanced control
<AdvancedSplitText
  animationType="fadeSlide"
  staggerDelay={0.1}
>
  Hello World
</AdvancedSplitText>
```

## Best Practices

1. **Choose animation by context:**

   - Headings: `slideUp`, `elasticSlide`, `rotateIn`
   - Body text: `slideUp`, `fadeSlide`, `smooth`
   - CTAs: `pop`, `bounce`, `elastic`

2. **Stagger delay guidelines:**

   - Words: 0.08-0.12 seconds
   - Characters: 0.03-0.08 seconds
   - Lines: 0.1-0.2 seconds

3. **Duration guidelines:**

   - Quick interactions: 0.3-0.5s
   - Normal text: 0.6-0.8s
   - Dramatic effect: 0.8-1.2s

4. **Test on mobile** - ensure animations don't feel sluggish

## Browser Support

All animations use GSAP which supports:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers
- ✅ IE 11+ (with polyfills)

## Advanced Usage

### Custom Stagger Order

```tsx
<AdvancedSplitText
  animationType="slideUp"
  staggerDelay={0.08}
  // Elements stagger in: first, center, right pattern
>
  Staggered from center
</AdvancedSplitText>
```

### With Scroll Trigger

```tsx
<GsapSplitTextAnimation
  text="Scroll to animate"
  animationType="slideUp"
  scrollTriggered={true}
  triggerElement=".my-section"
/>
```

### Chained Animations

```tsx
<div>
  <GsapBouncyText text="First" delay={0} animationStyle="slideUp" />
  <GsapBouncyText text="Then" delay={0.6} animationStyle="elastic" />
  <GsapBouncyText text="Finally" delay={1.2} animationStyle="pop" />
</div>
```

## Troubleshooting

### Animation not triggering

- Check element is in viewport on load
- Verify `triggerOnView={true}` (default)
- Adjust `rootMargin` in IntersectionObserver config
- Ensure GSAP is installed: `npm list gsap`

### Text jumps/jitters

- Check for conflicting CSS transitions
- Ensure `overflow: hidden` on parent span
- Verify `willChange` is not conflicting

### Performance issues

- Reduce number of animated elements
- Use `splitType="words"` instead of `chars`
- Increase `staggerDelay` slightly
- Consider debouncing if many elements

### Mobile looks wrong

- Test responsive sizes
- Consider simpler animations (e.g., `smooth` vs `wave`)
- Adjust timing for slower devices

## Future Enhancements

Potential improvements to explore:

- [ ] Character rotation per index
- [ ] Gradient color transitions during animation
- [ ] 3D perspective transforms
- [ ] Custom easing curve builder
- [ ] Animation sequencer for timelines
- [ ] Accessibility: ARIA labels and semantic HTML
- [ ] Reduced motion media query support
