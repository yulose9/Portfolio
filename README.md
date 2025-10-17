# Portfolio Website# Portfolio Website

A modern, responsive portfolio website built with **Next.js 15**, **React 19**, **TypeScript**, and **Framer Motion**.A modern, responsive portfolio website built with **Next.js 15**, **React 19**, **TypeScript**, and **Framer Motion**.

## 🚀 Tech Stack## 🚀 Tech Stack

| Technology | Version | Purpose || Technology | Version | Purpose |

|-----------|---------|---------||-----------|---------|---------|

| Next.js | 15.5.4 | Framework & routing || Next.js | 15.5.4 | Framework & routing |

| React | 19.1.1 | UI library || React | 19.1.1 | UI library |

| TypeScript | 5.9.3 | Type safety || TypeScript | 5.9.3 | Type safety |

| Tailwind CSS | 3.4.18 | Styling || Tailwind CSS | 3.4.18 | Styling |

| Framer Motion | 12.23.22 | Animations || Framer Motion | 12.23.22 | Animations |

| GSAP | 3.x | Advanced animations || GSAP | 3.x | Advanced animations |

| Lucide React | 0.544.0 | Icons || Lucide React | 0.544.0 | Icons |

## 📂 Project Structure## � Project Structure

```

app/app/

├── (sections)/          # Feature-based route groups├── (sections)/          # Feature-based route groups

│   ├── hero/           # Hero section│   ├── hero/           # Hero section

│   ├── portfolio/      # Projects & Blogs│   ├── portfolio/      # Projects & Blogs

│   ├── work/           # Work experience│   ├── work/           # Work experience

│   ├── about/          # About section│   ├── about/          # About section

│   ├── contact/        # Contact section│   ├── contact/        # Contact section

│   └── blog/           # Blog components│   └── blog/           # Blog components

├── components/         # Reusable components├── components/         # Reusable components

│   ├── animations/     # Animation components│   ├── animations/     # Animation components

│   ├── layout/         # Layout components│   ├── layout/         # Layout components

│   ├── shared/         # Shared UI components│   ├── shared/         # Shared UI components

│   ├── ui/             # UI library components│   ├── ui/             # UI library components

│   └── icons/          # Custom icons│   └── icons/          # Custom icons

├── hooks/              # Custom React hooks├── hooks/              # Custom React hooks

├── providers/          # Context providers├── providers/          # Context providers

└── page.tsx└── page.tsx

```

## 🚀 Quick Start## � Quick Start

### 1. Install Dependencies1. Clone the repository

````bash

npm install```bash

```git clone https://github.com/yulose9/Portfolio.git

cd Portfolio

### 2. Run Development Server```

```bash

npm run dev2. Install dependencies:

````

```bash

Open [http://localhost:3000](http://localhost:3000) in your browser.npm install

```

### 3. Build for Production

````bash3. Run the development server:

npm run build

npm start```bash

```npm run dev

````

## 🎨 Key Components

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### SectionHeading

Apple-inspired section headings with smooth animations.## 🏗️ Project Structure

`tsx`

import { SectionHeading } from "@/app/components/shared";Portfolio/

├── app/

<SectionHeading>Projects</SectionHeading>│ ├── components/

<SectionHeading textColor="text-white">Work & Experiences</SectionHeading>│ │ ├── Hero.tsx # Hero section with main content

`````│ │   ├── StickyNav.tsx         # Animated sticky navigation

│   │   ├── Portfolio.tsx         # Projects and Blogs sections

### Text Animations│   │   ├── Carousel.tsx          # Project carousel component

- **GsapBouncyText** - 6 animation styles│   │   ├── BlogCard.tsx          # Blog card component

- **AdvancedSplitText** - 10+ animation types│   │   └── icons/                # Custom icon components

- **SplitText** - Character/word/line animations│   ├── globals.css               # Global styles and animations

- **GsapSplitTextAnimation** - Official GSAP SplitText wrapper│   ├── layout.tsx                # Root layout

│   └── page.tsx                  # Home page

## 📚 Documentation├── public/

│   └── images/                   # Static images and assets

All documentation is organized in the `/docs` folder:├── next.config.js                # Next.js configuration

├── tailwind.config.js            # Tailwind CSS configuration

- **Full guide**: See `/docs/DOCS_ORGANIZATION.md`└── tsconfig.json                 # TypeScript configuration

- **Text animations**: See `/docs/features/text-animations/README.md````

- **Implementation**: See `/docs/implementation/`

- **Archived docs**: See `/docs/archive/`## 🎨 Key Features



## ✨ Features### Animated Sticky Navigation



✅ Mobile-first responsive design  - Smooth scale and fade animations using Framer Motion

✅ Smooth Framer Motion animations  - Teleport effect between top and bottom positions

✅ Advanced text animations with GSAP  - Active section detection with scroll tracking

✅ Optimized images & performance  - Spring physics for natural motion

✅ Accessible components (WCAG)

✅ Type-safe with TypeScript  ### Hero Section

✅ Production-ready code

- Full-screen hero with gradient background

## 🔗 Links- Location badge with map integration

- Responsive layout with optimized images

- [Repository](https://github.com/yulose9/Portfolio)- Professional typography with custom fonts

- [Documentation](/docs/)

- [Changelog](/CHANGELOG.md)### Portfolio Section



---- Project carousel with auto-play

- Navigation controls with smooth transitions

Built with ❤️ by Janna- Blog cards grid with hover effects

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
`````

Or deploy directly through the Vercel platform by connecting your GitHub repository.

## 📄 License

ISC

## 👤 Author

**John Nazarene Dela Pisa**

- Developer | Cloud Engineer | AI Enthusiast
- Location: Philippines

---

Made with ❤️ using Next.js and TypeScript
