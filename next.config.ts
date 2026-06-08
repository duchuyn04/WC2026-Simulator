import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/WC2026-Simulator" : undefined,
  assetPrefix: isGithubPages ? "/WC2026-Simulator/" : undefined,
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.fifa.com",
        pathname: "/api/v3/picture/**",
      },
    ],
  },
};

export default nextConfig;