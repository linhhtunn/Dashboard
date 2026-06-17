/** Public page routes — no clinical session required */
export const PUBLIC_PAGE_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/auth",
] as const;

export function isPublicPageRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PAGE_PREFIXES.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}

export function isAuthPageRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth")
  );
}

export function isMarketingPageRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms")
  );
}
