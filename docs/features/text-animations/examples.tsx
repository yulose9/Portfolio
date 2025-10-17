```tsx
"use client";

/**
 * PRACTICAL EXAMPLES - Copy and paste ready implementations
 * This file shows real-world usage patterns for all animation components
 */

import { GsapBouncyText } from "@/app/(sections)/hero";
import { AdvancedSplitText } from "@/app/components/animations";

// ============================================================================
// EXAMPLE 1: Basic Section Header with Animated Heading
// ============================================================================
export function BasicSectionHeader() {
  return (
    <section className="py-12">
      <GsapBouncyText
        text="Featured Projects"
        as="h2"
        animationStyle="smooth"
        className="text-4xl font-bold text-center mb-4"
      />
      <AdvancedSplitText
        animationType="fadeSlide"
        staggerDelay={0.08}
        className="text-center text-gray-600 max-w-2xl mx-auto"
      >
        Explore a collection of my work across different technologies and
        domains
      </AdvancedSplitText>
    </section>
  );
}

// ============================================================================
// EXAMPLE 2: Hero Section with Multiple Animations
// ============================================================================
export function HeroWithAnimations() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      <div className="text-center">
        {/* Main heading - bouncy style */}
        <GsapBouncyText
          text="Creative Developer"
          as="h1"
          animationStyle="bouncy"
          className="text-6xl font-bold text-white mb-4"
          delay={0}
        />

        {/* Subheading - smooth wave style */}
        <GsapBouncyText
          text="Building digital experiences with passion"
          as="h2"
          animationStyle="smooth-wave"
          className="text-2xl text-purple-200 mb-12"
          delay={0.6}
        />

        {/* Description - character level animation */}
        <AdvancedSplitText
          splitType="chars"
          animationType="slideUp"
          staggerDelay={0.03}
          delay={1.2}
          className="text-lg text-gray-300 mb-8"
        >
          Let's create something amazing together
        </AdvancedSplitText>

        {/* CTA - pop animation */}
        <button className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-all">
          <GsapBouncyText
            text="Get In Touch"
            animationStyle="pop"
            staggerDelay={0.08}
            delay={1.8}
          />
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 3: Card Component with Title Animation
// ============================================================================
export function AnimatedCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      {/* Card title animates on view */}
      <AdvancedSplitText
        animationType="rotateIn"
        staggerDelay={0.05}
        className="text-2xl font-bold mb-4 text-gray-900"
      >
        {title}
      </AdvancedSplitText>

      {/* Card description fades in */}
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: About Section with Line Animations
// ============================================================================
export function AboutSection() {
  const aboutText = \`I'm a passionate developer with a love for creating beautiful, 
functional digital experiences. With expertise in full-stack development, 
I enjoy solving complex problems and learning new technologies.\`;

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section heading */}
        <GsapBouncyText
          text="About Me"
          as="h2"
          animationStyle="smooth"
          className="text-5xl font-bold mb-12 text-gray-900"
        />

        {/* About text with line-level animation */}
        <AdvancedSplitText
          animationType="slideUp"
          staggerDelay={0.12}
          className="text-xl text-gray-700 leading-relaxed mb-8"
        >
          {aboutText}
        </AdvancedSplitText>

        {/* Skills list with word animation */}
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Skills</h3>
          <AdvancedSplitText
            animationType="slideUp"
            staggerDelay={0.1}
            className="flex flex-wrap gap-4"
          >
            React TypeScript Node.js Next.js Python AWS
          </AdvancedSplitText>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 5: Portfolio Grid with Staggered Animations
// ============================================================================
export function PortfolioGrid() {
  const projects = [
    {
      id: 1,
      title: "E-Commerce Platform",
      description: "Full-stack React + Node.js",
    },
    { id: 2, title: "Mobile App", description: "React Native iOS/Android" },
    { id: 3, title: "CMS Dashboard", description: "Next.js + MongoDB" },
    { id: 4, title: "API Service", description: "Express + TypeScript" },
  ];

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <GsapBouncyText
          text="My Work"
          as="h2"
          animationStyle="wave"
          className="text-5xl font-bold mb-4 text-center"
        />

        {/* Grid of projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {projects.map((project, index) => (
            <div key={project.id} className="bg-gray-100 rounded-lg p-6">
              {/* Each project title animates with delay */}
              <AdvancedSplitText
                animationType="scaleReveal"
                staggerDelay={0.06}
                delay={index * 0.15}
                className="text-xl font-bold text-gray-900 mb-2"
              >
                {project.title}
              </AdvancedSplitText>
              <p className="text-gray-600 text-sm">{project.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 6: Skills Showcase with Character Animation
// ============================================================================
export function SkillsShowcase() {
  const skills = [
    {
      category: "Frontend",
      items: ["React", "TypeScript", "Next.js", "Tailwind"],
    },
    {
      category: "Backend",
      items: ["Node.js", "Express", "Python", "PostgreSQL"],
    },
    { category: "Cloud", items: ["AWS", "Docker", "Kubernetes", "CI/CD"] },
  ];

  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section title */}
        <GsapBouncyText
          text="Technical Skills"
          as="h2"
          animationStyle="elastic"
          className="text-5xl font-bold mb-12 text-center"
        />

        {/* Skills grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {skills.map((skillGroup, groupIndex) => (
            <div key={skillGroup.category}>
              {/* Category title */}
              <GsapBouncyText
                text={skillGroup.category}
                as="h3"
                animationStyle="smooth"
                delay={groupIndex * 0.2}
                className="text-2xl font-bold mb-4 text-blue-400"
              />

              {/* Individual skills with character animation */}
              <div className="space-y-3">
                {skillGroup.items.map((skill, skillIndex) => (
                  <AdvancedSplitText
                    key={skill}
                    splitType="chars"
                    animationType="slideUp"
                    staggerDelay={0.02}
                    delay={groupIndex * 0.2 + skillIndex * 0.1}
                    className="text-gray-300 pl-4 border-l-2 border-blue-500"
                  >
                    {skill}
                  </AdvancedSplitText>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 7: Contact Section with Form
// ============================================================================
export function ContactSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
      <div className="max-w-2xl mx-auto px-4 text-center text-white">
        {/* Heading */}
        <GsapBouncyText
          text="Let's Connect"
          as="h2"
          animationStyle="pop"
          className="text-5xl font-bold mb-4"
        />

        {/* Description */}
        <AdvancedSplitText
          animationType="fadeSlide"
          staggerDelay={0.08}
          delay={0.5}
          className="text-xl mb-12"
        >
          Have a project in mind? Let's work together to bring your ideas to
          life.
        </AdvancedSplitText>

        {/* Contact info */}
        <div className="space-y-4">
          <AdvancedSplitText
            animationType="slideUp"
            staggerDelay={0.1}
            delay={1.0}
            className="text-lg"
          >
            Email: hello@example.com
          </AdvancedSplitText>

          <AdvancedSplitText
            animationType="slideUp"
            staggerDelay={0.1}
            delay={1.5}
            className="text-lg"
          >
            Phone: +1 (234) 567-8900
          </AdvancedSplitText>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 8: Testimonials with Quote Animation
// ============================================================================
export function TestimonialSection() {
  const testimonials = [
    {
      quote: "Amazing work! Delivered on time and exceeded expectations.",
      author: "John Doe",
      company: "Tech Startup",
    },
    {
      quote: "Professional, creative, and results-driven approach.",
      author: "Jane Smith",
      company: "Design Agency",
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section title */}
        <GsapBouncyText
          text="What Clients Say"
          as="h2"
          animationStyle="smooth"
          className="text-4xl font-bold text-center mb-12"
        />

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-100 p-8 rounded-lg border-l-4 border-blue-500"
            >
              {/* Quote */}
              <AdvancedSplitText
                animationType="slideUp"
                staggerDelay={0.1}
                delay={index * 0.3}
                className="text-lg text-gray-900 mb-4 italic"
              >
                {\`"\${testimonial.quote}"\`}
              </AdvancedSplitText>

              {/* Author */}
              <GsapBouncyText
                text={\`— \${testimonial.author}\`}
                animationStyle="smooth"
                delay={index * 0.3 + 0.4}
                className="font-semibold text-gray-900"
              />

              {/* Company */}
              <p className="text-gray-600 text-sm">{testimonial.company}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 9: Timeline/Experience Section
// ============================================================================
export function ExperienceTimeline() {
  const experiences = [
    {
      title: "Senior Developer",
      company: "Tech Corp",
      period: "2023 - Present",
      description: "Led frontend development for multiple projects",
    },
    {
      title: "Full Stack Developer",
      company: "Digital Agency",
      period: "2021 - 2023",
      description: "Developed and maintained web applications",
    },
    {
      title: "Junior Developer",
      company: "Startup Inc",
      period: "2020 - 2021",
      description: "Started career building responsive websites",
    },
  ];

  return (
    <section className="py-20">
      <div className="max-w-2xl mx-auto px-4">
        {/* Section title */}
        <GsapBouncyText
          text="Experience"
          as="h2"
          animationStyle="wave"
          className="text-4xl font-bold mb-12 text-center"
        />

        {/* Timeline */}
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-6">
              {/* Job title */}
              <AdvancedSplitText
                animationType="slideUp"
                staggerDelay={0.06}
                delay={index * 0.25}
                className="text-2xl font-bold text-gray-900"
              >
                {exp.title}
              </AdvancedSplitText>

              {/* Company and period */}
              <GsapBouncyText
                text={\`\${exp.company} • \${exp.period}\`}
                animationStyle="smooth"
                delay={index * 0.25 + 0.2}
                className="text-gray-600 mb-2"
              />

              {/* Description */}
              <p className="text-gray-700">{exp.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 10: Statistics Section with Character Animation
// ============================================================================
export function StatsSection() {
  const stats = [
    { label: "Projects Completed", value: "50+" },
    { label: "Happy Clients", value: "30+" },
    { label: "Years Experience", value: "5+" },
    { label: "Technologies", value: "25+" },
  ];

  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section title */}
        <GsapBouncyText
          text="By The Numbers"
          as="h2"
          animationStyle="elastic"
          className="text-4xl font-bold text-center mb-12"
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              {/* Number with character animation */}
              <AdvancedSplitText
                splitType="chars"
                animationType="scaleReveal"
                staggerDelay={0.08}
                delay={index * 0.1}
                className="text-5xl font-bold text-blue-400 mb-2"
              >
                {stat.value}
              </AdvancedSplitText>

              {/* Label */}
              <p className="text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// EXAMPLE 11: Full Page Combination
// ============================================================================
export function FullPageExample() {
  return (
    <main className="bg-white">
      <HeroWithAnimations />
      <BasicSectionHeader />
      <AboutSection />
      <PortfolioGrid />
      <SkillsShowcase />
      <ExperienceTimeline />
      <StatsSection />
      <TestimonialSection />
      <ContactSection />
    </main>
  );
}

export default FullPageExample;
```;
