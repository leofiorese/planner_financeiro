import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Uncomment and set the basePath if your repo name is not the root domain
  basePath: isProd ? "/personal-finance-planner" : "",
  assetPrefix: isProd ? "/personal-finance-planner/" : "",
};

export default nextConfig;
