export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  // If no allowlist is configured, allow any origin (useful for local dev).
  if (allowedOrigins.length === 0) return true;
  if (!origin) return false;
  return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

export function parseAllowedOrigins(env: string | undefined): string[] {
  if (!env) return [];
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
