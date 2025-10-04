# Portfolio Website

A modern, responsive portfolio website built with Next.js 15, React 19, TypeScript, and Framer Motion.

## 🚀 Features

- ⚡ **Next.js 15** - Latest App Router with Turbopack for blazing fast development
- 🎨 **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- 🎭 **Framer Motion** - Smooth animations and transitions with spring physics
- 📱 **Fully Responsive** - Mobile-first design that works on all devices
- 🎯 **TypeScript** - Type-safe development experience
- 🎪 **Interactive Navigation** - Smart sticky navigation with teleport animations
- 📦 **Optimized Images** - Next.js Image component for optimal performance

## 🛠️ Tech Stack

- **Framework:** Next.js 15.5.4
- **UI Library:** React 19.1.1
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 3.4.18
- **Animations:** Framer Motion 12.23.22
- **Icons:** Lucide React 0.544.0

## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/yulose9/Portfolio.git
cd Portfolio
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Project Structure

```
Portfolio/
├── app/
│   ├── components/
│   │   ├── Hero.tsx              # Hero section with main content
│   │   ├── StickyNav.tsx         # Animated sticky navigation
│   │   ├── Portfolio.tsx         # Projects and Blogs sections
│   │   ├── Carousel.tsx          # Project carousel component
│   │   ├── BlogCard.tsx          # Blog card component
│   │   └── icons/                # Custom icon components
│   ├── globals.css               # Global styles and animations
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── public/
│   └── images/                   # Static images and assets
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🎨 Key Features

### Animated Sticky Navigation

- Smooth scale and fade animations using Framer Motion
- Teleport effect between top and bottom positions
- Active section detection with scroll tracking
- Spring physics for natural motion

### Hero Section

- Full-screen hero with gradient background
- Location badge with map integration
- Responsive layout with optimized images
- Professional typography with custom fonts

### Portfolio Section

- Project carousel with auto-play
- Navigation controls with smooth transitions
- Blog cards grid with hover effects
- Gradient background matching design system

## 📜 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🎯 Best Practices Implemented

- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ Responsive design (mobile-first)
- ✅ Optimized images with Next.js Image
- ✅ Clean code structure and organization
- ✅ Git ignored sensitive files and build artifacts
- ✅ Modern animations with Framer Motion
- ✅ Accessible navigation and interactive elements

## 🚀 Deployment

This project can be easily deployed to Vercel:

```bash
npm run build
```

Or deploy directly through the Vercel platform by connecting your GitHub repository.

## 📄 License

ISC

## 👤 Author

**John Nazarene Dela Pisa**

- Developer | Cloud Engineer | AI Enthusiast
- Location: Philippines

---

Made with ❤️ using Next.js and TypeScript
