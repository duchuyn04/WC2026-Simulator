const GITHUB_PAGES_REPO = "WC2026-Simulator";

/** Prefix for static assets (empty on localhost / Vercel root). */
export function getBasePath(): string {
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === GITHUB_PAGES_REPO) return `/${GITHUB_PAGES_REPO}`;
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

export function assetPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getBasePath()}${normalized}`;
}