"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MagicTextRevealProps {
  /** The masked text to display, e.g., "jan***********.com" */
  text: string;
  /** The actual hidden value (for accessibility, not revealed) */
  hiddenText?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: number;
  spread?: number;
  speed?: number;
  density?: number;
  repeat?: boolean;
  className?: string;
  /** If true, clicking does nothing (useful for captcha implementation) */
  disableClick?: boolean;
  onClick?: () => void;
}

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinkleOffset: number;
}

export function MagicTextReveal({
  text,
  hiddenText,
  color = "#000000",
  fontSize = 18,
  fontWeight = 500,
  spread = 12,
  speed = 0.5,
  density = 4,
  repeat = true,
  className = "",
  disableClick = false,
  onClick,
}: MagicTextRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [prefixWidth, setPrefixWidth] = useState(0);
  const [suffixWidth, setSuffixWidth] = useState(0);

  // Parse text to find asterisk section
  const { prefix, asterisks, suffix } = (() => {
    const firstAsterisk = text.indexOf("*");
    const lastAsterisk = text.lastIndexOf("*");

    if (firstAsterisk === -1) {
      return { prefix: text, asterisks: "", suffix: "" };
    }

    return {
      prefix: text.slice(0, firstAsterisk),
      asterisks: text.slice(firstAsterisk, lastAsterisk + 1),
      suffix: text.slice(lastAsterisk + 1),
    };
  })();

  // Convert hex to RGB
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }, []);

  // Initialize particles from asterisks only
  const initParticles = useCallback(() => {
    if (isInitializedRef.current || !asterisks) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Create offscreen canvas for text measurement
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;

    // Set font for measurement
    const fontFamily = 'Inter, "SF Pro Display", sans-serif';
    const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    offCtx.font = font;

    // Measure prefix and suffix
    const prefixMetrics = offCtx.measureText(prefix);
    const suffixMetrics = offCtx.measureText(suffix);
    const asteriskMetrics = offCtx.measureText(asterisks);

    setPrefixWidth(prefixMetrics.width);
    setSuffixWidth(suffixMetrics.width);

    const asteriskWidth = asteriskMetrics.width;
    const textHeight = fontSize * 1.4;

    // Set canvas size with padding for particles
    const padding = spread;
    const width = Math.ceil(asteriskWidth + padding * 2);
    const height = Math.ceil(textHeight + padding);

    // Set dimensions for display
    setDimensions({ width, height });

    // Set offscreen canvas size (2x for retina)
    const scale = 2;
    offscreen.width = width * scale;
    offscreen.height = height * scale;

    // Draw asterisks on offscreen canvas
    offCtx.scale(scale, scale);
    offCtx.font = font;
    offCtx.fillStyle = color;
    offCtx.textBaseline = "middle";
    offCtx.textAlign = "center";
    offCtx.fillText(asterisks, width / 2, height / 2);

    // Get pixel data
    const imageData = offCtx.getImageData(
      0,
      0,
      offscreen.width,
      offscreen.height
    );
    const pixels = imageData.data;

    // Create particles from asterisk pixels
    const particles: Particle[] = [];
    const gap = Math.max(2, Math.floor(8 - density));

    for (let y = 0; y < offscreen.height; y += gap) {
      for (let x = 0; x < offscreen.width; x += gap) {
        const index = (y * offscreen.width + x) * 4;
        const alpha = pixels[index + 3];

        if (alpha > 50) {
          const px = x / scale;
          const py = y / scale;

          // Random scatter position
          const scatterX = px + (Math.random() - 0.5) * spread * 2;
          const scatterY = py + (Math.random() - 0.5) * spread * 2;

          particles.push({
            x: scatterX,
            y: scatterY,
            originX: px,
            originY: py,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            size: Math.random() * 1.5 + 0.8,
            alpha: Math.random() * 0.6 + 0.4,
            twinkleOffset: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    particlesRef.current = particles;

    // Set main canvas size
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    isInitializedRef.current = true;
  }, [asterisks, prefix, suffix, color, fontSize, fontWeight, spread, density]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    const rgb = hexToRgb(color);
    const particles = particlesRef.current;
    const time = Date.now() * 0.001;
    const isActive = isHovered || isRevealed;

    particles.forEach((particle) => {
      if (isActive) {
        // Move particles to origin (form the asterisks)
        const dx = particle.originX - particle.x;
        const dy = particle.originY - particle.y;
        const easing = 0.12 * speed;

        particle.x += dx * easing;
        particle.y += dy * easing;

        // Fade in
        particle.alpha += (1 - particle.alpha) * 0.08;
      } else {
        // Scatter particles (hide asterisks)
        particle.x += particle.vx * speed * 0.4;
        particle.y += particle.vy * speed * 0.4;

        // Boundary checking - keep particles within spread distance
        const dx = particle.x - particle.originX;
        const dy = particle.y - particle.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > spread) {
          // Redirect towards origin area
          particle.vx -= dx * 0.02;
          particle.vy -= dy * 0.02;
        }

        // Add some random movement
        particle.vx += (Math.random() - 0.5) * 0.15;
        particle.vy += (Math.random() - 0.5) * 0.15;

        // Damping
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Twinkling effect when scattered
        const twinkle = Math.sin(time * 3 + particle.twinkleOffset);
        particle.alpha = 0.4 + twinkle * 0.3;
      }

      // Draw particle as a small glowing dot
      const glowSize = particle.size * 2;
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        glowSize
      );

      gradient.addColorStop(
        0,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.alpha})`
      );
      gradient.addColorStop(
        0.5,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${particle.alpha * 0.5})`
      );
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    ctx.restore();
    animationRef.current = requestAnimationFrame(animate);
  }, [isHovered, isRevealed, color, speed, spread, hexToRgb]);

  // Initialize on mount
  useEffect(() => {
    // Small delay to ensure fonts are loaded
    const timer = setTimeout(() => {
      initParticles();
    }, 100);

    return () => clearTimeout(timer);
  }, [initParticles]);

  // Start animation
  useEffect(() => {
    if (isInitializedRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Re-init when particles are ready
  useEffect(() => {
    if (particlesRef.current.length > 0 && !animationRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [dimensions, animate]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!repeat) {
      setIsRevealed(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disableClick && onClick) {
      onClick();
    }
  };

  const textStyle: React.CSSProperties = {
    fontFamily: 'Inter, "SF Pro Display", sans-serif',
    fontSize: `${fontSize}px`,
    fontWeight,
    color,
    lineHeight: 1.4,
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center cursor-pointer select-none ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={hiddenText || text}
      style={{ cursor: disableClick ? "default" : "pointer" }}
    >
      {/* Prefix text (static) */}
      <span style={textStyle}>{prefix}</span>

      {/* Magic particles section (asterisks) */}
      <span
        className="relative inline-flex items-center justify-center"
        style={{
          width: dimensions.width || "auto",
          height: dimensions.height || fontSize * 1.5,
        }}
      >
        {/* Canvas for particle animation */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
          style={{
            display: "block",
          }}
        />
      </span>

      {/* Suffix text (static) */}
      <span style={textStyle}>{suffix}</span>
    </div>
  );
}

export default MagicTextReveal;
