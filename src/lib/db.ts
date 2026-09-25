/**
 * Runtime-neutral data access boundary.
 *
 * The primary web application can run on Vercel without importing the
 * Cloudflare Worker runtime. Cloudflare D1/R2 access is kept behind the
 * optional adapter in ./cloudflare-db.ts and can later be exposed to Vercel
 * through authenticated API routes/Worker endpoints.
 */
export type DatabaseRuntime = "cloudflare-d1" | "external-api" | "unconfigured";

export function getDatabaseRuntime(): DatabaseRuntime {
  if (process.env.CLOUDFLARE_API_BASE_URL) return "external-api";
  return "unconfigured";
}

export function assertDatabaseConfigured(): void {
  if (getDatabaseRuntime() === "unconfigured") {
    throw new Error(
      "Database backend is not configured. Set CLOUDFLARE_API_BASE_URL or configure another supported adapter."
    );
  }
}
