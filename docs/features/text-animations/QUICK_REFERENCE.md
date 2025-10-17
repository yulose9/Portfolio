# Text Animation - Quick Reference Card

## 🚀 Quick Start (60 seconds)

```tsx
// 1. Import
import { GsapBouncyText } from "@/app/(sections)/hero";
import { AdvancedSplitText } from "@/app/components/animations";

// 2. Use for headings (word-level)
<GsapBouncyText
  text="Section Title"
  as="h2"
  animationStyle="smooth"
/>

// 3. Use for body text (word or char level)
<AdvancedSplitText
  animationType="slideUp"
  staggerDelay={0.08}
>
  Your text here
</AdvancedSplitText>
```

## 📋 Component Comparison

| Feature             | GsapBouncyText | AdvancedSplitText | SplitText | GsapSplitTextAnimation |
| ------------------- | -------------- | ----------------- | --------- | ---------------------- |
| **Best For**        | Headings       | Any text          | Any text  | Complex animations     |
| **Ease of Use**     | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐          | ⭐⭐⭐    | ⭐⭐⭐                 |
| **Animation Types** | 6              | 10+               | 5         | 8+                     |
| **Char Level**      | ❌             | ✅                | ✅        | ✅                     |
| **Line Level**      | ❌             | ✅                | ✅        | ✅                     |
| **Hover Effect**    | ❌             | ✅                | ❌        | ❌                     |
| **Size**            | ~2KB           | ~4.5KB            | ~2KB      | ~2.8KB                 |

## 🎨 Animation Styles

### GsapBouncyText (6 styles)

```
"bouncy"       → Playful bounce effect
"smooth"       → Professional smooth slide
"elastic"      → Springy elastic effect
"pop"          → Quick pop entrance
"wave"         → Wavy motion
"smooth-wave"  → Controlled wave
```

### AdvancedSplitText (10+ styles)

```
"slideUp"      → Bottom to top slide
"slideDown"    → Top to bottom slide
"fadeSlide"    → Slide with fade and skew
"scaleReveal"  → Scale from 0 to 1
"elasticSlide" → Bouncy slide
"rotateIn"     → Spinning entrance
"charWave"     → Wavy character motion
"letterPress"  → Quick press effect
"bounce"       → Bouncy slide
"blur"         → Blur to clear fade
```

## 💡 Common Patterns

### Pattern 1: Section with Title + Description

```tsx
<GsapBouncyText
  text="Section"
  as="h2"
  animationStyle="smooth"
  delay={0}
/>

<AdvancedSplitText
  animationType="slideUp"
  delay={0.5}
>
  Description text
</AdvancedSplitText>
```

### Pattern 2: Staggered List

```tsx
{
  items.map((item, i) => (
    <AdvancedSplitText key={i} animationType="slideUp" delay={i * 0.15}>
      {item}
    </AdvancedSplitText>
  ));
}
```

### Pattern 3: Character-by-Character

```tsx
<AdvancedSplitText
  splitType="chars"
  animationType="slideUp"
  staggerDelay={0.03}
  className="tracking-widest"
>
  IMPACT TEXT
</AdvancedSplitText>
```

### Pattern 4: Hover Replay

```tsx
<AdvancedSplitText animationType="elasticSlide" hover={true}>
  Hover to replay
</AdvancedSplitText>
```

## ⚡ Performance Tips

| Tip               | What                  | Why                |
| ----------------- | --------------------- | ------------------ |
| Use `once={true}` | Animate only once     | Saves performance  |
| Use `words`       | Word-level animation  | Faster than chars  |
| Increase stagger  | 0.08-0.12 for words   | Better readability |
| Short duration    | 0.5-0.8 seconds       | Feels snappier     |
| Limit chars       | Max 50 chars animated | Prevent lag        |

## 🎯 Animation Strategy by Section

```
Hero
├─ Heading: "bouncy" or "elastic"
├─ Subheading: "smooth-wave"
└─ Description: "slideUp"

About
├─ Title: "smooth"
├─ Body: "slideUp"
└─ Highlights: "scaleReveal"

Portfolio
├─ Heading: "wave"
├─ Card titles: "rotateIn"
└─ Descriptions: "fadeSlide"

Contact
├─ Heading: "pop"
├─ Text: "slideUp"
└─ Button: "elastic"
```

