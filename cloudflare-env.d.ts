/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  SESSION_SECRET?: string;
}
