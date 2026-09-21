"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { useHaptics } from "@/app/hooks/use-haptics";
import Image from "next/image";
import { ReactNode } from "react";

export function BentoImageZoom({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  const haptic = useHaptics();
  return (
    <Dialog onOpenChange={(open) => haptic(open ? "medium" : "light")}>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Enlarge ${alt}`} className="block relative w-full h-full p-0 border-0 rounded-[inherit] overflow-hidden cursor-zoom-in image-tile">
          {children}
        </button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} data-lenis-prevent className="w-[92vw] max-w-5xl h-[85svh] p-3 bg-[#172016] border-white/15 rounded-3xl text-white">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative w-full h-full">
          <Image src={src} alt={alt} fill sizes="(max-width: 1024px) 92vw, 1024px" className="object-contain rounded-xl" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