## 🔧 Common Props

### All Components

```tsx
className="text-4xl"          // Tailwind classes
style={{}}                     // Inline styles
delay={0}                      // Initial delay (seconds)
staggerDelay={0.08}           // Delay between items (seconds)
```

### GsapBouncyText

```tsx
text="Hello"                   // Text to animate
as="h2"                        // HTML element (p, span, div, h1-h3)
animationStyle="smooth"        // 6 styles available
duration={0.6}                // Animation length
once={true}                   // Only animate once
```

### AdvancedSplitText

```tsx
children="Hello"              // Text content
splitType="words"             // "words" | "chars" | "lines"
animationType="slideUp"       // 10+ types available
duration={0.6}               // Animation length
ease="power2.out"            // GSAP easing function
once={true}                  // Only animate once
hover={false}                // Replay on hover
triggerOnView={true}         // Animate when visible
```

## 📊 Timing Guide

| Duration | Feel      | Use Case            |
| -------- | --------- | ------------------- |
| 0.3s     | Very fast | Quick pops, CTAs    |
| 0.6s     | Normal    | Standard animations |
| 0.8s     | Relaxed   | Dramatic reveals    |
| 1.0s+    | Slow      | Cinematic effects   |

| Stagger | Speed     | Use Case        |
| ------- | --------- | --------------- |
| 0.03s   | Very fast | Character level |
| 0.08s   | Normal    | Word level      |
| 0.12s   | Slow      | Line level      |
| 0.2s+   | Very slow | Dramatic effect |

## 🎬 Easing Functions

Popular GSAP Easings:

```
power1.out    → Smooth, universal
power2.out    → More pronounced
power3.out    → Very smooth
sine.out      → Wave-like
back.out(1.7) → Bouncy overshoot
elastic.out   → Spring effect
bounce.out    → Classic bounce
circ.easeOut  → Circular ease
```

## 🐛 Quick Troubleshooting

| Problem           | Solution                                         |
| ----------------- | ------------------------------------------------ |
| Not animating     | Check element visibility, `triggerOnView={true}` |
| Text jumps        | Add `overflow: hidden` to parent span            |
| Too fast/slow     | Adjust `duration` prop                           |
| Jittery           | Reduce `staggerDelay`, check for CSS conflicts   |
| Mobile lag        | Use simpler animation, increase delays           |
| Character overlap | Add `splitType="words"` instead                  |

## 📚 Documentation Files

Located in `/docs/features/text-animations/`:

1. **README.md** - Overview and navigation
2. **enhanced-text-animations.md** - Complete technical reference
3. **text-animation-implementation.md** - Step-by-step implementation
4. **examples.tsx** - Copy-paste code examples

## 🔗 Resources

- GSAP Docs
- Animation Showcase Component
- CodePen Examples

## ✅ Implementation Checklist

- [ ] Review quick reference
- [ ] Test AnimationShowcase component
- [ ] Implement in Hero section
- [ ] Implement in About section
- [ ] Implement in Portfolio section
- [ ] Implement in Contact section
- [ ] Test on mobile
- [ ] Fine-tune timing
- [ ] Performance check
- [ ] Accessibility review

## 💾 Copy-Paste Ready

### Import Statement

```tsx
import { GsapBouncyText } from "@/app/(sections)/hero";
import { AdvancedSplitText } from "@/app/components/animations";
```

### Minimal Example

```tsx
<GsapBouncyText text="Hello" />
<AdvancedSplitText>World</AdvancedSplitText>
```

### Full Example

```tsx
<section>
  <GsapBouncyText
    text="Title"
    as="h2"
    animationStyle="smooth"
    className="text-4xl font-bold"
  />
  <AdvancedSplitText
    animationType="slideUp"
    staggerDelay={0.1}
    className="text-lg"
  >
    Description text here
  </AdvancedSplitText>
</section>
```

---

**Last Updated**: October 17, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
