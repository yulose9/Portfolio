"use client";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/app/components/ui/dialog";
import Image from "next/image";

interface ImageZoomProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export function ImageZoom({ src, alt, children }: ImageZoomProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent aria-describedby={undefined} data-lenis-prevent className="max-w-7xl w-[90vw] h-[90svh] p-0 overflow-hidden bg-transparent border-none">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="90vw"
            className="object-contain"
            quality={100}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
