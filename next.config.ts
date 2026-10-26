import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["ffmpeg-static"],
  distDir: process.env.STUDIO_BUILD_DIR || ".next",
};

export default nextConfig;
