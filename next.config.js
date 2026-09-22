/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    // `output: "export"` has no image server, so next/image must not try to
    // optimize on request. Without this, adding next/image breaks the build.
    unoptimized: true,
  },
};

module.exports = nextConfig;
