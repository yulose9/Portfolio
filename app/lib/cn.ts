import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class names, merged so a caller's `className` overrides what a component sets. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
