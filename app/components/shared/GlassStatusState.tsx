"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileQuestion,
  Home,
  Lock,
  RefreshCcw,
  ServerCrash,
  WifiOff,
} from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

interface GlassStatusStateProps {
  code?: string | number;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  className?: string;
}

const ERROR_CONFIG: Record<
  string,
  { title: string; message: string; icon: any }
> = {
  "400": {
    title: "Bad Request",
    message:
      "The server could not understand the request due to invalid syntax.",
    icon: AlertTriangle,
  },
  "401": {
    title: "Unauthorized",
    message: "You do not have permission to access this resource.",
    icon: Lock,
  },
  "403": {
    title: "Forbidden",
    message: "You don't have permission to access this resource.",
    icon: Lock,
  },
  "404": {
    title: "Page Not Found",
    message: "The page you're looking for doesn't exist or has been moved.",
    icon: FileQuestion,
  },
  "500": {
    title: "Server Error",
    message: "Something went wrong on our end. We're working on it.",
    icon: ServerCrash,
  },
  "503": {
    title: "Service Unavailable",
    message: "The server is currently unavailable. Please try again later.",
    icon: WifiOff,
  },
  default: {
    title: "Error",
    message: "An unexpected error occurred.",
    icon: AlertTriangle,
  },
};

export function GlassStatusState({
  code = "default",
  title,
  message,
  actionLabel = "Back to Home",
  actionHref = "/",
  onRetry,
  className,
}: GlassStatusStateProps) {
  const codeStr = code.toString();
  const config = ERROR_CONFIG[codeStr] || ERROR_CONFIG["default"];

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex min-h-screen w-full items-center justify-center p-4 bg-brand-primary overflow-hidden relative",
        inter.className,
        className
      )}
    >
      {/* Background Animated Shapes */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-secondary/10 blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/5 blur-[100px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl md:p-12"
      >
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-sm ring-1 ring-white/20 backdrop-blur-md"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
            </motion.div>
          </motion.div>

          {/* Code Display */}
          {codeStr !== "default" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="mb-6 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm"
            >
              Error {codeStr}
            </motion.div>
          )}

          <h1 className="mb-4 text-[32px] md:text-[40px] font-medium leading-[1.1] tracking-[-0.04em] text-white">
            {displayTitle.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3 + i * 0.03,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className="inline-block"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
            className="mb-10 max-w-xs text-[15px] md:text-[16px] leading-relaxed text-white/70 font-medium"
          >
            {displayMessage}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-3 w-full sm:w-auto sm:flex-row"
          >
            {onRetry && (
              <button
                onClick={onRetry}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-brand-secondary/50 backdrop-blur-lg rounded-full text-sm font-semibold text-white hover:bg-brand-secondary/70 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <RefreshCcw className="h-4 w-4 transition-transform group-hover:rotate-180" />
                Try Again
              </button>
            )}

            {actionHref && (
              <Link
                href={actionHref}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-brand-secondary/50 backdrop-blur-lg rounded-full text-sm font-semibold text-white hover:bg-brand-secondary/70 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Home className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                {actionLabel}
              </Link>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
