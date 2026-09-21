/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    loader: "custom",
    loaderFile: "./app/image-loader.ts",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 768, 1080, 1600],
    imageSizes: [96, 256],
    qualities: [75, 90, 95, 100],
  },
};

module.exports = nextConfig;
