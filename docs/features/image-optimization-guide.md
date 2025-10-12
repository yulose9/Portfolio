# Image Optimization Guide for Next.js Portfolio

## 📋 Table of Contents

1. [Current Setup Analysis](#current-setup-analysis)
2. [Why Images Look Pixelated](#why-images-look-pixelated)
3. [Industry Best Practices](#industry-best-practices)
4. [Recommended Solutions](#recommended-solutions)
5. [Implementation Guide](#implementation-guide)
6. [Source Image Requirements](#source-image-requirements)
7. [Advanced Techniques](#advanced-techniques)

---

## ✅ Current Setup Analysis

Your `next.config.js` is already well-configured:

```javascript
{
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90, 100],
  }
}
```

**Strengths:**

- ✓ Modern formats (AVIF, WebP) enabled
- ✓ Multiple quality levels configured
- ✓ Comprehensive device sizes
- ✓ Long-term caching headers

---

## 🔍 Why Images Look Pixelated

### Common Causes:

1. **Default Quality (75)**: Next.js uses quality 75 by default

   - Good for most images but may not be sufficient for large carousel/hero images
   - Carousel images need higher quality (90-100)

2. **Missing `priority` Flag**: Large above-the-fold images should be preloaded

3. **Incorrect `sizes` Attribute**: Browser may load wrong image size

4. **Low-Quality Source Images**:

   - PNG compression artifacts
   - Low-resolution source files
   - Images saved at low quality initially

5. **Browser Caching**: Old cached versions displaying

---

## 🎯 Industry Best Practices

### From Next.js Documentation:

- Use `quality={90-100}` for hero/carousel images
- Use `priority={true}` for above-the-fold images
- Always provide `sizes` for responsive images
- Use AVIF/WebP formats (already configured ✓)

### From Web.dev (Google):

- Create 3-5 different image sizes
- Use Sharp library for image processing (Next.js uses this ✓)
- Serve responsive images with srcset (Next.js does this automatically ✓)
- Optimize for LCP (Largest Contentful Paint)

### From Community Best Practices:

- **Hero/Carousel images**: quality 90-100
- **Thumbnails**: quality 75-80
- **Icons**: Use SVG when possible
- **Decorative images**: quality 70-75

---

## 🚀 Recommended Solutions

### 1. **Increase Quality for Carousel Images**

```tsx
<Image
  src="/images/carousell-item1.png"
  quality={95} // Higher quality for large images
  priority // Preload first carousel image
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  className="object-cover"
/>
```

### 2. **Use Priority for First Image**

```tsx
// First carousel slide
<Image
  priority={index === 1} // Prioritize first real slide
  quality={95}
  // ... other props
/>
```

### 3. **Add Proper Sizes Attribute**

```tsx
// For carousel (16:9 aspect ratio container)
sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px";
```

### 4. **Optimize Source Images**

#### Using Sharp (Command Line):

```bash
# Install sharp-cli
npm install -g sharp-cli

# Optimize PNG images
sharp -i input.png -o output.png --png.quality 100 --png.compressionLevel 6

# Convert to WebP
sharp -i input.png -o output.webp --webp.quality 95
```

#### Using Online Tools:

- **TinyPNG**: https://tinypng.com/ (Lossy compression)
- **Squoosh**: https://squoosh.app/ (Google's image optimizer)
- **ImageOptim**: https://imageoptim.com/ (Mac app)

---

## 📦 Implementation Guide

### Step 1: Update Carousel Component

```tsx
// app/(sections)/portfolio/Carousel.tsx
export default function Carousel({ projects }: CarouselProps) {
  // ... existing code

  return (
    <div className="carousel-container">
      {extendedProjects.map((project, index) => (
        <div key={`slide-${index}`} className="slide">
          <Image
            src={project.image}
            alt={project.title}
            fill
            quality={95} // ← HIGH QUALITY
            priority={index === 1} // ← PRELOAD FIRST IMAGE
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px" // ← RESPONSIVE
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
```

### Step 2: Update Mobile Carousel

```tsx
// app/(sections)/portfolio/MobileProjectCarousel.tsx
<Image
  src={card.src}
  alt={card.title}
  fill
  quality={90} // ← HIGH QUALITY
  sizes="(max-width: 768px) 56vw, 384px" // ← MOBILE SIZES
  className="absolute inset-0 z-10 object-cover"
/>
```

### Step 3: Check Source Image Quality

```powershell
# Check current image details
Get-ChildItem -Path "public/images" -Filter "carousell*" | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        Size = "{0:N2} KB" -f ($_.Length / 1KB)
        LastModified = $_.LastWriteTime
    }
}
```

---

## 🖼️ Source Image Requirements

### For Best Quality:

#### **Resolution Guidelines:**

- **Desktop Carousel**: 1920x1080px minimum (16:9 aspect ratio)
- **Mobile Carousel**: 768x432px minimum
- **4K/Retina Displays**: 3840x2160px (recommended for future-proofing)

#### **File Format Priority:**

1. **PNG** (lossless) - Best for screenshots, graphics
2. **High-Quality JPEG** (95-100%) - Good for photos
3. **WebP** (95%+) - Modern format, great compression

#### **What NOT to Use:**

- ❌ Low-resolution images (<1920px wide)
- ❌ Heavily compressed JPEGs
- ❌ Images with existing compression artifacts
- ❌ Scaled-up images (always scale down, never up)

---

## 🎨 Advanced Techniques

### 1. **Use SVG for Logos and Icons**

```tsx
// For company logos, use SVG instead of PNG
<Image
  src="/images/logo.svg"
  width={100}
  height={50}
  unoptimized // SVG doesn't need optimization
  alt="Company Logo"
/>
```

### 2. **Blur Placeholder for Better UX**

```tsx
<Image
  src="/images/carousell-item1.png"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Tiny base64 image
  quality={95}
  fill
/>
```

### 3. **Custom Image Loader (CDN)**

If you want to use a CDN like Cloudinary or Imgix:

```javascript
// next.config.js
module.exports = {
  images: {
    loader: "custom",
    loaderFile: "./lib/imageLoader.js",
  },
};

// lib/imageLoader.js
export default function myImageLoader({ src, width, quality }) {
  return `https://your-cdn.com/${src}?w=${width}&q=${quality || 90}`;
}
```

### 4. **Art Direction (Different Images for Mobile/Desktop)**

```tsx
import { getImageProps } from "next/image";

export default function HeroImage() {
  const common = { alt: "Hero", sizes: "100vw" };

  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...common,
    width: 1920,
    height: 1080,
    quality: 95,
    src: "/images/hero-desktop.jpg",
  });

  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({
    ...common,
    width: 768,
    height: 432,
    quality: 90,
    src: "/images/hero-mobile.jpg",
  });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop} />
      <source media="(max-width: 767px)" srcSet={mobile} />
      <img {...rest} style={{ width: "100%", height: "auto" }} />
    </picture>
  );
}
```

---

## 🛠️ Quick Fix Checklist

- [ ] Update carousel images to use `quality={95}`
- [ ] Add `priority` to first carousel image
- [ ] Add proper `sizes` attribute
- [ ] Clear `.next` cache: `Remove-Item -Path ".\.next" -Recurse -Force`
- [ ] Check source image quality (should be high-res PNG or high-quality JPEG)
- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Test on different devices/screen sizes
- [ ] Run Lighthouse audit to verify improvements

---

## 📊 Quality Settings Reference

| Image Type        | Recommended Quality | Format    | Notes                      |
| ----------------- | ------------------- | --------- | -------------------------- |
| Hero/Carousel     | 90-100              | PNG/WebP  | High visibility, large     |
| Product Images    | 85-95               | JPEG/WebP | Important but smaller      |
| Thumbnails        | 75-85               | JPEG/WebP | Small, many instances      |
| Blog Images       | 80-90               | JPEG/WebP | Content images             |
| Background Images | 70-80               | JPEG/WebP | Often blurred/subtle       |
| Icons/Logos       | N/A                 | SVG       | Vector, no quality setting |

---

## 🔗 Additional Resources

- [Next.js Image Optimization Docs](https://nextjs.org/docs/app/api-reference/components/image)
- [Web.dev: Serve Responsive Images](https://web.dev/articles/serve-responsive-images)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Squoosh App](https://squoosh.app/) - Google's image optimizer
- [TinyPNG](https://tinypng.com/) - PNG/JPEG compression

---

## 💡 Pro Tips

1. **Always start with high-quality source images** - You can't improve quality, only reduce file size
2. **Test on real devices** - What looks good on desktop may look bad on mobile
3. **Use browser DevTools** to check which image size is being loaded
4. **Monitor Core Web Vitals** - LCP should be under 2.5 seconds
5. **Consider using a CDN** for better global performance
6. **Keep source images in version control** but exclude optimized versions

---

_Last Updated: October 12, 2025_
