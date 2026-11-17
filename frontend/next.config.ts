import type { NextConfig } from "next";

/**
 * The REST API lives in ../backend (Express + MySQL). Every request to /api/*
 * is proxied to it, so client code keeps calling relative URLs like
 * fetch("/api/plan/") with no CORS involved.
 */
const backendUrl = (process.env.BACKEND_URL || "http://localhost:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
