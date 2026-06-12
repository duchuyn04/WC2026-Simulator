import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const githubBasePath = "/WC2026-Simulator";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? githubBasePath : undefined,
  assetPrefix: isGithubPages ? `${githubBasePath}/` : undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? githubBasePath : "",
  },
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.fifa.com",
        pathname: "/api/v3/picture/**",
      },
      {
        protocol: "https",
        hostname: "digitalhub.fifa.com",
        pathname: "/transform/**",
      },
    ],
  },
};

export default nextConfig;
