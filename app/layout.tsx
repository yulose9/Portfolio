import "lenis/dist/lenis.css";
import { title } from "process";
import ImagePreloader from "./components/ImagePreloader";
import SmoothScrolling from "./components/SmoothScrolling";
import "./globals.css";

export const metadata = {
  title: "John Nazarene",
  description: "Generated manually in existing folder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical hero image for instant loading */}
        <link
          rel="preload"
          as="image"
          href="/7a97f9ff1efd6be56501753f1f090d23d760914c.png"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/snazzy-image.png"
          fetchPriority="high"
        />
      </head>
      <body>
        <ImagePreloader />
        <SmoothScrolling>{children}</SmoothScrolling>
      </body>
    </html>
  );
}
