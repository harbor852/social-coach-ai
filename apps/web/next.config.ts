import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 blocks cross-origin dev resources by default.
  // Allow HMR over 127.0.0.1 as well as localhost so screenshots /
  // headless testing tools can hydrate the React tree.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: __dirname,
  },
  // Static export for Tauri desktop embedding
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
